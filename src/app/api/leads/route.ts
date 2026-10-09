import { NextResponse } from "next/server";
import { getDatabase } from "@/db/client";
import { leads } from "@/db/schema";
import { leadSchema } from "@/lib/leadSchema";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Per-IP submission budget. Looser than /api/contact (5): campaign traffic is
 * mostly mobile, and carrier-grade NAT puts many visitors behind one IP.
 */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60_000;

/**
 * Accept only same-origin browser submissions: a matching `Origin`, or
 * `Sec-Fetch-Site: same-origin` (sent by every current browser, not by curl).
 * Same check as /api/contact.
 */
function isSameOrigin(request: Request): boolean {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  const origin = request.headers.get("origin");

  if (origin) {
    return !!forwardedHost && origin === `${forwardedProto}://${forwardedHost}`;
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

/**
 * Lead capture for the swap-free campaign landing page (/lp/swap-free).
 * Saved to the `leads` table; support lists and exports them at /admin/leads.
 * A failed insert must reach the visitor as an error, never a fake success.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 20_000) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const limit = rateLimit(`leads:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    console.warn(`[leads] rate limit hit, retry in ${limit.retryAfterSeconds}s`);
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Honeypot: invisible to people. Pretend success so bots learn nothing.
  const honeypot = (body as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot.trim()) {
    return NextResponse.json({ ok: true });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const lead = parsed.data;
  const submissionId = lead.submissionId ?? crypto.randomUUID();

  const startedAt = Date.now();
  try {
    // A retried submission (same id) is already saved: report success, add nothing.
    const inserted = await getDatabase()
      .insert(leads)
      .values({
        submissionId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || null,
        accountStatus: lead.status,
        locale: lead.locale,
        utmSource: lead.utm_source || null,
        utmMedium: lead.utm_medium || null,
        utmCampaign: lead.utm_campaign || null,
        utmContent: lead.utm_content || null,
      })
      .onConflictDoNothing({ target: leads.submissionId })
      .returning({ id: leads.id });

    // One line per submission. Never name, phone, email or UTMs.
    console.info(
      `[leads] submission=${submissionId} locale=${lead.locale} ` +
        `outcome=${inserted.length ? "saved" : "duplicate"} ms=${Date.now() - startedAt}`,
    );
    return NextResponse.json({ ok: true, submissionId });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    console.error(
      `[leads] submission=${submissionId} outcome=failed code=${code} ms=${Date.now() - startedAt}`,
    );
    return NextResponse.json({ ok: false, submissionId }, { status: 503 });
  }
}
