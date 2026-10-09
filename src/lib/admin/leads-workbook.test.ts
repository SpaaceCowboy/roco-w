import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildLeadsWorkbook } from "./leads-workbook";

test("leads workbook keeps phone zeros, Persian text and inert formulas", async () => {
  const file = await buildLeadsWorkbook([
    {
      id: "1",
      createdAt: new Date("2026-10-09T10:30:00Z"),
      name: "=HYPERLINK(\"http://x\")",
      phone: "09123456789",
      email: null,
      accountStatus: "lion",
      locale: "fa",
      utmSource: "instagram",
      utmMedium: null,
      utmCampaign: "swap-oct",
      utmContent: null,
    },
    {
      id: "2",
      createdAt: new Date("2026-10-09T11:00:00Z"),
      name: "علی رضایی",
      phone: "+447401131099",
      email: "a@b.co",
      accountStatus: "new",
      locale: "en",
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
    },
  ]);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet("Leads")!;
  assert.equal(sheet.rowCount, 3);
  assert.equal(sheet.getCell("B2").value, "=HYPERLINK(\"http://x\")");
  assert.equal(sheet.getCell("C2").value, "09123456789");
  assert.equal(sheet.getCell("E2").value, "Has Standard Lion");
  assert.equal(sheet.getCell("B3").value, "علی رضایی");
  assert.deepEqual(sheet.getCell("A2").value, new Date("2026-10-09T10:30:00Z"));
});
