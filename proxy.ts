import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";

// Public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  `${signInUrl}(.*)`,
  `${signUpUrl}(.*)`,
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // Handle root path redirects instantly at the edge
  if (pathname === "/") {
    if (userId) {
      return NextResponse.redirect(new URL("/editor", req.url));
    } else {
      return NextResponse.redirect(new URL(signInUrl, req.url));
    }
  }

  // Redirect signed-in users away from auth pages
  if (userId && (pathname.startsWith(signInUrl) || pathname.startsWith(signUpUrl))) {
    return NextResponse.redirect(new URL("/editor", req.url));
  }

  // Protect all other non-public routes
  if (!isPublicRoute(req)) {
    if (!userId) {
      if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL(signInUrl, req.url));
    }
  }
});

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
