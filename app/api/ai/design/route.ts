import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import type { designAgentTask } from "@/trigger/design-agent";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const identity = await getClerkIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const roomId = typeof body?.roomId === "string" ? body.roomId : "";
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";

    if (!prompt || !roomId || !projectId) {
      return NextResponse.json(
        { error: "Bad Request", message: "prompt, roomId, and projectId are required" },
        { status: 400 }
      );
    }

    const access = await checkProjectAccess(projectId, identity.userId, identity.emails);
    if (!access) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have access to this project" },
        { status: 403 }
      );
    }

    const handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
      prompt,
      roomId,
    });

    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId,
        userId: identity.userId,
      },
    });

    return NextResponse.json({ runId: handle.id });
  } catch (error) {
    console.error("Error in POST /api/ai/design:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
