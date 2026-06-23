"use client"

import React, { useState } from "react"
import {
  Activity,
  Cpu,
  Database,
  GitBranch,
  Layers,
  Network,
  Plus,
  Send,
  Settings,
  Terminal,
  Trash2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"

export default function EditorPage() {
  const [prompt, setPrompt] = useState("")
  const [logs, setLogs] = useState([
    { id: "1", time: "15:42:10", user: "system", msg: "Session initialized successfully." },
    { id: "2", time: "15:42:15", user: "system", msg: "Connected to Liveblocks room 'project-omega'." },
    { id: "3", time: "15:43:02", user: "Alex M.", msg: "Imported starter template 'Monolith Architecture'." },
    { id: "4", time: "15:43:24", user: "Alex M.", msg: "Moved node 'API Gateway' to x: 240, y: 150." },
    { id: "5", time: "15:44:01", user: "Ghost AI", msg: "Generating technical specification draft..." }
  ])
  const [activeTab, setActiveTab] = useState("nodes")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    const now = new Date()
    const timeStr = now.toTimeString().split(" ")[0]
    setLogs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), time: timeStr, user: "You", msg: `Prompted AI: "${prompt}"` },
      { id: crypto.randomUUID(), time: timeStr, user: "Ghost AI", msg: "Processing prompt to generate system nodes..." }
    ])
    setPrompt("")
  }

  return (
    <main className="flex min-h-screen flex-col bg-base font-sans text-copy-primary antialiased">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace Panels Grid */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Control Sidebar */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-default bg-surface/20 p-4 flex flex-col gap-4">
          <Card className="bg-surface border-default rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden">
            <CardHeader className="border-b border-default pb-3">
              <CardTitle className="text-copy-primary flex items-center gap-2">
                <Settings className="h-4 w-4 text-brand" />
                Workspace Panel
              </CardTitle>
              <CardDescription className="text-copy-muted">Manage system primitives & AI generator</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="bg-elevated border border-default p-0.5 rounded-lg w-full mb-3">
                  <TabsTrigger value="nodes" className="flex-1 text-xs py-1.5">
                    Node Presets
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="flex-1 text-xs py-1.5">
                    AI Prompts
                  </TabsTrigger>
                </TabsList>

                {/* Nodes tab */}
                <TabsContent value="nodes" className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold tracking-wider text-copy-muted uppercase">Computing & APIs</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="group flex flex-col gap-1 rounded-xl bg-elevated/40 hover:bg-elevated border border-default hover:border-brand/40 p-3 transition duration-200 cursor-pointer select-none">
                        <Cpu className="h-5 w-5 text-brand group-hover:scale-110 transition duration-300" />
                        <span className="text-xs font-semibold text-copy-primary">App Service</span>
                        <span className="text-[10px] text-copy-muted">REST/GraphQL API</span>
                      </div>
                      <div className="group flex flex-col gap-1 rounded-xl bg-elevated/40 hover:bg-elevated border border-default hover:border-brand/40 p-3 transition duration-200 cursor-pointer select-none">
                        <Layers className="h-5 w-5 text-accent-ai group-hover:scale-110 transition duration-300" />
                        <span className="text-xs font-semibold text-copy-primary">Queue worker</span>
                        <span className="text-[10px] text-copy-muted">Background consumer</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold tracking-wider text-copy-muted uppercase">Storage Layer</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="group flex flex-col gap-1 rounded-xl bg-elevated/40 hover:bg-elevated border border-default hover:border-brand/40 p-3 transition duration-200 cursor-pointer select-none">
                        <Database className="h-5 w-5 text-[#52A8FF] group-hover:scale-110 transition duration-300" />
                        <span className="text-xs font-semibold text-copy-primary">PostgreSQL</span>
                        <span className="text-[10px] text-copy-muted">Relational database</span>
                      </div>
                      <div className="group flex flex-col gap-1 rounded-xl bg-elevated/40 hover:bg-elevated border border-default hover:border-brand/40 p-3 transition duration-200 cursor-pointer select-none">
                        <Database className="h-5 w-5 text-[#BF7AF0] group-hover:scale-110 transition duration-300" />
                        <span className="text-xs font-semibold text-copy-primary">Redis Cache</span>
                        <span className="text-[10px] text-copy-muted">In-memory store</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold tracking-wider text-copy-muted uppercase">Routing & Events</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="group flex flex-col gap-1 rounded-xl bg-elevated/40 hover:bg-elevated border border-default hover:border-brand/40 p-3 transition duration-200 cursor-pointer select-none">
                        <Network className="h-5 w-5 text-[#FF990A] group-hover:scale-110 transition duration-300" />
                        <span className="text-xs font-semibold text-copy-primary">API Gateway</span>
                        <span className="text-[10px] text-copy-muted">Reverse Proxy</span>
                      </div>
                      <div className="group flex flex-col gap-1 rounded-xl bg-elevated/40 hover:bg-elevated border border-default hover:border-brand/40 p-3 transition duration-200 cursor-pointer select-none">
                        <GitBranch className="h-5 w-5 text-[#62C073] group-hover:scale-110 transition duration-300" />
                        <span className="text-xs font-semibold text-copy-primary">Event Bus</span>
                        <span className="text-[10px] text-copy-muted">Pub/sub messaging</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* AI prompt tab */}
                <TabsContent value="ai" className="flex-1 flex flex-col gap-3 overflow-hidden">
                  <form onSubmit={handleSendPrompt} className="flex-1 flex flex-col gap-3 overflow-hidden justify-between">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold tracking-wider text-copy-muted uppercase">Generate Architecture</label>
                      <Textarea
                        placeholder="e.g., Add a Redis cache node next to the Postgres database and create a connection between them..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="bg-elevated border-default text-copy-primary text-xs rounded-xl focus:border-brand h-32 flex-1 resize-none"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-accent-ai hover:bg-accent-ai/90 text-white gap-2 font-medium">
                      <Send className="h-3.5 w-3.5" />
                      <span>Run AI Designer</span>
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="border-t border-default bg-subtle/50 px-4 py-2 flex items-center justify-between text-xs text-copy-muted">
              <span>Status: Synchronized</span>
              <span className="h-2 w-2 rounded-full bg-state-success"></span>
            </CardFooter>
          </Card>
        </aside>

        {/* Center Panel - Simulated Canvas */}
        <section className="flex-1 bg-[#080809] relative p-6 flex items-center justify-center overflow-hidden border-b lg:border-b-0 border-default select-none">
          {/* Canvas Dot Grid Background */}
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: "radial-gradient(var(--border-subtle) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }}></div>

          {/* Canvas Snapshots Display */}
          <div className="relative w-full max-w-2xl aspect-[16/10] bg-surface/10 border border-default rounded-3xl p-6 shadow-2xl flex flex-col justify-between backdrop-blur-xs">
            {/* Mock Nodes Group */}
            <div className="absolute inset-0 p-8 flex flex-col gap-6 justify-between pointer-events-none">
              
              {/* Row 1: Gateway */}
              <div className="flex justify-center">
                <div className="bg-[#331B00] border border-[#FF990A] text-[#FF990A] px-4 py-2 rounded-xl text-xs font-mono shadow-lg flex items-center gap-2 pointer-events-auto hover:scale-105 transition duration-300">
                  <Network className="h-3.5 w-3.5" />
                  <span>api-gateway (Gateway)</span>
                </div>
              </div>

              {/* Row 2: Services */}
              <div className="flex justify-around items-center">
                {/* Node 1 */}
                <div className="bg-[#10233D] border border-[#52A8FF] text-[#52A8FF] px-4 py-2 rounded-xl text-xs font-mono shadow-lg flex items-center gap-2 pointer-events-auto hover:scale-105 transition duration-300">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>app-service (Monolith)</span>
                </div>

                {/* Connection visual arrows (Mock) */}
                <div className="hidden sm:flex flex-col items-center text-copy-faint select-none">
                  <span className="text-[10px] font-mono">sync</span>
                  <div className="w-16 h-px bg-gradient-to-r from-[#52A8FF] to-[#BF7AF0]"></div>
                </div>

                {/* Node 2 */}
                <div className="bg-[#2E1938] border border-[#BF7AF0] text-[#BF7AF0] px-4 py-2 rounded-xl text-xs font-mono shadow-lg flex items-center gap-2 pointer-events-auto hover:scale-105 transition duration-300">
                  <Layers className="h-3.5 w-3.5" />
                  <span>queue-worker (Worker)</span>
                </div>
              </div>

              {/* Row 3: Database & Cache */}
              <div className="flex justify-around">
                {/* Postgres Node */}
                <div className="bg-[#0F2E18] border border-[#62C073] text-[#62C073] px-4 py-2 rounded-xl text-xs font-mono shadow-lg flex items-center gap-2 pointer-events-auto hover:scale-105 transition duration-300">
                  <Database className="h-3.5 w-3.5" />
                  <span>postgres-main (DB)</span>
                </div>

                {/* Redis Node */}
                <div className="bg-[#3C1618] border border-[#FF6166] text-[#FF6166] px-4 py-2 rounded-xl text-xs font-mono shadow-lg flex items-center gap-2 pointer-events-auto hover:scale-105 transition duration-300">
                  <Database className="h-3.5 w-3.5" />
                  <span>redis-cache (Cache)</span>
                </div>
              </div>

            </div>

            {/* Custom Interactive Floating Canvas Controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-surface border border-default p-1 rounded-xl shadow-lg pointer-events-auto">
              <Button size="icon-xs" variant="ghost" className="rounded-lg hover:bg-elevated text-copy-primary">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <span className="h-3 w-px bg-default"></span>
              <Button size="icon-xs" variant="ghost" className="rounded-lg hover:bg-elevated text-state-error">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Simulated Live Collaborator Cursors */}
            <div className="absolute top-24 left-1/4 flex flex-col items-start pointer-events-none">
              <div className="w-0.5 h-3 bg-brand shadow-lg animate-pulse"></div>
              <div className="bg-brand text-black px-1.5 py-0.5 rounded text-[8px] font-semibold font-mono">
                Alex M.
              </div>
            </div>
            <div className="absolute bottom-28 right-1/3 flex flex-col items-start pointer-events-none">
              <div className="w-0.5 h-3 bg-accent-ai shadow-lg animate-pulse"></div>
              <div className="bg-accent-ai text-white px-1.5 py-0.5 rounded text-[8px] font-semibold font-mono">
                Ghost AI
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel - Session Activity Log */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-default bg-surface/20 p-4 flex flex-col gap-4">
          <Card className="bg-surface border-default rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden">
            <CardHeader className="border-b border-default pb-3">
              <CardTitle className="text-copy-primary flex items-center gap-2">
                <Terminal className="h-4 w-4 text-accent-ai" />
                Session Activity
              </CardTitle>
              <CardDescription className="text-copy-muted">Real-time collaborative transaction logs</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
              {/* ScrollArea implementation */}
              <ScrollArea className="flex-1 bg-base/40 border border-default rounded-xl p-3 pr-2.5">
                <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-2 items-start border-b border-default/30 pb-2 last:border-0 last:pb-0">
                      <span className="text-copy-faint select-none shrink-0">{log.time}</span>
                      <div>
                        <span className={`font-semibold shrink-0 ${
                          log.user === "Ghost AI" ? "text-accent-ai-text" :
                          log.user === "system" ? "text-state-warning" :
                          log.user === "You" ? "text-brand" : "text-copy-secondary"
                        }`}>
                          [{log.user}]
                        </span>{" "}
                        <span className="text-copy-secondary break-words">{log.msg}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Log filter input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Activity className="absolute left-2.5 top-2 h-3.5 w-3.5 text-copy-muted" />
                  <Input
                    placeholder="Filter transaction log..."
                    className="pl-8 bg-elevated border-default text-xs rounded-xl"
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}
