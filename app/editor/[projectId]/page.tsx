import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import { fetchProjectsForUser } from "@/lib/projects"
import { EditorClient } from "../editor-client"

interface ProjectPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params
  if (!projectId) {
    redirect("/editor")
  }

  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  // 1. Fetch user profile from Clerk and the active project from the database in parallel
  const [user, project] = await Promise.all([
    currentUser(),
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        collaborators: true
      }
    })
  ])

  if (!project) {
    redirect("/editor")
  }

  const emails = user?.emailAddresses.map((e) => e.emailAddress) || []

  const isOwner = project.ownerId === userId
  const isCollaborator = project.collaborators.some((collab: { email: string }) => emails.includes(collab.email))

  // Auth/membership verification
  if (!isOwner && !isCollaborator) {
    redirect("/editor")
  }

  // 2. Fetch all user's projects for the sidebar (requires emails)
  const projects = await fetchProjectsForUser(userId, emails)

  const activeProject = {
    id: project.id,
    name: project.name,
    slug: slugify(project.name),
    isOwner
  }

  return <EditorClient projects={projects} activeProject={activeProject} />
}
