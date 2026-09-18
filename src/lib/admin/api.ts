import "server-only";

import { ZodError } from "zod";
import { getAdminSession } from "./session";
import { ContentConflictError, ContentLockedError, ContentNotFoundError, ContentRouteConflictError, ContentSeoError } from "./content-service";
import { AdminAuthorizationError } from "./permissions";
import { PublicationTransitionError } from "./publication-service";

export async function requireAdminApiSession() {
  const session = await getAdminSession();
  if (!session || session.expiresAt <= new Date()) throw new AdminApiError(401, "Authentication required");
  return session;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new AdminApiError(403, "Origin header is required");
  const expected = new URL(request.url).origin;
  if (origin !== expected) throw new AdminApiError(403, "Cross-origin mutation denied");
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

export class AdminApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
  }
}

export function adminApiErrorResponse(error: unknown): Response {
  if (error instanceof AdminApiError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ContentConflictError) {
    return Response.json({ error: error.message, code: "version_conflict", currentVersion: error.currentVersion }, { status: 409 });
  }
  if (error instanceof ContentNotFoundError) return Response.json({ error: error.message }, { status: 404 });
  if (error instanceof ContentLockedError) return Response.json({ error: error.message, code: "content_locked" }, { status: 409 });
  if (error instanceof ContentRouteConflictError) return Response.json({ error: error.message, code: "route_collision" }, { status: 409 });
  if (error instanceof ContentSeoError) return Response.json({ error: error.message, code: "invalid_seo" }, { status: 400 });
  if (error instanceof AdminAuthorizationError) return Response.json({ error: "Permission denied" }, { status: 403 });
  if (error instanceof PublicationTransitionError) {
    return Response.json({ error: error.message, code: error.code }, { status: 409 });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: "Invalid input", issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) }, { status: 400 });
  }
  if (isPostgresUniqueViolation(error)) return Response.json({ error: "That slug or translation already exists", code: "duplicate" }, { status: 409 });
  console.error("Admin API failure", { name: error instanceof Error ? error.name : "UnknownError" });
  return Response.json({ error: "The operation could not be completed" }, { status: 500 });
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}
