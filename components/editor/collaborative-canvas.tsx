"use client";

import React, { useCallback, useRef, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  ConnectionMode,
  useReactFlow,
  ConnectionLineType,
} from "@xyflow/react";
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow";
import { useUndo, useRedo } from "@liveblocks/react";
import { CanvasNode } from "./canvas-node";
import { CanvasEdge } from "./canvas-edge";
import { ShapePanel } from "./shape-panel";
import { CanvasControls } from "./canvas-controls";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { NODE_COLORS, canvasNode, canvasEdge } from "@/types/canvas";
import { CanvasTemplate } from "./starter-templates";

import "@xyflow/react/dist/style.css";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-flow/styles.css";

const nodeTypes = {
  canvasNode: CanvasNode,
};

const edgeTypes = {
  canvasEdge: CanvasEdge,
};

const defaultEdgeOptions = {
  type: "canvasEdge",
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

  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition } = reactFlowInstance;
  const nodeCounter = useRef(0);

  const undo = useUndo();
  const redo = useRedo();

  useKeyboardShortcuts(reactFlowInstance, undo, redo);

  // Track latest nodes and edges with refs to avoid re-binding event listeners on every change
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Handle template imports via custom DOM event
  useEffect(() => {
    const handleImportTemplate = (event: Event) => {
      const customEvent = event as CustomEvent<CanvasTemplate>;
      const template = customEvent.detail;
      if (!template) return;

      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      // 1. Create remove changes for existing nodes/edges
      const nodeRemoveChanges = currentNodes.map((node) => ({
        type: "remove" as const,
        id: node.id,
      }));
      const edgeRemoveChanges = currentEdges.map((edge) => ({
        type: "remove" as const,
        id: edge.id,
      }));

      // 2. Create add changes for new nodes/edges
      const nodeAddChanges = template.nodes.map((node) => ({
        type: "add" as const,
        item: { ...node },
      }));
      const edgeAddChanges = template.edges.map((edge) => ({
        type: "add" as const,
        item: { ...edge },
      }));

      // 3. Batch apply changes to React Flow & Liveblocks flow state
      onNodesChange([...nodeRemoveChanges, ...nodeAddChanges]);
      onEdgesChange([...edgeRemoveChanges, ...edgeAddChanges]);

      // 4. Update internal node counter
      nodeCounter.current = template.nodes.length;

      // 5. Fit the new template layout inside the viewport
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      }, 100);
    };

    window.addEventListener("import-canvas-template", handleImportTemplate);
    return () => {
      window.removeEventListener("import-canvas-template", handleImportTemplate);
    };
  }, [onNodesChange, onEdgesChange, reactFlowInstance]);

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

  const mappedNodes = useMemo(() => {
    return nodes.map((node) => {
      const cleanStyle = node.style ? { ...node.style } : {};
      delete cleanStyle.width;
      delete cleanStyle.height;

      return {
        ...node,
        style: cleanStyle,
        data: {
          ...node.data,
          updateLabel: (label: string) => {
            onNodesChange([
              {
                type: "replace",
                id: node.id,
                item: {
                  ...node,
                  data: {
                    ...node.data,
                    label,
                  },
                } as canvasNode,
              },
            ]);
          },
          updateColor: (color: { fill: string; text: string }) => {
            onNodesChange([
              {
                type: "replace",
                id: node.id,
                item: {
                  ...node,
                  data: {
                    ...node.data,
                    color,
                  },
                } as canvasNode,
              },
            ]);
          },
        },
      };
    });
  }, [nodes, onNodesChange]);

  const mappedEdges = useMemo(() => {
    return edges.map((edge) => {
      return {
        ...edge,
        data: {
          ...edge.data,
          updateLabel: (label: string) => {
            onEdgesChange([
              {
                type: "replace",
                id: edge.id,
                item: {
                  ...edge,
                  data: {
                    ...edge.data,
                    label,
                  },
                } as canvasEdge,
              },
            ]);
          },
        },
      };
    });
  }, [edges, onEdgesChange]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={mappedNodes}
        edges={mappedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "var(--text-secondary)", strokeWidth: 2, strokeOpacity: 0.6 }}
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
        
        {/* Custom SVG arrow definitions for custom edges */}
        <svg className="absolute w-0 h-0 pointer-events-none">
          <defs>
            <marker
              id="arrow-dim"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-secondary)" opacity="0.4" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-primary)" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
      <ShapePanel />
      <CanvasControls />
    </div>
  );
}
