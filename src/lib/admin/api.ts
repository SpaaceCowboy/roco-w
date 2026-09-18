import "server-only";

import { ZodError } from "zod";
import { getAdminSession } from "./session";
import { ContentConflictError, ContentLockedError, ContentNotFoundError, ContentRouteConflictError, ContentSeoError } from "./content-service";
import { AdminAuthorizationError } from "./permissions";
import { PublicationTransitionError } from "./publication-service";
import { AdminApiError, RateLimitExceededError } from "./errors";
import { isSessionActive } from "./session-policy";
import { adminEvents, logAdminEvent, reportAdminFailure } from "./observability";

export { AdminApiError } from "./errors";
export { assertSameOrigin } from "./origin";

export async function requireAdminApiSession() {
  const session = await getAdminSession();
  if (!session) {
    reportAdminFailure(adminEvents.auth, { reason: "no_session" });
    throw new AdminApiError(401, "Authentication required");
  }
  if (!isSessionActive(session)) {
    reportAdminFailure(adminEvents.auth, { reason: "expired_session" });
    throw new AdminApiError(401, "Authentication required");
  }
  return session;
}

export async function readJsonBody(request: Request, maxBytes = 900_000): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new AdminApiError(413, "Request body is too large");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new AdminApiError(413, "Request body is too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new AdminApiError(400, "Request body must be valid JSON");
  }
}

export function adminApiErrorResponse(error: unknown): Response {
  if (error instanceof RateLimitExceededError) {
    return Response.json(
      { error: error.message, code: "rate_limited" },
      { status: error.status, headers: { "Retry-After": String(error.retryAfterSeconds) } },
    );
  }
  if (error instanceof AdminApiError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ContentConflictError) {
    return Response.json({ error: error.message, code: "version_conflict", currentVersion: error.currentVersion }, { status: 409 });
  }
  if (error instanceof ContentNotFoundError) return Response.json({ error: error.message }, { status: 404 });
  if (error instanceof ContentLockedError) return Response.json({ error: error.message, code: "content_locked" }, { status: 409 });
  if (error instanceof ContentRouteConflictError) return Response.json({ error: error.message, code: "route_collision" }, { status: 409 });
  if (error instanceof ContentSeoError) return Response.json({ error: error.message, code: "invalid_seo" }, { status: 400 });
  if (error instanceof AdminAuthorizationError) {
    logAdminEvent(adminEvents.auth, "denied", { reason: "permission_denied", role: error.role, permission: error.permission });
    return Response.json({ error: "Permission denied" }, { status: 403 });
  }
  if (error instanceof PublicationTransitionError) {
    logAdminEvent(adminEvents.publish, "denied", { code: error.code });
    return Response.json({ error: error.message, code: error.code }, { status: 409 });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: "Invalid input", issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
  }
  if (isPostgresUniqueViolation(error)) return Response.json({ error: "That slug or translation already exists", code: "duplicate" }, { status: 409 });
  reportAdminFailure(adminEvents.api, { name: error instanceof Error ? error.name : "UnknownError" });
  return Response.json({ error: "The operation could not be completed" }, { status: 500 });
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}
