Review the editor workspace implementation and fix the following
issues. Check `components/editor` first. Do not break existing
features.

## Issues

### 1. Error

## Error Type
Build Error

## Error Message
Error evaluating Node.js code

## Build Output
./app/globals.css
Error evaluating Node.js code
CssSyntaxError: tailwindcss: C:\Users\baran.cinar\Desktop\ghost-ai\app\globals.css:1:1: Can't resolve '@clerk/ui/themes/shadcn.css' in 'C:\Users\baran.cinar\Desktop\ghost-ai\app'
    [at Input.error (turbopack:///[project]/node_modules/postcss/lib/input.js:135:16)]
    [at Root.error (turbopack:///[project]/node_modules/postcss/lib/node.js:146:32)]
    [at Object.Once (C:\Users\baran.cinar\Desktop\ghost-ai\node_modules\@tailwindcss\postcss\dist\index.js:10:6918)]
    [at process.processTicksAndRejections (node:internal/process/task_queues:104:5)]
    [at async LazyResult.runAsync (turbopack:///[project]/node_modules/postcss/lib/lazy-result.js:293:11)]
    [at async transform (turbopack:///[turbopack-node]/transforms/postcss.ts:70:34)]
    [at async run (turbopack:///[turbopack-node]/child_process/evaluate.ts:89:23)]

Import trace:
  Client Component Browser:
    ./app/globals.css [Client Component Browser]
    ./app/layout.tsx [Server Component]

Next.js version: 16.2.9 (Turbopack)


## Scope

- Fix only what is listed above
- Do not change canvas node or edge rendering behavior
- Do not modify the editor home navbar layout
- Do not break existing autosave, presence, or collaboration
  logic
- npm run build passes
