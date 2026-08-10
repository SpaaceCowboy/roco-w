"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import styles from "./SocialTradingPage.module.css";

const REGISTER = "https://my.rocobroker.com/register";

/** Vertical guideline with an ongoing lime "energy" pulse (delay-staggered) —
 * shared home/accounts pattern, placed beside each subtext block. */
function Guideline({ delay }: { delay: number }) {
  return (
    <span
      className={styles.guideline}
      style={{ "--flow-delay": `${delay}s` } as CSSProperties}
      aria-hidden="true"
    />
  );
}

/**
 * SocialTradingView — page hero for Roco Social Trading. Light studio backdrop
 * (phone showing the rating app on the right) with dark copy on the empty left
 * space: a gradient-accent title, a lead line, two horizontal subtext blocks
 * (Follower / Provider) each flanked by a flowing guideline, and the primary
 * CTA. Text is verbatim from docs/social-trading-source.md.
 */
export function SocialTradingView() {
  const t = useTranslations("socialTrading");

  return (
    <section className={styles.hero}>
      <Image
        className={styles.bg}
        src="/social-trading/hero-bg.webp"
        alt=""
        aria-hidden="true"
        width={2000}
        height={1125}
        sizes="100vw"
        preload
      />

      <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* Left — title, two flanked subtext blocks, CTA */}
          <div className={styles.left}>
            <Reveal as="h1" variant="slide" className={styles.title}>
              {t("title")} <span className={styles.titleAccent}>{t("titleAccent")}</span>
            </Reveal>

            <Reveal as="p" variant="flicker" className={styles.lead}>
              {t("lead")}
            </Reveal>

            <Reveal as="div" variant="blink" delay={0.35} className={styles.cta}>
              <Button label={t("cta")} href={REGISTER} external size="lg" />
            </Reveal>

            <div className={styles.blocks}>
              <div className={styles.block}>
                <Guideline delay={0.4} />
                <Reveal as="span" variant="blink" delay={0.5} className={styles.blockLabel}>
                  {t("followerLabel")}
                </Reveal>
                <Reveal as="p" variant="flicker" delay={0.6} className={styles.blockText}>
                  {t("followerText")}
                </Reveal>
              </div>
              <div className={styles.block}>
                <Guideline delay={1.6} />
                <Reveal as="span" variant="blink" delay={0.7} className={styles.blockLabel}>
                  {t("providerLabel")}
                </Reveal>
                <Reveal as="p" variant="flicker" delay={0.8} className={styles.blockText}>
                  {t("providerText")}
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
