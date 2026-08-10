"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ICONS } from "./icons";
import styles from "./WhatWeDo.module.css";

/** The five "What We Do" pillars, in the order they appear down the timeline. */
const ITEMS = ["forexNews", "education", "markets", "support", "tools"] as const;

// Geometry of the centred spine (as a % of the 100vh sticky viewport): a short
// line, cropped top and bottom, that the square + gradient fill ride.
const LINE_TOP = 18;
const LINE_H = 64;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * WhatWeDo — a scroll-driven vertical timeline (adapted from sui.io's
 * "Innovation, engineered."). A short, centred dotted line stays sticky in the
 * viewport (faded/cropped at top and bottom); a white square rides it with a
 * gradient fill growing behind it, both tied directly to scroll position. Large
 * blueprint cards stretch to the left / right edges and appear one-by-one,
 * lighting up as each crosses the centre. rAF + IntersectionObservers, no
 * ScrollTrigger pin, so it stays in step with Lenis.
 */
export function WhatWeDo() {
  const t = useTranslations("whatWeDo");
  const rootRef = useRef<HTMLElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const isMobileRef = useRef(false);

  // Open ONLY the given card (mobile tap accordion) — imperative so it never
  // fights React's className.
  const openOnly = (idx: number | null) => {
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      card.classList.toggle(styles.open, i === idx);
      card.classList.remove(styles.active);
    });
  };

  // Track viewport mode; on mobile default the first card open.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => {
      const wasMobile = isMobileRef.current;
      isMobileRef.current = mq.matches;
      if (mq.matches && !wasMobile) openOnly(0);
      if (!mq.matches && wasMobile) openOnly(null); // hand back to the scroll loop
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Mobile tap: toggle the tapped card (one open at a time).
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

    // Reveal each card once it scrolls into view (stays revealed after).
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

    // Square + gradient fill tied to scroll progress; cards latch open.
    let raf = 0;
    let running = false;
    const loop = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = clamp(total > 0 ? -rect.top / total : 0, 0, 1);
      fill.style.height = `${p * LINE_H}%`;
      square.style.top = `${LINE_TOP + p * LINE_H}%`;

      // Mobile is a tap accordion (handled elsewhere) — the scroll loop only
      // drives the spine there, never the card open/close state.
      if (isMobileRef.current) {
        raf = running ? requestAnimationFrame(loop) : 0;
        return;
      }

      // Desktop: latch each card open as its HEADER passes the centre. Measuring
      // the header (fixed height) — not the whole card — avoids the feedback
      // loop where expanding a card grew its own bounding box, moved its centre,
      // and flipped the toggle back (the "jumping" bug).
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
            {t("title")} <span className={styles.titleAccent}>{t("titleAccent")}</span>
          </h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
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
                  <span className={styles.label}>{t(`${key}.label`)}</span>
                  <span className={styles.chev} aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path
                        d="m5 7.5 5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                <div className={styles.bodyWrap}>
                  <div className={styles.bodyInner}>
                    <div className={styles.body}>
                      <span className={styles.bodyIcon}>
                        <Icon />
                      </span>
                      <p className={styles.text}>{t(`${key}.text`)}</p>
                    </div>
                  </div>
                </div>
                <div className={styles.foot}>
                  <span className={styles.footName}>{t(`${key}.foot`)}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
