import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import type { Project as PrismaProject } from "@/app/generated/prisma/client"

export interface FormattedProject {
  id: string
  name: string
  slug: string
  isOwner: boolean
}

/**
 * Fetch all projects owned by the user or where the user is listed as a collaborator.
 */
export async function fetchProjectsForUser(
  userId: string,
  emails: string[]
): Promise<FormattedProject[]> {
  const projects = (await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { collaborators: { some: { email: { in: emails } } } }
      ]
    },
    orderBy: {
      createdAt: "desc"
    }
  })) as PrismaProject[]

  return projects.map((project: PrismaProject) => ({
    id: project.id,
    name: project.name,
    slug: slugify(project.name),
    isOwner: project.ownerId === userId
  }))
}
