import { z } from "zod";

/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII, so "۰۹۱۲…" validates. */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export const LEAD_STATUSES = ["new", "lion", "cheetah", "other"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** UTMs come from ad URLs, not the visitor: over-long values are cut, never rejected. */
const utm = z.string().trim().default("").transform((v) => v.slice(0, 100));

/**
 * Swap-free landing lead. Shared by the form (inline errors) and /api/leads
 * (authoritative check). Phone is stored as typed minus separators, with an
 * optional leading "+"; no country-specific format is enforced.
 */
export const leadSchema = z.object({
  submissionId: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/).optional(),
  // Any script's letters (Persian, Arabic, Latin…); rejects "123" or "!!!".
  name: z.string().trim().min(3).max(100).regex(/\p{L}/u),
  phone: z
    .string()
    .transform((v) => toAsciiDigits(v).replace(/[\s\-()]/g, ""))
    .pipe(z.string().regex(/^\+?\d{8,15}$/)),
  email: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === "" || EMAIL_RE.test(v))
    .default(""),
  status: z.enum(LEAD_STATUSES),
  consent: z.literal(true),
  locale: z.enum(["fa", "en"]),
  utm_source: utm,
  utm_medium: utm,
  utm_campaign: utm,
  utm_content: utm,
});

export type Lead = z.infer<typeof leadSchema>;
