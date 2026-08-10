"use client";

import { useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { MetaTrader } from "@/components/sections/MetaTrader/MetaTrader";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import styles from "./MetaTraderPage.module.css";

gsap.registerPlugin(ScrollTrigger);

const REGISTER = "https://my.rocobroker.com/register";
const ADV = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// Decorative "barcode" bar widths (fixed so SSR/CSR match) — from the About row.
const BARS = [3, 1, 2, 1, 1, 4, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 4, 2, 1, 3];
const BAR_GAP = 1.4;
const BAR_TOTAL = BARS.reduce((a, w) => a + w + BAR_GAP, 0);
function barRects() {
  let x = 0;
  return BARS.map((w, i) => {
    const rect = (
      <rect key={i} x={x} y={0} width={w} height={26} fill="currentColor" opacity={0.4 + ((i * 37) % 55) / 100} />
    );
    x += w + BAR_GAP;
    return rect;
  });
}

/**
 * MetaTraderView — the MetaTrader 5 subpage. WHITE editorial theme (like the
 * Calendar page), a fixed light dot backdrop, the reused home <MetaTrader/>
 * download section, and an "advantages" grid-list (numbered `( n )` title +
 * text + image per item, parallaxed) in the home "Who We Are" manner. Text is
 * verbatim from the MetaTrader 5 source page.
 */
export function MetaTraderView() {
  const t = useTranslations("mt5Page");
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Grid-list items rise + their top border draws in on enter.
      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.gridItem}`, el), {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: `.${styles.gridList}`, start: "top 82%" },
      });

      // Header row (About "Who We Are" pattern): barcode + 2026 flicker, and the
      // 2026 letters drift down.
      const rand = gsap.utils.random;
      chaosBlink(gsap.utils.toArray(`.${styles.advBars} rect`, el));
      const yr = gsap.utils.toArray<HTMLElement>(`.${styles.advYearTok}`, el);
      chaosBlink(yr);
      yr.forEach((c) =>
        gsap.to(c, {
          yPercent: 26,
          duration: rand(1.4, 2.4),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: rand(0, 1.2),
        }),
      );
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={styles.page}>
      {/* Hero band — white with a fixed light dot backdrop (page::before). */}
      <div className={styles.hero}>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.inner}>
          {/* Title left, subtext on the same horizontal line at the right. */}
          <div className={styles.headRow}>
            <Reveal as="h1" variant="slide" className={styles.title}>
              {t("title")}
            </Reveal>
            <Reveal as="h2" variant="slide" className={styles.headSub}>
              {t("lead")} <span className={styles.leadAccent}>{t("leadAccent")}</span>
            </Reveal>
          </div>

          <div className={styles.hair} />

          {/* Below the hairline: image left, text + CTA right. */}
          <div className={styles.introRow}>
            <figure className={styles.heroImage}>
              <Image
                className={styles.heroImg}
                src="/metatrader/hero.webp"
                alt={t("heroImageAlt")}
                width={1300}
                height={975}
                sizes="(max-width: 900px) 100vw, 50vw"
                preload
              />
            </figure>
            <div className={styles.introText}>
              <Reveal as="p" variant="flicker" className={styles.sub}>
                {t("sub")}
              </Reveal>
              <Button label={t("cta")} href={REGISTER} external />
            </div>
          </div>
        </div>
      </div>

      {/* Reused home download section (App Store · Google Play · Windows · Mac · Web) */}
      <MetaTrader image="/metatrader/devices.webp" />

      {/* Advantages — grid-list ( n ) · title · text · image */}
      <div className={styles.advantages}>
        <div className={styles.inner}>
          <div className={styles.advHead}>
            <span className={styles.advEyebrow}>{t("advantagesTitle")}</span>
            <span className={styles.advBars} aria-hidden="true">
              <svg viewBox={`0 0 ${BAR_TOTAL} 26`} preserveAspectRatio="none" width="100%" height="26">
                {barRects()}
              </svg>
            </span>
            <span className={styles.advYear} aria-hidden="true">
              {[..."2026"].map((c, i) => (
                <span key={i} className={styles.advYearTok}>
                  {c}
                </span>
              ))}
            </span>
          </div>

          <ul className={styles.gridList}>
            {ADV.map((n) => (
              <li key={n} className={styles.gridItem}>
                <div className={styles.advIcon}>
                  <Image
                    className={styles.advIconImg}
                    src={`/metatrader/adv-${n}.webp`}
                    alt=""
                    width={240}
                    height={240}
                    sizes="100px"
                  />
                </div>
                <div className={styles.advBody}>
                  <div className={styles.gridTitle}>
                    <span className={styles.gridNo}>(&nbsp;{n}&nbsp;)</span>
                    <h3 className={styles.gridHeading}>{t(`adv${n}t`)}</h3>
                  </div>
                  <p className={styles.gridText}>{t(`adv${n}d`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
