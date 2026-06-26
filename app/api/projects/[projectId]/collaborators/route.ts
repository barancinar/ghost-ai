import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface ClerkUserListItem {
  id: string
  firstName: string | null
  lastName: string | null
  username: string | null
  imageUrl: string
  emailAddresses: Array<{ emailAddress: string }>
}

/**
 * GET /api/projects/[projectId]/collaborators
 * Lists the owner and collaborators for a given project, enriching email addresses
 * with profile information (display names and avatar URLs) from Clerk.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    const { projectId } = await params
    if (!projectId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Project ID is required" },
        { status: 400 }
      )
    }

    // 1. Fetch project to check access and determine the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        collaborators: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Not Found", message: "Project not found" },
        { status: 404 }
      )
    }

    // 2. Access control check
    const client = await clerkClient()
    const ownerUser = await client.users.getUser(project.ownerId).catch(() => null)
    
    // Check if the current user has access (either project owner or collaborator)
    const isOwner = project.ownerId === userId
    
    // Resolve email addresses of current user to match collaborator list
    let isCollaborator = false
    if (!isOwner) {
      const currentUserProfile = await client.users.getUser(userId)
      const currentUserEmails = currentUserProfile.emailAddresses.map((ea) => ea.emailAddress.toLowerCase())
      isCollaborator = project.collaborators.some((collab: { email: string }) =>
        currentUserEmails.includes(collab.email.toLowerCase())
      )
    }

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have access to this project" },
        { status: 403 }
      )
    }

    // 3. Fetch collaborator profiles in bulk from Clerk
    const collaboratorEmails = project.collaborators.map((c: { email: string }) => c.email)
    let clerkUsers: ClerkUserListItem[] = []

    if (collaboratorEmails.length > 0) {
      const usersResponse = await client.users.getUserList({
        emailAddress: collaboratorEmails
      })
      clerkUsers = (usersResponse.data || []) as ClerkUserListItem[]
    }

    // Map Clerk users by lowercase email address
    const userMap = new Map<string, { name: string; avatar: string }>()
    clerkUsers.forEach((user) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || ""
      const avatar = user.imageUrl
      user.emailAddresses.forEach((ea) => {
        userMap.set(ea.emailAddress.toLowerCase(), { name, avatar })
      })
    })

    // 4. Construct owner info
    const ownerEmail = ownerUser?.emailAddresses?.[0]?.emailAddress || ""
    const ownerName = ownerUser
      ? [ownerUser.firstName, ownerUser.lastName].filter(Boolean).join(" ") || ownerUser.username || "Owner"
      : "Project Owner"

    const ownerInfo = {
      id: "owner",
      email: ownerEmail,
      name: ownerName,
      avatar: ownerUser?.imageUrl || null,
      role: "OWNER"
    }

    // 5. Construct collaborator info
    const collaboratorInfos = project.collaborators.map((c: { id: string; email: string }) => {
      const info = userMap.get(c.email.toLowerCase())
      return {
        id: c.id,
        email: c.email,
        name: info?.name || null,
        avatar: info?.avatar || null,
        role: "COLLABORATOR"
      }
    })

    return NextResponse.json({
      owner: ownerInfo,
      collaborators: collaboratorInfos
    })
  } catch (error) {
    console.error(`Error listing collaborators:`, error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[projectId]/collaborators
 * Invites a collaborator by email. Enforces project ownership server-side.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    const { projectId } = await params
    if (!projectId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Project ID is required" },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Not Found", message: "Project not found" },
        { status: 404 }
      )
    }

    // Enforce ownership: only the owner can invite collaborators
    if (project.ownerId !== userId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only the project owner can invite collaborators" },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Bad Request", message: "A valid email address is required" },
        { status: 400 }
      )
    }

    // Check if the owner is trying to invite themselves
    const client = await clerkClient()
    const ownerUser = await client.users.getUser(project.ownerId)
    const ownerEmails = ownerUser.emailAddresses.map((ea) => ea.emailAddress.toLowerCase())
    
    if (ownerEmails.includes(email)) {
      return NextResponse.json(
        { error: "Bad Request", message: "You cannot invite the project owner" },
        { status: 400 }
      )
    }

    // Check if collaborator is already invited
    const existing = await prisma.projectCollaborator.findUnique({
      where: {
        projectId_email: {
          projectId,
          email
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Bad Request", message: "Collaborator is already invited" },
        { status: 400 }
      )
    }

    // Create collaborator
    const newCollaborator = await prisma.projectCollaborator.create({
      data: {
        projectId,
        email
      }
    })

    return NextResponse.json(newCollaborator)
  } catch (error) {
    console.error(`Error inviting collaborator:`, error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[projectId]/collaborators
 * Removes a collaborator by email. Enforces project ownership server-side.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    const { projectId } = await params
    if (!projectId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Project ID is required" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")?.trim().toLowerCase()

    if (!email) {
      return NextResponse.json(
        { error: "Bad Request", message: "Collaborator email is required" },
        { status: 400 }
      )
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: "Not Found", message: "Project not found" },
        { status: 404 }
      )
    }

    // Enforce ownership: only the owner can remove collaborators
    if (project.ownerId !== userId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only the project owner can remove collaborators" },
        { status: 403 }
      )
    }

    // Remove collaborator
    const deleteResult = await prisma.projectCollaborator.deleteMany({
      where: {
        projectId,
        email
      }
    })

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: "Not Found", message: "Collaborator not found for this project" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Error removing collaborator:`, error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
