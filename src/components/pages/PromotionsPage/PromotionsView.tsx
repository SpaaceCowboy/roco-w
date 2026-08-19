"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import styles from "./PromotionsPage.module.css";

gsap.registerPlugin(ScrollTrigger);

/** The promo figures (values are universal; labels are translated). */
const STATS = [
  { num: "40%", highlight: true },
  { num: "$1,000" },
  { num: "1:100" },
  { num: "$500" },
  { num: "100" },
  { num: "$50" },
];

/** Deterministic decorative wave lines (our own — a flowing topographic field). */
const WAVE_W = 1200;
const WAVE_H = 620;
const WAVES = (() => {
  const lines: { d: string; w: string; o: string }[] = [];
  const N = 30;
  const steps = 44;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const yBase = 40 + t * (WAVE_H - 80);
    const swell = 0.35 + 0.65 * Math.sin(t * Math.PI); // fuller in the middle
    const amp = (34 + 64 * Math.sin(t * Math.PI)) * swell;
    const phase = t * Math.PI * 1.6;
    let d = "";
    for (let s = 0; s <= steps; s++) {
      const x = (s / steps) * WAVE_W;
      const k = s / steps;
      const y = yBase + Math.sin(k * Math.PI * 2 * 1.35 + phase) * amp + Math.sin(k * Math.PI * 4 + phase) * amp * 0.12;
      d += (s === 0 ? "M" : " L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    lines.push({ d, w: (0.3 + t * 1.1).toFixed(2), o: (0.05 + t * 0.09).toFixed(3) });
  }
  return lines;
})();

/**
 * PromotionsView — the Promotions page. Built section by section in the
 * tresmarescapital "Financial Solutions" manner, reskinned to our brand:
 *  - hero (title + hairline + team statement)
 *  - a grid-numbers stats band over a flowing wave field (bonus figures)
 * Text is from docs/promotions-source.md.
 */
const CONDITIONS = ["c1", "c2", "c3", "c4"] as const;
const MOTIV = ["motiv1", "motiv2", "motiv3", "motiv4"] as const;
const LOY = ["loy1", "loy2", "loy3", "loy4"] as const;

/** Render `full` with the `part` substring wrapped in the accent span. */
function highlight(full: string, part: string, cls: string) {
  const i = full.indexOf(part);
  if (i < 0) return full;
  return (
    <>
      {full.slice(0, i)}
      <span className={cls}>{part}</span>
      {full.slice(i + part.length)}
    </>
  );
}

export function PromotionsView() {
  const t = useTranslations("promotionsPage");
  const rootRef = useRef<HTMLElement>(null);
  const impactRef = useRef<HTMLDivElement>(null);

  // Pinned cross-fade "impact" section: CSS-sticky stage + rAF (Lenis-safe).
  // Scroll progress cross-fades the condition panels and spins the arrow.
  useEffect(() => {
    const section = impactRef.current;
    if (!section) return;
    const panels = Array.from(section.querySelectorAll<HTMLElement>(`.${styles.panel}`));
    const arrow = section.querySelector<HTMLElement>(`.${styles.arrow}`);
    const n = panels.length;
    if (!n) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      panels.forEach((el, i) => (el.style.opacity = i === 0 ? "1" : "0"));
      return;
    }

    let raf = 0;
    let running = false;
    const step = 1 / (n - 1);
    const update = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      if (arrow) arrow.style.transform = `translate(-50%, -50%) rotate(${(p * 360).toFixed(2)}deg)`;
      panels.forEach((el, i) => {
        const dp = (p - i * step) / step;
        const o = Math.max(0, 1 - Math.abs(dp) * 1.25);
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate(-50%, calc(-50% + ${(-dp * 46).toFixed(1)}px))`;
      });
      if (running) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(update);
        } else if (!e.isIntersecting) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    io.observe(section);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.statItem}`, el), {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: `.${styles.statsGrid}`, start: "top 80%" },
      });

      const items = gsap.utils.toArray<HTMLElement>(`.${styles.listItem}`, el);
      gsap.set(items, { opacity: 0, y: 24 });
      ScrollTrigger.batch(items, {
        start: "top 86%",
        onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.1 }),
      });

      // Wave field: slow ambient drift + a parallax that follows the cursor.
      const stats = el.querySelector<HTMLElement>(`.${styles.stats}`);
      const inner = el.querySelector<HTMLElement>(`.${styles.wavesInner}`);
      const svg = el.querySelector<SVGElement>(`.${styles.waves} svg`);
      if (!stats || !inner || !svg) return;

      gsap.set(inner, { scale: 1.18, transformOrigin: "50% 50%" });
      gsap.fromTo(
        inner,
        { xPercent: -2.5, yPercent: 2 },
        { xPercent: 2.5, yPercent: -2, duration: 11, ease: "sine.inOut", repeat: -1, yoyo: true },
      );

      const xTo = gsap.quickTo(svg, "xPercent", { duration: 0.7, ease: "power3" });
      const yTo = gsap.quickTo(svg, "yPercent", { duration: 0.7, ease: "power3" });
      const onMove = (e: PointerEvent) => {
        const r = stats.getBoundingClientRect();
        xTo((((e.clientX - r.left) / r.width) - 0.5) * 6);
        yTo((((e.clientY - r.top) / r.height) - 0.5) * 6);
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };
      stats.addEventListener("pointermove", onMove);
      stats.addEventListener("pointerleave", onLeave);
      return () => {
        stats.removeEventListener("pointermove", onMove);
        stats.removeEventListener("pointerleave", onLeave);
      };
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
          <div className={styles.heroGrid}>
            <div className={styles.heroText}>
              <Reveal as="h1" variant="slide" className={styles.title}>
                {t("title")}
              </Reveal>
              <Reveal as="h2" variant="slide" className={styles.lead}>
                {highlight(t("depositTitle"), t("depositAccent"), styles.leadAccent)}
              </Reveal>
            </div>
            <figure className={styles.heroVideo}>
              <video
                className={styles.heroVideoEl}
                src="/promotions/deposit.mp4"
                poster="/promotions/deposit-poster.webp"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-hidden="true"
              />
            </figure>
          </div>
        </div>
      </div>

      {/* Pinned cross-fade impact section — 40% deposit bonus conditions */}
      <div ref={impactRef} className={styles.impact}>
        <div className={styles.sticky}>
          <div className={styles.stage}>
            {/* dotted rings + rotating arrow */}
            <div className={styles.rings} aria-hidden="true">
              <svg className={styles.ellipse} viewBox="0 0 1418 525" fill="none" preserveAspectRatio="none">
                <ellipse cx="709" cy="262.5" rx="708" ry="261.5" stroke="currentColor" strokeDasharray="0.1 3" strokeLinecap="round" />
              </svg>
              <svg className={styles.circle} viewBox="0 0 542 542" fill="none">
                <circle cx="271" cy="271" r="261.5" stroke="currentColor" strokeDasharray="0.1 3" strokeLinecap="round" />
              </svg>
              <div className={styles.arrow}>
                <svg viewBox="0 0 542 542" fill="none">
                  {/* points radially outward, sitting on the circle's top edge */}
                  <path d="M271 0 L285 24 L257 24 Z" fill="var(--color-accent)" />
                </svg>
              </div>
            </div>

            <span className={styles.impactKicker}>{t("condHeading")}</span>

            {CONDITIONS.map((c, i) => (
              <div key={c} className={styles.panel}>
                <span className={styles.panelNo}>{String(i + 1).padStart(2, "0")}</span>
                <p className={styles.panelSentence}>{t(`${c}d`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid-numbers stats band (bonus figures over a wave field) */}
      <div className={styles.stats}>
        <div className={styles.waves} aria-hidden="true">
          <div className={styles.wavesInner}>
            <svg viewBox={`0 0 ${WAVE_W} ${WAVE_H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              {WAVES.map((l, i) => (
                <path key={i} d={l.d} fill="none" stroke="#ffffff" strokeOpacity={l.o} strokeWidth={l.w} />
              ))}
            </svg>
          </div>
        </div>

        <div className={styles.inner}>
          <span className={styles.statsEyebrow}>{t("statsEyebrow")}</span>
          <div className={styles.statsGrid}>
            {STATS.map((s, i) => (
              <div key={i} className={styles.statItem}>
                <span className={`${styles.statNo} ${s.highlight ? styles.statHi : ""}`}>{s.num}</span>
                <span className={styles.statLabel}>{t(`stat${i + 1}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motivational bonus — numbered c-list (head + ordered list) */}
      <div className={styles.motiv}>
        <div className={styles.inner}>
          <div className={styles.list}>
            <div className={styles.listHead}>
              <h2 className={styles.listTitle}>{t("motivTitle")}</h2>
              <p className={styles.listSub}>{t("motivSubtitle")}</p>
            </div>
            <ol className={styles.listInner}>
              {MOTIV.map((m, i) => (
                <li key={m} className={styles.listItem}>
                  <span className={styles.listNo}>{i + 1}</span>
                  <p className={styles.listText}>{t(m)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Loyalty bonus — mirrored (points left, brand-accent head right) */}
      <div className={styles.motiv}>
        <div className={styles.inner}>
          <div className={`${styles.list} ${styles.listMirror}`}>
            <ol className={styles.listInner}>
              {LOY.map((m, i) => (
                <li key={m} className={styles.listItem}>
                  <span className={styles.listNo}>{i + 1}</span>
                  <p className={styles.listText}>{t(m)}</p>
                </li>
              ))}
            </ol>
            <div className={`${styles.listHead} ${styles.listHeadAlt}`}>
              <h2 className={styles.listTitle}>{t("loyaltyTitle")}</h2>
              <p className={styles.listSub}>{t("loyaltySubtitle")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
