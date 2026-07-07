# Performance Issue — Deep Analysis & Fix Task

## 1. Problem Statement

The application is generally very slow both in **local development** and in the **deployed (production) environment**. Reported symptoms:

- Editor page load is slow
- The "Share" (collaborators) section is slow
- Almost every operation feels slow overall

The fact that the same slowness appears both locally and in production is an important clue: this is most likely **not** a cold-start / infrastructure / regional-latency issue, but rather a **structural problem in the application code** (bad query pattern, unnecessary synchronous calls, missing caching, etc.). The agent should start from this assumption but must verify it rather than accept it outright.

## 2. Evidence: Log Analysis

Real logs captured from production. Next.js breaks down request time into three components: `next.js` (routing/render), `proxy.ts` (reverse proxy layer), and `application-code` (the actual route handler / business logic).

| Endpoint | Total Time | next.js | proxy.ts | application-code | app-code share |
|---|---|---|---|---|---|
| `GET /editor/final-test-0muk` | 10.3s | 2.2s | 23ms | **8.1s** | **79%** |
| `POST /api/liveblocks-auth` | 5.4s | 296ms | 22ms | **5.1s** | **94%** |
| `PUT /api/projects/final-test-0muk/canvas` | 9.8s | 2.3s | 15ms | **7.5s** | **77%** |
| `GET /api/projects/final-test-0muk/collaborators` | 8.5s | 3.0s | 33ms | **5.5s** | **65%** |

### Key takeaway from this table

- `proxy.ts` time is only 15-33ms across all requests → **the proxy/middleware layer is not the bottleneck**; this path can be ruled out entirely.
- `next.js` time is within an acceptable range (296ms - 3.0s) → the routing/render layer may be a secondary factor but is not the main issue.
- **`application-code` dominates every request** (65-94%). The root cause must be sought in the business logic here: database queries, external service calls (Liveblocks), synchronous/blocking operations, sequential await chains.

These 4 endpoints do very different things (page render, auth token generation, data write, data read), yet all show a similarly large slowdown. This strengthens the likelihood of a **repeating anti-pattern** (e.g. a DB connection being re-established on every request, missing connection pooling, or a redundant DB/auth call repeated in every route) rather than a single isolated bug.

## 3. Prioritized Hypothesis List

Once the agent has access to the codebase, it should verify/rule out the following hypotheses **in order, with evidence**, starting from the most common and highest-impact causes:

### Hypothesis 1 — DB client is not managed as a singleton (MOST COMMON CAUSE)
If a new client (e.g. `new PrismaClient()`) is instantiated on every API route call instead of being reused, a fresh database connection is opened on every request. This:
- Blows up connection counts locally due to hot-reload (a well-known classic Next.js + Prisma issue).
- Incurs a fresh handshake cost per request in production (especially in serverless/edge environments).
- **Check:** In `lib/prisma.ts`, `db.ts`, or similar, is a singleton pattern implemented via `globalThis`?

### Hypothesis 2 — Missing or misconfigured connection pooling
Does the database connection string go directly to Postgres, or through a pooler (PgBouncer, Prisma Accelerate, Supabase pooler, etc.)?
- **Check:** `DATABASE_URL` in `.env`, pool limits, `connection_limit` parameter.

### Hypothesis 3 — N+1 query problem
The `collaborators` endpoint is especially suspect: user data might be fetched one-by-one in a loop instead of a single joined query (e.g. `await prisma.user.findUnique(...)` inside a `map`).
- **Check:** Is there an `await` inside a loop in the route handler? Could this be fetched in a single query using `include`/`join`?

### Hypothesis 4 — Missing database indexes
Foreign keys and frequently filtered columns (`project_id`, `user_id`, `slug`) in `projects`, `collaborators`, `canvas` tables may lack indexes.
- **Check:** Run `EXPLAIN ANALYZE` to measure the real cost of slow queries.

### Hypothesis 5 — Sequential await chains where parallelization is possible
In routes like `/api/liveblocks-auth`, user/project data may first be fetched from the DB, followed by a separate call to the Liveblocks API. If these are not actually dependent on each other, they should run in parallel via `Promise.all`.

### Hypothesis 6 — Unnecessary work in the Liveblocks auth route
`POST /api/liveblocks-auth` has an application-code time of 5.1s, ~94% of the total. This route should generally just sign a token — taking this long is abnormal.
- **Check:** Are there unnecessary DB queries, redundant authorization checks, or extra work before/after the Liveblocks SDK call?

### Hypothesis 7 — Canvas PUT rewrites the entire payload every time
`PUT /api/projects/.../canvas` may be writing the **entire** canvas to the DB on every small change (full overwrite instead of diff/patch). As the payload grows, this gets progressively slower.
- **Check:** Size of the incoming payload, serialize/deserialize cost, size of the JSON written to the DB.

### Hypothesis 8 — Session/auth check hits the DB on every request
Middleware or route handlers may be fetching the user from the database on every request instead of verifying the session from a JWT/cookie. This is likely the one thing all 4 endpoints have in common — the auth check — making it a high-priority suspect.

## 4. Step-by-Step Investigation Plan for the Agent

The agent should follow these steps **in order**, measuring at each step and carrying results into the next:

1. **Explore the environment and code structure:** Identify Next.js version, ORM (Prisma/Drizzle/etc.), database, Liveblocks integration files, deployment platform (Vercel/other).
2. **Inspect the DB client setup:** Is a singleton pattern used? If not, this will likely be the first and most critical fix.
3. **Enable ORM query logging:** e.g. `log: ['query', 'info', 'warn', 'error']` to make each query's duration visible.
4. **Instrument all 4 endpoints:** Use `console.time`/`performance.now()` to measure each step inside the route separately (DB read, DB write, external API call, serialize/deserialize). Right now we only have the "total application-code time" — this needs to be broken into sub-parts.
5. **Review `/api/liveblocks-auth` line by line:** Assess the order and necessity of DB calls vs. the Liveblocks API call.
6. **Review `/api/projects/[slug]/canvas` PUT route:** Payload size, write strategy (full overwrite vs. patch), transaction usage.
7. **Review `/api/projects/[slug]/collaborators` GET route:** N+1 queries, unnecessary `include`s, missing pagination.
8. **Run `EXPLAIN ANALYZE` on the database:** Identify the most frequently executed queries and measure their real cost.
9. **Identify and add missing indexes** (where applicable).
10. **Find sequential await chains and replace parallelizable ones with `Promise.all`.**
11. **Apply the fixes and re-measure the same 4 endpoints for a before/after comparison.**

## 5. Expected Deliverable

What is requested from the agent:

- The **exact root cause** for each endpoint (verified by measurement, not assumption).
- The corresponding code fixes (singleton client, parallel awaits, added indexes, N+1 elimination, payload optimization, etc. — whichever apply).
- A **before/after time comparison** after the fix (same log format: next.js / proxy.ts / application-code breakdown).
- If the root cause is a repeatable anti-pattern (e.g. missing singleton), it should be scanned for and fixed across **all routes** in the codebase, not just the 4 examined.

## 6. Notes

- This document is a **preliminary analysis** based solely on the log output the user provided. The actual root cause will only become clear once the agent has access to the codebase and completes the steps above.
- Hypotheses are listed in order of likelihood/impact, but the agent should not treat any of them as the "confirmed cause" without evidence.
- Per the measurements, the `next.js` and `proxy.ts` layers are not the source of the problem — to avoid wasted effort, the investigation should focus directly on `application-code` (route handlers, the DB layer, and external service integrations).