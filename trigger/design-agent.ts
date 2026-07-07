import { logger, metadata, task } from "@trigger.dev/sdk";
import { generateObject, APICallError } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { mutateFlow, type MutableFlow } from "@liveblocks/react-flow/node";

import { getLiveblocksClient } from "@/lib/liveblocks";
import { NODE_COLORS, NODE_SHAPES, canvasNode, canvasEdge } from "@/types/canvas";

interface DesignAgentPayload {
  prompt: string;
  roomId: string;
}

// The label the AI collaborator presents itself as, matching the "Ghost AI"
// persona used across the workspace UI.
const AI_LABEL = "Ghost AI";

// The Gemini model to drive the agent. Configurable via env so we can point at
// a model our billing/quota covers without a redeploy. Mirrors the spec
// generator's `GOOGLE_AI_MODEL` convention.
const GOOGLE_AI_MODEL = process.env.GOOGLE_AI_MODEL ?? "gemini-2.5-flash";

// Left-to-right layout spacing rules the model is asked to follow. Kept here so
// the applied fallback layout stays consistent with the prompt guidance.
const COLUMN_SPACING = 260;
const ROW_SPACING = 150;

/**
 * The set of canvas actions the AI may emit. Kept as a single flat object (with
 * a `type` discriminator and optional fields) rather than a discriminated union
 * because model structured-output support is more reliable with flat object
 * schemas.
 */
const actionSchema = z.object({
  type: z.enum([
    "addNode",
    "moveNode",
    "resizeNode",
    "updateNodeData",
    "deleteNode",
    "addEdge",
    "deleteEdge",
  ]),
  id: z
    .string()
    .describe("Stable identifier of the node or edge this action targets."),
  label: z
    .string()
    .nullish()
    .describe("Node or edge label text (for addNode/updateNodeData/addEdge)."),
  shape: z
    .enum(["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"])
    .nullish()
    .describe(
      "Node shape. rectangle=generic, pill=service/process, cylinder=database/storage, diamond=decision/gateway, circle=event/endpoint, hexagon=external system."
    ),
  colorIndex: z
    .number()
    .int()
    .nullish()
    .describe("Index (0-7) into the fixed node color palette."),
  x: z.number().nullish().describe("Canvas X position (addNode/moveNode)."),
  y: z.number().nullish().describe("Canvas Y position (addNode/moveNode)."),
  width: z.number().nullish().describe("Node width (addNode/resizeNode)."),
  height: z.number().nullish().describe("Node height (addNode/resizeNode)."),
  source: z.string().nullish().describe("Source node id (addEdge)."),
  target: z.string().nullish().describe("Target node id (addEdge)."),
});

const designSchema = z.object({
  summary: z
    .string()
    .describe("A short, friendly one-paragraph summary of the design produced."),
  actions: z
    .array(actionSchema)
    .describe("Ordered list of canvas mutations to apply."),
});

type DesignAction = z.infer<typeof actionSchema>;

/**
 * True when a failure is a provider quota / rate-limit (HTTP 429) error. These
 * are permanent for the current API key until billing/quota is fixed, so we
 * surface a distinct, actionable status instead of a generic "try again".
 */
function isQuotaError(error: unknown): boolean {
  if (APICallError.isInstance(error) && error.statusCode === 429) return true;
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted")
  );
}

function clampColorIndex(index: number | null | undefined): number {
  if (typeof index !== "number" || Number.isNaN(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), NODE_COLORS.length - 1);
}

function normalizeShape(shape: string | null | undefined): canvasNode["data"]["shape"] {
  if (shape && (NODE_SHAPES as string[]).includes(shape)) {
    return shape as canvasNode["data"]["shape"];
  }
  return "rectangle";
}

// Sensible default dimensions per shape so generated nodes look balanced even
// when the model omits width/height.
function defaultDimensions(
  shape: canvasNode["data"]["shape"],
  width: number | null | undefined,
  height: number | null | undefined
): { width: number; height: number } {
  const base: Record<canvasNode["data"]["shape"], { width: number; height: number }> = {
    rectangle: { width: 180, height: 80 },
    pill: { width: 190, height: 70 },
    cylinder: { width: 150, height: 100 },
    diamond: { width: 130, height: 130 },
    circle: { width: 120, height: 120 },
    hexagon: { width: 170, height: 100 },
  };
  const fallback = base[shape];
  return {
    width: typeof width === "number" && width > 0 ? width : fallback.width,
    height: typeof height === "number" && height > 0 ? height : fallback.height,
  };
}

const SYSTEM_PROMPT = `You are Ghost AI, a system-design architect that maps a user's plain-English description onto a collaborative diagram canvas.

You respond ONLY by producing a list of canvas actions plus a short summary.

Node shapes (use the right shape for each component):
- rectangle: generic component or module
- pill: a service or running process (API, worker, gateway)
- cylinder: a database, cache, or storage system
- diamond: a decision point or gateway
- circle: an event, trigger, or endpoint
- hexagon: an external system or boundary (third-party API, client app)

Color palette — set colorIndex (0-7) to group related components:
0 neutral (default), 1 blue, 2 purple, 3 orange, 4 red, 5 pink, 6 green, 7 teal.

Layout & spacing rules (STRICT):
- Lay the architecture out LEFT-TO-RIGHT: upstream/entry components on the left, downstream/storage on the right.
- Place each logical stage in its own column. Columns are ~${COLUMN_SPACING}px apart on the X axis.
- Stack components within the same stage vertically, ~${ROW_SPACING}px apart on the Y axis.
- Never overlap nodes. Start the first column near x=0, y=0.
- Keep node ids short, unique, lowercase-kebab (e.g. "api-gateway", "orders-db").

Edges:
- Add an edge for every meaningful connection/dependency. Edge id must be unique (e.g. "api-gateway__orders-db").
- source/target must reference node ids that exist (either already on the canvas or added in this same response).

Rules:
- Prefer extending the CURRENT canvas rather than duplicating existing components. Reference existing node ids when connecting to them.
- Only emit deleteNode/deleteEdge/moveNode/resizeNode/updateNodeData for ids that already exist on the current canvas.
- Keep the design focused and readable — usually 4-10 nodes unless the user asks for more.`;

export const designAgentTask = task({
  id: "design-agent",
  // AI generation is not safely idempotent (a retry would re-apply mutations),
  // so keep retries minimal and handle failures gracefully inside the run.
  retry: { maxAttempts: 1 },
  run: async (payload: DesignAgentPayload) => {
    const { prompt, roomId } = payload;
    logger.log("Design agent started", { roomId, prompt });

    const client = getLiveblocksClient();

    // Helper: broadcast an AI status message to every participant in the room.
    const publishStatus = async (
      phase: "started" | "processing" | "completed" | "error",
      message: string
    ) => {
      metadata.set("phase", phase).set("message", message);
      try {
        // AI_STATUS is the `ai-status-feed` payload: a lifecycle phase plus the
        // human-readable status text (see aiStatusMessageSchema in types/tasks).
        await client.broadcastEvent(roomId, { type: "AI_STATUS", phase, text: message });
      } catch (error) {
        logger.warn("Failed to broadcast AI status", { error: String(error) });
      }
    };

    // Helper: update the shared AI presence (thinking state + cursor position).
    const publishPresence = async (
      active: boolean,
      thinking: boolean,
      cursor: { x: number; y: number } | null
    ) => {
      try {
        await client.broadcastEvent(roomId, {
          type: "AI_PRESENCE",
          active,
          thinking,
          cursor,
          label: AI_LABEL,
        });
      } catch (error) {
        logger.warn("Failed to broadcast AI presence", { error: String(error) });
      }
    };

    try {
      metadata.set("progress", 5);
      await publishStatus("started", "Ghost AI is reading your prompt…");
      await publishPresence(true, true, { x: 0, y: 0 });

      // 1. Read the current canvas state so the model can extend/modify it.
      let currentNodes: readonly canvasNode[] = [];
      let currentEdges: readonly canvasEdge[] = [];
      await mutateFlow<canvasNode, canvasEdge>({ client, roomId }, (flow) => {
        currentNodes = flow.nodes;
        currentEdges = flow.edges;
      });

      const canvasContext = {
        nodes: currentNodes.map((node) => ({
          id: node.id,
          label: node.data?.label ?? "",
          shape: node.data?.shape ?? "rectangle",
          position: node.position,
        })),
        edges: currentEdges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.data?.label ?? "",
        })),
      };

      metadata.set("progress", 25);
      await publishStatus("processing", "Ghost AI is designing the architecture…");

      // 2. Interpret the prompt with Gemini into structured canvas actions.
      const google = createGoogleGenerativeAI({
        apiKey:
          process.env.GOOGLE_AI_API_KEY ??
          process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });

      const { object } = await generateObject({
        model: google(GOOGLE_AI_MODEL),
        schema: designSchema,
        system: SYSTEM_PROMPT,
        prompt: `User request:\n"""${prompt}"""\n\nCurrent canvas (JSON):\n${JSON.stringify(
          canvasContext
        )}\n\nProduce the canvas actions to fulfil the request.`,
        // Quota/billing (429) failures are permanent for the current key, so the
        // AI SDK's default retries (3 attempts w/ backoff) only burn compute
        // waiting on an error that won't recover. Fail fast; Trigger.dev's own
        // retry policy (maxAttempts: 1 here) governs any true transient retry.
        maxRetries: 1,
      });

      const actions = object.actions ?? [];
      logger.log("Design agent generated actions", {
        count: actions.length,
        summary: object.summary,
      });

      // Move the AI cursor near where the new work is happening.
      const addNodeActions = actions.filter((a) => a.type === "addNode");
      const centroid = computeCentroid(addNodeActions);
      metadata.set("progress", 60);
      await publishStatus(
        "processing",
        `Ghost AI is drawing ${actions.length} update${actions.length === 1 ? "" : "s"}…`
      );
      await publishPresence(true, true, centroid);

      // 3. Apply the actions through the shared collaborative flow.
      let applied = 0;
      await mutateFlow<canvasNode, canvasEdge>({ client, roomId }, (flow) => {
        const knownNodeIds = new Set(flow.nodes.map((n) => n.id));

        for (const action of actions) {
          try {
            applied += applyAction(flow, action, knownNodeIds) ? 1 : 0;
          } catch (error) {
            logger.warn("Skipped invalid AI action", {
              action,
              error: String(error),
            });
          }
        }
      });

      metadata.set("progress", 100);
      await publishStatus(
        "completed",
        object.summary || "Ghost AI finished updating the canvas."
      );

      logger.log("Design agent completed", { applied });

      return {
        ok: true as const,
        summary: object.summary,
        actionsApplied: applied,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error while designing.";
      const quotaExceeded = isQuotaError(error);
      logger.error("Design agent failed", { error: message, quotaExceeded });
      await publishStatus(
        "error",
        quotaExceeded
          ? "Ghost AI is out of API quota — check the Gemini API billing/plan and try again."
          : "Ghost AI couldn't complete the design. Please try again."
      );
      return {
        ok: false as const,
        error: message,
        quotaExceeded,
      };
    } finally {
      // Always clear AI presence so the ghost cursor/thinking indicator
      // disappears for all participants once the task finishes.
      await publishPresence(false, false, null);
    }
  },
});

/**
 * Applies a single AI action to the mutable flow. Returns true if a mutation was
 * performed. Invalid references (e.g. editing a non-existent node) are ignored.
 */
function applyAction(
  flow: MutableFlow<canvasNode, canvasEdge>,
  action: DesignAction,
  knownNodeIds: Set<string>
): boolean {
  switch (action.type) {
    case "addNode": {
      const shape = normalizeShape(action.shape);
      const { width, height } = defaultDimensions(shape, action.width, action.height);
      const node: canvasNode = {
        id: action.id,
        type: "canvasNode",
        position: { x: action.x ?? 0, y: action.y ?? 0 },
        width,
        height,
        data: {
          label: action.label ?? "",
          color: NODE_COLORS[clampColorIndex(action.colorIndex)],
          shape,
        },
      };
      flow.addNode(node);
      knownNodeIds.add(action.id);
      return true;
    }

    case "moveNode": {
      const existing = flow.getNode(action.id);
      if (!existing) return false;
      flow.updateNode(action.id, {
        position: {
          x: action.x ?? existing.position.x,
          y: action.y ?? existing.position.y,
        },
      });
      return true;
    }

    case "resizeNode": {
      const existing = flow.getNode(action.id);
      if (!existing) return false;
      flow.updateNode(action.id, {
        width: action.width ?? existing.width,
        height: action.height ?? existing.height,
      });
      return true;
    }

    case "updateNodeData": {
      if (!flow.getNode(action.id)) return false;
      const partial: Partial<canvasNode["data"]> = {};
      if (action.label != null) partial.label = action.label;
      if (action.colorIndex != null) {
        partial.color = NODE_COLORS[clampColorIndex(action.colorIndex)];
      }
      if (Object.keys(partial).length === 0) return false;
      flow.updateNodeData(action.id, partial);
      return true;
    }

    case "deleteNode": {
      if (!flow.getNode(action.id)) return false;
      // Cascade-remove any edges connected to this node to avoid dangling edges.
      const connectedEdgeIds = flow.edges
        .filter((edge) => edge.source === action.id || edge.target === action.id)
        .map((edge) => edge.id);
      if (connectedEdgeIds.length > 0) {
        flow.removeEdges(connectedEdgeIds);
      }
      flow.removeNode(action.id);
      knownNodeIds.delete(action.id);
      return true;
    }

    case "addEdge": {
      const source = action.source;
      const target = action.target;
      if (!source || !target) return false;
      if (!knownNodeIds.has(source) || !knownNodeIds.has(target)) return false;
      const edge: canvasEdge = {
        id: action.id,
        source,
        target,
        // Match the left-to-right layout: exit from the right, enter on the left.
        sourceHandle: "r",
        targetHandle: "l-target",
        type: "canvasEdge",
        data: { label: action.label ?? "" },
      };
      flow.addEdge(edge);
      return true;
    }

    case "deleteEdge": {
      if (!flow.getEdge(action.id)) return false;
      flow.removeEdge(action.id);
      return true;
    }

    default:
      return false;
  }
}

function computeCentroid(
  addNodeActions: DesignAction[]
): { x: number; y: number } {
  const points = addNodeActions
    .map((a) => ({ x: a.x ?? 0, y: a.y ?? 0 }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}
