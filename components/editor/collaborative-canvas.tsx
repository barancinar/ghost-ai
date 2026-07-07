"use client";

import React, { useCallback, useRef, useMemo, useEffect, useState } from "react";
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
import { useUndo, useRedo, useMyPresence, useOther } from "@liveblocks/react";
import { Loader2 } from "lucide-react";
import { CanvasNode } from "./canvas-node";
import { CanvasEdge } from "./canvas-edge";
import { ShapePanel } from "./shape-panel";
import { CanvasControls } from "./canvas-controls";
import { AvatarGroup } from "./avatar-group";
import { AiActivityLayer } from "./ai-activity-layer";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { NODE_COLORS, canvasNode, canvasEdge } from "@/types/canvas";
import { CanvasTemplate } from "./starter-templates";
import { useCanvasAutosave } from "@/hooks/useCanvasAutosave";

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

function CustomCursor({ connectionId }: { connectionId: number }) {
  const info = useOther(connectionId, (user) => user.info);
  // Read the collaborator's `thinking` presence so we can show a spinner in
  // their name badge while they have AI generation in progress.
  const thinking = useOther(connectionId, (user) => user.presence.thinking);

  if (!info) return null;

  const color = info.color || "var(--accent-primary)";
  const name = info.name || "Collaborator";

  return (
    <div className="absolute pointer-events-none select-none z-50">
      {/* SVG Pointer */}
      <svg
        className="h-5 w-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2.5 2V19.5L8 14.1L12.5 22L15.5 20.2L11 12.3L17.5 12.3L2.5 2Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {/* Name Badge */}
      <div
        className="absolute left-3.5 top-3.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-white truncate max-w-[140px] shadow-md border border-white/20 select-none whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {thinking && <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />}
        <span className="truncate">{name}</span>
      </div>
    </div>
  );
}

interface CollaborativeCanvasProps {
  projectId: string;
  isAiSidebarOpen?: boolean;
  onSaveStatusChange?: (status: "idle" | "saving" | "saved" | "error") => void;
  onManualSaveRef?: React.MutableRefObject<(() => void) | undefined>;
}

export function CollaborativeCanvas({
  projectId,
  isAiSidebarOpen = false,
  onSaveStatusChange,
  onManualSaveRef,
}: CollaborativeCanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDelete,
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
  const { screenToFlowPosition, deleteElements } = reactFlowInstance;
  const nodeCounter = useRef(0);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const undo = useUndo();
  const redo = useRedo();

  useKeyboardShortcuts(reactFlowInstance, undo, redo);

  const selectedNodeIdsRef = useRef<string[]>([]);
  const selectedEdgeIdsRef = useRef<string[]>([]);

  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: { id: string }[]; edges: { id: string }[] }) => {
    selectedNodeIdsRef.current = nodes.map((n) => n.id);
    selectedEdgeIdsRef.current = edges.map((e) => e.id);
  }, []);

  // Handle keydown deletion for selected nodes and edges.
  // NOTE: We intentionally keep React Flow's built-in deleteKeyCode disabled
  // (see deleteKeyCode={null} below) so we can guard against deleting while
  // the user is typing in an input/textarea. Actual deletion goes through
  // React Flow's own `deleteElements` helper (NOT the raw Liveblocks
  // `onDelete` function) so that:
  //   1. Connected edges are correctly cascaded when a node is removed.
  //   2. The full, real Node/Edge objects (not fake `{id}` stubs) reach the
  //      `onDelete` prop wired on <ReactFlow onDelete={onDelete} /> below,
  //      which is what actually syncs the deletion to Liveblocks storage as
  //      a single atomic/undoable operation.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable ||
          activeElement.closest('[contenteditable="true"]') !== null)
      ) {
        return;
      }

      const selectedNodeIds = selectedNodeIdsRef.current;
      const selectedEdgeIds = selectedEdgeIdsRef.current;

      if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) {
        return;
      }

      event.preventDefault();

      deleteElements({
        nodes: selectedNodeIds.map((id) => ({ id })),
        edges: selectedEdgeIds.map((id) => ({ id })),
      });
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [deleteElements]);

  // Track latest nodes and edges with refs to avoid re-binding event listeners on every change
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(false);
  const hasLoadedRef = useRef(false);

  const { status, triggerManualSave, setLastSavedContent } = useCanvasAutosave({
    projectId,
    nodes,
    edges,
    enabled: isAutosaveEnabled,
    onStatusChange: onSaveStatusChange,
  });

  // Share manual save ref back to parent component
  useEffect(() => {
    if (onManualSaveRef) {
      onManualSaveRef.current = triggerManualSave;
    }
    return () => {
      if (onManualSaveRef) {
        onManualSaveRef.current = undefined;
      }
    };
  }, [onManualSaveRef, triggerManualSave]);

  // Load saved canvas state if room is empty
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    if (nodes.length === 0 && edges.length === 0) {
      fetch(`/api/projects/${projectId}/canvas`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load project canvas");
          return res.json();
        })
        .then((data) => {
          if (data && (data.nodes?.length > 0 || data.edges?.length > 0)) {
            const nodeAddChanges = data.nodes.map((node: any) => ({
              type: "add" as const,
              item: { ...node },
            }));
            const edgeAddChanges = data.edges.map((edge: any) => ({
              type: "add" as const,
              item: { ...edge },
            }));

            // Sync with React Flow / Liveblocks
            onNodesChange(nodeAddChanges);
            onEdgesChange(edgeAddChanges);

            // Update internal node counter
            nodeCounter.current = data.nodes.length;

            // Set the baseline last saved content so the first render doesn't autosave
            setLastSavedContent(JSON.stringify({ nodes: data.nodes, edges: data.edges }));

            // Manually fit view after loading existing elements
            setTimeout(() => {
              reactFlowInstance.fitView({ padding: 0.2 });
            }, 100);
          }
          setIsAutosaveEnabled(true);
        })
        .catch((err) => {
          console.error("Error loading canvas state:", err);
          setIsAutosaveEnabled(true);
        });
    } else {
      // Room is not empty, use current state as baseline and enable autosave immediately
      setLastSavedContent(JSON.stringify({ nodes, edges }));
      setIsAutosaveEnabled(true);

      // Manually fit view for active session nodes
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 100);
    }
  }, [projectId, nodes.length, edges.length, onNodesChange, onEdgesChange, setLastSavedContent, reactFlowInstance]);

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
        const cursorFlowPos = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const position = {
          x: cursorFlowPos.x - width / 2,
          y: cursorFlowPos.y - height / 2,
        };

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

  const [, updateMyPresence] = useMyPresence();

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      updateMyPresence({ cursor: flowPos });
    },
    [screenToFlowPosition, updateMyPresence]
  );

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
      <ReactFlow
        nodes={mappedNodes}
        edges={mappedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        onSelectionChange={onSelectionChange}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "var(--text-secondary)", strokeWidth: 2, strokeOpacity: 0.6 }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{ width: "100%", height: "100%" }}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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
        <Cursors components={{ Cursor: CustomCursor }} />

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
              <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: "var(--text-secondary)" }} opacity="0.4" />
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
              <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: "var(--accent-primary)" }} />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
      <ShapePanel />
      <CanvasControls />
      <AvatarGroup isAiSidebarOpen={isAiSidebarOpen} />
      <AiActivityLayer />
    </div>
  );
}