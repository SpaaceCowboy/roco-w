import { NextResponse } from "next/server";
import { CONTACT } from "@/config/contact";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Per-IP submission budget. Generous for a person, useless for a script. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60_000;

/** Transient provider failures worth one more attempt. */
const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 400;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEPARTMENTS = new Set(["support", "marketing", "hr"]);
const LOCALES = new Set(["en", "de", "ru", "ar", "fa", "zh-hans"]);

type ContactRequest = {
  submissionId?: unknown;
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  department?: unknown;
  message?: unknown;
  locale?: unknown;
  website?: unknown;
};

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

/**
 * Accept only same-origin browser submissions.
 *
 * Browsers always attach `Origin` to a cross-origin POST, so a *missing* Origin
 * used to mean "same-origin form or a non-browser client" — and the old code
 * allowed it, which let any `curl` call straight through. Now a request must
 * prove same-origin one of two ways: a matching `Origin`, or `Sec-Fetch-Site:
 * same-origin`, which every browser since ~2020 sends and no plain script does.
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
 * Hand the message to Resend, retrying once on a transient failure. The
 * idempotency key is stable across both attempts, so a retry after a timeout
 * cannot deliver the enquiry twice.
 */
async function deliver(
  payload: unknown,
  apiKey: string,
  submissionId: string,
): Promise<{ ok: boolean; status: number | null; attempts: number }> {
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `contact/${submissionId}`,
          "User-Agent": "RocoBroker-Website/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12_000),
      });

      lastStatus = response.status;
      if (response.ok) return { ok: true, status: response.status, attempts: attempt };
      if (!RETRY_STATUSES.has(response.status)) {
        return { ok: false, status: response.status, attempts: attempt };
      }
    } catch (error) {
      // Network error or the 12s timeout — retryable, and never logged with a body.
      lastStatus = null;
      console.error(
        `[contact] submission=${submissionId} attempt=${attempt} transport error:`,
        error instanceof Error ? error.message : "unknown",
      );
    }

    if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  return { ok: false, status: lastStatus, attempts: 2 };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 20_000) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const ip = clientIp(request);
  const limit = rateLimit(`contact:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    // No IP in the log line — it is personal data under GDPR and this is not a
    // security log we have a retention policy for.
    console.warn(`[contact] rate limit hit, retry in ${limit.retryAfterSeconds}s`);
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: ContactRequest;
  try {
    body = (await request.json()) as ContactRequest;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Honeypot fields are invisible to people. Return success without sending so
  // simple form bots do not learn how to bypass the trap.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = text(body.name, 100);
  const email = text(body.email, 254);
  const subject = text(body.subject, 150);
  const message = text(body.message, 5_000);
  const department = typeof body.department === "string" && DEPARTMENTS.has(body.department)
    ? body.department
    : null;
  const locale = typeof body.locale === "string" && LOCALES.has(body.locale) ? body.locale : "en";

  if (!name || !email || !EMAIL_RE.test(email) || !subject || !department || !message) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Contact delivery is not configured: RESEND_API_KEY is missing.");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const submissionId =
    typeof body.submissionId === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(body.submissionId)
      ? body.submissionId
      : crypto.randomUUID();
  const departmentLabel = department.charAt(0).toUpperCase() + department.slice(1);
  const emailText = [
    "New message from rocobroker.com",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Department: ${departmentLabel}`,
    `Locale: ${locale}`,
    `Subject: ${subject}`,
    "",
    message,
  ].join("\n");

  const startedAt = Date.now();
  const result = await deliver(
    {
      from: process.env.CONTACT_EMAIL_FROM ?? "ROCO Website <website@rocobroker.com>",
      to: [process.env.CONTACT_EMAIL_TO ?? CONTACT.email],
      reply_to: email,
      subject: `[Website contact · ${departmentLabel}] ${subject}`,
      text: emailText,
    },
    apiKey,
    submissionId,
  );

  // One line per submission, success or failure, carrying the same id the
  // visitor's confirmation shows and the Resend idempotency key uses — so a
  // "I never got a reply" report can be traced end to end. Never the message.
  const summary =
    `[contact] submission=${submissionId} department=${department} locale=${locale} ` +
    `status=${result.status ?? "none"} attempts=${result.attempts} ms=${Date.now() - startedAt}`;

  if (!result.ok) {
    console.error(`${summary} outcome=failed`);
    return NextResponse.json({ ok: false, submissionId }, { status: 502 });
  }

  console.info(`${summary} outcome=delivered`);
  return NextResponse.json({ ok: true, submissionId });
}
