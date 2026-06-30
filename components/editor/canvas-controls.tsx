"use client";

import React from "react";
import { ZoomIn, ZoomOut, Maximize, Undo, Redo } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@liveblocks/react";
import { cn } from "@/lib/utils";

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <div 
      className="absolute bottom-24 left-6 z-10 flex items-center gap-1.5 bg-elevated/95 backdrop-blur-md border border-default px-3 py-1.5 rounded-full shadow-2xl shadow-black/80 select-none nodrag nopan nowheel pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Zoom Controls */}
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="flex h-8 w-8 items-center justify-center rounded-full text-copy-secondary hover:text-brand hover:bg-subtle hover:scale-105 active:scale-95 transition-all duration-150"
        title="Zoom Out (-)"
      >
        <ZoomOut className="h-4 w-4" />
      </button>

      <button
        onClick={() => fitView({ duration: 200 })}
        className="flex h-8 w-8 items-center justify-center rounded-full text-copy-secondary hover:text-brand hover:bg-subtle hover:scale-105 active:scale-95 transition-all duration-150"
        title="Fit View"
      >
        <Maximize className="h-4 w-4" />
      </button>

      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="flex h-8 w-8 items-center justify-center rounded-full text-copy-secondary hover:text-brand hover:bg-subtle hover:scale-105 active:scale-95 transition-all duration-150"
        title="Zoom In (+)"
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-default mx-1" />

      {/* History Controls */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150",
          canUndo
            ? "text-copy-secondary hover:text-brand hover:bg-subtle hover:scale-105 active:scale-95"
            : "text-copy-muted opacity-30 cursor-not-allowed"
        )}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </button>

      <button
        onClick={redo}
        disabled={!canRedo}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150",
          canRedo
            ? "text-copy-secondary hover:text-brand hover:bg-subtle hover:scale-105 active:scale-95"
            : "text-copy-muted opacity-30 cursor-not-allowed"
        )}
        title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </button>
    </div>
  );
}
