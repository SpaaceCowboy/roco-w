type Environment = Record<string, string | undefined>;
type RequestHeaders = { get(name: string): string | null };

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLoopbackHost(host: string): boolean {
  try {
    const url = new URL(`http://${host}`);
    return loopbackHosts.has(url.hostname) && url.host === host.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Opt-in only: never enable this from a production build or a public hostname.
 * The Host header is client-controlled, so locality also depends on the server being
 * bound to loopback: only `npm run dev:local` (which passes `--hostname 127.0.0.1`)
 * qualifies. A stray ADMIN_LOCAL_DEV_BYPASS in a .env file under plain `next dev`
 * (listening on every interface) must not expose admin to the LAN.
 */
export function isLocalDevAdminRequest(headers: RequestHeaders, environment: Environment = process.env): boolean {
  if (environment.NODE_ENV !== "development" || environment.ADMIN_LOCAL_DEV_BYPASS !== "1") return false;
  if (environment.npm_lifecycle_event !== "dev:local") return false;
  const host = headers.get("host");
  if (!host || !isLoopbackHost(host)) return false;
  const forwardedHost = headers.get("x-forwarded-host");
  if (forwardedHost && forwardedHost !== host) return false;
  const origin = headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.origin !== origin || url.host !== host || !["http:", "https:"].includes(url.protocol)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** The bypass must never authorize edits against a remote content database. */
export function assertLocalDevDatabase(environment: Environment = process.env): void {
  let url: URL;
  try {
    url = new URL(environment.DATABASE_URL ?? "");
  } catch {
    throw new Error("Local admin bypass requires DATABASE_URL pointing to a local PostgreSQL database");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) || !loopbackHosts.has(url.hostname) ||
    ["host", "hostaddr", "service"].some((key) => url.searchParams.has(key))
  ) {
    throw new Error("Local admin bypass requires a loopback PostgreSQL database without host overrides");
  }
}
