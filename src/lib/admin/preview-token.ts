import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { contentLocales, type ContentLocale } from "./content-locales";

const payloadSchema = z.object({
  v: z.literal(1),
  localizationId: z.string().uuid(),
  locale: z.enum(contentLocales),
  expiresAt: z.number().int().positive(),
});

type PreviewPayload = z.infer<typeof payloadSchema>;

function secret(): string {
  const value = process.env.ADMIN_PREVIEW_SECRET ?? process.env.ADMIN_AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_PREVIEW_SECRET or ADMIN_AUTH_SECRET must contain at least 32 characters");
  return value;
}

function signature(encodedPayload: string): Buffer {
  return createHmac("sha256", secret()).update("content-preview:v1:").update(encodedPayload).digest();
}

export function createPreviewToken(localizationId: string, locale: ContentLocale, now = Date.now()): string {
  const payload: PreviewPayload = { v: 1, localizationId, locale, expiresAt: now + 15 * 60_000 };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded).toString("base64url")}`;
}

export function verifyPreviewToken(token: string, now = Date.now()): PreviewPayload | null {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;
  const supplied = Buffer.from(suppliedSignature, "base64url");
  const expected = signature(encoded);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const parsed = payloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
    return parsed.expiresAt > now ? parsed : null;
  } catch {
    return null;
  }
}
