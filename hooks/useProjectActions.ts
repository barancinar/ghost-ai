import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { slugify } from "@/lib/utils"
import { Project } from "@/types/project"

export function useProjectActions(activeProjectId?: string) {
  const [activeDialog, setActiveDialog] = useState<"create" | "rename" | "delete" | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [suffix, setSuffix] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Generate stable room ID preview using slugified name + suffix
  const slugPreview = nameInput.trim() ? `${slugify(nameInput)}-${suffix}` : ""

  const openCreate = () => {
    setNameInput("")
    setSelectedProject(null)
    setSuffix(Math.random().toString(36).substring(2, 6))
    setActiveDialog("create")
  }

  const openRename = (project: Project) => {
    setSelectedProject(project)
    setNameInput(project.name)
    setActiveDialog("rename")
  }

  const openDelete = (project: Project) => {
    setSelectedProject(project)
    setNameInput(project.name) // Pre-fill name so we can show it in delete dialog
    setActiveDialog("delete")
  }

  const closeDialog = () => {
    setActiveDialog(null)
    setSelectedProject(null)
    setNameInput("")
    setSuffix("")
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = nameInput.trim()
    const roomId = slugPreview
    if (!trimmedName || !roomId) return

    startTransition(async () => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ id: roomId, name: trimmedName })
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.message || "Failed to create project")
        }

        const data = await res.json()
        closeDialog()
        router.push(`/editor/${data.id}`)
        router.refresh()
      } catch (err) {
        console.error("Create project failed:", err)
        alert(err instanceof Error ? err.message : "Failed to create project")
      }
    })
  }

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = nameInput.trim()
    if (!trimmedName || !selectedProject) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${selectedProject.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: trimmedName })
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.message || "Failed to rename project")
        }

        closeDialog()
        router.refresh()
      } catch (err) {
        console.error("Rename project failed:", err)
        alert(err instanceof Error ? err.message : "Failed to rename project")
      }
    })
  }

  const handleDeleteConfirm = () => {
    if (!selectedProject) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${selectedProject.id}`, {
          method: "DELETE"
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.message || "Failed to delete project")
        }

        const deletedId = selectedProject.id
        closeDialog()

        if (deletedId === activeProjectId) {
          router.push("/editor")
        }
        router.refresh()
      } catch (err) {
        console.error("Delete project failed:", err)
        alert(err instanceof Error ? err.message : "Failed to delete project")
      }
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
