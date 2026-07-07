"use client";

import React from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useOthers } from "@liveblocks/react";
import { cn } from "@/lib/utils";

interface AvatarGroupProps {
  isAiSidebarOpen?: boolean;
}

export function AvatarGroup({ isAiSidebarOpen = false }: AvatarGroupProps) {
  const { user } = useUser();
  const others = useOthers();

  // Filter others list to exclude the current user in case of duplicate IDs
  const collaborators = others.filter(
    (other) => other.id !== user?.id
  );

  const visibleCollaborators = collaborators.slice(0, 5);
  const overflowCount = collaborators.length - 5;

  return (
    <div
      className={cn(
        "absolute top-4 z-20 flex items-center gap-2 bg-elevated/95 backdrop-blur-md border border-default px-3 py-1.5 rounded-full shadow-2xl shadow-black/80 select-none nodrag nopan nowheel pointer-events-auto transition-all duration-300 ease-in-out",
        isAiSidebarOpen ? "right-[336px]" : "right-4"
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Collaborator Avatars */}
      {collaborators.length > 0 && (
        <div className="flex -space-x-2">
          {visibleCollaborators.map((collaborator) => {
            const name = collaborator.info?.name || "Collaborator";
            const avatar = collaborator.info?.avatar;
            const color = collaborator.info?.color || "var(--accent-primary)";

            return (
              <div
                key={collaborator.connectionId}
                className="relative flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border-2 border-elevated bg-subtle"
                style={{ borderColor: "var(--bg-elevated)" }}
                title={name}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full text-xs font-bold"
                    style={{ color }}
                  >
                    {getInitials(name)}
                  </div>
                )}
              </div>
            );
          })}

          {overflowCount > 0 && (
            <div
              className="relative flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border-2 border-elevated bg-subtle text-[11px] font-bold text-copy-secondary"
              style={{ borderColor: "var(--bg-elevated)" }}
              title={`${overflowCount} more collaborator${overflowCount > 1 ? "s" : ""}`}
            >
              +{overflowCount}
            </div>
          )}
        </div>
      )}

      {/* Divider - only visible when collaborators exist */}
      {collaborators.length > 0 && (
        <span className="h-4 w-px bg-default mx-1 shrink-0" />
      )}

      {/* Clerk User Button for Current User */}
      <div className="h-8 w-8 flex items-center justify-center shrink-0">
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "h-8 w-8 border border-default hover:border-brand/50 transition-colors duration-150",
            },
          }}
        />
      </div>
    </div>
  );
}

function getInitials(name?: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
