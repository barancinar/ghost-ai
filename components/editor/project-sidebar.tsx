"use client"

import * as React from "react"
import { FolderOpen, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed top-14 left-0 bottom-0 z-30 flex w-80 flex-col border-r border-default bg-surface/95 backdrop-blur-md transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-default px-4">
        <h2 className="text-sm font-semibold tracking-wide text-copy-primary">Projects</h2>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close projects sidebar"
          className="text-copy-muted hover:text-copy-primary hover:bg-elevated/50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden p-4">
        <Tabs defaultValue="my-projects" className="flex h-full flex-col">
          <TabsList className="bg-elevated border border-default p-0.5 rounded-lg w-full mb-4">
            <TabsTrigger value="my-projects" className="flex-1 text-xs py-1.5">
              My Projects
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex-1 text-xs py-1.5">
              Shared
            </TabsTrigger>
          </TabsList>

          {/* My Projects Panel */}
          <TabsContent value="my-projects" className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevated/50 border border-default">
                <FolderOpen className="h-5 w-5 text-copy-muted" />
              </div>
              <div>
                <p className="text-xs font-semibold text-copy-secondary">No projects yet</p>
                <p className="text-[10px] text-copy-muted mt-1 max-w-[200px]">
                  Create a new project to start designing your system architecture.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Shared Panel */}
          <TabsContent value="shared" className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevated/50 border border-default">
                <FolderOpen className="h-5 w-5 text-copy-muted" />
              </div>
              <div>
                <p className="text-xs font-semibold text-copy-secondary">No shared projects</p>
                <p className="text-[10px] text-copy-muted mt-1 max-w-[200px]">
                  Projects shared with you by other collaborators will appear here.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Button */}
      <div className="border-t border-default p-4 bg-surface/50">
        <Button className="w-full bg-brand text-black hover:bg-brand/90 font-medium flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-xl">
          <Plus className="h-3.5 w-3.5" />
          <span>New Project</span>
        </Button>
      </div>
    </aside>
  )
}
