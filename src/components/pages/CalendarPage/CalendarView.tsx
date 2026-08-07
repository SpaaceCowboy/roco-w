"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { EconomicCalendar } from "./EconomicCalendar";
import styles from "./CalendarPage.module.css";

gsap.registerPlugin(ScrollTrigger);

const REGISTER = "https://my.rocobroker.com/register";
const ADVANTAGES = ["adv1", "adv2", "adv3", "adv4", "adv5", "adv6", "adv7", "adv8"] as const;

/**
 * CalendarView — the Economic Calendar subpage. Markets-style dot-grid hero
 * (title + hairline + gradient lead / subtext + CTA), the live TradingView
 * economic-calendar widget in a framed panel, and an "advantages" grid of glass
 * cards. Content from docs/calendar-source.md.
 */
export function CalendarView() {
  const t = useTranslations("calendarPage");
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const grid = el.querySelector(`.${styles.advGrid}`);
      if (!grid) return;
      const enter = { trigger: grid, start: "top 80%" as const };
      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.advCol}`, el), {
        opacity: 0,
        y: 26,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.06,
        scrollTrigger: enter,
      });
      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.advGuide}`, el), {
        scaleY: 0,
        transformOrigin: "top center",
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.06,
        scrollTrigger: enter,
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={styles.page}>
      {/* Hero band */}
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
                <Reveal as="h2" variant="slide" className={styles.lead}>
                  {t("lead")} <span className={styles.leadAccent}>{t("leadAccent")}</span>
                </Reveal>
                <Button label={t("cta")} href={REGISTER} external />
              </div>
            </div>
            <Reveal as="p" variant="flicker" className={styles.sub}>
              {t("sub")}
            </Reveal>
          </div>
        </div>
      </div>

      {/* Live calendar widget */}
      <div className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.widgetHead}>
            <span className={styles.microBlock} />
            <span className={styles.micro}>{t("widgetLabel")}</span>
          </div>
          <div className={styles.widgetFrame}>
            <EconomicCalendar />
          </div>
        </div>
      </div>

      {/* Advantages — About "vision"-style guideline columns */}
      <div className={styles.advantages}>
        <div className={styles.inner}>
          <div className={styles.advHead}>
            <span className={styles.microBlock} />
            <h2 className={styles.advTitle}>{t("advantagesTitle")}</h2>
          </div>
          <ul className={styles.advGrid}>
            {ADVANTAGES.map((k, i) => (
              <li key={k} className={styles.advCol}>
                <span
                  className={styles.advGuide}
                  style={{ "--flow-delay": `${(i % 4) * 0.9}s` } as React.CSSProperties}
                  aria-hidden="true"
                />
                <span className={styles.advNo}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.advText}>{t(k)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
