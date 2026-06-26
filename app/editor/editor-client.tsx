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
import { useProjectActions } from "@/hooks/useProjectActions"
import { Project } from "@/types/project"

interface EditorClientProps {
  projects: Project[]
  activeProject: Project | null
}

export function EditorClient({ projects, activeProject }: EditorClientProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

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

  return (
    <main className="flex h-screen flex-col bg-base font-sans text-copy-primary antialiased overflow-hidden">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        activeProject={activeProject}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen((prev) => !prev)}
        onOpenShare={() => setIsShareOpen(true)}
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
          
          {/* Central Canvas Placeholder */}
          <section className="flex-1 bg-base relative p-6 flex flex-col items-center justify-center overflow-hidden border-b lg:border-b-0 border-default select-none">
            {/* Canvas Dot Grid Background */}
            <div className="absolute inset-0 opacity-15" style={{
              backgroundImage: "radial-gradient(var(--border-subtle) 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}></div>

            {/* Premium Placeholder Card */}
            <div className="relative z-10 max-w-md w-full bg-surface border border-default p-8 rounded-3xl shadow-2xl backdrop-blur-md flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-dim border border-brand/20 mb-5">
                <Activity className="h-6 w-6 text-brand" />
              </div>
              <h2 className="text-lg font-bold text-copy-primary">
                Collaborative Architecture Canvas
              </h2>
              <p className="mt-2 text-xs text-copy-muted leading-relaxed">
                This is where your system design graph will render. You will be able to add and connect services, databases, and message queues in real-time.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                <span className="text-[10px] font-mono bg-elevated border border-default text-copy-secondary px-2.5 py-1 rounded-lg">
                  Project ID: {activeProject.id}
                </span>
                <span className="text-[10px] font-mono bg-elevated border border-default text-copy-secondary px-2.5 py-1 rounded-lg">
                  Room: {activeProject.slug}
                </span>
              </div>
            </div>
          </section>

          {/* Right Sidebar - AI Assistant Placeholder */}
          {isAiSidebarOpen && (
            <aside className="w-80 h-full border-l border-default bg-surface flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
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
          )}

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
    </main>
  )
}

