import { useState, useTransition } from "react"
import { Project } from "@/types/project"

export function useProjectDialogs() {
  const [activeDialog, setActiveDialog] = useState<"create" | "rename" | "delete" | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [isPending, startTransition] = useTransition()

  // Generate a URL-friendly slug in real-time
  const slugPreview = slugify(nameInput)

  const openCreate = () => {
    setNameInput("")
    setSelectedProject(null)
    setActiveDialog("create")
  }

  const openRename = (project: Project) => {
    setSelectedProject(project)
    setNameInput(project.name)
    setActiveDialog("rename")
  }

  const openDelete = (project: Project) => {
    setSelectedProject(project)
    setNameInput("")
    setActiveDialog("delete")
  }

  const closeDialog = () => {
    setActiveDialog(null)
    setSelectedProject(null)
    setNameInput("")
  }

  const handleCreateSubmit = (
    e: React.FormEvent,
    onSubmit: (name: string, slug: string) => void
  ) => {
    e.preventDefault()
    if (!nameInput.trim()) return

    startTransition(async () => {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 600))
      onSubmit(nameInput.trim(), slugPreview)
      closeDialog()
    })
  }

  const handleRenameSubmit = (
    e: React.FormEvent,
    onSubmit: (id: string, name: string) => void
  ) => {
    e.preventDefault()
    if (!nameInput.trim() || !selectedProject) return

    startTransition(async () => {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 600))
      onSubmit(selectedProject.id, nameInput.trim())
      closeDialog()
    })
  }

  const handleDeleteConfirm = (
    onSubmit: (id: string) => void
  ) => {
    if (!selectedProject) return

    startTransition(async () => {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 600))
      onSubmit(selectedProject.id)
      closeDialog()
    })
  }

  return {
    activeDialog,
    selectedProject,
    nameInput,
    setNameInput,
    slugPreview,
    isLoading: isPending,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    handleCreateSubmit,
    handleRenameSubmit,
    handleDeleteConfirm,
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace non-alphanumeric chars (excluding spaces/hyphens)
    .replace(/[^\w\s-]/g, "")
    // Replace spaces/underscores with hyphens
    .replace(/[\s_-]+/g, "-")
    // Remove duplicate hyphens
    .replace(/-+/g, "-")
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, "")
}
