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
