"use client"

import * as React from "react"
import { Folder, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Project } from "@/types/project"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  projects: Project[]
  activeProject: Project | null
  onSelectProject: (project: Project) => void
  onCreateProject: () => void
  onRenameProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
}

export function ProjectSidebar({
  isOpen,
  onClose,
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject
}: ProjectSidebarProps) {
  const myProjects = (projects || []).filter((p) => p.isOwner)
  const sharedProjects = (projects || []).filter((p) => !p.isOwner)

  return (
    <>
      {/* Mobile Backdrop Scrim */}
      {isOpen && (
        <div
          className="fixed inset-0 top-14 z-20 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-14 left-0 bottom-0 z-30 flex w-80 flex-col border-r border-default bg-surface/95 backdrop-blur-md transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        inert={!isOpen}
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
            <TabsContent value="my-projects" className="flex-1 overflow-y-auto outline-none">
              {myProjects.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-4">
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
                </div>
              ) : (
                <div className="space-y-1 pr-1">
                  {myProjects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        "group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition duration-200 cursor-pointer select-none border-l-2",
                        activeProject?.id === project.id
                          ? "bg-elevated text-brand border-brand font-medium"
                          : "border-transparent text-copy-secondary hover:bg-elevated/40 hover:text-copy-primary"
                      )}
                      onClick={() => onSelectProject(project)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Folder className={cn("h-4 w-4 shrink-0", activeProject?.id === project.id ? "text-brand" : "text-copy-muted")} />
                        <span className="truncate">{project.name}</span>
                      </div>
                      
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 ml-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-6 w-6 rounded-lg text-copy-muted hover:text-copy-primary hover:bg-subtle"
                          onClick={() => onRenameProject(project)}
                          aria-label={`Rename ${project.name}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-6 w-6 rounded-lg text-copy-muted hover:text-state-error hover:bg-state-error/10"
                          onClick={() => onDeleteProject(project)}
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Shared Panel */}
            <TabsContent value="shared" className="flex-1 overflow-y-auto outline-none">
              {sharedProjects.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-4">
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
                </div>
              ) : (
                <div className="space-y-1 pr-1">
                  {sharedProjects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        "group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition duration-200 cursor-pointer select-none border-l-2",
                        activeProject?.id === project.id
                          ? "bg-elevated text-brand border-brand font-medium"
                          : "border-transparent text-copy-secondary hover:bg-elevated/40 hover:text-copy-primary"
                      )}
                      onClick={() => onSelectProject(project)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Folder className={cn("h-4 w-4 shrink-0", activeProject?.id === project.id ? "text-brand" : "text-copy-muted")} />
                        <span className="truncate">{project.name}</span>
                      </div>
                      
                      {/* Shared projects have no edit/delete options in sidebar */}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Button */}
        <div className="border-t border-default p-4 bg-surface/50">
          <Button
            className="w-full bg-brand text-black hover:bg-brand/90 font-medium flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-xl transition duration-200"
            onClick={onCreateProject}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project</span>
          </Button>
        </div>
      </aside>
    </>
  )
}
