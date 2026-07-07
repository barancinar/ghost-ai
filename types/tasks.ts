import { z } from "zod";

/**
 * Shared realtime AI activity contracts.
 *
 * These describe the payloads carried over the room-scoped Liveblocks
 * `ai-status-feed`. The feed surfaces AI progress/presence to *every*
 * participant in a room (not just the person who prompted), and is delivered
 * through Liveblocks room events broadcast from the Trigger.dev design agent —
 * so we don't stand up a parallel realtime system.
 *
 * The schema is intentionally generic: it carries a lifecycle `phase` plus an
 * optional human-readable `text`, so the same feed can back design generation
 * today and spec generation later.
 */

/** Name of the shared AI status feed (room event channel). */
export const AI_STATUS_FEED = "ai-status-feed" as const;

/** Lifecycle phase of a single AI status update. */
export const aiStatusPhaseSchema = z.enum([
  "started",
  "processing",
  "completed",
  "error",
]);

export type AiStatusPhase = z.infer<typeof aiStatusPhaseSchema>;

/**
 * Payload for a single `ai-status-feed` message. `text` is optional so the feed
 * stays generic across the different generators that publish to it.
 */
export const aiStatusMessageSchema = z.object({
  phase: aiStatusPhaseSchema,
  text: z.string().optional(),
});

export type AiStatusMessage = z.infer<typeof aiStatusMessageSchema>;

/**
 * Validate an untrusted feed payload before displaying it. Returns the parsed
 * message, or `null` when the payload is malformed.
 */
export function parseAiStatusMessage(input: unknown): AiStatusMessage | null {
  const result = aiStatusMessageSchema.safeParse(input);
  return result.success ? result.data : null;
}

/** Phases during which the AI is actively working (generation in progress). */
export function isActivePhase(phase: AiStatusPhase): boolean {
  return phase === "started" || phase === "processing";
}

/** Human-readable fallback text for a phase when a message omits `text`. */
export function defaultStatusText(phase: AiStatusPhase): string {
  switch (phase) {
    case "started":
      return "Ghost AI is getting started…";
    case "processing":
      return "Ghost AI is working…";
    case "completed":
      return "Ghost AI finished.";
    case "error":
      return "Ghost AI ran into a problem.";
  }
}

/* -------------------------------------------------------------------------- */
/*  Collaborative room chat (`ai-chat` feed)                                  */
/* -------------------------------------------------------------------------- */

/**
 * The `ai-chat` feed is a *separate*, room-scoped realtime channel for
 * human-to-human chat in the AI sidebar. It is intentionally kept distinct from
 * the `ai-status-feed` (AI progress/presence) — chat messages must never be
 * mixed with status messages. Like the status feed, it rides Liveblocks room
 * events so we don't stand up a parallel realtime system.
 */

/** Name of the collaborative chat feed (room event channel). */
export const AI_CHAT_FEED = "ai-chat" as const;

/** Author kind for a chat message. Only `user` is emitted today (no AI replies
 *  yet), but `assistant` is reserved so the shape can grow without a migration. */
export const aiChatRoleSchema = z.enum(["user", "assistant"]);

export type AiChatRole = z.infer<typeof aiChatRoleSchema>;

/**
 * Payload for a single `ai-chat` message. Carries who sent it (`sender`), the
 * author kind (`role`), the message `content`, and when it was sent
 * (`timestamp`, epoch ms). `id` is included so the UI can key/dedupe messages.
 */
export const aiChatMessageSchema = z.object({
  id: z.string().min(1),
  sender: z.string().min(1),
  role: aiChatRoleSchema,
  content: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
});

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

/**
 * Validate an untrusted chat payload before rendering it. Returns the parsed
 * message, or `null` when the payload is malformed.
 */
export function parseAiChatMessage(input: unknown): AiChatMessage | null {
  const result = aiChatMessageSchema.safeParse(input);
  return result.success ? result.data : null;
}
