import { randomUUID } from "node:crypto";
import { logger, metadata, task } from "@trigger.dev/sdk";
import { generateText, APICallError } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { put } from "@vercel/blob";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// The label the AI collaborator presents itself as, matching the "Ghost AI"
// persona used across the workspace UI.
const AI_LABEL = "Ghost AI";

// The Gemini model to drive spec generation. Configurable via env so we can
// point at a model our billing/quota covers without a redeploy. Mirrors the
// design agent's `GOOGLE_AI_MODEL` convention.
const GOOGLE_AI_MODEL = process.env.GOOGLE_AI_MODEL ?? "gemini-2.5-flash";

/* -------------------------------------------------------------------------- */
/*  Input validation (Zod)                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Canvas node/edge shapes are validated leniently: they arrive as
 * JSON-serialized React Flow graph data (client callbacks stripped), and we only
 * read a handful of fields to build the prompt context. `.passthrough()` keeps
 * any extra fields without failing validation, and unknown data is ignored.
 */
const specNodeSchema = z
  .object({
    id: z.string(),
    type: z.string().nullish(),
    position: z
      .object({ x: z.number(), y: z.number() })
      .partial()
      .nullish(),
    width: z.number().nullish(),
    height: z.number().nullish(),
    data: z
      .object({
        label: z.string().nullish(),
        shape: z.string().nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough();

const specEdgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    data: z
      .object({ label: z.string().nullish() })
      .passthrough()
      .nullish(),
  })
  .passthrough();

const specChatMessageSchema = z
  .object({
    sender: z.string().nullish(),
    role: z.string().nullish(),
    content: z.string(),
  })
  .passthrough();

const generateSpecPayloadSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(specChatMessageSchema).default([]),
  nodes: z.array(specNodeSchema).default([]),
  edges: z.array(specEdgeSchema).default([]),
});

type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>;

/**
 * Loose input accepted at the trigger boundary. The canvas graph and chat
 * history arrive as JSON-serialized client data, so they're typed as `unknown[]`
 * here and validated into `GenerateSpecPayload` with Zod inside `run`.
 */
interface GenerateSpecInput {
  projectId: string;
  roomId: string;
  chatHistory?: unknown[];
  nodes?: unknown[];
  edges?: unknown[];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * True when a failure is a provider quota / rate-limit (HTTP 429) error. These
 * are permanent for the current API key until billing/quota is fixed, so we
 * surface a distinct, actionable status instead of a generic "try again".
 * Mirrors the classifier used by the design agent.
 */
function isQuotaError(error: unknown): boolean {
  if (APICallError.isInstance(error) && error.statusCode === 429) return true;
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted")
  );
}

/**
 * Flatten the validated canvas graph into a compact, model-friendly JSON
 * context. We only surface the fields relevant to writing a technical spec.
 */
function buildCanvasContext(payload: GenerateSpecPayload) {
  return {
    nodes: payload.nodes.map((node) => ({
      id: node.id,
      label: node.data?.label ?? "",
      shape: node.data?.shape ?? "rectangle",
      position: node.position ?? null,
    })),
    edges: payload.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.data?.label ?? "",
    })),
  };
}

/** Flatten chat history into a readable transcript for the prompt. */
function buildChatTranscript(payload: GenerateSpecPayload): string {
  if (payload.chatHistory.length === 0) {
    return "(no chat history)";
  }
  return payload.chatHistory
    .map((message) => {
      const who = message.sender || message.role || "user";
      return `${who}: ${message.content}`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `You are ${AI_LABEL}, a senior software architect. You turn a collaborative system-design diagram and its accompanying team conversation into a clear, implementation-ready technical specification.

Write the spec as GitHub-flavored Markdown ONLY — no preamble, no code fences wrapping the whole document, no commentary outside the spec.

Structure the document with these top-level sections (use "##" headings), omitting any that genuinely do not apply:
1. Overview — what the system does and its purpose, in a short paragraph.
2. Architecture — the components (canvas nodes) and how they connect (edges/data flow). Reference components by their labels.
3. Components — a subsection or table per major component describing its responsibility.
4. Data Flow — how requests/data move through the system, following the edges.
5. Technical Requirements — concrete implementation notes, technologies, and constraints implied by the design and chat.
6. Open Questions — anything ambiguous or unresolved from the design/chat.

Ground every statement in the provided canvas and chat context. Do not invent components that are not present in the diagram. Keep it concise, precise, and useful to an engineer about to build the system.`;

/* -------------------------------------------------------------------------- */
/*  Task                                                                       */
/* -------------------------------------------------------------------------- */

export const generateSpecTask = task({
  id: "generate-spec",
  // Spec generation is read-only (it never mutates the canvas), but provider
  // quota/billing (429) failures are permanent for the current key, so extra
  // retries only burn compute. Keep attempts minimal and fail gracefully.
  retry: { maxAttempts: 1 },
  run: async (payload: GenerateSpecInput) => {
    // Validate the task input up front so a malformed trigger fails fast with a
    // clear error rather than deep inside prompt construction.
    const input = generateSpecPayloadSchema.parse(payload);
    const { projectId, roomId, nodes, edges } = input;

    logger.log("Spec generation started", {
      roomId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      chatCount: input.chatHistory.length,
    });

    // Publish interim status through Trigger.dev run metadata for realtime
    // tracking by the initiating user (see aiStatusMessageSchema phases).
    const publishStatus = (
      phase: "started" | "processing" | "completed" | "error",
      text: string,
      progress: number
    ) => {
      metadata.set("phase", phase).set("text", text).set("progress", progress);
    };

    try {
      publishStatus("started", "Ghost AI is reading your design…", 5);

      const canvasContext = buildCanvasContext(input);
      const chatTranscript = buildChatTranscript(input);

      publishStatus("processing", "Ghost AI is writing the technical spec…", 35);

      const google = createGoogleGenerativeAI({
        apiKey:
          process.env.GOOGLE_AI_API_KEY ??
          process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });

      const { text } = await generateText({
        model: google(GOOGLE_AI_MODEL),
        system: SYSTEM_PROMPT,
        prompt: `Canvas (JSON):\n${JSON.stringify(
          canvasContext
        )}\n\nTeam conversation:\n"""\n${chatTranscript}\n"""\n\nWrite the technical specification as Markdown.`,
        // Quota/billing (429) failures are permanent for the current key, so the
        // AI SDK's default retries only burn compute waiting on an error that
        // won't recover. Fail fast; Trigger.dev's retry policy governs any true
        // transient retry.
        maxRetries: 1,
      });

      const spec = text.trim();

      // Persist the generated spec: content goes to Vercel Blob, metadata to
      // Postgres — the same separation used for canvas persistence. The Blob URL
      // is stored in `ProjectSpec.filePath` and is the only reference to the
      // artifact (never exposed to clients directly; downloads are proxied
      // through the access-checked download route). The specId is minted up
      // front so it can key the deterministic blob path `specs/{projectId}/{specId}.md`.
      publishStatus("processing", "Ghost AI is saving the technical spec…", 85);
      const specId = randomUUID();
      const blob = await put(`specs/${projectId}/${specId}.md`, spec, {
        access: "private",
        contentType: "text/markdown",
      });
      await prisma.projectSpec.create({
        data: {
          id: specId,
          projectId,
          filePath: blob.url,
        },
      });

      publishStatus("completed", "Ghost AI finished the technical spec.", 100);
      logger.log("Spec generation completed", {
        specId,
        specLength: spec.length,
      });

      return {
        ok: true as const,
        specId,
        spec,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error while generating the spec.";
      const quotaExceeded = isQuotaError(error);
      logger.error("Spec generation failed", { error: message, quotaExceeded });
      publishStatus(
        "error",
        quotaExceeded
          ? "Ghost AI is out of API quota — check the Gemini API billing/plan and try again."
          : "Ghost AI couldn't generate the spec. Please try again.",
        100
      );
      return {
        ok: false as const,
        error: message,
        quotaExceeded,
      };
    }
  },
});
