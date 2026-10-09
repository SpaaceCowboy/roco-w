"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button/Button";
import { leadSchema } from "@/lib/leadSchema";
import styles from "./SwapFreeLanding.module.css";

const DASHBOARD = "https://my.rocobroker.com/login";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

type Field = "name" | "phone" | "email" | "consent";
const FIELDS: Field[] = ["name", "phone", "email", "consent"];
type Status = "idle" | "submitting" | "success" | "error" | "rateLimited";

/**
 * Lead form for the swap-free campaign page. Validates with the same schema as
 * /api/leads (the server is still authoritative) and posts there. UTMs are read
 * from the URL at submit time, so no Suspense boundary is needed.
 */
/** crypto.randomUUID is missing on older Safari and on non-HTTPS origins. */
function newSubmissionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function LeadForm() {
  const t = useTranslations("swapFreeLanding");
  const locale = useLocale();
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  // Reused only when the same data is re-sent (a retry after a lost response),
  // so the server stores it once. Any edit gets a fresh id and a fresh row.
  const lastAttempt = useRef<{ key: string; id: string } | null>(null);

  const messages: Record<Field, string> = {
    name: t("errName"),
    phone: t("errPhone"),
    email: t("errEmail"),
    consent: t("errConsent"),
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k) ?? ""]));
    const fields = {
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      status: String(data.get("status") ?? ""),
      consent: data.get("consent") === "on",
      locale,
      ...utm,
    };

    const parsed = leadSchema.safeParse(fields);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field;
        if (FIELDS.includes(key)) next[key] = messages[key];
      }
      setErrors(next);
      // A field the visitor can't see failed (should not happen): say so
      // rather than leaving the button doing nothing.
      if (!Object.keys(next).length) setStatus("error");
      const first = FIELDS.find((f) => next[f]);
      if (first) e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setStatus("submitting");

    const key = JSON.stringify(fields);
    if (lastAttempt.current?.key !== key) lastAttempt.current = { key, id: newSubmissionId() };
    const payload = { ...fields, submissionId: lastAttempt.current.id };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, website: String(data.get("website") ?? "") }),
      });
      if (response.status === 429) {
        setStatus("rateLimited");
        return;
      }
      if (!response.ok) throw new Error(`Lead request failed with ${response.status}`);
      lastAttempt.current = null;
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const input = (field: Field) => `${styles.input} ${errors[field] ? styles.inputError : ""}`;
  const err = (field: Field) =>
    errors[field] && (
      <span className={styles.errorMsg} id={`lead-${field}-err`}>
        {errors[field]}
      </span>
    );

  return (
    <aside className={styles.card} id="form" aria-labelledby="lead-title">
      {status === "success" ? (
        <div className={styles.ok} role="status">
          <span className={styles.tick} aria-hidden="true">✓</span>
          <h2 id="lead-title">{t("okTitle")}</h2>
          <p>{t("okBody")}</p>
          <Button label={t("okCta")} href={DASHBOARD} external />
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <h2 id="lead-title" className={styles.cardTitle}>{t("formTitle")}</h2>
          <p className={styles.cardSub}>{t("formSub")}</p>

          <div className={styles.honeypot} aria-hidden="true">
            <label>
              Website
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <div className={styles.fields}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t("fName")}</span>
              <input
                className={input("name")}
                name="name"
                aria-required="true"
                autoComplete="name"
                maxLength={100}
                placeholder={t("fNamePh")}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "lead-name-err" : undefined}
              />
              {err("name")}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t("fPhone")}</span>
              <input
                className={`${input("phone")} ${styles.ltr}`}
                name="phone"
                aria-required="true"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                placeholder="09123456789"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "lead-phone-err" : undefined}
              />
              {err("phone")}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {t("fEmail")} <span className={styles.optional}>{t("fOptional")}</span>
              </span>
              <input
                className={`${input("email")} ${styles.ltr}`}
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="name@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "lead-email-err" : undefined}
              />
              {err("email")}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t("fStatus")}</span>
              <select className={styles.input} name="status" defaultValue="new">
                <option value="new">{t("statusNew")}</option>
                <option value="lion">{t("statusLion")}</option>
                <option value="cheetah">{t("statusCheetah")}</option>
                <option value="other">{t("statusOther")}</option>
              </select>
            </label>
          </div>

          <div className={styles.consentRow}>
            <label className={styles.consent}>
              <input
                type="checkbox"
                name="consent"
                aria-required="true"
                aria-invalid={!!errors.consent}
                aria-describedby={errors.consent ? "lead-consent-err" : undefined}
              />
              <span>{t("consent")}</span>
            </label>
            {err("consent")}
          </div>

          <Button
            label={status === "submitting" ? t("sending") : t("submit")}
            type="submit"
            disabled={status === "submitting"}
            className={styles.submit}
          />

          <div className={styles.status} aria-live="polite" aria-atomic="true">
            {status === "rateLimited" && <p className={styles.statusError} role="alert">{t("tooMany")}</p>}
            {status === "error" && <p className={styles.statusError} role="alert">{t("sendError")}</p>}
          </div>
        </form>
      )}
    </aside>
  );
}
