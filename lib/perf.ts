/**
 * Lightweight per-request timing instrumentation.
 *
 * Mirrors the production log format from the performance investigation
 * (spec 30): the total `application-code` time is broken into named sub-phases
 * (auth, DB read, external API call, serialize, etc.) so the before/after cost
 * of each step is visible.
 *
 * Enabled by default in development and whenever `PERF_LOG=1` is set, so it can
 * also be turned on temporarily in a deployed environment. Emits nothing
 * otherwise, keeping production quiet.
 */

const PERF_ENABLED =
  process.env.PERF_LOG === "1" || process.env.NODE_ENV !== "production";

export interface PerfTimer {
  /** Record the elapsed time of a named phase since the previous mark. */
  mark(phase: string): void;
  /** Log the full breakdown (per-phase + total) and return the total ms. */
  end(): number;
}

/**
 * Starts a timer for a single request. `label` identifies the endpoint, e.g.
 * `GET /api/projects/[projectId]/collaborators`.
 */
export function startPerf(label: string): PerfTimer {
  if (!PERF_ENABLED) {
    // No-op timer to avoid any overhead when disabled.
    return { mark: () => {}, end: () => 0 };
  }

  const start = performance.now();
  let last = start;
  const phases: Array<{ phase: string; ms: number }> = [];

  return {
    mark(phase: string) {
      const now = performance.now();
      phases.push({ phase, ms: now - last });
      last = now;
    },
    end() {
      const total = performance.now() - start;
      const breakdown = phases
        .map((p) => `${p.phase}=${p.ms.toFixed(1)}ms`)
        .join(" ");
      console.log(
        `[perf] ${label} total=${total.toFixed(1)}ms ${breakdown}`.trim()
      );
      return total;
    },
  };
}
