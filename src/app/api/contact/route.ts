import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { CONTACT } from "@/config/contact";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Per-IP submission budget. Generous for a person, useless for a script. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60_000;

const RETRY_DELAY_MS = 400;

/**
 * Mail goes to the MTA on this host (Exim, under cPanel), which delivers to a
 * local mailbox. No third-party sender, no API credential, and no SPF/DKIM
 * changes to a domain that already carries production mail.
 *
 * STARTTLS is skipped deliberately: the connection never leaves the loopback
 * interface, and Exim's certificate is issued for the mail hostname, so a TLS
 * handshake against 127.0.0.1 fails name verification. Encrypting a loopback
 * socket buys nothing anyway.
 */
const SMTP_HOST = process.env.SMTP_HOST ?? "127.0.0.1";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 25);

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  ignoreTLS: true,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

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

type DeliveryResult = {
  ok: boolean;
  /** SMTP reply code, for the log line. Null when we never got a reply. */
  status: number | null;
  attempts: number;
  /** True when the MTA could not be reached at all, as opposed to rejecting us. */
  unreachable: boolean;
};

/** Leading reply code of an SMTP response line ("250 OK id=1ab…" -> 250). */
function replyCode(response: string | undefined): number | null {
  const match = /^(\d{3})/.exec(response ?? "");
  return match ? Number(match[1]) : null;
}

/**
 * Hand the message to the local MTA.
 *
 * Retry policy is deliberately narrower than the previous HTTP one. SMTP has no
 * idempotency key: once Exim has accepted the DATA there is no way to ask "did
 * you already take this one?", so a blind retry can deliver the same enquiry
 * twice. Only a failure to *establish the connection* is retried — at that point
 * nothing was handed over, so a second attempt cannot duplicate. Every other
 * failure is reported after a single attempt, and the stable Message-ID lets a
 * duplicate be spotted in the mailbox if one ever does occur.
 */
async function deliver(
  message: nodemailer.SendMailOptions,
  submissionId: string,
): Promise<DeliveryResult> {
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const info = await transport.sendMail(message);
      return {
        ok: true,
        status: replyCode(info.response) ?? 250,
        attempts: attempt,
        unreachable: false,
      };
    } catch (error) {
      const { code, command } = error as { code?: string; command?: string };
      lastStatus = (error as { responseCode?: number }).responseCode ?? null;

      // Never log the message, the addresses, or the visitor's IP.
      console.error(
        `[contact] submission=${submissionId} attempt=${attempt} smtp error:`,
        `${code ?? "unknown"}/${command ?? "none"}`,
      );

      // `command: "CONN"` means the failure happened while establishing the
      // connection — nothing was handed over, so retrying cannot duplicate.
      // Anything later (envelope or DATA) may or may not have been accepted, so
      // it is reported after one attempt rather than risking a second delivery.
      if (command !== "CONN") {
        return { ok: false, status: lastStatus, attempts: attempt, unreachable: false };
      }
    }

    if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  return { ok: false, status: lastStatus, attempts: 2, unreachable: true };
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

  const from = process.env.CONTACT_EMAIL_FROM ?? "ROCO Website <website@rocobroker.com>";
  const startedAt = Date.now();
  const result = await deliver(
    {
      from,
      to: process.env.CONTACT_EMAIL_TO ?? CONTACT.email,
      replyTo: email,
      subject: `[Website contact · ${departmentLabel}] ${subject}`,
      text: emailText,
      // Derived from the submission id, so the same enquiry always carries the
      // same Message-ID and a duplicate is identifiable in the mailbox.
      messageId: `<contact.${submissionId}@rocobroker.com>`,
    },
    submissionId,
  );

  // One line per submission, success or failure, carrying the same id the
  // visitor's confirmation shows and the Message-ID embeds — so a "I never got
  // a reply" report can be traced end to end. Never the message.
  const summary =
    `[contact] submission=${submissionId} department=${department} locale=${locale} ` +
    `status=${result.status ?? "none"} attempts=${result.attempts} ms=${Date.now() - startedAt}`;

  if (!result.ok) {
    console.error(`${summary} outcome=failed`);
    // Unreachable MTA is an infrastructure fault, not a rejected message: 503
    // says "the send path is down", 502 says "the MTA refused this one".
    return NextResponse.json(
      { ok: false, submissionId },
      { status: result.unreachable ? 503 : 502 },
    );
  }

  console.info(`${summary} outcome=delivered`);
  return NextResponse.json({ ok: true, submissionId });
}
