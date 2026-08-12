/**
 * Minimal in-process fixed-window rate limiter.
 *
 * Deliberately dependency-free and in-memory: this site is a single Next.js
 * standalone server under PM2, so one process holds the whole counter. Two
 * consequences to know about before relying on it elsewhere:
 *
 *  - Counters reset when the process restarts (a deploy briefly clears them).
 *  - Running PM2 in cluster mode would give each worker its own counter, so the
 *    effective limit multiplies by the worker count. Move to Redis before
 *    scaling out.
 *
 * It is a brake on abuse of a public form, not a security boundary.
 */

type Window = { count: number; resetAt: number };

/** Hard cap on tracked keys, so a flood of unique IPs cannot grow this forever. */
const MAX_KEYS = 10_000;

const windows = new Map<string, Window>();

export type RateLimitResult = {
  ok: boolean;
  /** Requests still allowed in the current window. */
  remaining: number;
  /** Seconds until the window resets — feeds the Retry-After header. */
  retryAfterSeconds: number;
};

function prune(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    // Only pay for the sweep when the map is actually growing.
    if (windows.size >= MAX_KEYS) prune(now);
    // Still full of live windows: shed the oldest rather than grow unbounded.
    if (windows.size >= MAX_KEYS) {
      const oldest = windows.keys().next().value;
      if (oldest !== undefined) windows.delete(oldest);
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds,
  };
}

/**
 * Client IP from the proxy chain in front of this app: Cloudflare, then Apache
 * `mod_proxy` on the same host, then here.
 *
 * `cf-connecting-ip` is preferred because Cloudflare sets it on every proxied
 * request and strips any value the client tries to supply. `x-forwarded-for` is
 * only a fallback: Apache's `mod_proxy` *appends* to that header rather than
 * replacing it, so its first entry is whatever the caller sent. Both headers are
 * forgeable by anyone who reaches the origin directly — which is why the origin
 * must only accept proxied traffic. Until then this is a brake on casual abuse,
 * not a boundary, and the module comment above says as much.
 */
export function clientIp(request: Request): string {
  const cloudflare = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
