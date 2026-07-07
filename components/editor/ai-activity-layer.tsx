"use client";

import React, { useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useEventListener } from "@liveblocks/react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

import {
  parseAiStatusMessage,
  defaultStatusText,
  type AiStatusPhase,
  type AiStatusMessage,
} from "@/types/tasks";

interface AiPresence {
  active: boolean;
  thinking: boolean;
  cursor: { x: number; y: number } | null;
  label: string;
}

/**
 * Renders the AI design agent's shared presence and status feed on the canvas so
 * that every participant (not just the person who prompted) sees the same thing.
 *
 * Both the AI cursor/thinking indicator and the status messages are driven by
 * Liveblocks room events broadcast from the Trigger.dev background task. This
 * intentionally mirrors the human presence/cursor flow rather than introducing a
 * separate state system.
 */
export function AiActivityLayer() {
  const { flowToScreenPosition } = useReactFlow();

  const [status, setStatus] = useState<AiStatusMessage | null>(null);
  const [presence, setPresence] = useState<AiPresence | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEventListener(({ event }) => {
    if (event.type === "AI_STATUS") {
      // Validate the shared feed payload before rendering it.
      const parsed = parseAiStatusMessage(event);
      if (!parsed) return;
      setStatus(parsed);

      // Auto-dismiss the toast a few seconds after a terminal phase.
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (parsed.phase === "completed" || parsed.phase === "error") {
        hideTimerRef.current = setTimeout(() => setStatus(null), 5000);
      }
    } else if (event.type === "AI_PRESENCE") {
      setPresence(event.active ? event : null);
    }
  });

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Convert the AI cursor's canvas-space coordinates to screen space so it pans
  // and zooms together with everyone else's view.
  const cursorScreen =
    presence?.cursor != null ? flowToScreenPosition(presence.cursor) : null;

  return (
    <>
      {/* AI ghost cursor + thinking indicator */}
      {presence?.active && cursorScreen && (
        <div
          className="pointer-events-none absolute z-50 select-none"
          style={{
            left: cursorScreen.x,
            top: cursorScreen.y,
            transform: "translate(-2px, -2px)",
            transition: "left 0.4s ease-out, top 0.4s ease-out",
          }}
        >
          <svg
            className="h-5 w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 2V19.5L8 14.1L12.5 22L15.5 20.2L11 12.3L17.5 12.3L2.5 2Z"
              fill="var(--accent-ai)"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className="absolute left-3.5 top-3.5 flex items-center gap-1 whitespace-nowrap rounded-md border border-white/20 px-2 py-0.5 text-[10px] font-medium text-white shadow-md"
            style={{ backgroundColor: "var(--accent-ai)" }}
          >
            {presence.thinking && (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            )}
            <span>{presence.label}</span>
          </div>
        </div>
      )}

      {/* Shared AI status feed */}
      {status && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-accent-ai/30 bg-elevated/95 px-3.5 py-2 shadow-lg shadow-black/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
            <StatusIcon phase={status.phase} />
            <span className="max-w-[320px] truncate text-xs font-medium text-copy-primary">
              {status.text ?? defaultStatusText(status.phase)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

function StatusIcon({ phase }: { phase: AiStatusPhase }) {
  if (phase === "completed") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-state-success" />;
  }
  if (phase === "error") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-state-error" />;
  }
  if (phase === "started") {
    return <Sparkles className="h-4 w-4 shrink-0 text-accent-ai" />;
  }
  return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-ai" />;
}
