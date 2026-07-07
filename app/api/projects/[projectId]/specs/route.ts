import { NextResponse } from "next/server"
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * GET /api/projects/[projectId]/specs
 *
 * Returns the metadata for every generated spec belonging to a project so the
 * editor sidebar can list them. This is metadata only — `ProjectSpec` stores no
 * content (the Markdown lives in a private Blob), so the actual spec body must
 * be fetched separately through the `/download` route. Access is gated the same
 * way as the rest of the project API: the caller must be authenticated and have
 * access to the project.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const identity = await getClerkIdentity(request)
    if (!identity) {
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

    const access = await checkProjectAccess(projectId, identity.userId, identity.emails)
    if (!access) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have access to this project" },
        { status: 403 }
      )
    }

    const specs = await prisma.projectSpec.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    })

    return NextResponse.json({
      specs: specs.map((spec: { id: string; createdAt: Date }) => ({
        id: spec.id,
        createdAt: spec.createdAt,
        // Matches the filename the `/download` route attaches to the response.
        filename: `spec-${spec.id}.md`,
      })),
    })
  } catch (error) {
    console.error("Error in GET /api/projects/[projectId]/specs:", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
