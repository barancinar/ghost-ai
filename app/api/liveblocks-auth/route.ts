import { NextResponse } from "next/server";
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access";
import { currentUser } from "@clerk/nextjs/server";
import { getLiveblocksClient, getUserColor } from "@/lib/liveblocks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Require Clerk authentication
    const identity = await getClerkIdentity();
    if (!identity) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Parse room (projectId) from request body
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch {
      return new NextResponse("Invalid request body", { status: 400 });
    }

    const projectId = requestBody.room;
    if (!projectId || typeof projectId !== "string") {
      return new NextResponse("Missing room parameter", { status: 400 });
    }

    // 3. Verify project access using the existing access helper
    const accessResult = await checkProjectAccess(
      projectId,
      identity.userId,
      identity.emails
    );
    if (!accessResult) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get the Liveblocks server client instance lazily
    const liveblocks = getLiveblocksClient();

    // 4. Ensure the Liveblocks room exists (create only if needed)
    try {
      await liveblocks.getOrCreateRoom(projectId, {
        defaultAccesses: [], // Private room by default
      });
    } catch (roomError) {
      // Log error but don't fail the request unless room creation is absolutely required
      console.error(`Error ensuring Liveblocks room ${projectId} exists:`, roomError);
    }


    // 5. Generate deterministic user metadata
    const displayName =
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.username ||
          clerkUser.emailAddresses[0]?.emailAddress ||
          "Anonymous";

    const avatarUrl = clerkUser.imageUrl || "";
    const cursorColor = getUserColor(identity.userId);

    // 6. Return a session token with the user info and permission
    const session = liveblocks.prepareSession(identity.userId, {
      userInfo: {
        name: displayName,
        avatar: avatarUrl,
        color: cursorColor,
      },
    });

    // Grant full write access to the specific room/project
    session.allow(projectId, session.FULL_ACCESS);

    // Authorize and return response
    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (error) {
    console.error("Error in Liveblocks auth route:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
