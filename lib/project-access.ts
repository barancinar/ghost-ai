import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export interface ClerkIdentity {
  userId: string
  primaryEmail: string | null
  emails: string[]
}

/**
 * Retrieves the current authenticated user's ID, primary email, and all verified emails.
 * Returns null if the user is unauthenticated.
 */
export async function getClerkIdentity(): Promise<ClerkIdentity | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const emails = user?.emailAddresses.map((e) => e.emailAddress) || []
  const primaryEmail = user?.primaryEmailAddress?.emailAddress || null

  return {
    userId,
    primaryEmail,
    emails,
  }
}

interface ProjectWithCollaborators {
  id: string
  name: string
  ownerId: string
  description: string | null
  status: "DRAFT" | "ARCHIVED"
  canvasJsonPath: string | null
  createdAt: Date
  updatedAt: Date
  collaborators: Array<{
    id: string
    projectId: string
    email: string
    createdAt: Date
  }>
}

interface ProjectAccessResult {
  project: ProjectWithCollaborators
  isOwner: boolean
  isCollaborator: boolean
}

/**
 * Checks if a user has access to a project as either the owner or a collaborator.
 * Returns the project and access details if allowed, or null otherwise.
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string,
  emails: string[]
): Promise<ProjectAccessResult | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: true,
    },
  }) as ProjectWithCollaborators | null

  if (!project) return null

  const isOwner = project.ownerId === userId
  const isCollaborator = project.collaborators.some((collab) =>
    emails.includes(collab.email)
  )

  if (!isOwner && !isCollaborator) {
    return null
  }

  return {
    project,
    isOwner,
    isCollaborator,
  }
}
