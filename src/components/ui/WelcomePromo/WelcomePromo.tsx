"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/Button/Button";
import { routing, type Locale } from "@/i18n/routing";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";
import { welcomePromoCopy } from "./welcomePromoCopy";
import styles from "./WelcomePromo.module.css";

const DISMISS_KEY = "roco.welcomePromo.swapFree.dismissed.v2";
const DELAY_MS = 20000; // ~20s after consent

/**
 * WelcomePromo — a small bottom-end banner promoting the Swap-Free account. Shown
 * ~20s AFTER the user has confirmed cookie consent (so it never competes with the
 * consent banner), once per browsing session — dismissal is kept in sessionStorage,
 * so it appears again on the visitor's next visit after the same delay.
 */
export function WelcomePromo() {
  const locale = useLocale();
  const copy = welcomePromoCopy[locale as Locale] ?? welcomePromoCopy.en;
  const [show, setShow] = useState(false);
  const timerRef = useRef<number | null>(null);
  const swapFreeHref = locale === routing.defaultLocale ? "/swap-free-account" : `/${locale}/swap-free-account`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(DISMISS_KEY)) return;

    const arm = () => {
      if (timerRef.current !== null) return;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setShow(true);
      }, DELAY_MS);
    };

    if (readConsent()) {
      arm();
    } else {
      window.addEventListener(CONSENT_EVENT, arm);
    }

    return () => {
      window.removeEventListener(CONSENT_EVENT, arm);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
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
    <aside className={styles.promo} role="complementary" aria-label={copy.title}>
      <button type="button" className={styles.close} aria-label={copy.close} onClick={dismiss}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className={styles.media} aria-hidden="true">
        <Image
          className={styles.mediaImage}
          src="/swap-free/welcome-promo.webp"
          alt=""
          fill
          sizes="144px"
        />
      </div>
      <div className={styles.body}>
        <span className={styles.kicker}>{copy.kicker}</span>
        <strong className={styles.title}>{copy.title}</strong>
        <p className={styles.text}>{copy.text}</p>
        <Button label={copy.cta} href={swapFreeHref} size="sm" variant="primary" onClick={dismiss} />
      </div>
    </aside>
  );
}
