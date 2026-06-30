"use client";

import * as React from "react";
import { LayoutGrid, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CANVAS_TEMPLATES, CanvasTemplate } from "./starter-templates";

interface StarterTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (template: CanvasTemplate) => void;
}

function truncateLabel(label: string, width: number): string {
  const limit = Math.floor(width / 9.5);
  if (label.length <= limit) return label;
  return label.substring(0, limit - 3) + "...";
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  // Calculate bounding box of all nodes
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  template.nodes.forEach((node) => {
    const x = node.position.x;
    const y = node.position.y;
    const w = node.width || 100;
    const h = node.height || 60;

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  });

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 500;
    maxY = 300;
  }

  // Add padding around content
  const padding = 40;
  const viewX = minX - padding;
  const viewY = minY - padding;
  const viewWidth = (maxX - minX) + padding * 2;
  const viewHeight = (maxY - minY) + padding * 2;

  return (
    <div className="relative w-full h-40 bg-base rounded-xl overflow-hidden border border-default p-2 flex items-center justify-center group-hover:border-brand/35 transition-colors duration-300 shadow-inner">
      <svg
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        className="w-full h-full max-h-[140px] select-none pointer-events-none"
      >
        <defs>
          {/* Dotted pattern background inside the SVG grid */}
          <pattern
            id={`preview-grid-${template.id}`}
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="0.75" fill="var(--border-subtle)" opacity="0.35" />
          </pattern>
          {/* Arrowhead marker for connection lines */}
          <marker
            id={`preview-arrow-${template.id}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" opacity="0.4" />
          </marker>
        </defs>

        {/* Fill SVG background with grid */}
        <rect
          x={viewX - 100}
          y={viewY - 100}
          width={viewWidth + 200}
          height={viewHeight + 200}
          fill={`url(#preview-grid-${template.id})`}
        />

        {/* Draw Edges */}
        {template.edges.map((edge) => {
          const sourceNode = template.nodes.find((n) => n.id === edge.source);
          const targetNode = template.nodes.find((n) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          const sW = sourceNode.width || 100;
          const sH = sourceNode.height || 60;
          const tW = targetNode.width || 100;
          const tH = targetNode.height || 60;

          // Compute centers
          const sx = sourceNode.position.x + sW / 2;
          const sy = sourceNode.position.y + sH / 2;
          const tx = targetNode.position.x + tW / 2;
          const ty = targetNode.position.y + tH / 2;

          // Calculate line length and unit vector
          const dx = tx - sx;
          const dy = ty - sy;
          const len = Math.sqrt(dx * dx + dy * dy);

          // Calculate node radius offset so edge arrow hits the boundary cleanly
          const sOffset = sourceNode.data.shape === "circle" ? sW / 2 : 12;
          const tOffset = targetNode.data.shape === "circle" ? tW / 2 + 5 : 20;

          const startX = len > 0 ? sx + (dx / len) * sOffset : sx;
          const startY = len > 0 ? sy + (dy / len) * sOffset : sy;
          const endX = len > 0 ? tx - (dx / len) * tOffset : tx;
          const endY = len > 0 ? ty - (dy / len) * tOffset : ty;

          return (
            <g key={edge.id}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="var(--border-subtle)"
                strokeWidth={1.5}
                opacity={0.8}
                markerEnd={`url(#preview-arrow-${template.id})`}
              />
              {edge.data?.label && (
                <g transform={`translate(${(sx + tx) / 2}, ${(sy + ty) / 2})`}>
                  <rect
                    x={-18}
                    y={-5}
                    width={36}
                    height={10}
                    rx={2}
                    fill="var(--bg-base)"
                    stroke="var(--border-default)"
                    strokeWidth={0.5}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--text-muted)"
                    fontSize={5}
                    fontWeight="500"
                  >
                    {edge.data.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Draw Nodes */}
        {template.nodes.map((node) => {
          const { x, y } = node.position;
          const w = node.width || 100;
          const h = node.height || 60;
          const fill = node.data.color.fill;
          const textColor = node.data.color.text;
          const stroke = "var(--border-subtle)";
          const shape = node.data.shape;

          let shapeSvg = null;

          if (shape === "circle") {
            shapeSvg = (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={9999}
                ry={9999}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.2}
              />
            );
          } else if (shape === "pill") {
            shapeSvg = (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={9999}
                ry={9999}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.2}
              />
            );
          } else if (shape === "diamond") {
            shapeSvg = (
              <polygon
                points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.2}
              />
            );
          } else if (shape === "hexagon") {
            const paddingX = w * 0.15;
            shapeSvg = (
              <polygon
                points={`${x + paddingX},${y} ${x + w - paddingX},${y} ${x + w},${y + h / 2} ${x + w - paddingX},${y + h} ${x + paddingX},${y + h} ${x},${y + h / 2}`}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.2}
              />
            );
          } else if (shape === "cylinder") {
            const cylH = h * 0.15;
            shapeSvg = (
              <g>
                <path
                  d={`M ${x},${y + cylH} L ${x},${y + h - cylH} A ${w / 2},${cylH} 0 0 0 ${x + w},${y + h - cylH} L ${x + w},${y + cylH} Z`}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.2}
                />
                <ellipse
                  cx={x + w / 2}
                  cy={y + cylH}
                  rx={w / 2}
                  ry={cylH}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.2}
                />
              </g>
            );
          } else {
            // Default rectangle
            shapeSvg = (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={8}
                ry={8}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.2}
              />
            );
          }

          return (
            <g key={node.id}>
              {shapeSvg}
              <text
                x={x + w / 2}
                y={y + h / 2}
                fill={textColor}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={7}
                fontWeight="600"
                fontFamily="var(--font-geist-sans), sans-serif"
              >
                {truncateLabel(node.data.label, w)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function StarterTemplatesModal({
  isOpen,
  onClose,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="rounded-3xl border border-default bg-surface max-w-5xl md:max-w-6xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-brand" />
            <DialogTitle className="text-copy-primary font-semibold text-lg">
              Starter Templates
            </DialogTitle>
          </div>
          <DialogDescription className="text-copy-muted text-sm">
            Select a prebuilt diagram template to populate your workspace canvas.
          </DialogDescription>
        </DialogHeader>

        {/* Warning Indicator */}
        <div className="flex items-start gap-3.5 rounded-2xl bg-state-warning/5 border border-state-warning/15 p-4 my-2 text-xs text-state-warning/90 backdrop-blur-sm shadow-lg shadow-black/25">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Destructive Action Warning</span>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Importing a template will **completely clear** all current nodes and edges on your canvas. This change is synchronized for all active collaborators.
            </p>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3">
          {CANVAS_TEMPLATES.map((template) => (
            <div
              key={template.id}
              onClick={() => onImport(template)}
              className="flex flex-col gap-4 rounded-2xl bg-elevated/30 border border-default p-5 hover:border-brand/50 hover:bg-elevated/80 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand/5 group cursor-pointer relative overflow-hidden"
            >
              {/* Preview */}
              <TemplatePreview template={template} />

              {/* Title & Description */}
              <div className="flex-1 flex flex-col gap-1.5">
                <h4 className="text-sm font-semibold text-copy-primary group-hover:text-brand transition-colors duration-200">
                  {template.name}
                </h4>
                <p className="text-[11px] text-copy-muted leading-relaxed">
                  {template.description}
                </p>
              </div>

              {/* Import Action Button */}
              <Button
                size="sm"
                className="w-full bg-elevated hover:bg-subtle text-copy-primary border border-default text-xs rounded-xl h-9 font-semibold mt-2 transition-all duration-300 group-hover:bg-brand group-hover:text-black group-hover:border-transparent group-hover:shadow-md group-hover:shadow-brand/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onImport(template);
                }}
              >
                Import Template
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
