"use client"

import React, { useEffect, useState } from "react"
import { FileCode, Download, Loader2, AlertCircle, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Metadata for a single generated spec (no content — that is fetched lazily). */
interface SpecMeta {
  id: string
  createdAt: string
  filename: string
}

interface SpecListProps {
  projectId: string
  /** Bump to force a re-fetch of the list (e.g. after generating a new spec). */
  refreshKey?: number
}

/** Build the secure, access-checked download endpoint for a spec. */
function downloadUrl(projectId: string, specId: string): string {
  return `/api/projects/${projectId}/specs/${specId}/download`
}

/** Format an ISO timestamp as a short, human-readable date + time. */
function formatCreatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Specs tab list. Fetches the current project's spec metadata from the
 * `ProjectSpec` API, renders a compact, scrollable list, and lets the user
 * preview (rendered Markdown, fetched on demand) or download each spec. Spec
 * content is never held long-term — it is fetched when a preview opens and
 * dropped when it closes.
 */
export function SpecList({ projectId, refreshKey = 0 }: SpecListProps) {
  const [specs, setSpecs] = useState<SpecMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SpecMeta | null>(null)

  useEffect(() => {
    let cancelled = false
    setSpecs(null)
    setError(null)

    fetch(`/api/projects/${projectId}/specs`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load specs")
        return (await res.json()) as { specs: SpecMeta[] }
      })
      .then((data) => {
        if (!cancelled) setSpecs(data.specs ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setSpecs([])
          setError("Couldn't load specs. Please try again.")
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId, refreshKey])

  // Trigger a browser download via the access-checked download endpoint. The
  // route responds with a `Content-Disposition: attachment` header, so a plain
  // anchor navigation (with cookies) lets the browser handle the file.
  const handleDownload = (spec: SpecMeta) => {
    const a = document.createElement("a")
    a.href = downloadUrl(projectId, spec.id)
    a.download = spec.filename
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <p className="text-[10px] font-semibold text-muted-text uppercase tracking-wider pl-0.5 mb-3">
        Generated Specifications
      </p>

      {specs === null ? (
        <div className="flex flex-1 items-center justify-center text-muted-text">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : specs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-ai/10 text-accent-ai border border-accent-ai/20 mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-[11px] text-muted-text leading-relaxed max-w-[220px]">
            {error ?? "No specs yet. Generate a spec to see it listed here."}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-1 px-1">
          <ul className="space-y-2">
            {specs.map((spec) => (
              <li key={spec.id}>
                <div className="group flex items-center gap-2.5 rounded-xl border border-surface-border bg-elevated p-2.5 transition-all duration-200 hover:border-brand-dim">
                  <button
                    type="button"
                    onClick={() => setSelected(spec)}
                    className="flex flex-1 items-center gap-2.5 min-w-0 text-left cursor-pointer"
                    aria-label={`Preview ${spec.filename}`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-ai/10 text-accent-ai border border-accent-ai/20">
                      <FileCode className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-primary-text truncate">
                        {spec.filename}
                      </h5>
                      <p className="text-[10px] text-muted-text mt-0.5">
                        {formatCreatedAt(spec.createdAt)}
                      </p>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDownload(spec)}
                    aria-label={`Download ${spec.filename}`}
                    className="shrink-0 text-muted-text hover:text-primary-text"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        {selected && (
          <DialogContent className="theme-ai flex max-h-[80vh] w-full flex-col gap-3 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary-text">
                <FileCode className="h-4 w-4 text-accent-ai" />
                <span className="truncate">{selected.filename}</span>
              </DialogTitle>
              <DialogDescription className="text-muted-text">
                Generated {formatCreatedAt(selected.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <SpecPreview projectId={projectId} specId={selected.id} />

            <div className="flex justify-end pt-1">
              <Button
                onClick={() => handleDownload(selected)}
                className="bg-accent-ai hover:bg-accent-ai/90 text-white text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Markdown</span>
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

/**
 * Fetches a single spec's Markdown content (through the download endpoint, never
 * the Blob directly) and renders it. Mounted only while the preview is open, so
 * the content is dropped from memory when the modal closes.
 */
function SpecPreview({ projectId, specId }: { projectId: string; specId: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setContent(null)
    setError(null)

    fetch(downloadUrl(projectId, specId))
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load spec")
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this spec's content.")
      })

    return () => {
      cancelled = true
    }
  }, [projectId, specId])

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-state-error/30 bg-state-error/10 px-3 py-2 text-xs text-state-error">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (content === null) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-text">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  return (
    // A single element with `overflow-y-auto` + `max-height` scrolls natively —
    // unlike the Base UI ScrollArea (whose viewport uses `height: 100%`, which
    // can't resolve inside the dialog's `max-h` chain, so it never scrolled and
    // the content overflowed the modal).
    <div className="min-h-0 flex-1 max-h-[60vh] overflow-y-auto overscroll-contain break-words themed-scrollbar rounded-xl border border-surface-border bg-base/50 p-4">
      <Markdown content={content} />
    </div>
  )
}

/** Render `**bold**`, `` `code` ``, and `*italic*` inline spans. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let lastIndex = 0
  let i = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    const key = `${keyPrefix}-${i++}`
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-primary-text">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-subtle px-1 py-0.5 font-mono text-xs text-accent-ai-text"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

/**
 * Minimal, dependency-free Markdown renderer covering the block elements our
 * generated specs use: headings, ordered/unordered lists, code fences,
 * blockquotes, horizontal rules, and paragraphs (with inline bold/code/italic).
 */
function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  const isBlockStart = (line: string) =>
    /^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>|```)/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i])
        i++
      }
      i++ // skip the closing fence
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto themed-scrollbar rounded-lg border border-surface-border bg-base p-3 font-mono text-xs leading-relaxed text-copy-secondary"
        >
          <code>{code.join("\n")}</code>
        </pre>
      )
      continue
    }

    // Headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      blocks.push(
        <p
          key={key++}
          className={cn(
            "font-semibold text-primary-text",
            level <= 2 ? "mt-2 text-base" : "mt-1 text-sm"
          )}
        >
          {renderInline(heading[2], `h${key}`)}
        </p>
      )
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="border-surface-border" />)
      i++
      continue
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      const quote: string[] = []
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""))
        i++
      }
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-2 border-accent-ai/40 pl-3 italic text-copy-secondary"
        >
          {renderInline(quote.join(" "), `q${key}`)}
        </blockquote>
      )
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""))
        i++
      }
      blocks.push(
        <ul key={key++} className="list-disc space-y-1 pl-5 text-copy-secondary">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `ul${key}-${idx}`)}</li>
          ))}
        </ul>
      )
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""))
        i++
      }
      blocks.push(
        <ol key={key++} className="list-decimal space-y-1 pl-5 text-copy-secondary">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `ol${key}-${idx}`)}</li>
          ))}
        </ol>
      )
      continue
    }

    // Blank line
    if (line.trim() === "") {
      i++
      continue
    }

    // Paragraph — gather consecutive non-blank, non-block lines
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="leading-relaxed text-copy-secondary">
        {renderInline(para.join(" "), `p${key}`)}
      </p>
    )
  }

  return <div className="space-y-2.5 text-[13px]">{blocks}</div>
}
