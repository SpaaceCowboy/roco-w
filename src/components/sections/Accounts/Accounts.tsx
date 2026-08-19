"use client";

import { Fragment, useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DotMatrix } from "@/components/ui/DotMatrix/DotMatrix";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import { CTA_JOIN } from "@/config/nav";
import { DepositIcon, LeverageIcon, SpreadIcon, CommissionIcon } from "./icons";
import styles from "./Accounts.module.css";

gsap.registerPlugin(ScrollTrigger);

const ACCOUNTS = ["lion", "nanoLion", "nanoCheetah", "cheetah"] as const;

/**
 * Accounts ("Our Accounts") — 4 large spec cards in a 2×2 grid. Each whole card
 * is the Join link (no inner button). Same dot-matrix background as the hero
 * (reused component — IntersectionObserver-gated so it pauses off-screen).
 */
export function Accounts() {
  const t = useTranslations("accounts");
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.matchMedia("(max-width: 1024px)").matches
      ) {
        return;
      }

      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, root);
      gsap.from(cards, {
        opacity: 0,
        y: 40,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: root, start: "top 75%" },
      });

      // Ongoing flicker/shimmer on the meta-row words.
      chaosBlink(gsap.utils.toArray(`.${styles.metaRow} .${styles.tok}`, root));
    },
    { scope: rootRef },
  );

  const specs = (key: string) => [
    { Icon: DepositIcon, label: t("labelDeposit"), value: t(`${key}.deposit`) },
    { Icon: LeverageIcon, label: t("labelLeverage"), value: t(`${key}.leverage`) },
    { Icon: SpreadIcon, label: t("labelSpread"), value: t(`${key}.spread`) },
    { Icon: CommissionIcon, label: t("labelCommission"), value: t(`${key}.commission`) },
  ];

  return (
    <section ref={rootRef} className={styles.accounts}>
      <div className={styles.dots}>
        <DotMatrix speed={0.02} delay={0.2} opacity={0.5} color="#727d85" />
      </div>

      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </header>

        {/* Meta row — staggered: two objects top-right, two bottom-left, split
            by long gradient guideline lines. Words flicker/shimmer. */}
        <div className={styles.metaRow}>
          <div className={`${styles.metaItem} ${styles.posTR1}`}>
            <Guideline delay={0.4} />
            <span className={styles.metaTag}>
              <Words text={t("metaB")} />
            </span>
          </div>
          <div className={`${styles.metaItem} ${styles.posTR2}`}>
            <Guideline delay={1.5} />
            <p className={styles.metaText}>
              <Words text={t("metaText")} />
            </p>
          </div>
          <div className={`${styles.metaItem} ${styles.posBL1}`}>
            <Guideline delay={2.6} />
            <span className={styles.metaLabel}>
              <Words text={t("metaLabel")} />
            </span>
          </div>
          <div className={`${styles.metaItem} ${styles.posBL2}`}>
            <Guideline delay={3.4} />
            <span className={styles.metaTag}>
              <Words text={t("metaA")} />
            </span>
          </div>
        </div>

        <div className={styles.grid}>
          {ACCOUNTS.map((key) => (
            <a
              key={key}
              className={`${styles.card} ${key === "cheetah" ? styles.featured : ""}`}
              href={CTA_JOIN.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {key === "cheetah" && (
                <span className={styles.popularBadge}>{t("mostPopular")}</span>
              )}
              <h3 className={styles.cardName}>{t(`${key}.name`)}</h3>

              <ul className={styles.specs}>
                {specs(key).map(({ Icon, label, value }) => (
                  <li key={label} className={styles.specRow}>
                    <span className={styles.specIcon}>
                      <Icon />
                    </span>
                    <span className={styles.specLabel}>{label}</span>
                    <span className={styles.specValue}>{value}</span>
                  </li>
                ))}
              </ul>

              <p className={styles.note}>* {t(`${key}.note`)}</p>

              <span className={styles.cardCta}>
                {t("cta")}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Text as inline-block word tokens (so chaosBlink can shimmer each word).
 *  The space sits BETWEEN the tokens so inline-block boxes keep word spacing. */
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className={styles.tok}>{w}</span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

/** Vertical guideline with an ongoing gradient "energy" pulse (delay-staggered). */
function Guideline({ delay }: { delay: number }) {
  return (
    <span
      className={styles.guideline}
      style={{ "--flow-delay": `${delay}s` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}
