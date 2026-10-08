import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { adminUsers } from "@/db/schema";
import type { AdminRole } from "./permissions";
import { getAdminAuth } from "./auth";
import { isSessionActive } from "./session-policy";
import { isLocalDevAdminRequest } from "./local-dev-policy";
import { getLocalDevAdminSession } from "./local-dev-session";
import { staffMode, trustedStaffProxy } from "./staff-policy";
import { getVerifiedStaffSession } from "./staff-session";

export type AdminSession = {
  userId: string;
  role: AdminRole;
  expiresAt: Date;
  localDevelopment?: boolean;
  seoActorId?: string | null;
};

/**
 * Google authentication is required unless the explicit localhost development
 * bypass is enabled. Both pages and API mutations use this boundary.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const requestHeaders = await headers();
  if (isLocalDevAdminRequest(requestHeaders)) return getLocalDevAdminSession();
  if (staffMode()) {
    if (!trustedStaffProxy(requestHeaders)) return null;
    return getVerifiedStaffSession(new Headers(requestHeaders));
  }
  const auth = getAdminAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user?.id || !session.user.emailVerified) return null;

  const [admin] = await getDatabase()
    .select({ id: adminUsers.id, role: adminUsers.role })
    .from(adminUsers)
    .where(
      and(
        eq(adminUsers.authUserId, session.user.id),
        eq(adminUsers.isActive, true),
      ),
    )
    .limit(1);
  if (!admin) return null;

  return {
    userId: admin.id,
    role: admin.role,
    expiresAt: new Date(session.session.expiresAt),
  };
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!isSessionActive(session)) redirect("/admin/sign-in");
  return session;
}
