import { AdminApiError } from "./errors";

/**
 * Same-origin enforcement for admin mutations.
 *
 * The browser always sends `Origin` on a cross-origin request and on any
 * non-GET request, so a missing header means the caller is not the admin UI:
 * `curl`, a script, or a server-to-server caller. Requiring a matching origin
 * rejects those instead of trusting them by default. `Sec-Fetch-Site` is
 * deliberately not an accepted substitute here; admin mutations require the
 * unambiguous `Origin` header.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new AdminApiError(403, "Origin header is required");
  if (!isSameOrigin(request)) throw new AdminApiError(403, "Cross-origin mutation denied");
}
