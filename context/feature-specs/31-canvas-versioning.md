Add canvas version history so users can checkpoint the canvas, automatically snapshot it before every AI generation, and restore any previous version. Snapshots are immutable copies of the canvas graph. Follow the same metadata + blob split already used for canvas autosave and spec persistence: Prisma stores snapshot metadata only, Vercel Blob stores the actual canvas JSON.

## Implementation

1. CanvasSnapshot model

Add a `CanvasSnapshot` Prisma model in `prisma/models/project.prisma` with:

- `id`
- `projectId` (relation to `Project`, `onDelete: Cascade`)
- `filePath` (Blob URL/path to the snapshot JSON — metadata only, no graph content in Postgres)
- `label` (optional, user-supplied checkpoint name)
- `origin` (enum `SnapshotOrigin`: `MANUAL`, `PRE_AI`)
- `createdBy` (Clerk user id of whoever triggered the snapshot; optional so the AI-triggered path can omit it)
- `createdAt`

Add a `snapshots CanvasSnapshot[]` back-relation on `Project`. Index on `[projectId, createdAt]`.

Create the migration with `prisma migrate dev` and **without** an explicit `--schema` flag (multi-file schema — passing `--schema` drops the other model files). Run `prisma generate` so the client picks up the new model.

2. Snapshot creation route (manual checkpoint)

Create: `POST /api/projects/[projectId]/canvas/snapshots`

This route should:

- authenticate the user (Clerk)
- verify project access with `checkProjectAccess`
- validate the request body with Zod (the current canvas `{ nodes, edges }` plus an optional `label`), using the same lenient/`passthrough` node/edge validation the spec flow already uses
- mint a `snapshotId` up front and upload the canvas JSON to a **private** Vercel Blob at `canvas-snapshots/{projectId}/{snapshotId}.json`
- create a `CanvasSnapshot` row with `origin: MANUAL`, `createdBy` = caller, and `filePath` = blob URL
- return the created snapshot metadata (no graph content)

3. Automatic snapshot before AI generation

In `trigger/design-agent.ts`, before applying any mutations, serialize the current room graph the task already reads (`currentNodes` / `currentEdges` at the read-state step) and persist it as a snapshot:

- upload the current `{ nodes, edges }` to Vercel Blob at the same `canvas-snapshots/{projectId}/{snapshotId}.json` path
- create a `CanvasSnapshot` row with `origin: PRE_AI` and no `createdBy`
- resolve `projectId` from `roomId` (the room id is the project id, matching the spec flow)
- this must never block or fail the generation: wrap it so a snapshot error is logged and swallowed, and the design mutations still run

4. List route

Create: `GET /api/projects/[projectId]/canvas/snapshots`

This route should:

- authenticate the user and verify project access
- return the project's `CanvasSnapshot` records (metadata only: `id`, `label`, `origin`, `createdBy`, `createdAt`), newest first
- never return blob URLs or graph content

5. Restore route

Create: `POST /api/projects/[projectId]/canvas/snapshots/[snapshotId]/restore`

This route should:

- authenticate the user and verify project access
- load the `CanvasSnapshot`, confirm `snapshot.projectId === projectId` (404 otherwise)
- fetch the snapshot JSON server-side from the private blob via the SDK `get` stream (never expose the blob URL to the client)
- replace the live Liveblocks room graph with the snapshot's nodes/edges using the backend `mutateFlow` flow utility (the same one the design agent uses), so the restore is reflected in realtime for every connected participant
- take a fresh `PRE_AI`-style safety snapshot of the current graph before overwriting is **out of scope** here (defer), but the restore itself must be atomic within the `mutateFlow` call
- update the main canvas blob (`Project.canvasJsonPath`) so a later reload reflects the restored state, and call `invalidateProjectCache(projectId)`
- return a success response

## Storage Pattern

- Prisma stores snapshot metadata (`CanvasSnapshot`) only.
- Vercel Blob stores the actual canvas JSON at `canvas-snapshots/{projectId}/{snapshotId}.json` (private).
- Snapshots are immutable: never overwrite an existing snapshot blob; each snapshot gets its own id/path.

## Scope Limits

- do not store canvas graph content in Postgres
- do not expose blob URLs to the client
- do not build the full history-panel UI in this unit — a follow-up spec covers the sidebar/timeline UI and the restore confirmation dialog (this unit only needs the routes to be callable and verifiable)
- do not change the existing autosave `PUT /GET /api/projects/[projectId]/canvas` behavior
- do not add snapshot pruning/retention limits yet (note it as a later concern)

## Notes

- read `context/project-overview.md` and `context/architecture-context.md` first
- reuse the existing access-control (`checkProjectAccess`), cache-invalidation (`invalidateProjectCache`), private-blob (`put` / `get` stream), and backend `mutateFlow` patterns — do not introduce new infrastructure
- the `roomId` is the `projectId`; resolve project access the same way the spec flow does
- keep route handlers thin; the design-agent snapshot is background work and already lives in the correct boundary (`trigger/`)

## Check When Done

- `CanvasSnapshot` model exists with the required fields and the `SnapshotOrigin` enum
- migration created without `--schema`, and `prisma generate` run
- `POST .../canvas/snapshots` creates a `MANUAL` snapshot (blob + metadata) after access checks
- the design agent writes a `PRE_AI` snapshot before applying mutations, and a snapshot failure never breaks generation
- `GET .../canvas/snapshots` returns metadata only, newest first, access-checked
- `POST .../canvas/snapshots/[snapshotId]/restore` replaces the room graph via `mutateFlow`, updates `canvasJsonPath`, invalidates the project cache, and validates ownership
- no blob URLs or graph content leak to the client
- `npx tsc --noEmit` and `npm run build` pass
