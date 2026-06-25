"use client"

import * as React from "react"
import { AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Project } from "@/types/project"

interface ProjectDialogsProps {
  activeDialog: "create" | "rename" | "delete" | null
  selectedProject: Project | null
  nameInput: string
  setNameInput: (name: string) => void
  slugPreview: string
  isLoading: boolean
  onClose: () => void
  onCreateSubmit: (e: React.FormEvent) => void
  onRenameSubmit: (e: React.FormEvent) => void
  onDeleteConfirm: () => void
}

export function ProjectDialogs({
  activeDialog,
  selectedProject,
  nameInput,
  setNameInput,
  slugPreview,
  isLoading,
  onClose,
  onCreateSubmit,
  onRenameSubmit,
  onDeleteConfirm,
}: ProjectDialogsProps) {
  return (
    <>
      {/* Create Project Dialog */}
      <Dialog open={activeDialog === "create"} onOpenChange={(open) => { if (!open && !isLoading) onClose() }}>
        <DialogContent showCloseButton={!isLoading} className="rounded-3xl border border-default bg-surface max-w-sm">
          <form onSubmit={onCreateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-copy-primary font-semibold">Create Project</DialogTitle>
              <DialogDescription className="text-copy-muted">
                Start a new system architecture workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label htmlFor="create-project-name" className="text-xs font-bold text-copy-muted uppercase tracking-wider">
                Project Name
              </label>
              <Input
                id="create-project-name"
                placeholder="My Awesome Architecture"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                disabled={isLoading}
                autoFocus
                required
                className="bg-elevated border-default text-copy-primary focus:border-brand text-sm rounded-xl"
              />
              {nameInput.trim() && (
                <p className="text-[10px] text-copy-faint select-none">
                  Slug preview: <span className="font-mono text-brand">{slugPreview || "blank"}</span>
                </p>
              )}
            </div>

            <DialogFooter className="flex sm:justify-end gap-2 border-t border-default/30 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
                className="text-copy-secondary hover:text-copy-primary hover:bg-elevated/50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !nameInput.trim() || !slugPreview}
                className="bg-brand text-black hover:bg-brand/90 font-medium rounded-xl flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Project</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={activeDialog === "rename"} onOpenChange={(open) => { if (!open && !isLoading) onClose() }}>
        <DialogContent showCloseButton={!isLoading} className="rounded-3xl border border-default bg-surface max-w-sm">
          <form onSubmit={onRenameSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-copy-primary font-semibold">Rename Project</DialogTitle>
              <DialogDescription className="text-copy-muted break-words">
                Rename current project &ldquo;{selectedProject?.name}&rdquo; to something new.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label htmlFor="rename-project-name" className="text-xs font-bold text-copy-muted uppercase tracking-wider">
                New Name
              </label>
              <Input
                id="rename-project-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                disabled={isLoading}
                autoFocus
                required
                className="bg-elevated border-default text-copy-primary focus:border-brand text-sm rounded-xl"
              />
            </div>

            <DialogFooter className="flex sm:justify-end gap-2 border-t border-default/30 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
                className="text-copy-secondary hover:text-copy-primary hover:bg-elevated/50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !nameInput.trim() || nameInput.trim() === selectedProject?.name}
                className="bg-brand text-black hover:bg-brand/90 font-medium rounded-xl flex items-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Rename</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={activeDialog === "delete"} onOpenChange={(open) => { if (!open && !isLoading) onClose() }}>
        <DialogContent showCloseButton={!isLoading} className="rounded-3xl border border-default bg-surface max-w-sm">
          <div className="space-y-4">
            <DialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-state-error/10 text-state-error mb-2">
                <AlertCircle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-copy-primary font-semibold text-center">Delete Project</DialogTitle>
              <DialogDescription className="text-copy-muted text-center break-words">
                Are you sure you want to delete &ldquo;{selectedProject?.name}&rdquo;? This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-default/30 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
                className="text-copy-secondary hover:text-copy-primary hover:bg-elevated/50 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onDeleteConfirm}
                disabled={isLoading}
                className="bg-state-error text-white hover:bg-state-error/90 font-medium rounded-xl flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Project</span>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
