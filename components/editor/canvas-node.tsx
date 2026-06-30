"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { CanvasNodeData } from "@/types/canvas";

export function CanvasNode({ data, selected }: NodeProps) {
  // Safe cast data to CanvasNodeData
  const nodeData = data as unknown as CanvasNodeData;
  const fill = nodeData?.color?.fill || "#1F1F1F";
  const text = nodeData?.color?.text || "#EDEDED";

  return (
    <div
      className="group relative flex h-full w-full items-center justify-center rounded-xl border text-center transition-all duration-200"
      style={{
        backgroundColor: fill,
        color: text,
        borderColor: selected ? "var(--accent-primary)" : "var(--border-default)",
        boxShadow: selected ? "0 0 12px var(--accent-primary-dim)" : "none",
      }}
    >
      <div className="px-4 py-3 text-sm font-medium tracking-wide select-none break-words max-w-full truncate">
        {nodeData?.label || (
          <span className="text-copy-muted font-normal italic opacity-40">
            [Empty Label]
          </span>
        )}
      </div>

      {/* Connection Handles on 4 sides (Top, Right, Bottom, Left) */}
      <Handle
        type="source"
        position={Position.Top}
        id="t"
        className="opacity-0 group-hover:opacity-100 transition-all duration-150 !bg-white hover:!bg-brand !border-0 !w-2.5 !h-2.5 hover:!scale-125 !shadow-md cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r"
        className="opacity-0 group-hover:opacity-100 transition-all duration-150 !bg-white hover:!bg-brand !border-0 !w-2.5 !h-2.5 hover:!scale-125 !shadow-md cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        className="opacity-0 group-hover:opacity-100 transition-all duration-150 !bg-white hover:!bg-brand !border-0 !w-2.5 !h-2.5 hover:!scale-125 !shadow-md cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="l"
        className="opacity-0 group-hover:opacity-100 transition-all duration-150 !bg-white hover:!bg-brand !border-0 !w-2.5 !h-2.5 hover:!scale-125 !shadow-md cursor-crosshair"
      />
    </div>
  );
}
