"use client";

import React, { useState, useEffect, useRef } from "react";
import { Handle, Position, NodeProps, NodeResizer } from "@xyflow/react";
import { CanvasNodeData, NODE_COLORS } from "@/types/canvas";

export function CanvasNode({ data, selected }: NodeProps) {
  // Safe cast data to CanvasNodeData
  const nodeData = data as unknown as CanvasNodeData;
  const fill = nodeData?.color?.fill || "#1F1F1F";
  const text = nodeData?.color?.text || "#EDEDED";
  const shape = nodeData?.shape || "rectangle";

  const isSvgShape = shape === "diamond" || shape === "hexagon" || shape === "cylinder";
  const borderColor = selected ? "var(--accent-primary)" : "var(--border-default)";
  const strokeWidth = selected ? 2 : 1.5;

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(nodeData?.label || "");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateLabel = nodeData?.updateLabel as ((label: string) => void) | undefined;
  const updateColor = nodeData?.updateColor as ((color: { fill: string; text: string }) => void) | undefined;

  const activeColorIndex = NODE_COLORS.findIndex(
    (c) => c.fill.toLowerCase() === fill.toLowerCase()
  );

  // Synchronize input value with label updates when not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(nodeData?.label || "");
    }
  }, [nodeData?.label, isEditing]);

  // Focus and select text when entering editing mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // Auto-grow textarea height based on content
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue, isEditing]);

  const isEditingRef = useRef(false);

  const startEditing = () => {
    isEditingRef.current = true;
    setIsEditing(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startEditing();
  };

  const handleBlur = () => {
    if (!isEditingRef.current) return;
    isEditingRef.current = false;
    setIsEditing(false);
    if (updateLabel && inputValue !== nodeData?.label) {
      updateLabel(inputValue);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      isEditingRef.current = false;
      setIsEditing(false);
      setInputValue(nodeData?.label || "");
      e.preventDefault();
    } else if (e.key === "Enter" && !e.shiftKey) {
      isEditingRef.current = false;
      setIsEditing(false);
      if (updateLabel && inputValue !== nodeData?.label) {
        updateLabel(inputValue);
      }
      e.preventDefault();
    }
    e.stopPropagation();
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="group relative flex h-full w-full items-center justify-center text-center transition-all duration-200"
      style={{
        color: text,
      }}
    >
      {/* Node Resize Controls */}
      <NodeResizer
        isVisible={selected && !isEditing}
        minWidth={60}
        minHeight={40}
        handleClassName="hover:bg-brand! transition-colors"
        handleStyle={{
          width: "8px",
          height: "8px",
          backgroundColor: "var(--bg-base)",
          border: "1px solid var(--accent-primary)",
          borderRadius: "2px",
        }}
        lineStyle={{
          border: "1px dashed rgba(0, 200, 212, 0.4)",
        }}
      />

      {/* Floating Color Toolbar */}
      {selected && !isEditing && (
        <div
          className="nodrag nopan nowheel absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-xl border border-default bg-elevated p-1.5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          {NODE_COLORS.map((color, index) => {
            const isActive = index === activeColorIndex || (activeColorIndex === -1 && index === 0);
            const isHovered = hoveredIndex === index;

            return (
              <button
                key={index}
                type="button"
                onClick={() => updateColor?.(color)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="h-5 w-5 rounded-full border transition-all duration-200 focus:outline-none relative cursor-pointer"
                style={{
                  backgroundColor: color.fill,
                  borderColor: isActive
                    ? "var(--accent-primary)"
                    : isHovered
                    ? color.text
                    : "rgba(255, 255, 255, 0.15)",
                  boxShadow: isActive
                    ? `0 0 6px ${color.text}`
                    : isHovered
                    ? `0 0 8px ${color.text}80`
                    : "none",
                  transform: isHovered ? "scale(1.15)" : "scale(1)",
                }}
                aria-label={`Select color pair ${index + 1}`}
              >
                {isActive && (
                  <span
                    className="absolute inset-1.5 rounded-full transition-all duration-200"
                    style={{ backgroundColor: color.text }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Visual background and shape container */}
      {isSvgShape ? (
        shape === "diamond" ? (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              filter: selected ? "drop-shadow(0 0 8px var(--accent-primary-dim))" : "none",
            }}
          >
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill={fill}
              stroke={borderColor}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              className="transition-all duration-200"
            />
          </svg>
        ) : shape === "hexagon" ? (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              filter: selected ? "drop-shadow(0 0 8px var(--accent-primary-dim))" : "none",
            }}
          >
            <polygon
              points="25,2 75,2 98,50 75,98 25,98 2,50"
              fill={fill}
              stroke={borderColor}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              className="transition-all duration-200"
            />
          </svg>
        ) : (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              filter: selected ? "drop-shadow(0 0 8px var(--accent-primary-dim))" : "none",
            }}
          >
            {/* Cylinder body */}
            <path
              d="M 2,15 L 2,85 A 48,13 0 0 0 98,85 L 98,15 Z"
              fill={fill}
              stroke={borderColor}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              className="transition-all duration-200"
            />
            {/* Cylinder top cap */}
            <ellipse
              cx="50"
              cy="15"
              rx="48"
              ry="13"
              fill={fill}
              stroke={borderColor}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              className="transition-all duration-200"
            />
          </svg>
        )
      ) : (
        <div
          className={`absolute inset-0 w-full h-full border transition-all duration-200 ${
            shape === "circle" || shape === "pill" ? "rounded-full" : "rounded-xl"
          }`}
          style={{
            backgroundColor: fill,
            borderColor,
            boxShadow: selected ? "0 0 12px var(--accent-primary-dim)" : "none",
          }}
        />
      )}

      {/* Centered label layer */}
      <div
        className={`absolute inset-0 flex items-center justify-center p-3 ${
          isEditing ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="nodrag nopan nowheel w-full bg-transparent resize-none outline-none border-0 text-center text-sm font-medium tracking-wide break-words focus:ring-0 focus:outline-none p-0 m-0"
            value={inputValue}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            placeholder="Type a label..."
            rows={1}
            style={{
              color: text,
              caretColor: text,
              maxWidth:
                shape === "diamond"
                  ? "65%"
                  : shape === "circle"
                  ? "75%"
                  : shape === "hexagon"
                  ? "80%"
                  : "90%",
              marginTop: shape === "cylinder" ? "8px" : "0px",
            }}
          />
        ) : (
          <div
            className="text-sm font-medium tracking-wide break-words max-w-full truncate select-none text-center"
            style={{
              maxWidth:
                shape === "diamond"
                  ? "65%"
                  : shape === "circle"
                  ? "75%"
                  : shape === "hexagon"
                  ? "80%"
                  : "90%",
              marginTop: shape === "cylinder" ? "8px" : "0px",
            }}
          >
            {nodeData?.label || (
              <span className="text-copy-muted font-normal italic opacity-40">
                [Empty Label]
              </span>
            )}
          </div>
        )}
      </div>

      {/* Connection Handles on 4 sides (Top, Right, Bottom, Left) */}
      <Handle
        type="source"
        position={Position.Top}
        id="t"
        className="opacity-0 group-hover:opacity-100 transition-all duration-150 bg-white! hover:bg-brand! border! border-[#080809]! w-2! h-2! hover:scale-125! shadow-md! cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r"
        className="opacity-0 group-hover:opacity-100 transition-all duration-150 bg-white! hover:bg-brand! border! border-[#080809]! w-2! h-2! hover:scale-125! shadow-md! cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        className="opacity-0 group-hover:opacity-100 transition-all duration-150 bg-white! hover:bg-brand! border! border-[#080809]! w-2! h-2! hover:scale-125! shadow-md! cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="l"
        className="opacity-0 group-hover:opacity-100 transition-all duration-150 bg-white! hover:bg-brand! border! border-[#080809]! w-2! h-2! hover:scale-125! shadow-md! cursor-crosshair"
      />
    </div>
  );
}
