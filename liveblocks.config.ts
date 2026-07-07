// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
import type { AiStatusPhase, AiChatMessage } from "@/types/tasks";

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      cursor: { x: number; y: number } | null;
      thinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      // Example, a conflict-free list
      // animals: LiveList<string>;
    };

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener.
    // The AI design agent (running as a Trigger.dev background task) broadcasts
    // these events into the room so every connected participant sees the same
    // AI status feed and AI presence (thinking state + cursor), mirroring the
    // human presence/cursor flow.
    //
    // AI_STATUS is the payload of the shared `ai-status-feed`; its shape is
    // validated on receipt via `aiStatusMessageSchema` in `types/tasks.ts`.
    //
    // AI_CHAT is the payload of the separate, room-scoped `ai-chat` feed used
    // for collaborative human-to-human chat in the sidebar. It is kept distinct
    // from AI_STATUS so chat messages are never mixed with status messages; its
    // `message` is validated on receipt via `aiChatMessageSchema`.
    RoomEvent:
      | {
          type: "AI_STATUS";
          phase: AiStatusPhase;
          text?: string;
        }
      | {
          type: "AI_PRESENCE";
          active: boolean;
          thinking: boolean;
          cursor: { x: number; y: number } | null;
          label: string;
        }
      | {
          type: "AI_CHAT";
          message: AiChatMessage;
        };

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: {
      // Example, attaching coordinates to a thread
      // x: number;
      // y: number;
    };

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: {
      // Example, rooms with a title and url
      // title: string;
      // url: string;
    };
  }
}

export {};

