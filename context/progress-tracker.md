# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1: Foundation & Design System

## Current Goal

- Implement the real-time collaborative canvas using Liveblocks and React Flow.

## Completed

- Design System & UI Primitive Components Setup ([01-design-system.md](../context/feature-specs/01-design-system.md))
- Base Editor Chrome Layout Components ([02-editor.md](../context/feature-specs/02-editor.md))
- Clerk Authentication & Route Protection Setup ([03-auth.md](../context/feature-specs/03-auth.md))
- Project Dialogs & Editor Home ([04-project-dialogs.md](../context/feature-specs/04-project-dialogs.md))
- Prisma Schema And Data Layer ([05-prisma.md](../context/feature-specs/05-prisma.md))
- Project REST API routes ([06-project-apis.md](../context/feature-specs/06-project-apis.md))
- Wired Editor Home & Project Dialogs to API ([07-wire-editor-home.md](../context/feature-specs/07-wire-editor-home.md))
- Built `/editor/[roomId]` Workspace Shell with Server access control and updated layout ([08-editor-workspace-shell.md](../context/feature-specs/08-editor-workspace-shell.md))
- Added Share Dialog UI and REST API collaborators endpoint ([09-share-dialog.md](../context/feature-specs/09-share-dialog.md))

## In Progress

- None.

## Next Up

- Collaborative Canvas Setup

## Open Questions

- None.

## Architecture Decisions

- Map shadcn/ui CSS variables to the specified custom dark theme tokens (`--bg-base`, etc.) to ensure automatic dark mode style synchronization without customizing the shadcn source code.
- Dynamically use `@prisma/adapter-ppg` (`PrismaPostgresAdapter`) when the `DATABASE_URL` host contains `.prisma.io` (Prisma Postgres databases) to connect via WebSockets/HTTPS on port 443, bypassing firewalls that block standard TCP port 5432.

## Session Notes

- Initiating setup of tailwind-merge, clsx, lucide-react, and shadcn/ui primitives.
- Setting up Clerk authentication, proxy.ts middleware, and custom dark auth pages.
- Fixed redirect loop and blank rendering screen issues by handling root `/` redirects and auth-page protection in `proxy.ts` (middleware/edge level) and setting `afterSignOutUrl="/sign-in"` on `ClerkProvider`.
- Refactored auth marketing panels into a shared `<AuthMarketingPanel />` component, implemented UUIDs for editor logs, pinned Clerk dependencies in the root `package.json`, set up a server-side route layout to protect `/editor`, and configured proxy middleware to return 401 for unauthorized API/tRPC requests.
- Implemented `/editor` home screen when no project is active, built ProjectDialogs for creating/renaming/deleting projects with slugify generator and loading/transition overlays, updated ProjectSidebar to handle project categorizations, hover rename/delete buttons, and mobile scrim backdrop closures. Fixed page height scrolling/layout shift bug by constraining main wrapper to `h-screen overflow-hidden` and added undefined array safety checks in sidebar filters.
- Implemented the database layer using Prisma v7 multi-file schema support. Created the `Project` and `ProjectCollaborator` models inside `prisma/models/project.prisma`, instantiated the cached client singleton `lib/prisma.ts` with direct/Accelerate connection branching, applied the initial database schema migration, and verified build compilation.
- Implemented the backend REST API routes (`GET /api/projects`, `POST /api/projects`, `PATCH /api/projects/[projectId]`, `DELETE /api/projects/[projectId]`) in Next.js 16. Added strict Clerk auth, project ownership verification checks, cascade delete for project collaborators on project deletion, and a shared `slugify` utility. Verified strict TypeScript type compliance and compiled build.
- Wired the editor home page, sidebar, and dialogs to the database REST API using a Server Component architecture. Extracted client layout elements into a dedicated `EditorClient` component, refactored `/editor` to fetch owned and shared projects server-side on load, created the dynamic `/editor/[projectId]` route to display individual workspaces after performing authentication checks, and implemented the `useProjectActions` mutation hook. Verified that the production build compiles successfully.
- Resolved Prisma connection timeout (`ETIMEDOUT`) and SSL warning issue in local development environment. By branching in `lib/prisma.ts` to instantiate `PrismaPostgresAdapter` from `@prisma/adapter-ppg` when connecting to `*.prisma.io` hosts, database connections are established over port 443 (HTTPS/WebSocket) instead of direct TCP port 5432.
- Created `lib/project-access.ts` containing Clerk identity extraction and workspace member/owner checking. Added centering dark layout for `AccessDenied` view when project lookup fails or rights are absent. Migrated routes to `/editor/[roomId]` dynamic segment using access control checks server-side. Refactored workspace shell in `EditorClient` to feature project header name, sharing action, toggleable right-hand AI assistant placeholder, and centered main canvas dot grid template.
- Implemented `app/api/projects/[projectId]/collaborators` REST endpoints supporting collaborator lists (`GET`), invites (`POST`), and removals (`DELETE`). Integrated Clerk Backend API `getUserList()` to query display names and avatars from emails in bulk. Created `<ShareDialog />` allowing project link copies, new invites, and members list management, showing read-only states for collaborators. Wired the Share button inside the top navbar.





