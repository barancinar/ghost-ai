import { auth, getAuth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export interface ClerkIdentity {
  userId: string
  primaryEmail: string | null
  emails: string[]
  firstName: string | null
  lastName: string | null
  username: string | null
  imageUrl: string | null
}

/**
 * Short-TTL in-memory cache for Clerk Backend API user lookups.
 *
 * The Clerk `userId` is available for free from the session JWT, but reading a
 * user's email addresses / profile requires a network round-trip to Clerk's
 * Backend API. A single editor load fans out to several requests (page render,
 * liveblocks-auth, canvas GET, collaborators), each of which previously repeated
 * that same round-trip. Caching the user object by id collapses those repeated
 * lookups into one call. A user's own email set / profile changes rarely, and
 * access is still authorized against the live `project.collaborators` list read
 * from Postgres on every request — so revoking access takes effect immediately
 * regardless of this cache.
 */
interface CachedClerkUser {
  user: any
  expiresAt: number
}

const CLERK_USER_TTL_MS = 60_000

const globalForClerk = globalThis as unknown as {
  clerkUserCache?: Map<string, CachedClerkUser>
}

const clerkUserCache =
  globalForClerk.clerkUserCache ?? (globalForClerk.clerkUserCache = new Map())

/**
 * Fetches a Clerk user by id, served from a short-TTL in-memory cache to avoid a
 * Backend API round-trip on every request. Returns `null` if the lookup fails.
 */
export async function getCachedClerkUser(userId: string): Promise<any | null> {
  const now = Date.now()
  const cached = clerkUserCache.get(userId)
  if (cached && cached.expiresAt > now) {
    return cached.user
  }

  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    clerkUserCache.set(userId, { user, expiresAt: now + CLERK_USER_TTL_MS })
    return user
  } catch {
    return null
  }
}

/**
 * Retrieves the current authenticated user's ID, primary email, and all verified emails.
 * Returns null if the user is unauthenticated.
 */
export async function getClerkIdentity(req?: Request): Promise<ClerkIdentity | null> {
  const authObj = req ? getAuth(req as any) : await auth()
  const userId = authObj.userId

  if (!userId) return null

  // userId comes free from the session JWT; the profile/emails require a
  // (cached) Clerk Backend API lookup.
  const user = await getCachedClerkUser(userId)

  const emails = user?.emailAddresses
    .filter((e: any) => e.verification?.status === "verified")
    .map((e: any) => e.emailAddress) || []
  const primaryEmail = user?.primaryEmailAddress?.emailAddress || null

  return {
    userId,
    primaryEmail,
    emails,
    firstName: user?.firstName || null,
    lastName: user?.lastName || null,
    username: user?.username || null,
    imageUrl: user?.imageUrl || null,
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
 * Short-TTL in-memory cache for the project record (with its collaborators).
 *
 * Measurement showed each DB round-trip to the remote `pooled.db.prisma.io`
 * endpoint costs ~2-3s. A single editor load fires several requests (page
 * render, liveblocks-auth, canvas GET, collaborators) that each re-run the
 * *same* access-check query against the *same* project — paying that round-trip
 * repeatedly. Caching the project record by id collapses those into one query;
 * access is still evaluated per-request against the caller's identity.
 *
 * The cache is keyed by projectId only (not per-user) so it is shared across
 * requests, and it is invalidated explicitly on every project/collaborator
 * mutation (see `invalidateProjectCache`). The short TTL bounds staleness for
 * anything an invalidation misses (e.g. a mutation on another server instance).
 */
interface CachedProject {
  project: ProjectWithCollaborators | null
  expiresAt: number
}

const PROJECT_TTL_MS = 10_000

const globalForProjectCache = globalThis as unknown as {
  projectCache?: Map<string, CachedProject>
}

const projectCache =
  globalForProjectCache.projectCache ??
  (globalForProjectCache.projectCache = new Map())

/**
 * Drops the cached project record so the next access reads fresh from the DB.
 * Call this after any mutation to a project or its collaborators.
 */
export function invalidateProjectCache(projectId: string): void {
  projectCache.delete(projectId)
}

/**
 * Loads a project (with collaborators) by id, served from the short-TTL cache to
 * avoid repeating the slow DB round-trip across the requests fired by one page
 * load. Returns `null` if the project does not exist.
 */
export async function getCachedProject(
  projectId: string
): Promise<ProjectWithCollaborators | null> {
  const now = Date.now()
  const cached = projectCache.get(projectId)
  if (cached && cached.expiresAt > now) {
    return cached.project
  }

  const project = (await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      collaborators: true,
    },
  })) as ProjectWithCollaborators | null

  projectCache.set(projectId, { project, expiresAt: now + PROJECT_TTL_MS })
  return project
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
  const project = await getCachedProject(projectId)

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
