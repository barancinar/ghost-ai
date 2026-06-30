"use client";

import React, { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionMode,
  useReactFlow,
} from "@xyflow/react";
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow";
import { CanvasNode } from "./canvas-node";
import { ShapePanel } from "./shape-panel";
import { NODE_COLORS, canvasNode, canvasEdge } from "@/types/canvas";

import "@xyflow/react/dist/style.css";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-flow/styles.css";

const nodeTypes = {
  canvasNode: CanvasNode,
};

export function CollaborativeCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useLiveblocksFlow<canvasNode, canvasEdge>({
    suspense: true,
    nodes: {
      initial: [],
    },
    edges: {
      initial: [],
    },
  });

  const { screenToFlowPosition } = useReactFlow();
  const nodeCounter = useRef(0);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const rawPayload = event.dataTransfer.getData("application/reactflow-shape");
      if (!rawPayload) return;

      try {
        const payload = JSON.parse(rawPayload);
        const { type, width, height } = payload;

        // Calculate position relative to flow coordinates, centering the shape on the drop point
        const position = screenToFlowPosition({
          x: event.clientX - width / 2,
          y: event.clientY - height / 2,
        });

        nodeCounter.current += 1;
        const timestamp = Date.now();
        const id = `${type}-${timestamp}-${nodeCounter.current}`;

        const newNode: canvasNode = {
          id,
          type: "canvasNode",
          position,
          width,
          height,
          style: {
            width,
            height,
          },
          data: {
            label: "",
            color: NODE_COLORS[0],
            shape: type,
          },
        };

        // Add the node via applyNodeChanges by passing "add" change type
        onNodesChange([{ type: "add", item: newNode }]);
      } catch (error) {
        console.error("Failed to parse shape payload on drop", error);
      }
    },
    [screenToFlowPosition, onNodesChange]
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{ width: "100%", height: "100%" }}
        className="w-full h-full"
        fitView
      >
        <Background variant={BackgroundVariant.Dots} color="var(--border-subtle)" gap={20} size={1} />
        <MiniMap
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border-default)",
          }}
          nodeColor={() => "var(--bg-subtle)"}
          maskColor="rgba(8, 8, 9, 0.7)"
        />
        <Cursors />
      </ReactFlow>
      <ShapePanel />
    </div>
  );
}
