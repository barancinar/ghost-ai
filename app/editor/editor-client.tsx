"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Activity, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ShareDialog } from "@/components/editor/share-dialog"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { CanvasTemplate } from "@/components/editor/starter-templates"
import { useProjectActions } from "@/hooks/useProjectActions"
import { Project } from "@/types/project"
import { CanvasWrapper, WorkspaceRoom } from "@/components/editor/canvas-wrapper"
import { AiSidebar } from "@/components/editor/ai-sidebar"
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const manualSaveRef = useRef<() => void>(undefined)

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
        saveStatus={saveStatus}
        onManualSave={() => manualSaveRef.current?.()}
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
        <WorkspaceRoom projectId={activeProject.id}>
          <div className="flex flex-1 flex-row overflow-hidden relative h-[calc(100vh-3.5rem)]">

            {/* Central Collaborative Canvas */}
            <section className="flex-1 bg-base relative overflow-hidden select-none">
              <CanvasWrapper
                projectId={activeProject.id}
                isAiSidebarOpen={isAiSidebarOpen}
                onSaveStatusChange={setSaveStatus}
                onManualSaveRef={manualSaveRef}
              />
            </section>

            {/* Right Sidebar - AI Assistant (shares the workspace room so it can
                subscribe to the shared ai-status-feed and presence) */}
            <AiSidebar
              isOpen={isAiSidebarOpen}
              onClose={() => setIsAiSidebarOpen(false)}
              projectId={activeProject.id}
            />

          </div>
        </WorkspaceRoom>
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

