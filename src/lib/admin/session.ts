import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { adminUsers } from "@/db/schema";
import type { AdminRole } from "./permissions";
import { getAdminAuth } from "./auth";

export type AdminSession = {
  userId: string;
  role: AdminRole;
  expiresAt: Date;
};

/**
 * Fails closed until the selected OIDC provider is connected. The protected
 * admin route already depends on this boundary, so adding a provider cannot
 * accidentally bypass server-side authorization.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.user.emailVerified) return null;

  const [admin] = await getDatabase()
    .select({ id: adminUsers.id, role: adminUsers.role })
    .from(adminUsers)
    .where(and(eq(adminUsers.authUserId, session.user.id), eq(adminUsers.isActive, true)))
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
  if (!session || session.expiresAt <= new Date()) redirect("/admin/sign-in");
  return session;
}
