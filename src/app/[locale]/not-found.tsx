"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DotMatrix } from "@/components/ui/DotMatrix/DotMatrix";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import styles from "./not-found.module.css";

/**
 * NotFound — 404 page in the site style: the shared animated dot-matrix backdrop
 * tinted red, a big white "404" that keeps flickering (chaosBlink), a message,
 * and a back-home button.
 */
export default function NotFound() {
  const t = useTranslations("notFound");
  const rootRef = useRef<HTMLElement>(null);

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
        <DotMatrix color="#e04b4b" opacity={0.55} speed={0.02} delay={0.15} />
      </div>

      <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

      <div className={styles.inner}>
        <div className={styles.code} aria-label="404">
          {[..."404"].map((d, i) => (
            <span key={i} className={styles.digit}>
              {d}
            </span>
          ))}
        </div>
        <p className={styles.message}>{t("message")}</p>
        <span className={styles.cta}>
          <Button label={t("cta")} href="/" variant="primary" />
        </span>
      </div>
    </main>
  );
}
