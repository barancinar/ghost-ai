"use client";

import React from "react";
import { LiveblocksProvider, RoomProvider, ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "./error-boundary";
import { CollaborativeCanvas } from "./collaborative-canvas";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactFlowProvider } from "@xyflow/react";

interface CanvasWrapperProps {
  projectId: string;
}

function CanvasLoadingFallback() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center select-none w-full h-full min-h-[400px] bg-base">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-dim border border-brand/20 mb-5 animate-pulse">
        <Loader2 className="h-6 w-6 text-brand animate-spin" />
      </div>
      <h2 className="text-sm font-semibold text-copy-primary">
        Connecting to collaboration workspace...
      </h2>
      <p className="mt-2 text-xs text-copy-muted max-w-xs leading-relaxed">
        Synchronizing canvas state and user presence in real-time.
      </p>
    </div>
  );
}

function CanvasErrorFallback() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center select-none w-full h-full min-h-[400px] bg-base">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 mb-5 animate-bounce">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-sm font-semibold text-copy-primary">
        Connection Failed
      </h2>
      <p className="mt-2 text-xs text-copy-muted max-w-xs leading-relaxed mb-6">
        We couldn't connect to the real-time session. This may be due to insufficient permissions or a network issue.
      </p>
      <Button
        onClick={handleReload}
        className="bg-elevated hover:bg-subtle text-copy-primary border border-default text-xs rounded-xl font-medium px-4 py-2"
      >
        Retry Connection
      </Button>
    </div>
  );
}

export function CanvasWrapper({ projectId }: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={projectId}
        initialPresence={{
          cursor: null,
          isThinking: false,
        }}
      >
        <ErrorBoundary fallback={<CanvasErrorFallback />}>
          <ClientSideSuspense fallback={<CanvasLoadingFallback />}>
            <ReactFlowProvider>
              <CollaborativeCanvas />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
