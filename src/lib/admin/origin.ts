import { AdminApiError } from "./errors";

/**
 * Same-origin enforcement for admin mutations.
 *
 * The browser always sends `Origin` on a cross-origin request and on any
 * non-GET request, so a missing header means the caller is not the admin UI:
 * `curl`, a script, or a server-to-server caller. Requiring a matching origin
 * rejects those instead of trusting them by default.
 *
 * The app sits behind Apache, which terminates TLS and proxies to it over
 * plain HTTP, so `request.url` reports the backend scheme (`http`) while the
 * browser's `Origin` carries `https`. The expected origin is therefore rebuilt
 * from the proxy headers (`x-forwarded-host`, else `host`, and
 * `x-forwarded-proto`) rather than from `request.url` — the same approach the
 * contact endpoint already uses in production.
 */
export type OriginRequest = {
  url: string;
  headers: { get(name: string): string | null };
};

export function requestOrigin(request: OriginRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  return `${forwardedProto}://${forwardedHost}`;
}

export function isSameOrigin(request: OriginRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return origin === requestOrigin(request);
  } catch {
    return false;
  }
}

export function assertSameOrigin(request: OriginRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) throw new AdminApiError(403, "Origin header is required");
  if (!isSameOrigin(request)) throw new AdminApiError(403, "Cross-origin mutation denied");
}
