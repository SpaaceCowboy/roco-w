import { readFile } from "node:fs/promises";

const baseUrl = (process.env.CHATWOOT_URL ?? "https://support.rocobroker.com").replace(/\/$/, "");
const accountId = process.env.CHATWOOT_ACCOUNT_ID ?? "1";
const token = process.env.CHATWOOT_API_TOKEN;
const dryRun = process.argv.includes("--dry-run");

if (!token && !dryRun) {
  throw new Error("CHATWOOT_API_TOKEN is required (use --dry-run to inspect the bundle without importing)");
}

const shortcuts = JSON.parse(await readFile(new URL("../migrations/tawk-shortcuts.json", import.meta.url), "utf8"));

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      api_access_token: token,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed with HTTP ${response.status}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

if (dryRun) {
  console.log(`dry_run=${shortcuts.length} public non-empty shortcuts ready`);
  process.exit(0);
}

const existingResponse = await request(`/api/v1/accounts/${accountId}/canned_responses`);
const existing = new Set((Array.isArray(existingResponse) ? existingResponse : existingResponse.data ?? []).map((item) => item.short_code));
let created = 0;
let skipped = 0;

for (const shortcut of shortcuts) {
  if (existing.has(shortcut.short_code)) {
    skipped += 1;
    console.log(`skip short_code=${shortcut.short_code} reason=already_exists`);
    continue;
  }

  await request(`/api/v1/accounts/${accountId}/canned_responses`, {
    method: "POST",
    body: JSON.stringify(shortcut),
  });
  created += 1;
  console.log(`created short_code=${shortcut.short_code}`);
}

console.log(`complete created=${created} skipped=${skipped} total=${shortcuts.length}`);
