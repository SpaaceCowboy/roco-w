"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DotMatrix } from "@/components/ui/DotMatrix/DotMatrix";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import styles from "./not-found.module.css";

/**
 * Error boundary for the localized app — mirrors the 404 look (red-tinted dot
 * backdrop, flickering mark) but offers a "try again" (reset) alongside the
 * back-home link. Rendered inside the locale layout, so translations and the
 * brand chrome are available. Layout-level failures fall through to
 * `app/global-error.tsx`.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Surface the digest in the console for debugging; no PII is logged.
    console.error(error);
  }, [error]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      chaosBlink(gsap.utils.toArray(`.${styles.digit}`, rootRef.current!));
    },
    { scope: rootRef },
  );

  return (
    <main ref={rootRef} className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        <DotMatrix color="#e04b4b" opacity={0.5} speed={0.02} delay={0.15} />
      </div>

      <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

      <div className={styles.inner}>
        <div className={styles.code} aria-hidden="true">
          <span className={styles.digit}>!</span>
        </div>
        <p className={styles.message}>{t("message")}</p>
        <span className={styles.cta}>
          <Button label={t("retry")} onClick={reset} variant="primary" />
          <Button label={t("home")} href="/" variant="secondary" />
        </span>
      </div>
    </main>
  );
}
