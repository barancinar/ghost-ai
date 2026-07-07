import { useEffect, useRef, useState, useCallback } from "react"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface UseCanvasAutosaveOptions {
  projectId: string
  nodes: any[]
  edges: any[]
  enabled: boolean
  debounceMs?: number
  onStatusChange?: (status: SaveStatus) => void
}

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
  debounceMs = 2000,
  onStatusChange,
}: UseCanvasAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track last saved stringified content to avoid saving if nothing changed
  const lastSavedContentRef = useRef<string>("")
  
  // Keep mutable references of the dependencies to avoid restarting timers on change
  const stateRef = useRef({ nodes, edges, enabled, projectId })
  
  useEffect(() => {
    stateRef.current = { nodes, edges, enabled, projectId }
  }, [nodes, edges, enabled, projectId])

  const updateStatus = useCallback((newStatus: SaveStatus) => {
    setStatus(newStatus)
    if (onStatusChange) {
      onStatusChange(newStatus)
    }
  }, [onStatusChange])

  const saveCanvas = useCallback(async (nodesToSave: any[], edgesToSave: any[], targetProjectId: string) => {
    const serialized = JSON.stringify({ nodes: nodesToSave, edges: edgesToSave })
    
    // Check if content matches what we last saved
    if (lastSavedContentRef.current === serialized) {
      updateStatus("idle")
      return
    }

    updateStatus("saving")

    try {
      const response = await fetch(`/api/projects/${targetProjectId}/canvas`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: serialized,
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error("Save request failed on server side:", errBody);
        throw new Error(`Save request failed: ${JSON.stringify(errBody)}`);
      }

      lastSavedContentRef.current = serialized
      updateStatus("saved")

      // Clear the "saved" status to "idle" after a delay
      setTimeout(() => {
        // Only reset to idle if no new save has started
        setStatus((current) => {
          if (current === "saved") {
            setTimeout(() => {
              updateStatus("idle")
            }, 0)
          }
          return current
        })
      }, 3000)
    } catch (error) {
      console.error("Autosave error:", error)
      updateStatus("error")

      // Clear the "error" status to "idle" after a delay
      setTimeout(() => {
        setStatus((current) => {
          if (current === "error") {
            setTimeout(() => {
              updateStatus("idle")
            }, 0)
          }
          return current
        })
      }, 3000)
    }
  }, [updateStatus])

  // Watch for changes in nodes/edges and trigger debounced save
  useEffect(() => {
    if (!enabled) {
      return
    }

    // Cancel existing debounce timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const currentContent = JSON.stringify({ nodes, edges })
    // If it matches last saved content, do not start a saving cycle
    if (lastSavedContentRef.current === currentContent) {
      return
    }

    // Set status to saving immediately when edits are made
    updateStatus("saving")

    timeoutRef.current = setTimeout(() => {
      saveCanvas(stateRef.current.nodes, stateRef.current.edges, stateRef.current.projectId)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [nodes, edges, enabled, debounceMs, saveCanvas, updateStatus])

  // Expose a manual trigger
  const triggerManualSave = useCallback(async () => {
    // Clear pending debounce timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    await saveCanvas(stateRef.current.nodes, stateRef.current.edges, stateRef.current.projectId)
  }, [saveCanvas])

  return {
    status,
    triggerManualSave,
    setLastSavedContent: (content: string) => {
      lastSavedContentRef.current = content
    }
  }
}
