import "server-only";

import { count, desc } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { auditEvents, leads } from "@/db/schema";
import { requireAdminPermission } from "./permissions";
import type { AdminSession } from "./session";
import { buildLeadsWorkbook, type LeadRow } from "./leads-workbook";

// ponytail: the page shows the newest 1000 rows; the Excel export has all of
// them. Add paging/date filters when support needs to browse further back.
const PAGE_LIMIT = 1000;

const columns = {
  id: leads.id,
  createdAt: leads.createdAt,
  name: leads.name,
  phone: leads.phone,
  email: leads.email,
  accountStatus: leads.accountStatus,
  locale: leads.locale,
  utmSource: leads.utmSource,
  utmMedium: leads.utmMedium,
  utmCampaign: leads.utmCampaign,
  utmContent: leads.utmContent,
};

export async function listLeadsForAdmin(session: AdminSession): Promise<{ rows: LeadRow[]; total: number }> {
  requireAdminPermission(session.role, "leads:read");
  const database = getDatabase();
  const [rows, [{ total }]] = await Promise.all([
    database.select(columns).from(leads).orderBy(desc(leads.createdAt)).limit(PAGE_LIMIT),
    database.select({ total: count() }).from(leads),
  ]);
  return { rows, total: Number(total) };
}

/**
 * Every lead as an .xlsx file. Each export is written to the audit log.
 * ponytail: builds the whole workbook in memory, fine for tens of thousands of
 * rows; switch to ExcelJS's streaming WorkbookWriter or a date range beyond that.
 */
export async function exportLeadsForAdmin(session: AdminSession): Promise<{ file: Buffer; rows: number }> {
  requireAdminPermission(session.role, "leads:read");
  const database = getDatabase();
  const rows = await database.select(columns).from(leads).orderBy(desc(leads.createdAt));
  const file = await buildLeadsWorkbook(rows);
  await database.insert(auditEvents).values({
    actorId: session.userId,
    action: "leads.export",
    entityType: "lead",
    outcome: "success",
    correlationId: crypto.randomUUID(),
    metadata: { rows: rows.length },
  });
  return { file, rows: rows.length };
}
