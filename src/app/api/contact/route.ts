import { NextResponse } from "next/server";
import { CONTACT } from "@/config/contact";

export const runtime = "nodejs";

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

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1);
  return !!forwardedHost && origin === `${forwardedProto}://${forwardedHost}`;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 20_000) {
    return NextResponse.json({ ok: false }, { status: 413 });
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

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `contact/${submissionId}`,
        "User-Agent": "RocoBroker-Website/1.0",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_EMAIL_FROM ?? "ROCO Website <website@rocobroker.com>",
        to: [process.env.CONTACT_EMAIL_TO ?? CONTACT.email],
        reply_to: email,
        subject: `[Website contact · ${departmentLabel}] ${subject}`,
        text: emailText,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      console.error(`Contact delivery failed with provider status ${response.status}.`);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
  } catch (error) {
    console.error("Contact delivery request failed.", error);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
