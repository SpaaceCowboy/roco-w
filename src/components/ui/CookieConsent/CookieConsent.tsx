"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button/Button";
import { Link } from "@/i18n/navigation";
import {
  CONSENT_OPEN_EVENT,
  readConsent,
  saveConsent,
  useConsentChoice,
} from "@/lib/consent";
import styles from "./CookieConsent.module.css";

/*
 * Cookie consent — GDPR / ePrivacy compliant:
 *  - "Accept all" and "Reject all" carry equal weight (no dark-pattern nudge).
 *  - "Manage choices" expands per-category toggles; nothing non-essential is
 *    pre-ticked. Essential is always on and cannot be turned off.
 *  - External market-data widgets have their own opt-in category and remain
 *    blocked until it is enabled.
 *  - The choice persists in localStorage under a versioned key with a 365-day
 *    TTL; the banner re-shows after it expires or the schema version bumps.
 *  - On save a `cookie-consent` CustomEvent fires so analytics/marketing loaders
 *    can react. This banner loads no third-party scripts itself.
 *  - A `cookie-consent:open` event reopens it (e.g. a footer "Cookie settings").
 */

export function CookieConsent() {
  const t = useTranslations("cookies");
  const { ready, choice } = useConsentChoice();
  const [forcedOpen, setForcedOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [externalMedia, setExternalMedia] = useState(false);
  const open = ready && (forcedOpen || !choice);

  const save = useCallback((a: boolean, m: boolean) => {
    saveConsent({ analytics: a, marketing: m, externalMedia });
    setAnalytics(a);
    setMarketing(m);
    setForcedOpen(false);
    setShowDetails(false);
  }, [externalMedia]);

  useEffect(() => {
    const reopen = () => {
      const existing = readConsent();
      setAnalytics(existing?.analytics ?? false);
      setMarketing(existing?.marketing ?? false);
      setExternalMedia(existing?.externalMedia ?? false);
      setForcedOpen(true);
      setShowDetails(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
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
          <Link className={styles.link} href="/legal-documents">
            {t("policy")}
          </Link>
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

            <label className={styles.choice} htmlFor="cookie-external-media">
              <span className={styles.choiceHead}>
                <span className={styles.choiceLabel}>{t("externalMediaLabel")}</span>
                <input
                  id="cookie-external-media"
                  type="checkbox"
                  className={styles.toggle}
                  checked={externalMedia}
                  onChange={(e) => setExternalMedia(e.target.checked)}
                />
              </span>
              <span className={styles.choiceBody}>{t("externalMediaBody")}</span>
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
          <Button
            label={t("reject")}
            size="sm"
            variant="secondary"
            onClick={() => {
              setExternalMedia(false);
              saveConsent({ analytics: false, marketing: false, externalMedia: false });
              setAnalytics(false);
              setMarketing(false);
              setForcedOpen(false);
              setShowDetails(false);
            }}
            className={styles.btn}
          />
          <Button
            label={t("accept")}
            size="sm"
            variant="primary"
            onClick={() => {
              setExternalMedia(true);
              saveConsent({ analytics: true, marketing: true, externalMedia: true });
              setAnalytics(true);
              setMarketing(true);
              setForcedOpen(false);
              setShowDetails(false);
            }}
            className={styles.btn}
          />
        </div>
      </div>
    </div>
  );
}
