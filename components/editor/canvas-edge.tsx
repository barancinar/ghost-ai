"use client";

import React, { useState, useRef, useEffect } from "react";
import { EdgeProps, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import { canvasEdge } from "@/types/canvas";

export function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  selected = false,
  data,
}: EdgeProps<canvasEdge>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(data?.label || "");
  const [width, setWidth] = useState(60);
  const spanRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const label = data?.label || "";
  const updateLabel = data?.updateLabel;

  // Calculate the smooth step path and its midpoint
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Synchronize input value with label updates when not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(label);
    }
  }, [label, isEditing]);

  // Focus and select text when entering editing mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Auto-grow input width based on content
  useEffect(() => {
    if (spanRef.current) {
      // Add extra padding space
      setWidth(Math.max(60, spanRef.current.offsetWidth + 16));
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

  const saveLabel = () => {
    if (!isEditingRef.current) return;
    isEditingRef.current = false;
    setIsEditing(false);
    if (updateLabel && inputValue !== label) {
      updateLabel(inputValue);
    }
  };

  const handleBlur = () => {
    saveLabel();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveLabel();
      e.preventDefault();
    } else if (e.key === "Escape") {
      isEditingRef.current = false;
      setIsEditing(false);
      setInputValue(label);
      e.preventDefault();
    }
    e.stopPropagation();
  };

  const isHighlighted = selected || isHovered;
  
  // Custom edge style details
  const strokeColor = isHighlighted ? "var(--accent-primary)" : "var(--text-secondary)";
  const strokeOpacity = isHighlighted ? 1.0 : 0.4;
  const markerEnd = isHighlighted ? "url(#arrow-active)" : "url(#arrow-dim)";

  return (
    <>
      {/* Background group container to capture hovers */}
      <g
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={handleDoubleClick}
      >
        {/* Visible Path */}
        <path
          id={id}
          style={{
            ...style,
            stroke: strokeColor,
            strokeOpacity,
            strokeWidth: 2,
          }}
          className="react-flow__edge-path transition-colors duration-200"
          d={edgePath}
          markerEnd={markerEnd}
          strokeLinecap="round"
        />

        {/* Interaction Path (thick, transparent, easy to click) */}
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={15}
          className="react-flow__edge-interaction cursor-pointer"
        />
      </g>

      {/* Label Renderer */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan nowheel z-50 select-none"
          // Stop propagation of events to prevent canvas zoom/pan/drag
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <div className="relative">
              {/* Hidden span to measure width */}
              <span
                ref={spanRef}
                className="absolute invisible whitespace-pre px-2.5 py-1 text-xs font-medium"
              >
                {inputValue || "Add label..."}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                style={{ width }}
                className="bg-subtle text-primary border border-brand rounded-full px-2.5 py-1 text-xs font-medium text-center outline-none focus:ring-1 focus:ring-brand shadow-lg"
                placeholder="Add label..."
              />
            </div>
          ) : label ? (
            <div
              onDoubleClick={handleDoubleClick}
              className="bg-subtle text-primary border border-default rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer shadow-md select-none hover:border-brand hover:scale-105 transition-all duration-150"
            >
              {label}
            </div>
          ) : isHighlighted ? (
            <div
              onDoubleClick={handleDoubleClick}
              className="bg-subtle/80 text-muted border border-dashed border-subtle rounded-full px-2.5 py-0.5 text-xs font-normal cursor-pointer select-none hover:border-brand hover:text-primary transition-all duration-150 opacity-70 hover:opacity-100"
            >
              Add label
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
