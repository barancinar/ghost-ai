import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { Project } from "@/app/generated/prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Project ID is required" },
        { status: 400 }
      );
    }

    const project = (await prisma.project.findUnique({
      where: { id: projectId }
    })) as Project | null;

    if (!project) {
      return NextResponse.json(
        { error: "Not Found", message: "Project not found" },
        { status: 404 }
      );
    }

    if (project.ownerId !== userId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only the project owner can rename this project" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Bad Request", message: "Project name is required" },
        { status: 400 }
      );
    }

    const updatedProject = (await prisma.project.update({
      where: { id: projectId },
      data: { name }
    })) as Project;

    return NextResponse.json({
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      status: updatedProject.status,
      canvasJsonPath: updatedProject.canvasJsonPath,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt,
      slug: slugify(updatedProject.name),
      isOwner: true
    });
  } catch (error) {
    console.error(`Error in PATCH /api/projects/${(await params).projectId}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    if (!projectId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Project ID is required" },
        { status: 400 }
      );
    }

    const project = (await prisma.project.findUnique({
      where: { id: projectId }
    })) as Project | null;

    if (!project) {
      return NextResponse.json(
        { error: "Not Found", message: "Project not found" },
        { status: 404 }
      );
    }

    if (project.ownerId !== userId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only the project owner can delete this project" },
        { status: 403 }
      );
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/projects/${(await params).projectId}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
