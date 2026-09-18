import "server-only";

import { getDatabase } from "@/db/client";
import { auditEvents, type NewAuditEvent } from "@/db/schema";

type AuditMetadataValue = string | number | boolean | null;

export type WriteAuditEventInput = Omit<NewAuditEvent, "id" | "createdAt" | "metadata"> & {
  metadata?: Record<string, AuditMetadataValue>;
};

/** Append-only by database trigger. Never pass request bodies or content here. */
export async function writeAuditEvent(input: WriteAuditEventInput): Promise<void> {
  await getDatabase().insert(auditEvents).values({ ...input, metadata: input.metadata ?? {} });
}
