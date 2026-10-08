// Integration verification against a disposable, migrated PostgreSQL database only.
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

async function main() {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error(
      "TEST_DATABASE_URL must point to a disposable migrated database",
    );
  const testDatabase = new URL(process.env.TEST_DATABASE_URL);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(testDatabase.hostname) ||
    !testDatabase.pathname.includes("test")
  )
    throw new Error("Verification requires a loopback test database");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.ADMIN_AUTH_MODE = "staff";
  process.env.ADMIN_AUTH_BASE_URL = "https://scc.rocobroker.com";
  process.env.ADMIN_AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.ADMIN_STAFF_SERVICE_SECRET =
    randomBytes(48).toString("base64url");

  const { getDatabase, closeDatabase } = await import("../src/db/client");
  const {
    adminUsers,
    authUsers,
    authAccounts,
    authSessions,
    authVerifications,
  } = await import("../src/db/schema");
  const { POST } = await import("../src/app/api/auth/[...all]/route");
  const { GET: sessionEndpoint } =
    await import("../src/app/api/admin/staff-session/route");
  const userId = randomUUID(),
    adminId = randomUUID(),
    seoActorId = randomUUID(),
    email = `${randomUUID()}@example.test`,
    password = randomBytes(24).toString("base64url");
  const db = getDatabase(),
    jar = new Map<string, string>();
  let seoApp:
    | {
        inject(options: {
          method: string;
          url: string;
          headers: Record<string, string>;
        }): Promise<{ statusCode: number }>;
        close(): Promise<void>;
      }
    | undefined;
  const originalFetch = globalThis.fetch;
  if (process.env.SEO_SOURCE_DIR) {
    process.env.STAFF_AUTH_URL =
      "https://authority.example.test/api/admin/staff-session";
    process.env.STAFF_AUTH_SERVICE_SECRET =
      process.env.ADMIN_STAFF_SERVICE_SECRET;
    const { buildApp } = await import(
      pathToFileURL(resolve(process.env.SEO_SOURCE_DIR, "apps/api/dist/app.js"))
        .href
    );
    const { createLogger } = await import(
      pathToFileURL(
        resolve(process.env.SEO_SOURCE_DIR, "packages/shared/dist/index.js"),
      ).href
    );
    globalThis.fetch = async (input, init) =>
      sessionEndpoint(new Request(String(input), init));
    seoApp = buildApp({
      logger: createLogger({
        level: "silent",
        service: "staff-integration",
        environment: "test",
      }),
      readiness: async () => ({ database: true, queue: true }),
      workflowAccess: JSON.stringify([
        {
          token: randomBytes(48).toString("base64url"),
          actorId: seoActorId,
          roles: ["VIEWER"],
        },
      ]),
      control: {
        identity: async (principal: { actorId: string; roles: string[] }) => {
          assert.equal(principal.actorId, seoActorId);
          assert.deepEqual(principal.roles, ["VIEWER"]);
          return {
            actorId: seoActorId,
            displayName: "Fixture",
            roles: principal.roles,
          };
        },
        auditSession: async () => {},
        sites: async () => [],
        read: async () => ({}),
        detail: async () => ({}),
      },
    });
  }
  function cookies() {
    return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async function request(path: string, body: unknown) {
    const response = await POST(
      new Request(`https://scc.rocobroker.com/api/auth${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: process.env.ADMIN_AUTH_BASE_URL!,
          cookie: cookies(),
          "x-roco-client-ip": "127.0.0.1",
          "x-roco-proxy-key": process.env.ADMIN_STAFF_SERVICE_SECRET!,
          "x-forwarded-host": "scc.rocobroker.com",
          "x-forwarded-proto": "https",
        },
        body: JSON.stringify(body),
      }),
    );
    for (const entry of response.headers.getSetCookie()) {
      const pair = entry.split(";")[0]!,
        at = pair.indexOf("=");
      if (pair.slice(at + 1)) jar.set(pair.slice(0, at), pair.slice(at + 1));
      else jar.delete(pair.slice(0, at));
    }
    return { response, data: await response.json() };
  }
  async function session(cookie = cookies()) {
    const response = await sessionEndpoint(
      new Request("https://rocobroker.com/api/admin/staff-session", {
        headers: {
          authorization: `Bearer ${process.env.ADMIN_STAFF_SERVICE_SECRET}`,
          cookie,
        },
      }),
    );
    if (seoApp) {
      const value = new Map(
        cookie.split("; ").map((part) => {
          const i = part.indexOf("=");
          return [part.slice(0, i), part.slice(i + 1)];
        }),
      ).get("__Secure-roco-staff.session_token");
      const authorization = value
        ? `StaffSession ${Buffer.from(`__Secure-roco-staff.session_token=${decodeURIComponent(value)}`).toString("base64url")}`
        : "StaffSession invalid";
      const result = await seoApp.inject({
        method: "GET",
        url: "/control/session",
        headers: { authorization },
      });
      assert.equal(
        result.statusCode,
        response.status,
        "SEO must enforce the same actual MFA session and actor mapping",
      );
    }
    return response;
  }
  function totp(key: string) {
    let bits = "";
    for (const char of key.toUpperCase().replace(/=+$/, ""))
      bits += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        .indexOf(char)
        .toString(2)
        .padStart(5, "0");
    const bytes = Buffer.from(bits.match(/.{8}/g)!.map((x) => parseInt(x, 2)));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const digest = createHmac("sha1", bytes).update(counter).digest(),
      offset = digest[19]! & 15;
    return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
      .toString()
      .padStart(6, "0");
  }

  try {
    await db.insert(authUsers).values({
      id: userId,
      email,
      name: "Integration test",
      emailVerified: true,
    });
    await db.insert(adminUsers).values({
      id: adminId,
      email,
      normalizedEmail: email,
      authUserId: userId,
      role: "admin",
      seoActorId,
    });
    await db.insert(authAccounts).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: await hashPassword(password),
    });
    assert.equal(
      (await request("/sign-up/email", { email, password, name: "Denied" }))
        .response.status,
      404,
    );
    assert.equal(
      (
        await request("/sign-in/email", {
          email,
          password: "incorrect-password",
        })
      ).response.status,
      401,
    );
    assert.equal(
      (await request("/sign-in/email", { email, password })).response.status,
      200,
    );
    assert.ok(
      jar.has("__Secure-roco-staff.session_token"),
      "the shared cookie name must match the SEO adapter",
    );
    assert.equal(
      (await session()).status,
      401,
      "password-only session must have no dashboard access",
    );
    const preEnrollmentCookie = cookies();
    const enrollment = await request("/two-factor/enable", {
      password,
      method: "totp",
    });
    assert.equal(enrollment.response.status, 200);
    const key = new URL(enrollment.data.totpURI).searchParams.get("secret")!;
    const validCode = totp(key),
      invalidCode = `${validCode.slice(0, 5)}${(Number(validCode[5]) + 1) % 10}`;
    assert.notEqual(
      (
        await request("/two-factor/verify-totp", {
          code: invalidCode,
          trustDevice: false,
        })
      ).response.status,
      200,
    );
    assert.equal(
      (await session()).status,
      401,
      "invalid MFA codes must not grant access",
    );
    assert.equal(
      (
        await request("/two-factor/verify-totp", {
          code: totp(key),
          trustDevice: false,
        })
      ).response.status,
      200,
    );
    assert.equal(
      (await session()).status,
      200,
      "only the newly MFA-verified session is valid",
    );
    assert.equal((await session(preEnrollmentCookie)).status, 401);
    assert.equal(
      (await request("/two-factor/disable", { password })).response.status,
      404,
    );
    const activeCookie = cookies();
    const emptySignOut = await POST(new Request("https://scc.rocobroker.com/api/auth/sign-out", { method: "POST", headers: {
      origin: process.env.ADMIN_AUTH_BASE_URL!, cookie: cookies(), "x-roco-proxy-key": process.env.ADMIN_STAFF_SERVICE_SECRET!, "x-forwarded-host": "scc.rocobroker.com", "x-forwarded-proto": "https", "x-roco-client-ip": "127.0.0.1",
    } }));
    assert.equal(emptySignOut.status, 200, "the existing blog auth client may send an empty sign-out body");

    assert.equal((await request("/sign-out", {})).response.status, 200);
    assert.equal(
      (await session(activeCookie)).status,
      401,
      "global logout revokes the shared session",
    );
    const signIn = await request("/sign-in/email", { email, password });
    assert.equal(signIn.response.status, 200);
    assert.equal(signIn.data.twoFactorRedirect, true);
    assert.equal(
      (await session()).status,
      401,
      "an MFA challenge grants no access",
    );
    const recovery = await request("/two-factor/verify-backup-code", {
      code: enrollment.data.backupCodes[0],
      trustDevice: false,
    });
    assert.equal(recovery.response.status, 200);
    assert.equal(
      (await session()).status,
      200,
      "recovery verification creates an MFA-verified session",
    );
    const reuse = await request("/two-factor/verify-backup-code", {
      code: enrollment.data.backupCodes[0],
      trustDevice: false,
    });
    assert.notEqual(
      reuse.response.status,
      200,
      "a recovery code is single-use",
    );
    await db
      .update(authSessions)
      .set({
        createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 60_000),
      })
      .where(eq(authSessions.userId, userId));
    assert.equal(
      (await session()).status,
      401,
      "staff sessions have a hard eight-hour lifetime despite refresh",
    );
    await db
      .update(authSessions)
      .set({ createdAt: new Date() })
      .where(eq(authSessions.userId, userId));
    await db
      .update(adminUsers)
      .set({ isActive: false })
      .where(eq(adminUsers.id, adminId));
    assert.equal(
      (await session()).status,
      401,
      "disabled staff cannot use existing sessions",
    );
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
    await db
      .delete(authVerifications)
      .where(eq(authVerifications.value, userId));
    console.log(
      "Staff auth integration passed: signup denied, password-only access denied, MFA enrollment, shared logout, challenge isolation, recovery codes and disabled accounts.",
    );
  } finally {
    // Keep disabled fixture identities: deleting them would mutate append-only audit references.
    await db
      .update(adminUsers)
      .set({ isActive: false })
      .where(eq(adminUsers.id, adminId));
    await closeDatabase();
    await seoApp?.close();
    globalThis.fetch = originalFetch;
  }
}
main().catch((error: unknown) => {
  console.error(
    "Staff auth integration failed:",
    error instanceof assert.AssertionError
      ? error.message
      : error instanceof Error
        ? error.name
        : "UnknownError",
  );
  process.exitCode = 1;
});
