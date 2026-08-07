"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import styles from "./SocialValues.module.css";

gsap.registerPlugin(ScrollTrigger);

/** Converging arrows — investors following/replicating top traders. */
function InvestorsIcon() {
  return (
    <svg viewBox="0 0 50 50" fill="none" aria-hidden="true" className={styles.cardGlyph}>
      <path d="M7.06348 7.06348V24.4765L24.294 7.06348H7.06348Z" fill="#081219" />
      <path d="M42.9366 7.06348H25.7061L42.9366 24.4765V7.06348Z" fill="#081219" />
      <path d="M7.06348 42.9365H24.294L7.06348 25.5234V42.9365Z" fill="#081219" />
      <path d="M42.9366 42.9365V25.5234L25.7061 42.9365H42.9366Z" fill="#081219" />
    </svg>
  );
}

/** Compass star — expert traders showcasing proven strategies. */
function ExpertIcon() {
  return (
    <svg viewBox="0 0 50 50" fill="none" aria-hidden="true" className={styles.cardGlyph}>
      <path
        d="M33.7214 7.04443L25.0003 16.0079L16.2791 7.04443L7.52051 16.0462L16.2326 25.0002L7.52061 33.9542L16.2791 42.956L25.0003 33.9925L33.7214 42.956L42.4799 33.9542L33.7679 25.0002L42.4799 16.0462L33.7214 7.04443ZM33.675 25.0002L25.0003 33.9159L16.3256 25.0002L25.0003 16.0845L33.675 25.0002Z"
        fill="#081219"
      />
    </svg>
  );
}

/**
 * SocialValues — dark "Core values" section for Social Trading. Title + hairline,
 * then a four-column band: left = lead + value bullets, an empty spacer column,
 * then two audience cards (Investors / Expert traders) offset at different
 * heights for an asynchronous feel. Everything reveals on scroll. Text verbatim
 * from docs/social-trading-source.md.
 */
export function SocialValues() {
  const t = useTranslations("socialTrading");
  const root = useRef<HTMLElement>(null);

  const bullets = [t("values.bullet1"), t("values.bullet2"), t("values.bullet3")];
  const cards = [
    { label: t("values.investorsLabel"), text: t("values.investorsText"), Icon: InvestorsIcon },
    { label: t("values.expertLabel"), text: t("values.expertText"), Icon: ExpertIcon },
  ];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Header + left column reveal on enter.
      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.reveal}`, el), {
        opacity: 0,
        y: 26,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 72%" },
      });

      // Cards: fade in, then drift with a scroll-scrubbed parallax (right card
      // moves further for the asynchronous feel). Skip parallax when stacked.
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, el);
      const parallax = window.matchMedia("(min-width: 601px)").matches;
      cards.forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top 88%" },
        });
        if (!parallax) return;
        const d = i === 1 ? 180 : 100;
        gsap.fromTo(
          card,
          { y: d },
          {
            y: -d,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 className={`${styles.title} ${styles.reveal}`}>
            {t("values.title")} <span className={styles.accent}>{t("values.titleAccent")}</span>
          </h2>
          <div className={`${styles.hair} ${styles.reveal}`} aria-hidden="true" />
        </header>

        <div className={styles.grid}>
          <div className={styles.left}>
            <p className={`${styles.lead} ${styles.reveal}`}>{t("values.lead")}</p>
            <ul className={styles.bullets}>
              {bullets.map((b, i) => (
                <li key={i} className={`${styles.bullet} ${styles.reveal}`}>
                  <span className={styles.bulletMark} aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.spacer} aria-hidden="true" />

          {cards.map((c, i) => (
            <article
              key={i}
              className={`${styles.card} ${i === 1 ? styles.cardOffset : ""}`}
            >
              <span className={styles.cardIcon}>
                <c.Icon />
              </span>
              <span className={styles.cardLabel}>{c.label}</span>
              <p className={styles.cardText}>{c.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
