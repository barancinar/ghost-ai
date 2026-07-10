import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedClerkUser } from "@/lib/project-access";
import { slugify } from "@/lib/utils";
import type { Project } from "@/app/generated/prisma/client";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await getCachedClerkUser(userId);
    const emails = user?.emailAddresses.map((e: { emailAddress: string }) => e.emailAddress) || [];

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
    })) as Project[];

    const formattedProjects = projects.map((project: Project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      canvasJsonPath: project.canvasJsonPath,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      slug: slugify(project.name),
      isOwner: project.ownerId === userId
    }));

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error("Error in GET /api/projects:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id.trim() : undefined;
    let name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      name = "Untitled Project";
    }
    const description = typeof body.description === "string" ? body.description.trim() : null;

    const project = (await prisma.project.create({
      data: {
        id,
        ownerId: userId,
        name,
        description,
      }
    })) as Project;

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      canvasJsonPath: project.canvasJsonPath,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      slug: slugify(project.name),
      isOwner: true
    }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/projects:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
