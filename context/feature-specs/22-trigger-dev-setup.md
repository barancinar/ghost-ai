Install and link Trigger.dev so the durable AI generation workflows described in `architecture-context.md` (design generation, spec generation) have a background task runtime to run on. This unit only sets up the SDK, config, and project link — it does not implement any actual tasks yet.

## What to Install

- `@trigger.dev/sdk` (dependency)
- `@trigger.dev/build` (devDependency)

## Implementation

1. Ran `npx trigger.dev@latest init --project-ref proj_luhcvxtdmhmmhucerfwj` to log in, link the existing cloud project ("Ghost AI"), and scaffold config.
2. The CLI defaults to a `src/trigger` task directory, but this repo has no `src/` folder — moved the generated `example.ts` to a root-level `trigger/` folder to match the `trigger` system boundary already defined in `architecture-context.md`.
3. Updated `trigger.config.ts`'s `dirs` option from `./src/trigger` to `./trigger` to match the relocated folder.
4. Added a `TRIGGER_SECRET_KEY` placeholder to `.env` (value must be copied in from the project's dashboard at cloud.trigger.dev — not something the CLI login exposes).
5. Added a `trigger:dev` script to `package.json` to run the local Trigger.dev dev worker alongside `next dev`.

## Storage Pattern

- No storage impact. This is a runtime/infra addition only.

## Check When Done

- `@trigger.dev/sdk` and `@trigger.dev/build` are installed.
- `trigger.config.ts` exists at the project root and points `dirs` at `./trigger`.
- Task files live in the root-level `trigger/` folder (not `src/trigger`).
- `TRIGGER_SECRET_KEY` placeholder exists in `.env`.
- `npx tsc --noEmit` passes.

## Next Steps (not part of this unit)

- Fill in `TRIGGER_SECRET_KEY` in `.env` from the Trigger.dev dashboard.
- Run `npx trigger.dev@latest dev` (or `npm run trigger:dev`) to start the local dev worker.
- Implement the actual design-generation and spec-generation tasks per the AI Generation Model in `architecture-context.md`, and the API routes that trigger them.
