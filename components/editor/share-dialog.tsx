"use client"

import React, { useState, useEffect } from "react"
import { Copy, Check, Trash2, UserPlus, Users, Loader2, Link2, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Collaborator {
  id: string
  email: string
  name: string | null
  avatar: string | null
  role: "OWNER" | "COLLABORATOR"
}

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
  isOwner: boolean
}

export function ShareDialog({
  isOpen,
  onClose,
  projectId,
  projectName,
  isOwner,
}: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [ownerInfo, setOwnerInfo] = useState<Collaborator | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch collaborators list from API
  const fetchCollaborators = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Failed to load collaborators")
      }
      const data = await res.json()
      setOwnerInfo(data.owner)
      setCollaborators(data.collaborators || [])
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : "Failed to load collaborators")
    } finally {
      setIsLoading(false)
    }
  }

  // Load collaborators when dialog is opened
  useEffect(() => {
    if (isOpen && projectId) {
      fetchCollaborators()
      setInviteEmail("")
      setErrorMessage(null)
    }
  }, [isOpen, projectId])

  // Handle invitation submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return

    setIsInviting(true)
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Failed to invite collaborator")
      }

      setInviteEmail("")
      // Reload list to resolve profile picture/display name from Clerk
      await fetchCollaborators()
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : "Failed to invite collaborator")
    } finally {
      setIsInviting(false)
    }
  }

  // Handle collaborator removal
  const handleRemoveCollaborator = async (email: string) => {
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Failed to remove collaborator")
      }

      // Reload list
      await fetchCollaborators()
    } catch (err) {
      console.error(err)
      setErrorMessage(err instanceof Error ? err.message : "Failed to remove collaborator")
    }
  }

  // Handle copying URL link
  const handleCopyLink = () => {
    if (typeof window === "undefined") return
    const shareLink = `${window.location.origin}/editor/${projectId}`
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Helper to render user initials
  const renderInitials = (user: Collaborator) => {
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email.slice(0, 2).toUpperCase()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-surface border border-default p-4 sm:p-6 text-copy-primary select-none shadow-2xl backdrop-blur-md flex flex-col gap-4">
        <DialogHeader className="pb-3 border-b border-default">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-brand" />
            <span>Project Sharing Settings</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-copy-muted leading-relaxed">
            Collaborate on <span className="font-semibold text-copy-secondary">"{projectName}"</span> in real-time.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="text-xs text-state-error bg-state-error/10 border border-state-error/20 p-3 rounded-2xl animate-in fade-in duration-200">
            {errorMessage}
          </div>
        )}

        {/* Invite section: Owner only */}
        {isOwner && (
          <form onSubmit={handleInviteSubmit} className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-copy-faint uppercase flex items-center gap-1">
              <UserPlus className="h-3 w-3 text-copy-muted" />
              <span>Invite collaborators</span>
            </label>
            <div className="flex gap-2 min-w-0">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={isInviting}
                className="bg-elevated border-default text-xs rounded-xl focus:border-brand h-9 sm:h-10 flex-1 min-w-0"
                required
              />
              <Button
                type="submit"
                disabled={isInviting}
                className="bg-brand text-black hover:bg-brand/90 font-semibold h-9 sm:h-10 rounded-xl px-3 sm:px-4 gap-1.5 shrink-0 transition duration-150 active:scale-[0.98] text-xs sm:text-sm"
              >
                {isInviting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                <span>Invite</span>
              </Button>
            </div>
          </form>
        )}

        {/* Copy project link section: Owner only */}
        {isOwner && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-copy-faint uppercase flex items-center gap-1">
              <Link2 className="h-3 w-3 text-copy-muted" />
              <span>Project invite link</span>
            </label>
            <div className="relative flex items-center bg-elevated border border-default rounded-xl overflow-hidden h-9 sm:h-10 px-3 pr-2 min-w-0">
              <span className="text-xs text-copy-muted truncate flex-1 font-mono min-w-0 select-all leading-none pr-2">
                {typeof window !== "undefined" ? `${window.location.origin}/editor/${projectId}` : `/editor/${projectId}`}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCopyLink}
                className="h-7 px-3 hover:bg-subtle/50 text-copy-secondary hover:text-copy-primary rounded-lg shrink-0 gap-1.5 transition duration-150"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-state-success animate-in zoom-in-50 duration-200" />
                    <span className="text-state-success font-semibold text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* People with Access Section: Both Owner & Collaborators */}
        <div className="space-y-1.5 flex flex-col flex-1 overflow-hidden min-w-0">
          <label className="text-[10px] font-bold tracking-wider text-copy-faint uppercase flex items-center gap-1">
            <Shield className="h-3 w-3 text-copy-muted" />
            <span>People with access</span>
          </label>

          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 gap-2 border border-default rounded-2xl bg-elevated/25">
              <Loader2 className="h-5 w-5 text-brand animate-spin" />
              <span className="text-[10px] text-copy-muted font-mono">Resolving access profiles...</span>
            </div>
          ) : (
            <ScrollArea className="max-h-48 sm:max-h-56 overflow-y-auto border border-default rounded-2xl bg-elevated/20 p-2 pr-1">
              <div className="space-y-2">
                {/* Render Owner */}
                {ownerInfo && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface/40 border border-default/20 min-w-0 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {ownerInfo.avatar ? (
                        <img
                          src={ownerInfo.avatar}
                          alt={ownerInfo.name || ownerInfo.email}
                          className="h-8.5 w-8.5 rounded-full border border-default/60 shrink-0 object-cover"
                        />
                      ) : (
                        <div className="h-8.5 w-8.5 rounded-full bg-brand-dim border border-brand/20 text-brand flex items-center justify-center text-xs font-bold font-mono shrink-0">
                          {renderInitials(ownerInfo)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-copy-primary truncate leading-none">
                            {ownerInfo.name || "Project Owner"}
                          </span>
                          <span className="text-[8px] font-mono font-bold text-brand bg-brand-dim border border-brand/25 px-1 py-0.5 rounded uppercase tracking-wider shrink-0 leading-none">
                            Owner
                          </span>
                        </div>
                        <p className="text-[10px] text-copy-muted truncate mt-1.5 leading-none">
                          {ownerInfo.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render Collaborators */}
                {collaborators.length === 0 ? (
                  !ownerInfo && (
                    <p className="text-xs text-copy-muted text-center py-6">No access list available.</p>
                  )
                ) : (
                  collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-surface/20 border border-transparent hover:border-default/40 hover:bg-elevated/30 transition-all duration-200 group min-w-0 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {collab.avatar ? (
                          <img
                            src={collab.avatar}
                            alt={collab.name || collab.email}
                            className="h-8.5 w-8.5 rounded-full border border-default/60 shrink-0 object-cover"
                          />
                        ) : (
                          <div className="h-8.5 w-8.5 rounded-full bg-subtle border border-default text-copy-secondary flex items-center justify-center text-xs font-bold font-mono shrink-0">
                            {renderInitials(collab)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-copy-primary truncate leading-none">
                            {collab.name || collab.email.split("@")[0]}
                          </p>
                          <p className="text-[10px] text-copy-muted truncate mt-1.5 leading-none">
                            {collab.email}
                          </p>
                        </div>
                      </div>

                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleRemoveCollaborator(collab.email)}
                          className="text-copy-muted hover:text-state-error hover:bg-state-error/10 rounded-lg h-6 w-6 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition duration-150 cursor-pointer shrink-0"
                          aria-label={`Remove collaborator ${collab.email}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
