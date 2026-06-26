import { redirect } from "next/navigation"
import { fetchProjectsForUser } from "@/lib/projects"
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access"
import { AccessDenied } from "@/components/editor/access-denied"
import { EditorClient } from "../editor-client"
import { slugify } from "@/lib/utils"

interface ProjectPageProps {
  params: Promise<{ roomId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { roomId } = await params
  if (!roomId) {
    redirect("/editor")
  }

  const identity = await getClerkIdentity()
  if (!identity) {
    redirect("/sign-in")
  }

  const accessResult = await checkProjectAccess(roomId, identity.userId, identity.emails)
  if (!accessResult) {
    return <AccessDenied />
  }

  const { project, isOwner } = accessResult

  // Fetch all user's projects for the sidebar
  const projects = await fetchProjectsForUser(identity.userId, identity.emails)

  const activeProject = {
    id: project.id,
    name: project.name,
    slug: slugify(project.name),
    isOwner
  }

  return <EditorClient projects={projects} activeProject={activeProject} />
}
