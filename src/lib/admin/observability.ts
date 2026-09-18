/**
 * Structured operational logging and alerting for the admin content system.
 *
 * Every event is a single-line JSON record so journald or an external log
 * monitor can filter on `event` and `outcome`. Callers must never pass article
 * bodies, credentials, tokens, email addresses, or other customer data in
 * `fields`; only identifiers, counts, status codes, and latency belong here.
 *
 * Event keys are outcome-neutral streams. A success and a failure on the same
 * stream share a key, so a success clears the consecutive-failure count that
 * drives alerting.
 */

export type AdminLogOutcome = "success" | "failure" | "denied" | "alert" | "info";

export type AdminLogField = string | number | boolean | null | undefined;
export type AdminLogFields = Record<string, AdminLogField>;

export const adminEvents = {
  auth: "admin.auth",
  rateLimit: "admin.rate_limit",
  mediaUpload: "admin.media.upload",
  publish: "admin.publish",
  scheduledDelay: "admin.scheduled_publication.delay",
  cacheRefresh: "admin.cache_refresh",
  api: "admin.api",
  alert: "admin.alert",
} as const;

const failureStreaks = new Map<string, number>();

/** Consecutive failures of one event stream before an alert record is emitted. */
function alertThreshold(): number {
  const value = Number(process.env.ADMIN_ALERT_FAILURE_THRESHOLD ?? 5);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
}

export function logAdminEvent(event: string, outcome: AdminLogOutcome, fields: AdminLogFields = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, outcome, ...fields });
  if (outcome === "failure" || outcome === "alert") console.error(line);
  else console.info(line);
}

/** Logs a success and clears any failure streak for the event stream. */
export function reportAdminSuccess(event: string, fields: AdminLogFields = {}): void {
  const hadStreak = failureStreaks.delete(event);
  logAdminEvent(event, "success", hadStreak ? { ...fields, streakReset: true } : fields);
}

/**
 * Logs a failure with the running consecutive-failure count. Once the
 * configured threshold is reached it also emits an `admin.alert` record and
 * resets the count, so sustained failures alert periodically rather than on
 * every request.
 */
export function reportAdminFailure(event: string, fields: AdminLogFields = {}): void {
  const streak = (failureStreaks.get(event) ?? 0) + 1;
  logAdminEvent(event, "failure", { ...fields, consecutiveFailures: streak });
  if (streak >= alertThreshold()) {
    logAdminEvent(adminEvents.alert, "alert", {
      trigger: event,
      consecutiveFailures: streak,
      threshold: alertThreshold(),
    });
    failureStreaks.delete(event);
  } else {
    failureStreaks.set(event, streak);
  }
}

/** Test and process-lifecycle hook so streak state cannot leak between cases. */
export function resetAdminFailureStreaks(): void {
  failureStreaks.clear();
}
