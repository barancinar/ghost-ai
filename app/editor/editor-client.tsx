"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  Plus,
  Send,
  Sparkles,
  MessageSquareCode
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ShareDialog } from "@/components/editor/share-dialog"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { CanvasTemplate } from "@/components/editor/starter-templates"
import { useProjectActions } from "@/hooks/useProjectActions"
import { Project } from "@/types/project"
import { CanvasWrapper } from "@/components/editor/canvas-wrapper"
import { cn } from "@/lib/utils"


interface EditorClientProps {
  projects: Project[]
  activeProject: Project | null
}

export function EditorClient({ projects, activeProject }: EditorClientProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)

  const {
    activeDialog,
    selectedProject,
    nameInput,
    setNameInput,
    slugPreview,
    isLoading,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    handleCreateSubmit,
    handleRenameSubmit,
    handleDeleteConfirm,
  } = useProjectActions(activeProject?.id)

  const handleSelectProject = (project: Project) => {
    router.push(`/editor/${project.id}`)
  }

  const handleImportTemplate = (template: CanvasTemplate) => {
    const event = new CustomEvent("import-canvas-template", { detail: template });
    window.dispatchEvent(event);
    setIsTemplatesOpen(false);
  };

  return (
    <main className="flex h-screen flex-col bg-base font-sans text-copy-primary antialiased overflow-hidden">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        activeProject={activeProject}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen((prev) => !prev)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
      />
      
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onCreateProject={openCreate}
        onRenameProject={openRename}
        onDeleteProject={openDelete}
      />

      {/* Main Workspace / Editor Home Section */}
      {!activeProject ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center select-none max-w-xl mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-dim border border-brand/20 mb-6">
            <Plus className="h-8 w-8 text-brand animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-copy-primary sm:text-3xl">
            Create a project or open an existing one
          </h1>
          <p className="mt-3 text-sm text-copy-muted leading-relaxed max-w-md">
            Start a new architecture workspace, or choose a project from the sidebar.
          </p>
          <div className="mt-8">
            <Button
              className="bg-brand text-black hover:bg-brand/90 font-semibold px-6 py-5 text-sm rounded-xl flex items-center gap-2 transition duration-200 shadow-lg shadow-brand/10 hover:shadow-brand/25"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Workspace Shell Layout */
        <div className="flex flex-1 flex-row overflow-hidden relative h-[calc(100vh-3.5rem)]">
          
          {/* Central Collaborative Canvas */}
          <section className="flex-1 bg-base relative overflow-hidden select-none">
            <CanvasWrapper projectId={activeProject.id} />
          </section>

          {/* Right Sidebar - AI Assistant Placeholder */}
          <aside
            className={cn(
              "fixed top-14 right-0 bottom-0 z-30 flex w-80 flex-col border-l border-default bg-surface/95 backdrop-blur-md shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out",
              isAiSidebarOpen ? "translate-x-0" : "translate-x-[calc(100%+8px)]"
            )}
            inert={!isAiSidebarOpen}
          >
            {/* Sidebar Header */}
            <div className="flex h-12 items-center gap-2 border-b border-default px-4">
              <Sparkles className="h-4 w-4 text-accent-ai" />
              <h3 className="text-sm font-semibold text-copy-primary">AI Assistant</h3>
            </div>

            {/* Sidebar Content */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="rounded-2xl bg-elevated/40 border border-default p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-ai-text">
                    <MessageSquareCode className="h-3.5 w-3.5" />
                    <span>Ghost AI Chat</span>
                  </div>
                  <p className="text-[11px] text-copy-secondary leading-relaxed">
                    Hello! I am your AI designer. Soon, you'll be able to type natural language instructions here to automatically generate and mutate canvas architecture.
                  </p>
                </div>
                
                <div className="text-[10px] text-copy-muted text-center pt-2">
                  Future AI updates will integrate Trigger.dev background workflows.
                </div>
              </div>
            </ScrollArea>

            {/* Mock Chat Input at bottom */}
            <div className="p-4 border-t border-default bg-surface/50">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask Ghost AI to design..."
                  className="bg-elevated border-default text-xs rounded-xl h-9"
                  disabled
                />
                <Button size="icon" className="bg-accent-ai hover:bg-accent-ai/90 text-white rounded-xl h-9 w-9 flex items-center justify-center shrink-0" disabled>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </aside>

        </div>
      )}

      {/* Project Mutation Dialogs */}
      <ProjectDialogs
        activeDialog={activeDialog}
        selectedProject={selectedProject}
        nameInput={nameInput}
        setNameInput={setNameInput}
        slugPreview={slugPreview}
        isLoading={isLoading}
        onClose={closeDialog}
        onCreateSubmit={handleCreateSubmit}
        onRenameSubmit={handleRenameSubmit}
        onDeleteConfirm={handleDeleteConfirm}
      />

      {activeProject && (
        <ShareDialog
          key={activeProject.id}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
          isOwner={activeProject.isOwner}
        />
      )}

      {activeProject && (
        <StarterTemplatesModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
          onImport={handleImportTemplate}
        />
      )}
    </main>
  )
}

