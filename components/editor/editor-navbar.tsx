"use client"

import * as React from "react"
import { PanelLeftClose, PanelLeftOpen, Share2, Sparkles } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"
import { Project } from "@/types/project"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  activeProject?: Project | null
  isAiSidebarOpen?: boolean
  onToggleAiSidebar?: () => void
  onOpenShare?: () => void
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  activeProject,
  isAiSidebarOpen = false,
  onToggleAiSidebar,
  onOpenShare
}: EditorNavbarProps) {
  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-default bg-surface/50 px-4 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close projects sidebar" : "Open projects sidebar"}
          className="text-copy-secondary hover:text-copy-primary hover:bg-elevated/50 transition-colors"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>

        {activeProject && (
          <>
            <span className="h-4 w-px bg-default" />
            <span className="text-xs font-semibold text-copy-primary truncate max-w-[200px]" id="navbar-project-name">
              {activeProject.name}
            </span>
          </>
        )}
      </div>

      {/* Right section contains UserButton and Workspace Actions */}
      <div className="flex items-center gap-2">
        {activeProject && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="bg-surface border-default text-copy-secondary hover:text-copy-primary hover:bg-elevated gap-1.5 h-8 text-xs rounded-xl"
              onClick={onOpenShare}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button
              variant={isAiSidebarOpen ? "default" : "outline"}
              size="sm"
              className={`gap-1.5 h-8 text-xs rounded-xl transition duration-200 ${
                isAiSidebarOpen
                  ? "bg-accent-ai hover:bg-accent-ai/90 text-white border-transparent"
                  : "bg-surface border-default text-copy-secondary hover:text-copy-primary hover:bg-elevated"
              }`}
              onClick={onToggleAiSidebar}
              aria-label={isAiSidebarOpen ? "Close AI assistant" : "Open AI assistant"}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Assistant</span>
            </Button>

            <span className="h-4 w-px bg-default mx-1" />
          </>
        )}
        
        <UserButton />
      </div>
    </header>
  )
}

