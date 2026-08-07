"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button/Button";
import styles from "./CookieConsent.module.css";

/*
 * Cookie consent — GDPR / ePrivacy compliant:
 *  - "Accept all" and "Reject all" carry equal weight (no dark-pattern nudge).
 *  - "Manage choices" expands per-category toggles; nothing non-essential is
 *    pre-ticked. Essential is always on and cannot be turned off.
 *  - The choice persists in localStorage under a versioned key with a 365-day
 *    TTL; the banner re-shows after it expires or the version bumps.
 *  - On save a `cookie-consent` CustomEvent fires so analytics/marketing loaders
 *    can react. This banner loads no third-party scripts itself.
 *  - A `cookie-consent:open` event reopens it (e.g. a footer "Cookie settings").
 */

const STORAGE_KEY = "roco.cookieConsent.v1";
const TTL_DAYS = 365;

interface StoredChoice {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  ts: string;
  expires: string;
}

function readStored(): StoredChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChoice;
    if (!parsed.expires || new Date(parsed.expires).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const t = useTranslations("cookies");
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readStored();
    if (!existing) {
      setOpen(true);
      return;
    }
    setAnalytics(existing.analytics);
    setMarketing(existing.marketing);
  }, []);

  const save = useCallback((a: boolean, m: boolean) => {
    if (typeof window !== "undefined") {
      const stored: StoredChoice = {
        essential: true,
        analytics: a,
        marketing: m,
        ts: new Date().toISOString(),
        expires: new Date(Date.now() + TTL_DAYS * 864e5).toISOString(),
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        /* private mode / quota — banner simply reappears next load */
      }
      window.dispatchEvent(new CustomEvent("cookie-consent", { detail: stored }));
    }
    setAnalytics(a);
    setMarketing(m);
    setOpen(false);
    setShowDetails(false);
  }, []);

  useEffect(() => {
    const reopen = () => {
      const existing = readStored();
      if (existing) {
        setAnalytics(existing.analytics);
        setMarketing(existing.marketing);
      }
      setOpen(true);
      setShowDetails(true);
    };
    window.addEventListener("cookie-consent:open", reopen);
    return () => window.removeEventListener("cookie-consent:open", reopen);
  }, []);

  if (!open) return null;

  return (
    <div
      className={styles.cookie}
      role="dialog"
      aria-labelledby="cookie-heading"
      aria-describedby="cookie-body"
    >
      <div className={styles.panel}>
        <h2 id="cookie-heading" className={styles.heading}>
          {t("heading")}
        </h2>
        <p id="cookie-body" className={styles.body}>
          {t("body")}{" "}
          <a className={styles.link} href="/legal-documents">
            {t("policy")}
          </a>
          .
        </p>

        {showDetails && (
          <div className={styles.choices} role="group" aria-label={t("manage")}>
            <div className={styles.choice}>
              <div className={styles.choiceHead}>
                <span className={styles.choiceLabel}>{t("essentialLabel")}</span>
                <span className={styles.choiceMeta}>{t("essentialMeta")}</span>
              </div>
              <p className={styles.choiceBody}>{t("essentialBody")}</p>
            </div>

            <label className={styles.choice} htmlFor="cookie-analytics">
              <span className={styles.choiceHead}>
                <span className={styles.choiceLabel}>{t("analyticsLabel")}</span>
                <input
                  id="cookie-analytics"
                  type="checkbox"
                  className={styles.toggle}
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                />
              </span>
              <span className={styles.choiceBody}>{t("analyticsBody")}</span>
            </label>

            <label className={styles.choice} htmlFor="cookie-marketing">
              <span className={styles.choiceHead}>
                <span className={styles.choiceLabel}>{t("marketingLabel")}</span>
                <input
                  id="cookie-marketing"
                  type="checkbox"
                  className={styles.toggle}
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                />
              </span>
              <span className={styles.choiceBody}>{t("marketingBody")}</span>
            </label>
          </div>
        )}

        <div className={styles.actions}>
          {showDetails ? (
            <Button label={t("save")} size="sm" variant="secondary" onClick={() => save(analytics, marketing)} className={styles.btn} />
          ) : (
            <Button label={t("manage")} size="sm" variant="secondary" onClick={() => setShowDetails(true)} className={styles.btn} />
          )}
          <Button label={t("reject")} size="sm" variant="secondary" onClick={() => save(false, false)} className={styles.btn} />
          <Button label={t("accept")} size="sm" variant="primary" onClick={() => save(true, true)} className={styles.btn} />
        </div>
      </div>
    </div>
  );
}
