"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button/Button";
import styles from "./WelcomePromo.module.css";

const REGISTER = "https://my.rocobroker.com/register";
const DISMISS_KEY = "roco.welcomePromo.dismissed.v1";
const CONSENT_KEY = "roco.cookieConsent.v1";
const DELAY_MS = 20000; // ~20s after consent

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { expires?: string };
    return !!parsed.expires && new Date(parsed.expires).getTime() >= Date.now();
  } catch {
    return false;
  }
}

/**
 * WelcomePromo — a small bottom-end banner promoting the 40% deposit bonus. Shown
 * ~20s AFTER the user has confirmed cookie consent (so it never competes with the
 * consent banner), once per browsing session — dismissal is kept in sessionStorage,
 * so it appears again on the visitor's next visit after the same delay. Video left,
 * copy + CTA right.
 */
export function WelcomePromo() {
  const t = useTranslations("welcomePromo");
  const [show, setShow] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(DISMISS_KEY)) return;

    const arm = () => {
      if (timerRef.current) return;
      timerRef.current = window.setTimeout(() => setShow(true), DELAY_MS);
    };

    if (hasConsent()) {
      arm();
    } else {
      const onConsent = () => arm();
      window.addEventListener("cookie-consent", onConsent);
      return () => window.removeEventListener("cookie-consent", onConsent);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <aside className={styles.promo} role="complementary" aria-label={t("title")}>
      <button type="button" className={styles.close} aria-label={t("close")} onClick={dismiss}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <figure className={styles.media}>
        <video
          className={styles.video}
          src="/promotions/deposit.mp4"
          poster="/promotions/deposit-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      </figure>
      <div className={styles.body}>
        <span className={styles.kicker}>{t("kicker")}</span>
        <strong className={styles.title}>{t("title")}</strong>
        <p className={styles.text}>{t("text")}</p>
        <Button label={t("cta")} href={REGISTER} external size="sm" variant="primary" onClick={dismiss} />
      </div>
    </aside>
  );
}
