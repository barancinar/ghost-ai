import { NextResponse } from "next/server";
import { auth } from "@trigger.dev/sdk";
import { getClerkIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

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

    const runId = typeof body?.runId === "string" ? body.runId : "";
    if (!runId) {
      return NextResponse.json(
        { error: "Bad Request", message: "runId is required" },
        { status: 400 }
      );
    }

    const taskRun = await prisma.taskRun.findUnique({ where: { runId } });
    if (!taskRun || taskRun.userId !== identity.userId) {
      return NextResponse.json(
        { error: "Forbidden", message: "You do not have access to this run" },
        { status: 403 }
      );
    }

    const publicToken = await auth.createPublicToken({
      scopes: {
        read: {
          runs: [runId],
        },
      },
    });

    return NextResponse.json({ token: publicToken });
  } catch (error) {
    console.error("Error in POST /api/ai/design/token:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
