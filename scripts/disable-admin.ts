import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/db/client";
import { adminUsers, auditEvents, authSessions } from "@/db/schema";
import { normalizeAdminEmail } from "@/lib/admin/identity";

function emailArgument(): string | undefined {
  const index = process.argv.indexOf("--email");
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const email = emailArgument();
  if (!email) throw new Error("Usage: npm run admin:disable -- --email admin@example.com");

  const normalizedEmail = normalizeAdminEmail(email);
  const db = getDatabase();
  try {
    await db.transaction(async (transaction) => {
      const [admin] = await transaction
        .update(adminUsers)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(adminUsers.normalizedEmail, normalizedEmail))
        .returning({ id: adminUsers.id, authUserId: adminUsers.authUserId });
      if (!admin) throw new Error("No matching admin allowlist entry exists");

      if (admin.authUserId) {
        await transaction.delete(authSessions).where(eq(authSessions.userId, admin.authUserId));
      }
      await transaction.insert(auditEvents).values({
        action: "admin.allowlist.disabled",
        entityType: "admin_user",
        entityId: admin.id,
        outcome: "success",
        correlationId: randomUUID(),
      });
    });
    console.log(`Disabled ${normalizedEmail} and revoked its active sessions.`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to disable the admin");
  process.exitCode = 1;
});
