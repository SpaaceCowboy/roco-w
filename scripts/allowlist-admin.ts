import { randomUUID } from "node:crypto";
import { closeDatabase, getDatabase } from "@/db/client";
import { adminUsers, auditEvents } from "@/db/schema";
import { adminRoles, type AdminRole } from "@/lib/admin/permissions";
import { normalizeAdminEmail } from "@/lib/admin/identity";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const email = option("email");
  const role = option("role") as AdminRole | undefined;
  const displayName = option("name");

  if (!email || !role || !adminRoles.includes(role)) {
    throw new Error(
      "Usage: npm run admin:allowlist -- --email admin@example.com --role admin|editor|reviewer [--name Name]",
    );
  }

  const normalizedEmail = normalizeAdminEmail(email);
  const db = getDatabase();
  try {
    await db.transaction(async (transaction) => {
      await transaction
        .insert(adminUsers)
        .values({ email: email.trim(), normalizedEmail, displayName, role, isActive: true })
        .onConflictDoUpdate({
          target: adminUsers.normalizedEmail,
          set: { email: email.trim(), displayName, role, isActive: true, updatedAt: new Date() },
        });
      await transaction.insert(auditEvents).values({
        action: "admin.allowlist.upserted",
        entityType: "admin_user",
        outcome: "success",
        correlationId: randomUUID(),
        metadata: { role },
      });
    });
    console.log(`Allowlisted ${normalizedEmail} as ${role}.`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to update the admin allowlist");
  process.exitCode = 1;
});
