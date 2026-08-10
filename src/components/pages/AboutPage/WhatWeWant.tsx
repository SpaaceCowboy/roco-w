"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "./WhatWeWant.module.css";

const ITEMS = ["vision", "mission"] as const;

const LINE_TOP = 18;
const LINE_H = 64;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Eye glyph — brand vision. */
function VisionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
/** Target glyph — brand mission. */
function MissionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
const ICONS = { vision: VisionIcon, mission: MissionIcon };

/**
 * WhatWeWant — the About "What We Want" (Brand Vision + Mission) section, built
 * with the home "What We Do" scroll-timeline pattern: a sticky centred dotted
 * spine with a white square + gradient fill tied to scroll, and cards that
 * appear one-by-one and light up as each crosses the centre. rAF +
 * IntersectionObservers (Lenis-safe). Text from docs/about-source.md.
 */
export function WhatWeWant() {
  const t = useTranslations("aboutPage");
  const rootRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const isMobileRef = useRef(false);

  const openOnly = (idx: number | null) => {
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      card.classList.toggle(styles.open, i === idx);
      card.classList.remove(styles.active);
    });
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => {
      const wasMobile = isMobileRef.current;
      isMobileRef.current = mq.matches;
      if (mq.matches && !wasMobile) openOnly(0);
      if (!mq.matches && wasMobile) openOnly(null);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const onCardClick = (idx: number) => {
    if (!isMobileRef.current) return;
    const card = cardRefs.current[idx];
    const isOpen = card?.classList.contains(styles.open);
    openOnly(isOpen ? null : idx);
  };

  useEffect(() => {
    const section = rootRef.current;
    const fill = fillRef.current;
    const square = squareRef.current;
    if (!section || !fill || !square) return;
    const cards = cardRefs.current.filter(Boolean) as HTMLElement[];

    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add(styles.in);
            revealIO.unobserve(e.target);
          }
        }
      },
      { threshold: 0.35 },
    );
    cards.forEach((c) => revealIO.observe(c));

    let raf = 0;
    let running = false;
    const loop = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = clamp(total > 0 ? -rect.top / total : 0, 0, 1);
      fill.style.height = `${p * LINE_H}%`;
      square.style.top = `${LINE_TOP + p * LINE_H}%`;

      if (isMobileRef.current) {
        raf = running ? requestAnimationFrame(loop) : 0;
        return;
      }

      const mid = window.innerHeight / 2;
      const band = window.innerHeight * 0.32;
      for (const card of cards) {
        const head = (card.firstElementChild as HTMLElement) ?? card;
        const r = head.getBoundingClientRect();
        const c = r.top + r.height / 2;
        card.classList.toggle(styles.open, c <= mid);
        card.classList.toggle(styles.active, Math.abs(c - mid) < band);
      }
      raf = running ? requestAnimationFrame(loop) : 0;
    };
    const visIO = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
        if (running && !raf) raf = requestAnimationFrame(loop);
      },
      { threshold: 0 },
    );
    visIO.observe(section);

    return () => {
      revealIO.disconnect();
      visIO.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 className={styles.title}>
            {t("wantTitle")} <span className={styles.titleAccent}>{t("wantAccent")}</span>
          </h2>
          <p className={styles.subtitle}>{t("wantSubtitle")}</p>
        </header>

        <div className={styles.main}>
          <div className={styles.spine}>
            <div className={styles.spineSticky}>
              <div className={styles.line} />
              <div ref={fillRef} className={styles.fill} />
              <div ref={squareRef} className={styles.square} />
            </div>
          </div>

          {ITEMS.map((key, i) => {
            const Icon = ICONS[key];
            const side = i % 2 === 0 ? styles.right : styles.left;
            return (
              <article
                key={key}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={`${styles.card} ${side}`}
                style={{ gridRow: i + 1 }}
                onClick={() => onCardClick(i)}
              >
                <div className={styles.head}>
                  <span className={styles.numBox}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.label}>{t(`${key}Label`)}</span>
                  <span className={styles.chev} aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <div className={styles.bodyWrap}>
                  <div className={styles.bodyInner}>
                    <div className={styles.body}>
                      <span className={styles.bodyIcon}>
                        <Icon />
                      </span>
                      <p className={styles.text}>{t(`${key}Text`)}</p>
                    </div>
                  </div>
                </div>
                <div className={styles.foot}>
                  <span className={styles.footName}>{t(`${key}Foot`)}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
