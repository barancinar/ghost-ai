import { redirect } from "next/navigation"
import { fetchProjectsForUser } from "@/lib/projects"
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access"
import { AccessDenied } from "@/components/editor/access-denied"
import { EditorClient } from "../editor-client"
import { slugify } from "@/lib/utils"
import { startPerf } from "@/lib/perf"

interface ProjectPageProps {
  params: Promise<{ roomId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const perf = startPerf("GET /editor/[roomId]")
  const { roomId } = await params
  if (!roomId) {
    redirect("/editor")
  }

  const identity = await getClerkIdentity()
  perf.mark("auth")
  if (!identity) {
    redirect("/sign-in")
  }

  // Access check and sidebar project list are independent (both need only the
  // identity), so run them concurrently instead of chaining the awaits.
  const [accessResult, projects] = await Promise.all([
    checkProjectAccess(roomId, identity.userId, identity.emails),
    fetchProjectsForUser(identity.userId, identity.emails),
  ])
  perf.mark("access+projects")
  perf.end()

  if (!accessResult) {
    return <AccessDenied />
  }

  const { project, isOwner } = accessResult

  const activeProject = {
    id: project.id,
    name: project.name,
    slug: slugify(project.name),
    isOwner
  }

  return <EditorClient projects={projects} activeProject={activeProject} />
}
