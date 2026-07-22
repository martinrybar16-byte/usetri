import "server-only";

/**
 * Sliding-window rate limiter. In-memory implementation — sufficient for a
 * single dev/server instance; swapped for Upstash Redis in production (the
 * call sites don't change, only this module's internals).
 */
const windows = new Map<string, number[]>();

// Periodic cleanup so long-running dev servers don't leak
const CLEANUP_INTERVAL_MS = 10 * 60_000;
let lastCleanup = Date.now();

export type RateLimitResult = { success: boolean; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, hits] of windows) {
      if (hits.every((t) => now - t > windowMs)) windows.delete(k);
    }
  }

  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    windows.set(key, hits);
    const retryAfterMs = windowMs - (now - hits[0]);
    return { success: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  hits.push(now);
  windows.set(key, hits);
  return { success: true, retryAfterSeconds: 0 };
}
