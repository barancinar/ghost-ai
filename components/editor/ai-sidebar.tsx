"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Sparkles, X, Send, Bot, Loader2, MessageSquare, AlertCircle } from "lucide-react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { useEventListener, useMyPresence, useBroadcastEvent, useSelf } from "@liveblocks/react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpecList } from "@/components/editor/spec-list"
import { cn } from "@/lib/utils"
import {
  parseAiStatusMessage,
  parseAiChatMessage,
  isActivePhase,
  defaultStatusText,
  type AiStatusMessage,
  type AiChatMessage,
  type AiChatRole,
} from "@/types/tasks"
import type { designAgentTask } from "@/trigger/design-agent"
import type { generateSpecTask } from "@/trigger/generate-spec"

/** Display name used for messages authored by the design agent. */
const AI_SENDER = "Ghost AI"

/** A validated `ai-chat` message plus whether this client authored it (used
 *  only for alignment/styling — the wire payload is just `AiChatMessage`). */
interface ChatEntry {
  message: AiChatMessage
  mine: boolean
}

interface ActiveRun {
  runId: string
  accessToken: string
}

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function AiSidebar({ isOpen, onClose, projectId }: AiSidebarProps) {
  const [activeTab, setActiveTab] = useState<string>("architect")
  const [inputValue, setInputValue] = useState("")
  // Local flag for the brief window between hitting "send" and the run being
  // registered (before the shared feed reports the run as active).
  const [isStarting, setIsStarting] = useState(false)
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null)
  // Latest validated message from the shared `ai-status-feed`. This is broadcast
  // to every participant, so all sidebars in the room render the same status.
  const [feedStatus, setFeedStatus] = useState<AiStatusMessage | null>(null)
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)
  // Bumped after a generation completes to force the spec list to re-fetch.
  const [specRefreshKey, setSpecRefreshKey] = useState(0)
  // The active spec-generation run (if any) and any surfaced error.
  const [activeSpecRun, setActiveSpecRun] = useState<ActiveRun | null>(null)
  const [specError, setSpecError] = useState<string | null>(null)

  // Single collaborative conversation over the room-scoped `ai-chat` feed.
  // Both the design prompts / AI replies (Architect tab) and free-form team
  // messages (Chat tab) flow through this one feed, so every participant sees
  // the same conversation in real time. It stays separate from the
  // `ai-status-feed` (AI progress/presence), which is a different channel.
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatError, setChatError] = useState<string | null>(null)

  const [, updateMyPresence] = useMyPresence()
  const broadcast = useBroadcastEvent()
  const self = useSelf()

  // Whether AI generation is active anywhere in the room. Derived from the
  // shared feed (visible to everyone) plus this client's own pending run, so the
  // input/send button lock for every participant while the AI is working.
  const feedActive = feedStatus != null && isActivePhase(feedStatus.phase)
  const isGenerating = isStarting || activeRun != null || feedActive

  // Whether *this* user initiated the active run — used to reflect a `thinking`
  // spinner on their own live cursor for everyone else.
  const iAmGenerating = isStarting || activeRun != null

  const statusText = feedStatus
    ? feedStatus.text ?? defaultStatusText(feedStatus.phase)
    : "Ghost AI is starting…"

  // Broadcast this user's thinking state into presence so their cursor badge
  // shows a spinner to other collaborators while their run is in progress.
  useEffect(() => {
    updateMyPresence({ thinking: iAmGenerating })
    return () => {
      // Ensure we never leave a stale "thinking" flag behind on unmount.
      updateMyPresence({ thinking: false })
    }
  }, [iAmGenerating, updateMyPresence])

  // Subscribe to the shared AI status feed, validating each payload before use.
  useEventListener(({ event }) => {
    if (event.type !== "AI_STATUS") return
    const parsed = parseAiStatusMessage(event)
    if (parsed) setFeedStatus(parsed)
  })

  // Subscribe to the separate `ai-chat` feed. Every payload is validated before
  // rendering, and this stays isolated from the AI status feed above.
  useEventListener(({ event }) => {
    if (event.type !== "AI_CHAT") return
    const parsed = parseAiChatMessage(event.message)
    if (parsed) {
      setChatMessages((prev) => [...prev, { message: parsed, mine: false }])
    }
  })

  // Publish a message to the shared `ai-chat` feed: broadcast it to every other
  // participant and mirror it locally (broadcastEvent does not echo to the
  // sender). Returns whether it was published. `mine` only drives local
  // alignment/styling; the wire payload is a plain `AiChatMessage`.
  const publishChat = useCallback(
    (role: AiChatRole, content: string, sender: string, mine: boolean): boolean => {
      const message: AiChatMessage = {
        id: `${self?.connectionId ?? "ai"}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        sender,
        role,
        content,
        timestamp: Date.now(),
      }
      const parsed = parseAiChatMessage(message)
      if (!parsed) return false
      try {
        broadcast({ type: "AI_CHAT", message: parsed })
      } catch {
        // Not connected to the room — still mirror locally so this client sees
        // its own message; other participants simply won't receive it.
      }
      setChatMessages((prev) => [...prev, { message: parsed, mine }])
      return true
    },
    [broadcast, self]
  )

  // Emit an assistant (design agent) message to the shared feed.
  const addAssistantMessage = useCallback(
    (content: string) => {
      publishChat("assistant", content, AI_SENDER, false)
    },
    [publishChat]
  )

  const handleRunComplete = useCallback(
    (summary: string) => {
      addAssistantMessage(summary)
      setIsStarting(false)
      setActiveRun(null)
    },
    [addAssistantMessage]
  )

  const handleRunError = useCallback(
    (message: string) => {
      // Surface run failures as messages in the `ai-chat` feed (per spec).
      addAssistantMessage(message)
      setIsStarting(false)
      setActiveRun(null)
    },
    [addAssistantMessage]
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the design conversation to bottom
  useEffect(() => {
    if (activeTab === "architect") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, isGenerating, activeTab])

  // Auto-scroll the team chat to the latest message
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, activeTab])

  // Handle textarea auto-resize
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 72), 160)}px`
    }
  }, [inputValue])

  const handleSend = async (text: string) => {
    const prompt = text.trim()
    if (!prompt || isGenerating) return

    // Push the user's design prompt to the shared `ai-chat` feed so it appears
    // for every participant in the room, then kick off the design agent.
    const senderName = self?.info?.name?.trim() || "You"
    publishChat("user", prompt, senderName, true)
    setInputValue("")
    setIsStarting(true)

    try {
      // 1. Trigger the durable design agent background task.
      const triggerRes = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, roomId: projectId, projectId }),
      })
      if (!triggerRes.ok) {
        throw new Error("Failed to start the design agent.")
      }
      const { runId } = (await triggerRes.json()) as { runId: string }

      // 2. Exchange the run id for a read-only, run-scoped access token so we
      //    can subscribe to its realtime progress from the browser.
      const tokenRes = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })
      if (!tokenRes.ok) {
        throw new Error("Failed to authorize the design run.")
      }
      const { token } = (await tokenRes.json()) as { token: string }

      setActiveRun({ runId, accessToken: token })
      // From here the run is tracked via `activeRun`; hand off the local flag.
      setIsStarting(false)
    } catch (error) {
      handleRunError(
        error instanceof Error
          ? `Ghost AI couldn't start: ${error.message}`
          : "Ghost AI couldn't start the design."
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(inputValue)
    }
  }

  // Send a message to the collaborative `ai-chat` feed. Broadcasts to everyone
  // else in the room and mirrors it locally (broadcastEvent does not echo back
  // to the sender). Does NOT trigger any backend AI task.
  const handleSendChat = () => {
    const content = chatInput.trim()
    if (!content) return

    const senderName = self?.info?.name?.trim()
    if (!self || !senderName) {
      setChatError("You must be connected to the room to send a message.")
      return
    }

    if (publishChat("user", content, senderName, true)) {
      setChatInput("")
      setChatError(null)
    } else {
      setChatError("Couldn't send your message. Please try again.")
    }
  }

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendChat()
    }
  }

  // Finalize a spec run: stop the spinner and refresh the list so the newly
  // persisted spec appears.
  const handleSpecComplete = useCallback(() => {
    setActiveSpecRun(null)
    setIsGeneratingSpec(false)
    setSpecRefreshKey((k) => k + 1)
  }, [])

  const handleSpecError = useCallback((message: string) => {
    setActiveSpecRun(null)
    setIsGeneratingSpec(false)
    setSpecError(message)
  }, [])

  const handleGenerateSpec = async () => {
    if (isGeneratingSpec) return
    setIsGeneratingSpec(true)
    setSpecError(null)

    try {
      // Ground the spec in the current canvas graph. We read the last autosaved
      // canvas (the debounced autosave keeps this current) rather than reaching
      // into React Flow, since the sidebar sits outside the canvas provider.
      let nodes: unknown[] = []
      let edges: unknown[] = []
      try {
        const canvasRes = await fetch(`/api/projects/${projectId}/canvas`)
        if (canvasRes.ok) {
          const canvas = (await canvasRes.json()) as {
            nodes?: unknown[]
            edges?: unknown[]
          }
          nodes = canvas.nodes ?? []
          edges = canvas.edges ?? []
        }
      } catch {
        // Fall back to an empty canvas; the task tolerates it.
      }

      const chatHistory = chatMessages.map((entry) => ({
        sender: entry.message.sender,
        role: entry.message.role,
        content: entry.message.content,
      }))

      // 1. Trigger the durable spec-generation task.
      const triggerRes = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: projectId, chatHistory, nodes, edges }),
      })
      if (!triggerRes.ok) throw new Error("Failed to start spec generation.")
      const { runId } = (await triggerRes.json()) as { runId: string }

      // 2. Exchange the run id for a run-scoped realtime token.
      const tokenRes = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })
      if (!tokenRes.ok) throw new Error("Failed to authorize spec generation.")
      const { token } = (await tokenRes.json()) as { token: string }

      // 3. Hand off to the watcher, which finalizes on the terminal run status.
      setActiveSpecRun({ runId, accessToken: token })
    } catch (error) {
      handleSpecError(
        error instanceof Error
          ? `Couldn't generate spec: ${error.message}`
          : "Couldn't start spec generation."
      )
    }
  }

  const starterChips = [
    "Design an e-commerce backend",
    "Create a chat app architecture",
    "Build a CI/CD pipeline",
  ]

  return (
    <aside
      className={cn(
        "fixed top-14 right-0 bottom-0 z-30 flex w-80 flex-col border-l border-surface-border bg-base/95 backdrop-blur-md shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out theme-ai",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%+8px)]"
      )}
      inert={!isOpen}
    >
      {/* Sidebar Header */}
      <div className="flex h-12 items-center justify-between border-b border-surface-border px-4 bg-surface/20">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-ai/10 text-accent-ai border border-accent-ai/20 shadow-[0_0_12px_rgba(100,87,249,0.15)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-primary-text leading-tight">AI Workspace</h3>
            <p className="text-[10px] text-muted-text">Collaborate with Ghost AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Shared AI activity indicator — visible to every participant while
              generation is active anywhere in the room. */}
          {isGenerating && (
            <div
              className="flex items-center gap-1.5 rounded-full border border-accent-ai/30 bg-accent-ai/10 px-2 py-0.5 animate-in fade-in duration-200"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-accent-ai" />
              <span className="text-[10px] font-medium text-accent-ai">Working</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Close AI workspace"
            className="text-muted-text hover:text-primary-text"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Selector wrapper */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b border-surface-border px-4 py-2 bg-surface/10">
          <TabsList className="grid w-full grid-cols-3 bg-subtle/50 p-0.5 rounded-xl">
            <TabsTrigger
              value="architect"
              className="rounded-lg py-1.5 text-xs font-medium transition-all data-[active]:bg-accent data-[active]:text-white text-muted-text hover:text-primary-text cursor-pointer"
            >
              Architect
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="rounded-lg py-1.5 text-xs font-medium transition-all data-[active]:bg-accent data-[active]:text-white text-muted-text hover:text-primary-text cursor-pointer"
            >
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-lg py-1.5 text-xs font-medium transition-all data-[active]:bg-accent data-[active]:text-white text-muted-text hover:text-primary-text cursor-pointer"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content AI Architect */}
        <TabsContent
          value="architect"
          className="flex flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden data-[active]:flex"
        >
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 min-h-full flex flex-col justify-end">
              {chatMessages.length === 0 && !isGenerating ? (
                /* Empty state — yields to the shared status indicator so that even
                   participants who didn't prompt still see AI activity. */
                <div className="flex flex-col items-center justify-center text-center py-6 px-2 my-auto">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-ai/10 text-accent-ai border border-accent-ai/20 shadow-[0_0_15px_rgba(100,87,249,0.2)] mb-4">
                    <Bot className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-semibold text-primary-text mb-1">Architecture Design Chat</h4>
                  <p className="text-[11px] text-muted-text leading-relaxed max-w-[220px] mb-6">
                    Ask me to generate a system structure or build architectural flows directly on your canvas.
                  </p>
                  <div className="w-full space-y-2">
                    <p className="text-[10px] font-semibold text-muted-text uppercase tracking-wider text-left pl-1">
                      Starter Prompts
                    </p>
                    {starterChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(chip)}
                        className="w-full text-left bg-subtle hover:bg-subtle/80 text-accent-text text-[11px] font-medium py-2 px-3.5 rounded-xl border border-surface-border/50 transition-all duration-200 cursor-pointer block hover:translate-x-0.5"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Message list — the shared `ai-chat` conversation (design
                   prompts + AI replies), collaborative across all sessions. */
                <div className="space-y-4">
                  {chatMessages.map((entry) => (
                    <ChatBubble key={entry.message.id} entry={entry} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Message Input Bottom Area */}
          <div className="p-4 border-t border-surface-border bg-surface/20">
            {/* Status strip — compact bar reflecting the latest `ai-status-feed`
                message. Only shown while a run is active anywhere in the room. */}
            {isGenerating && (
              <div
                className="mb-2 flex items-center gap-2 rounded-lg border border-accent-green/30 bg-elevated px-3 py-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200"
                role="status"
                aria-live="polite"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
                </span>
                <span className="truncate text-[11px] font-medium text-accent-green">
                  {statusText}
                </span>
              </div>
            )}
            <div className="relative flex items-end gap-2 bg-elevated border border-surface-border rounded-xl p-1.5 focus-within:border-accent-green/40 focus-within:ring-1 focus-within:ring-accent-green/40 transition-all duration-200">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isGenerating
                    ? "Ghost AI is working…"
                    : "Ask Ghost AI to design..."
                }
                className="flex-1 min-h-[72px] max-h-[160px] resize-none bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2.5 py-2 text-xs text-primary-text placeholder:text-muted-text outline-none overflow-y-auto disabled:opacity-60"
                disabled={isGenerating}
              />
              <Button
                onClick={() => handleSend(inputValue)}
                size="icon"
                disabled={isGenerating || !inputValue.trim()}
                aria-label={isGenerating ? "Ghost AI is working" : "Send message"}
                className="bg-accent-green hover:bg-accent-green/90 text-[var(--bg-base)] rounded-lg h-8 w-8 flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab content Team Chat — collaborative room chat over the separate
            `ai-chat` feed. No AI replies and no backend tasks are triggered. */}
        <TabsContent
          value="chat"
          className="flex flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden data-[active]:flex"
        >
          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 min-h-full flex flex-col justify-end">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-6 px-2 my-auto">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-ai/10 text-accent-ai border border-accent-ai/20 shadow-[0_0_15px_rgba(100,87,249,0.2)] mb-4">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-semibold text-primary-text mb-1">Team Chat</h4>
                  <p className="text-[11px] text-muted-text leading-relaxed max-w-[220px]">
                    Chat in real time with everyone in this room. Messages appear for all collaborators.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((entry) => (
                    <ChatBubble key={entry.message.id} entry={entry} />
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat input */}
          <div className="p-4 border-t border-surface-border bg-surface/20">
            {chatError && (
              <div
                className="mb-2 flex items-center gap-1.5 rounded-lg border border-state-error/30 bg-state-error/10 px-2.5 py-1.5 text-[11px] text-state-error"
                role="alert"
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{chatError}</span>
              </div>
            )}
            <div className="relative flex items-end gap-2 bg-elevated border border-surface-border rounded-xl p-1.5 focus-within:border-accent-green/40 focus-within:ring-1 focus-within:ring-accent-green/40 transition-all duration-200">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Message your team..."
                className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2.5 py-2 text-xs text-primary-text placeholder:text-muted-text outline-none overflow-y-auto"
              />
              <Button
                onClick={handleSendChat}
                size="icon"
                disabled={!chatInput.trim()}
                aria-label="Send chat message"
                className="bg-accent-green hover:bg-accent-green/90 text-[var(--bg-base)] rounded-lg h-8 w-8 flex items-center justify-center shrink-0 shadow-md cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab content Specs */}
        <TabsContent
          value="specs"
          className="flex flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden data-[active]:flex p-4"
        >
          <div className="space-y-4 flex-1 flex flex-col">
            <div>
              <Button
                onClick={handleGenerateSpec}
                disabled={isGeneratingSpec}
                className="w-full bg-accent hover:bg-accent/90 text-white py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-accent-ai/10 hover:shadow-accent-ai/20 transition-all duration-200"
              >
                {isGeneratingSpec ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing Canvas graph...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate Spec</span>
                  </>
                )}
              </Button>
            </div>

            {specError && (
              <div
                className="flex items-start gap-1.5 rounded-lg border border-state-error/30 bg-state-error/10 px-2.5 py-2 text-[11px] text-state-error"
                role="alert"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
                <span>{specError}</span>
              </div>
            )}

            <SpecList projectId={projectId} refreshKey={specRefreshKey} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Subscribes to the active design run's realtime progress. Keyed by runId
          so each new run gets a fresh subscription. */}
      {activeRun && (
        <DesignRunWatcher
          key={activeRun.runId}
          runId={activeRun.runId}
          accessToken={activeRun.accessToken}
          onComplete={handleRunComplete}
          onError={handleRunError}
        />
      )}

      {/* Subscribes to the active spec-generation run. On the terminal status it
          refreshes the spec list (success) or surfaces an error. */}
      {activeSpecRun && (
        <SpecRunWatcher
          key={activeSpecRun.runId}
          runId={activeSpecRun.runId}
          accessToken={activeSpecRun.accessToken}
          onComplete={handleSpecComplete}
          onError={handleSpecError}
        />
      )}
    </aside>
  )
}

/** Format a chat message timestamp (epoch ms) as a short local time. */
function formatChatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Renders a single message from the shared `ai-chat` feed. Design-agent replies
 * (`role: "assistant"`) render as a dark AI bubble on the left; the local user's
 * own messages render right-aligned with the green accent; everyone else's
 * messages render as a dark bubble on the left with the sender's name.
 */
function ChatBubble({ entry }: { entry: ChatEntry }) {
  const { message, mine } = entry
  const isAI = message.role === "assistant"
  const alignRight = mine && !isAI
  const label = isAI ? AI_SENDER : mine ? "You" : message.sender

  return (
    <div
      className={cn(
        "flex flex-col gap-1 text-xs",
        alignRight ? "items-end" : "items-start"
      )}
    >
      <div className="flex items-center gap-1.5 px-1 text-[10px] text-muted-text">
        <span className="font-medium text-copy-secondary">{label}</span>
        <span aria-hidden>·</span>
        <span>{formatChatTime(message.timestamp)}</span>
      </div>
      <div
        className={cn(
          "rounded-2xl px-3 py-2.5 max-w-[90%] leading-relaxed whitespace-pre-line text-left shadow-sm break-words",
          alignRight
            ? "bg-accent-green text-[var(--bg-base)] rounded-tr-xs"
            : "bg-elevated border border-surface-border text-copy-secondary rounded-tl-xs"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

interface DesignRunWatcherProps {
  runId: string
  accessToken: string
  onComplete: (summary: string) => void
  onError: (message: string) => void
}

const TERMINAL_STATUSES = [
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "CRASHED",
  "TIMED_OUT",
  "SYSTEM_FAILURE",
  "INTERRUPTED",
]

/**
 * Headless component that subscribes to a single design agent run via
 * Trigger.dev realtime and finalizes it (assistant summary / error) back in the
 * sidebar. Interim status is delivered separately through the shared
 * `ai-status-feed`, so this watcher only cares about the terminal outcome.
 */
function DesignRunWatcher({
  runId,
  accessToken,
  onComplete,
  onError,
}: DesignRunWatcherProps) {
  const { run, error } = useRealtimeRun<typeof designAgentTask>(runId, {
    accessToken,
  })

  const finalizedRef = useRef(false)

  // Handle subscription/transport errors.
  useEffect(() => {
    if (error && !finalizedRef.current) {
      finalizedRef.current = true
      onError(`Ghost AI connection error: ${error.message}`)
    }
  }, [error, onError])

  // Finalize once the run reaches a terminal state.
  useEffect(() => {
    if (!run || finalizedRef.current) return
    if (!TERMINAL_STATUSES.includes(run.status)) return

    finalizedRef.current = true
    const output = run.output

    if (run.status === "COMPLETED" && output && output.ok !== false) {
      onComplete(output.summary || "Ghost AI finished updating the canvas.")
    } else {
      const failureMessage =
        output && output.ok === false && output.error
          ? `Ghost AI couldn't complete the design: ${output.error}`
          : "Ghost AI couldn't complete the design. Please try again."
      onError(failureMessage)
    }
  }, [run, onComplete, onError])

  return null
}

interface SpecRunWatcherProps {
  runId: string
  accessToken: string
  onComplete: () => void
  onError: (message: string) => void
}

/**
 * Headless watcher for a single spec-generation run. Mirrors `DesignRunWatcher`:
 * it subscribes via Trigger.dev realtime and fires `onComplete` (which refreshes
 * the persisted spec list) or `onError` once the run reaches a terminal state.
 */
function SpecRunWatcher({
  runId,
  accessToken,
  onComplete,
  onError,
}: SpecRunWatcherProps) {
  const { run, error } = useRealtimeRun<typeof generateSpecTask>(runId, {
    accessToken,
  })

  const finalizedRef = useRef(false)

  useEffect(() => {
    if (error && !finalizedRef.current) {
      finalizedRef.current = true
      onError(`Ghost AI connection error: ${error.message}`)
    }
  }, [error, onError])

  useEffect(() => {
    if (!run || finalizedRef.current) return
    if (!TERMINAL_STATUSES.includes(run.status)) return

    finalizedRef.current = true
    const output = run.output

    if (run.status === "COMPLETED" && output && output.ok !== false) {
      onComplete()
    } else {
      const failureMessage =
        output && output.ok === false && output.error
          ? output.quotaExceeded
            ? "Ghost AI is out of API quota — check the Gemini API billing/plan and try again."
            : `Ghost AI couldn't generate the spec: ${output.error}`
          : "Ghost AI couldn't generate the spec. Please try again."
      onError(failureMessage)
    }
  }, [run, onComplete, onError])

  return null
}
