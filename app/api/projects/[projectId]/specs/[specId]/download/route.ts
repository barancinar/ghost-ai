import { NextResponse } from "next/server"
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { get } from "@vercel/blob"

export const dynamic = "force-dynamic"

/**
 * GET /api/projects/[projectId]/specs/[specId]/download
 *
 * Securely streams a generated Markdown spec back to the caller as a file
 * attachment. Access is gated at every layer: the user must be authenticated,
 * must have access to the project, and the spec must belong to that project.
 * The Blob URL lives only in the database (`ProjectSpec.filePath`) and is never
 * exposed to the client — the file is fetched server-side from the private Blob
 * store and proxied through this route.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; specId: string }> }
) {
  try {
    const identity = await getClerkIdentity(request)
    if (!identity) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      )
    }

    const { projectId, specId } = await params
    if (!projectId || !specId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Project ID and Spec ID are required" },
        { status: 400 }
      )
    }

    // Verify the user owns or collaborates on the project.
    const access = await checkProjectAccess(projectId, identity.userId, identity.emails)
    if (!access) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have access to this project" },
        { status: 403 }
      )
    }

    // Look up the spec metadata and verify it belongs to this project.
    const spec = await prisma.projectSpec.findUnique({ where: { id: specId } })
    if (!spec || spec.projectId !== projectId) {
      return NextResponse.json(
        { error: "Not Found", message: "Spec not found" },
        { status: 404 }
      )
    }

    // Fetch the Markdown content from the private Vercel Blob store.
    const blob = await get(spec.filePath, { access: "private" })
    if (!blob) {
      console.error(`Failed to retrieve spec from blob URL: ${spec.filePath}`)
      return NextResponse.json(
        { error: "Not Found", message: "Spec file could not be retrieved" },
        { status: 404 }
      )
    }

    const markdown = await new Response(blob.stream).text()

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="spec-${specId}.md"`,
      },
    })
  } catch (error) {
    console.error(
      "Error in GET /api/projects/[projectId]/specs/[specId]/download:",
      error
    )
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
