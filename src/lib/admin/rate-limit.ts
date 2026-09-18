import { rateLimit } from "@/lib/rateLimit";
import { RateLimitExceededError } from "./errors";
import { adminEvents, reportAdminFailure } from "./observability";

/**
 * Per-bucket admin rate limits, layered on the in-process fixed-window limiter
 * in `@/lib/rateLimit`. Keys are per signed-in admin, so one compromised or
 * runaway session cannot exhaust another's budget.
 *
 * These limits are abuse brakes, not a security boundary: the limiter is
 * in-process and resets on deploy. Authentication callbacks are separately
 * limited by Better Auth's own 20-per-minute per-IP rule.
 */
export type AdminRateLimitPolicy = { limit: number; windowMs: number };

export const adminRateLimitPolicies = {
  /** Debounced autosave runs frequently while a post is being edited. */
  autosave: { limit: 120, windowMs: 60_000 },
  /** Create, publish, rollback, translation, and retry mutations. */
  mutation: { limit: 40, windowMs: 60_000 },
  /** Media upload URL issuance and completion. */
  upload: { limit: 30, windowMs: 60_000 },
  /** Draft preview token issuance. */
  preview: { limit: 30, windowMs: 60_000 },
} as const satisfies Record<string, AdminRateLimitPolicy>;

export type AdminRateLimitBucket = keyof typeof adminRateLimitPolicies;

export function enforceAdminRateLimit(bucket: AdminRateLimitBucket, identity: string): void {
  const policy = adminRateLimitPolicies[bucket];
  const result = rateLimit(`admin:${bucket}:${identity}`, policy.limit, policy.windowMs);
  if (result.ok) return;
  reportAdminFailure(adminEvents.rateLimit, {
    bucket,
    limit: policy.limit,
    windowMs: policy.windowMs,
    retryAfterSeconds: result.retryAfterSeconds,
  });
  throw new RateLimitExceededError(result.retryAfterSeconds);
}
