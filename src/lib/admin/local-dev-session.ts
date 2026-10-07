import "server-only";

import { eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { assertLocalDevDatabase } from "./local-dev-policy";
import type { AdminSession } from "./session";

const localDeveloperId = "00000000-0000-4000-8000-000000000001";
const localDeveloperEmail = "local-developer@localhost.invalid";

let verifiedActor: Promise<string> | undefined;

/** Upserts and verifies the dedicated audit identity; cached per process after success. */
async function verifyLocalDeveloper(): Promise<string> {
  const database = getDatabase();
  await database.insert(adminUsers).values({
    id: localDeveloperId,
    email: localDeveloperEmail,
    normalizedEmail: localDeveloperEmail,
    displayName: "Local developer",
    role: "admin",
    // This audit identity is deliberately ineligible for normal Google sign-in.
    isActive: false,
  }).onConflictDoNothing();
  const [actor] = await database.select().from(adminUsers).where(eq(adminUsers.id, localDeveloperId)).limit(1);
  if (!actor || actor.normalizedEmail !== localDeveloperEmail || actor.role !== "admin" || actor.isActive || actor.authUserId) {
    throw new Error("Local developer audit identity is missing or conflicts with an existing administrator");
  }
  return actor.id;
}

/** Called only after the development flag and loopback request checks pass. */
export async function getLocalDevAdminSession(): Promise<AdminSession> {
  assertLocalDevDatabase();
  verifiedActor ??= verifyLocalDeveloper().catch((error: unknown) => {
    verifiedActor = undefined; // retry on the next request instead of caching a failure
    throw error;
  });
  return {
    userId: await verifiedActor,
    role: "admin",
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    localDevelopment: true,
  };
}
