"use client";

import { useId, useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import styles from "./FAQ.module.css";

/** FAQ entries, in display order (content mirrors rocobroker.com). */
const KEYS = ["minDeposit", "methods", "withdrawTime", "commissions", "islamic", "scalping"] as const;

/**
 * FAQ — light editorial section (adapted from nfinitepaper.com): a sticky left
 * heading with a flickering "FAQ" pill, and a right-hand accordion. Each row is
 * a hidden radio + label; the checked row expands its answer via the 0fr→1fr
 * grid trick and rotates its chevron. Pure CSS interaction — no JS needed.
 */
export function FAQ() {
  const t = useTranslations("faq");
  const group = useId();
  const rootRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const pill = pillRef.current;
      if (!pill) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      chaosBlink([pill], { base: 0.4, minDelay: 0, maxDelay: 1.5 });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={styles.faq}>
      <div className={styles.row}>
        <div className={styles.aside}>
          <span ref={pillRef} className={styles.pill}>
            {t("eyebrow")}
          </span>
          <h2 className={styles.heading}>
            {t("titleLead")} <span className={styles.titleMuted}>{t("titleMuted")}</span>
          </h2>
        </div>

        <div className={styles.list}>
          {KEYS.map((key, i) => {
            const id = `${group}-${key}`;
            return (
              <div key={key} className={styles.item}>
                <input
                  className={styles.input}
                  type="radio"
                  id={id}
                  name={group}
                  defaultChecked={i === 0}
                />
                <label className={styles.label} htmlFor={id}>
                  <span>{t(`items.${key}.q`)}</span>
                  <span className={styles.chev} aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path
                        d="m16 7.625-6 6-6-6"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </label>
                <div className={styles.panel}>
                  <div className={styles.panelInner}>
                    <p className={styles.answer}>{t(`items.${key}.a`)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
