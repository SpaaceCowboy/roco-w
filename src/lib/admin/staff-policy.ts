import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { firstForwardedValue } from "./proxy-host";

export function staffServiceSecret(): string | undefined {
  const path = process.env.ADMIN_STAFF_SERVICE_SECRET_FILE;
  if (!path) return process.env.ADMIN_STAFF_SERVICE_SECRET;
  if (process.env.ADMIN_STAFF_SERVICE_SECRET)
    throw new Error("Configure one staff service secret source");
  if (statSync(path).size > 256)
    throw new Error("Invalid staff service secret file");
  return readFileSync(path, "utf8").trim();
}

export function staffMode(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return environment.ADMIN_AUTH_MODE === "staff";
}

export function serviceAuthorized(
  headers: { get(name: string): string | null },
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < 32) return false;
  const candidate =
    headers.get("x-roco-proxy-key") ??
    headers.get("authorization")?.replace(/^Bearer /, "");
  if (!candidate || candidate.length > 256) return false;
  return timingSafeEqual(
    createHash("sha256").update(candidate).digest(),
    createHash("sha256").update(secret).digest(),
  );
}

export function trustedStaffProxy(headers: {
  get(name: string): string | null;
}): boolean {
  return (
    serviceAuthorized(headers, staffServiceSecret()) &&
    firstForwardedValue(headers.get("x-forwarded-host")) ===
      new URL(process.env.ADMIN_AUTH_BASE_URL ?? "https://scc.rocobroker.com")
        .host &&
    firstForwardedValue(headers.get("x-forwarded-proto")) === "https"
  );
}

export function staffReturnPath(value: string | undefined): string {
  if (!value || value.includes("\\") || value.startsWith("//")) return "/admin";
  return value === "/" ||
    (/^\/admin(?:\/|\?|$)/.test(value) && !value.startsWith("/admin/sign-in"))
    ? value
    : "/admin";
}

const staffRoutes = new Set([
  "/get-session",
  "/sign-in/email",
  "/sign-out",
  "/two-factor/enable",
  "/two-factor/get-totp-uri",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
  "/two-factor/generate-backup-codes",
]);
export function staffAuthRouteAllowed(path: string): boolean {
  return staffRoutes.has(path);
}

export function hasVerifiedMfa(
  session: { mfaVerifiedAt?: unknown; expiresAt: Date | string },
  enabled: boolean,
  now = Date.now(),
): boolean {
  const verified =
    session.mfaVerifiedAt instanceof Date
      ? session.mfaVerifiedAt.getTime()
      : Number.NaN;
  return (
    enabled &&
    Number.isFinite(verified) &&
    verified <= now &&
    new Date(session.expiresAt).getTime() > now
  );
}
