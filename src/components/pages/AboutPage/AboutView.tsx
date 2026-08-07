"use client";

import { useRef, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import { WhatWeWant } from "./WhatWeWant";
import { WhyChooseUs } from "./WhyChooseUs";
import styles from "./AboutPage.module.css";

gsap.registerPlugin(ScrollTrigger);

const REGISTER = "https://my.rocobroker.com/register";
const BLOCKS = ["b1", "b2", "b3"] as const;
const PARTNERS = [
  { src: "/about/partners/metaquotes.webp", name: "MetaQuotes" },
  { src: "/about/partners/tools-for-brokers.webp", name: "Tools For Brokers" },
  { src: "/about/partners/broctagon.webp", name: "Broctagon Fintech Group" },
  { src: "/about/partners/pipwise.webp", name: "PipWise" },
  { src: "/about/partners/match2pay.webp", name: "match2pay" },
  { src: "/about/partners/tcpay.webp", name: "TCPAY" },
];

/** Vertical guideline with a flowing lime pulse (shared social/accounts pattern). */
function Guideline({ delay }: { delay: number }) {
  return (
    <span
      className={styles.guideline}
      style={{ "--flow-delay": `${delay}s` } as CSSProperties}
      aria-hidden="true"
    />
  );
}

/** Upward-trend glyph for the floating "years of experience" card. */
function GrowthGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.cardGlyph} aria-hidden="true">
      <path d="M4 17l6-6 4 4 6-7" />
      <path d="M16 8h4v4" />
    </svg>
  );
}

/**
 * AboutView — the About Us page. Hero in the home "Trade Every Market" manner:
 * a centred title, the ROCO team image as the central visual with a floating
 * glass stat card (parallaxed) over its left, and the "Who We Are" copy split
 * into guideline-flanked blocks. Below: a scrolling partners ribbon. Text from
 * docs/about-source.md.
 */
export function AboutView() {
  const t = useTranslations("aboutPage");
  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const root = rootRef.current;
      const card = cardRef.current;
      if (!root || !card) return;

      // Brand animations: chaosBlink on the small labels, card fades in.
      chaosBlink(gsap.utils.toArray(`.${styles.blockLabel}`, root));
      gsap.from(card, { opacity: 0, duration: 0.6, delay: 0.8, ease: "power2.out" });

      // Parallax the floating card as the hero scrolls.
      gsap.fromTo(
        card,
        { yPercent: -16 },
        {
          yPercent: 16,
          ease: "none",
          scrollTrigger: { trigger: `.${styles.hero}`, start: "top top", end: "bottom top", scrub: 0.5 },
        },
      );
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={styles.page}>
      <PageBackground />

      <div className={styles.hero}>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.inner}>
          <Reveal as="span" variant="blink" className={styles.kicker}>
            {t("kicker")}
          </Reveal>

          <Reveal as="h1" variant="slide" className={styles.title}>
            {t("title")}
          </Reveal>

          <figure className={styles.media}>
            <img
              className={styles.mediaImg}
              src="/about/team.webp"
              alt="The ROCO Broker team"
              width={900}
              height={900}
              decoding="async"
            />
            {/* Floating glass stat card over the left of the image (parallax). */}
            <div ref={cardRef} className={styles.card}>
              <span className={styles.cardIcon}>
                <GrowthGlyph />
              </span>
              <span className={styles.cardStat}>12+</span>
              <span className={styles.cardLabel}>{t("cardLabel")}</span>
            </div>
          </figure>

          <div className={styles.blocks}>
            {BLOCKS.map((b, i) => (
              <div key={b} className={styles.block}>
                <Guideline delay={i * 1.1} />
                <span className={styles.blockLabel}>{t(`${b}label`)}</span>
                <Reveal as="p" variant="flicker" delay={0.2 + i * 0.15} className={styles.blockText}>
                  {t(`${b}text`)}
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partners ribbon (placeholder logo slots — drop real logos in later). */}
      <div className={styles.partners}>
        <div className={styles.inner}>
          <span className={styles.partnersLabel}>{t("partnersLabel")}</span>
        </div>
        <div className={styles.marquee}>
          <div className={styles.track}>
            {PARTNERS.concat(PARTNERS).map((p, i) => (
              <span key={i} className={styles.logo}>
                <img
                  className={styles.logoImg}
                  src={p.src}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* What We Want — Vision + Mission (home "What We Do" timeline pattern) */}
      <WhatWeWant />

      {/* Why Choose Us — advantages (titangate stats-section manner) */}
      <WhyChooseUs />

      {/* Small yellow CTA banner */}
      <div className={styles.ctaWrap}>
        <div className={styles.ctaBanner}>
          <p className={styles.ctaText}>{t("ctaText")}</p>
          <Button label={t("ctaBtn")} href={REGISTER} external variant="dark" />
        </div>

        {/* Regulatory note */}
        <div className={styles.regNote}>
          <span className={styles.regLabel}>{t("regLabel")}</span>
          <p className={styles.regText}>{t("regNote")}</p>
          <p className={styles.regText}>{t("regRestriction")}</p>
        </div>
      </div>
    </section>
  );
}
