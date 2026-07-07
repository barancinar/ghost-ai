import { NextResponse } from "next/server";
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access";
import { getLiveblocksClient, getUserColor } from "@/lib/liveblocks";
import { startPerf } from "@/lib/perf";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const perf = startPerf("POST /api/liveblocks-auth");
  try {
    // 1. Require Clerk authentication
    const identity = await getClerkIdentity(request);
    perf.mark("auth");
    if (!identity) {
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
    perf.mark("access-check");
    if (!accessResult) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Get the Liveblocks server client instance lazily
    const liveblocks = getLiveblocksClient();

    // Note: we intentionally do NOT call `getOrCreateRoom` here. It added a full
    // Liveblocks Backend API round-trip to every auth request; the room is
    // created automatically (private by default under the access-token model) on
    // first client connection, so `session.authorize()` below is sufficient.

    // 5. Generate deterministic user metadata
    const displayName =
      identity.firstName && identity.lastName
        ? `${identity.firstName} ${identity.lastName}`
        : identity.username ||
          identity.primaryEmail ||
          "Anonymous";

    const avatarUrl = identity.imageUrl || "";
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
    perf.mark("liveblocks-authorize");
    perf.end();
    return new Response(body, { status });
  } catch (error) {
    console.error("Error in Liveblocks auth route:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
