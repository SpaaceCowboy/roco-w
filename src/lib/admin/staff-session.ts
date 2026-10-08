import "server-only";
import { createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { adminUsers, authSessions, authUsers } from "@/db/schema";
import { getAdminAuth } from "./auth";
import { hasVerifiedMfa } from "./staff-policy";

export async function getVerifiedStaffSession(requestHeaders: Headers) {
  const auth = getAdminAuth();
  if (!auth) return null;
  const identity = await auth.api.getSession({ headers: requestHeaders });
  if (!identity?.user.emailVerified) return null;
  const [row] = await getDatabase()
    .select({
      userId: adminUsers.id,
      authUserId: authUsers.id,
      role: adminUsers.role,
      seoActorId: adminUsers.seoActorId,
      sessionId: authSessions.id,
      expiresAt: authSessions.expiresAt,
      createdAt: authSessions.createdAt,
      mfaVerifiedAt: authSessions.mfaVerifiedAt,
      twoFactorEnabled: authUsers.twoFactorEnabled,
    })
    .from(authSessions)
    .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
    .innerJoin(adminUsers, eq(adminUsers.authUserId, authUsers.id))
    .where(
      and(
        eq(authSessions.id, identity.session.id),
        eq(adminUsers.isActive, true),
      ),
    )
    .limit(1);
  if (!row) return null;
  const expiresAt = new Date(
    Math.min(
      row.expiresAt.getTime(),
      row.createdAt.getTime() + 8 * 60 * 60 * 1000,
    ),
  );
  if (!hasVerifiedMfa({ ...row, expiresAt }, row.twoFactorEnabled)) return null;
  return {
    userId: row.userId,
    authUserId: row.authUserId,
    role: row.role,
    seoActorId: row.seoActorId,
    expiresAt,
    csrf: createHmac("sha256", process.env.ADMIN_AUTH_SECRET!)
      .update(`staff-csrf:${row.sessionId}`)
      .digest("base64url"),
  };
}
