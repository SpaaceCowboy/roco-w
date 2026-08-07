"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { PartnershipSteps } from "./PartnershipSteps";
import styles from "./PartnershipPage.module.css";

gsap.registerPlugin(ScrollTrigger);

const REGISTER = "https://my.rocobroker.com/register";
const ADV = ["adv1", "adv2", "adv3"] as const;

/** Advantage icons (stroke-based, brand lime via currentColor). */
function CommissionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={styles.advGlyph} aria-hidden="true">
      <path d="M4 17l6-6 4 4 6-7" />
      <path d="M16 8h4v4" />
    </svg>
  );
}
function TrustIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={styles.advGlyph} aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={styles.advGlyph} aria-hidden="true">
      <path d="M5 15v-2a7 7 0 0 1 14 0v2" />
      <path d="M19 15h1a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2h-1z" />
      <path d="M5 15H4a1 1 0 0 0-1 1v2a2 2 0 0 0 2 2h1z" />
    </svg>
  );
}
const ADV_ICONS = { adv1: CommissionIcon, adv2: TrustIcon, adv3: SupportIcon };

/**
 * PartnershipView — the Partnership (IB / Ambassador) subpage: Markets-style
 * dot-grid hero, the scroll-driven IB steps, and the advantages. Content from
 * docs/partnership-source.md.
 */
export function PartnershipView() {
  const t = useTranslations("partnershipPage");
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.advCard}`, el), {
        opacity: 0,
        y: 28,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: `.${styles.advGrid}`, start: "top 82%" },
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={styles.page}>
      <PageBackground />

      {/* Hero */}
      <div className={styles.hero}>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.inner}>
          <Reveal as="h1" variant="slide" className={styles.title}>
            {t("title")}
          </Reveal>

          <div className={styles.hair} />

          <div className={styles.introRow}>
            <div className={styles.introLeft}>
              <div className={styles.introLeadBlock}>
                <h2 className={styles.lead}>
                  {t("lead")} <span className={styles.leadAccent}>{t("leadAccent")}</span>
                </h2>
                <Button label={t("cta")} href={REGISTER} external />
              </div>
            </div>
            <Reveal as="p" variant="flicker" className={styles.sub}>
              {t("sub")}
            </Reveal>
          </div>
        </div>
      </div>

      {/* IB steps — scroll-driven numbered strip */}
      <PartnershipSteps />

      {/* Advantages */}
      <div className={styles.advantages}>
        <div className={styles.inner}>
          <div className={styles.advHead}>
            <span className={styles.microBlock} />
            <h2 className={styles.advTitle}>{t("advTitle")}</h2>
          </div>
          <div className={styles.advGrid}>
            {ADV.map((a) => {
              const Icon = ADV_ICONS[a];
              return (
                <div key={a} className={styles.advCard}>
                  <span className={styles.advIcon}>
                    <Icon />
                  </span>
                  <span className={styles.advText}>{t(a)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
