import ExcelJS from "exceljs";

export type LeadRow = {
  id: string;
  createdAt: Date;
  name: string;
  phone: string;
  email: string | null;
  accountStatus: "new" | "lion" | "cheetah" | "other";
  locale: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
};

export const leadStatusLabels: Record<LeadRow["accountStatus"], string> = {
  new: "No ROCO account yet",
  lion: "Has Standard Lion",
  cheetah: "Has Standard Cheetah",
  other: "Has another account",
};

/**
 * One sheet, one row per lead. Every value is written as a plain string or
 * date, never a formula, so a name like "=HYPERLINK(…)" stays inert text, and
 * phone numbers keep their leading zero.
 */
export async function buildLeadsWorkbook(rows: LeadRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Submitted (UTC)", key: "createdAt", width: 20, style: { numFmt: "yyyy-mm-dd hh:mm" } },
    { header: "Full name", key: "name", width: 28 },
    { header: "Mobile", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 30 },
    { header: "Current status", key: "accountStatus", width: 24 },
    { header: "Language", key: "locale", width: 10 },
    { header: "utm_source", key: "utmSource", width: 16 },
    { header: "utm_medium", key: "utmMedium", width: 16 },
    { header: "utm_campaign", key: "utmCampaign", width: 20 },
    { header: "utm_content", key: "utmContent", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow({
      ...row,
      email: row.email ?? "",
      accountStatus: leadStatusLabels[row.accountStatus],
      utmSource: row.utmSource ?? "",
      utmMedium: row.utmMedium ?? "",
      utmCampaign: row.utmCampaign ?? "",
      utmContent: row.utmContent ?? "",
    });
  }
  sheet.autoFilter = { from: "A1", to: "J1" };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
