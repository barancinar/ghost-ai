import { NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import type { generateSpecTask } from "@/trigger/generate-spec";

export const dynamic = "force-dynamic";

/**
 * Request body for spec generation. `nodes`, `edges`, and `chatHistory` are the
 * client's current canvas + conversation, validated leniently (extra fields are
 * kept) since we only forward them to the task. Crucially there is NO
 * client-supplied `projectId`: project access is resolved server-side from
 * `roomId` (the Liveblocks room id, which is the project id).
 */
const specRequestSchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(z.unknown()).default([]),
  nodes: z.array(z.unknown()).default([]),
  edges: z.array(z.unknown()).default([]),
});

export async function POST(request: Request) {
  try {
    const identity = await getClerkIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = specRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "roomId is required" },
        { status: 400 }
      );
    }

    const { roomId, chatHistory, nodes, edges } = parsed.data;

    // Resolve project access from the authenticated user + roomId. We never
    // trust a client-supplied projectId; the room id IS the project id.
    const access = await checkProjectAccess(
      roomId,
      identity.userId,
      identity.emails
    );
    if (!access) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have access to this project" },
        { status: 403 }
      );
    }

    const projectId = access.project.id;

    const handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
      projectId,
      roomId,
      chatHistory,
      nodes,
      edges,
    });

    // Record the run for ownership/access control so the token route can verify
    // the requester owns the run before issuing a run-scoped token.
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId,
        userId: identity.userId,
      },
    });

    return NextResponse.json({ runId: handle.id });
  } catch (error) {
    console.error("Error in POST /api/ai/spec:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
