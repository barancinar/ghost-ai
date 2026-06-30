"use client";

import React from "react";
import {
  Square,
  Diamond,
  Circle,
  Pill,
  Cylinder,
  Hexagon,
} from "lucide-react";
import { NodeShape } from "@/types/canvas";

interface ShapeConfig {
  type: NodeShape;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultWidth: number;
  defaultHeight: number;
}

const SHAPES: ShapeConfig[] = [
  {
    type: "rectangle",
    label: "Rectangle",
    icon: Square,
    defaultWidth: 150,
    defaultHeight: 80,
  },
  {
    type: "diamond",
    label: "Diamond (Decision)",
    icon: Diamond,
    defaultWidth: 120,
    defaultHeight: 120,
  },
  {
    type: "circle",
    label: "Circle (Event/Endpoint)",
    icon: Circle,
    defaultWidth: 90,
    defaultHeight: 90,
  },
  {
    type: "pill",
    label: "Pill (Service)",
    icon: Pill,
    defaultWidth: 140,
    defaultHeight: 60,
  },
  {
    type: "cylinder",
    label: "Cylinder (Database)",
    icon: Cylinder,
    defaultWidth: 100,
    defaultHeight: 120,
  },
  {
    type: "hexagon",
    label: "Hexagon (External)",
    icon: Hexagon,
    defaultWidth: 120,
    defaultHeight: 100,
  },
];

function createDragPreview(shape: NodeShape, width: number, height: number): HTMLElement {
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.top = "-9999px";
  el.style.left = "-9999px";
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.pointerEvents = "none";
  el.style.opacity = "0.6";

  const isSvg = shape === "diamond" || shape === "hexagon" || shape === "cylinder";

  if (isSvg) {
    el.style.backgroundColor = "transparent";
    let svgContent = "";
    if (shape === "diamond") {
      svgContent = `<polygon points="50,2 98,50 50,98 2,50" fill="#1F1F1F" stroke="var(--border-default)" stroke-width="1.5" vector-effect="non-scaling-stroke" />`;
    } else if (shape === "hexagon") {
      svgContent = `<polygon points="25,2 75,2 98,50 75,98 25,98 2,50" fill="#1F1F1F" stroke="var(--border-default)" stroke-width="1.5" vector-effect="non-scaling-stroke" />`;
    } else if (shape === "cylinder") {
      svgContent = `
        <path d="M 2,15 L 2,85 A 48,13 0 0 0 98,85 L 98,15 Z" fill="#1F1F1F" stroke="var(--border-default)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
        <ellipse cx="50" cy="15" rx="48" ry="13" fill="#1F1F1F" stroke="var(--border-default)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
      `;
    }
    el.innerHTML = `
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" style="display: block;">
        ${svgContent}
      </svg>
    `;
  } else {
    // CSS shape
    el.style.backgroundColor = "#1F1F1F";
    el.style.border = "1.5px solid var(--border-default)";
    if (shape === "circle" || shape === "pill") {
      el.style.borderRadius = "9999px";
    } else {
      el.style.borderRadius = "0.75rem"; // rounded-xl
    }
  }

  return el;
}

export function ShapePanel() {
  const handleDragStart = (
    event: React.DragEvent,
    shape: NodeShape,
    width: number,
    height: number
  ) => {
    const payload = JSON.stringify({ type: shape, width, height });
    event.dataTransfer.setData("application/reactflow-shape", payload);
    event.dataTransfer.effectAllowed = "move";

    // Create and configure a temporary drag image
    const ghostElement = createDragPreview(shape, width, height);
    document.body.appendChild(ghostElement);
    event.dataTransfer.setDragImage(ghostElement, width / 2, height / 2);

    // Clean up element on next tick once captured
    setTimeout(() => {
      if (document.body.contains(ghostElement)) {
        document.body.removeChild(ghostElement);
      }
    }, 0);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-elevated/95 backdrop-blur-md border border-default px-3 py-1.5 rounded-full shadow-2xl shadow-black/80 select-none">
      {SHAPES.map(({ type, label, icon: Icon, defaultWidth, defaultHeight }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => handleDragStart(e, type, defaultWidth, defaultHeight)}
          title={`Drag ${label} onto the canvas`}
          className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full text-copy-secondary hover:text-brand hover:bg-subtle hover:scale-110 active:scale-95 active:cursor-grabbing transition-all duration-150"
        >
          <Icon className="h-5 w-5" />
        </div>
      ))}
    </div>
  );
}
