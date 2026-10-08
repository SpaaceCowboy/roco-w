import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { closeDatabase, getDatabase } from "@/db/client";
import {
  adminUsers,
  auditEvents,
  authAccounts,
  authSessions,
  authTwoFactors,
  authUsers,
  authVerifications,
} from "@/db/schema";
import { normalizeAdminEmail } from "@/lib/admin/identity";
import { adminRoles, type AdminRole } from "@/lib/admin/permissions";

function option(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
}
async function hiddenPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error("An interactive terminal is required");
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const cleanup = () => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " " && value.length < 129) value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const command = process.argv[2],
    email = option("email");
  if (
    !email ||
    !["create", "reset-password", "disable", "reset-mfa"].includes(
      command ?? "",
    ) ||
    option("password")
  )
    throw new Error(
      "Usage: npm run staff:user -- create|reset-password|disable|reset-mfa --email <email> [--role admin|editor|reviewer] [--seo-actor-id <human actor UUID>] [--name <name>]. Passwords are prompted securely.",
    );
  const normalized = normalizeAdminEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    throw new Error("A valid email is required");
  const role = option("role") as AdminRole | undefined,
    seoActorId = option("seo-actor-id");
  if (command === "create" && (!role || !adminRoles.includes(role)))
    throw new Error("Create requires an explicit valid --role");
  if (
    seoActorId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      seoActorId,
    )
  )
    throw new Error("Invalid SEO actor UUID");
  let passwordHash: string | undefined;
  if (command === "create" || command === "reset-password") {
    const password = await hiddenPassword("Password (12–128 characters): ");
    if (password.length < 12 || password.length > 128)
      throw new Error("Password must be 12–128 characters");
    if (password !== (await hiddenPassword("Confirm password: ")))
      throw new Error("Passwords do not match");
    passwordHash = await hashPassword(password);
  }
  try {
    await getDatabase().transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.normalizedEmail, normalized))
        .for("update")
        .limit(1);
      let userId = existing?.authUserId;
      if (command === "create") {
        if (userId) {
          const [credential] = await tx
            .select({ id: authAccounts.id })
            .from(authAccounts)
            .where(
              and(
                eq(authAccounts.userId, userId),
                eq(authAccounts.providerId, "credential"),
              ),
            )
            .limit(1);
          if (credential)
            throw new Error(
              "Account already has a password; use reset-password",
            );
        } else {
          const [identity] = await tx
            .select({ id: authUsers.id })
            .from(authUsers)
            .where(eq(authUsers.email, normalized))
            .limit(1);
          userId = identity?.id ?? randomUUID();
          if (!identity)
            await tx.insert(authUsers).values({
              id: userId,
              name: option("name") ?? "Staff",
              email: normalized,
              emailVerified: true,
            });
        }
        await tx
          .update(authUsers)
          .set({ emailVerified: true, updatedAt: new Date() })
          .where(eq(authUsers.id, userId));
        await tx.insert(authAccounts).values({
          id: randomUUID(),
          accountId: userId,
          userId,
          providerId: "credential",
          password: passwordHash,
        });
        if (existing)
          await tx
            .update(adminUsers)
            .set({
              authUserId: userId,
              role: role!,
              seoActorId: seoActorId ?? existing.seoActorId,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(adminUsers.id, existing.id));
        else
          await tx.insert(adminUsers).values({
            email: normalized,
            normalizedEmail: normalized,
            authUserId: userId,
            role: role!,
            seoActorId,
            displayName: option("name"),
            isActive: true,
          });
      } else {
        if (!existing || !userId) throw new Error("Account does not exist");
        if (command === "reset-password") {
          const updated = await tx
            .update(authAccounts)
            .set({ password: passwordHash, updatedAt: new Date() })
            .where(
              and(
                eq(authAccounts.userId, userId),
                eq(authAccounts.providerId, "credential"),
              ),
            )
            .returning({ id: authAccounts.id });
          if (!updated.length)
            throw new Error(
              "Account has no password; use create to attach one",
            );
        } else if (command === "disable")
          await tx
            .update(adminUsers)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(adminUsers.id, existing.id));
        else {
          await tx
            .delete(authTwoFactors)
            .where(eq(authTwoFactors.userId, userId));
          await tx
            .update(authUsers)
            .set({ twoFactorEnabled: false, updatedAt: new Date() })
            .where(eq(authUsers.id, userId));
        }
      }
      await tx.delete(authSessions).where(eq(authSessions.userId, userId!));
      await tx
        .delete(authVerifications)
        .where(eq(authVerifications.value, userId!));
      await tx.insert(auditEvents).values({
        action: `staff.${command}`,
        entityType: "admin_user",
        outcome: "success",
        correlationId: randomUUID(),
        metadata: { role },
      });
    });
    console.log(
      "Staff account updated; existing sessions and sign-in challenges revoked.",
    );
  } finally {
    await closeDatabase();
  }
}
main().catch(() => {
  console.error(
    "Staff account operation failed. Check the command, database availability and account state. No changes were committed.",
  );
  process.exitCode = 1;
});
