import "server-only";

import { randomUUID } from "node:crypto";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  adminUsers,
  auditEvents,
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "@/db/schema";
import { normalizeAdminEmail } from "./identity";
import { readAdminAuthConfig, type AdminAuthConfig } from "./auth-config";

type AdminAuth = ReturnType<typeof createAdminAuth>;
let cachedAuth: AdminAuth | null | undefined;

export function getAdminAuth(): AdminAuth | null {
  if (cachedAuth !== undefined) return cachedAuth;
  const config = readAdminAuthConfig();
  if (!config) {
    cachedAuth = null;
    return null;
  }

  cachedAuth = createAdminAuth(config);
  return cachedAuth;
}

function createAdminAuth(config: AdminAuthConfig) {
  const db = getDatabase();
  return betterAuth({
    appName: "RocoBroker Content Admin",
    baseURL: config.baseUrl,
    basePath: "/api/auth",
    secret: config.secret,
    trustedOrigins: [config.baseUrl],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
      },
    }),
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
        prompt: "select_account",
        includeGrantedScopes: false,
        ...(config.googleHostedDomain ? { hd: config.googleHostedDomain } : {}),
      },
    },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
    },
    account: {
      accountLinking: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
    },
    advanced: {
      useSecureCookies: config.baseUrl.startsWith("https://"),
      database: { generateId: () => randomUUID() },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const normalizedEmail = normalizeAdminEmail(user.email);
            const [allowlisted] = await db
              .select({ id: adminUsers.id })
              .from(adminUsers)
              .where(and(eq(adminUsers.normalizedEmail, normalizedEmail), eq(adminUsers.isActive, true)))
              .limit(1);

            if (!user.emailVerified || !allowlisted) {
              await db.insert(auditEvents).values({
                action: "auth.google.denied",
                entityType: "admin_session",
                outcome: "denied",
                correlationId: randomUUID(),
                metadata: { reason: !user.emailVerified ? "email_unverified" : "not_allowlisted" },
              });
              throw new APIError("FORBIDDEN", { message: "Admin access is not permitted." });
            }

            return { data: user };
          },
          after: async (user) => {
            const normalizedEmail = normalizeAdminEmail(user.email);
            const bound = await db
              .update(adminUsers)
              .set({ authUserId: user.id, updatedAt: new Date() })
              .where(
                and(
                  eq(adminUsers.normalizedEmail, normalizedEmail),
                  eq(adminUsers.isActive, true),
                  isNull(adminUsers.authUserId),
                ),
              )
              .returning({ id: adminUsers.id });

            if (bound.length === 0) {
              const [existing] = await db
                .select({ authUserId: adminUsers.authUserId })
                .from(adminUsers)
                .where(eq(adminUsers.normalizedEmail, normalizedEmail))
                .limit(1);
              if (existing?.authUserId !== user.id) {
                throw new APIError("FORBIDDEN", { message: "Admin identity binding failed." });
              }
            }
          },
        },
      },
      account: {
        create: {
          before: async (account) => ({
            data: { ...account, accessToken: null, refreshToken: null, idToken: null },
          }),
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [admin] = await db
              .select({ id: adminUsers.id })
              .from(adminUsers)
              .where(and(eq(adminUsers.authUserId, session.userId), eq(adminUsers.isActive, true)))
              .limit(1);
            if (!admin) throw new APIError("FORBIDDEN", { message: "Admin access is not permitted." });
            return { data: session };
          },
          after: async (session) => {
            const [admin] = await db
              .update(adminUsers)
              .set({ lastLoginAt: new Date(), updatedAt: new Date() })
              .where(and(eq(adminUsers.authUserId, session.userId), eq(adminUsers.isActive, true)))
              .returning({ id: adminUsers.id });
            if (!admin) return;
            await db.insert(auditEvents).values({
              actorId: admin.id,
              action: "auth.google.signed_in",
              entityType: "admin_session",
              outcome: "success",
              correlationId: randomUUID(),
              metadata: { provider: "google" },
            });
          },
        },
      },
    },
  });

}
