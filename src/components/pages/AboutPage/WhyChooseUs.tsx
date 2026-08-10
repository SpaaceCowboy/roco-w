"use client";

import { Fragment, useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import styles from "./WhyChooseUs.module.css";

gsap.registerPlugin(ScrollTrigger);

const ADV = ["why1", "why2", "why4"] as const;
const MICRO_L = "ROCO BROKER";
const MICRO_R = "EST. 2014";

// Decorative "barcode" bar widths (fixed for SSR/CSR parity).
const BARS = [3, 1, 2, 1, 1, 4, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 4, 2];
const BAR_GAP = 1.4;
const BAR_TOTAL = BARS.reduce((a, w) => a + w + BAR_GAP, 0);
const BAR_LAYOUT = BARS.map((width, index) => ({
  width,
  x: BARS.slice(0, index).reduce((total, previous) => total + previous + BAR_GAP, 0),
}));

/** Advantage icons (own, stroke-based). */
function LeverageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 17l6-6 4 4 6-7" />
      <path d="M16 8h4v4" />
    </svg>
  );
}
function LiquidityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z" />
      <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  );
}
function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 15v-2a7 7 0 0 1 14 0v2" />
      <path d="M19 15h1a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2h-1z" />
      <path d="M5 15H4a1 1 0 0 0-1 1v2a2 2 0 0 0 2 2h1z" />
    </svg>
  );
}
function RiskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
const ICONS = { why1: LeverageIcon, why2: LiquidityIcon, why3: SupportIcon, why4: RiskIcon };

/** Split text into flickering char spans. */
function Chars({ text }: { text: string }) {
  return (
    <>
      {[...text].map((c, i) => (
        <Fragment key={i}>
          <span className={styles.microChar}>{c === " " ? " " : c}</span>
        </Fragment>
      ))}
    </>
  );
}

/** Split text into flickering word spans. */
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(/\s+/).map((w, i, arr) => (
        <Fragment key={i}>
          <span className={styles.microWord}>{w}</span>
          {i < arr.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

/**
 * WhyChooseUs — the About "Why Choose Us" section, in the titangatequity
 * stats-section manner but reskinned to our brand: a micro-text header row with
 * a barcode graphic, a heading flanked by dotted guideline lines, an intro line,
 * and the four advantages as dotted-ring blocks. Own decorations + colours.
 * Text from docs/about-source.md.
 */
export function WhyChooseUs() {
  const t = useTranslations("aboutPage");
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      chaosBlink(gsap.utils.toArray(`.${styles.microChar}`, el));
      chaosBlink(gsap.utils.toArray(`.${styles.microWord}`, el));
      chaosBlink(gsap.utils.toArray(`.${styles.bars} rect`, el));
      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.advantage}`, el), {
        opacity: 0,
        y: 28,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: `.${styles.advGrid}`, start: "top 82%" },
      });
      // Count-up the stat numbers when they scroll into view.
      gsap.utils.toArray<HTMLElement>(`.${styles.count}`, el).forEach((node) => {
        const to = Number(node.dataset.to) || 0;
        node.textContent = "0";
        const obj = { v: 0 };
        gsap.to(obj, {
          v: to,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: { trigger: node, start: "top 88%" },
          onUpdate: () => {
            node.textContent = String(Math.round(obj.v));
          },
        });
      });

      // Draw each dotted ring on as its block enters view (progress mask).
      gsap.utils.toArray<SVGCircleElement>(`.${styles.maskCircle}`, el).forEach((circle) => {
        gsap.fromTo(
          circle,
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 1.3,
            ease: "power2.out",
            scrollTrigger: { trigger: circle.closest(`.${styles.advantage}`), start: "top 82%" },
          },
        );
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={styles.section}>
      <div className={styles.inner}>
        {/* Micro header row */}
        <div className={styles.microRow}>
          <span className={styles.microText}>
            <Chars text={MICRO_L} />
          </span>
          <span className={styles.bars} aria-hidden="true">
            <svg viewBox={`0 0 ${BAR_TOTAL} 24`} preserveAspectRatio="none" width="100%" height="24">
              {BAR_LAYOUT.map(({ width, x }, i) => (
                <rect
                  key={i}
                  x={x}
                  y={0}
                  width={width}
                  height={24}
                  fill="currentColor"
                  opacity={0.35 + ((i * 37) % 55) / 100}
                />
              ))}
            </svg>
          </span>
          <span className={`${styles.microText} ${styles.microEnd}`}>
            <Chars text={MICRO_R} />
          </span>
        </div>

        {/* Heading flanked by dotted guideline lines */}
        <div className={styles.intro}>
          <span className={styles.guide} aria-hidden="true" />
          <h2 className={styles.title}>{t("whyTitle")}</h2>
          <span className={styles.guide} aria-hidden="true" />
        </div>

        <p className={styles.introText}>{t("whyIntro")}</p>

        {/* Advantages — dotted-ring blocks */}
        <div className={styles.advGrid}>
          {ADV.map((a, i) => {
            const Icon = ICONS[a];
            return (
              <div key={a} className={styles.advantage}>
                <span className={styles.ring}>
                  {/* faint dotted ring underneath */}
                  <svg className={styles.ringBg} viewBox="0 0 100 100" fill="none" aria-hidden="true">
                    <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
                  </svg>
                  {/* lime dotted ring revealed by an animated progress arc */}
                  <svg className={styles.ringFg} viewBox="0 0 100 100" fill="none" aria-hidden="true">
                    <mask id={`why-ring-${i}`}>
                      <circle
                        className={styles.maskCircle}
                        cx="50"
                        cy="50"
                        r="46"
                        stroke="#fff"
                        strokeWidth="8"
                        pathLength={1}
                        strokeDasharray="1 1"
                        strokeDashoffset={1}
                        transform="rotate(-90 50 50)"
                      />
                    </mask>
                    <g mask={`url(#why-ring-${i})`}>
                      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
                    </g>
                  </svg>
                  <span className={styles.ringIcon}>
                    <Icon />
                  </span>
                </span>
                <h3 className={styles.advTitle}>{t(`${a}t`)}</h3>
                <p className={styles.advText}>{t(`${a}d`)}</p>
              </div>
            );
          })}
        </div>

        {/* Big stat circles (progress-draw left + overlapping circles right) */}
        <div className={styles.stats}>
          {/* Left — dense dotted ring that draws on, micro-text above a huge number */}
          <div className={`${styles.stat} ${styles.statLeftCol}`}>
            <div className={styles.statCircle}>
              <svg className={styles.statRingBg} viewBox="0 0 514 514" fill="none" aria-hidden="true">
                <circle cx="257" cy="257" r="250" stroke="currentColor" strokeWidth="4" strokeDasharray="4 16" />
              </svg>
              <svg className={styles.statRingFg} viewBox="0 0 514 514" fill="none" aria-hidden="true">
                <mask id="why-stat-left">
                  <circle
                    className={styles.maskCircle}
                    cx="257"
                    cy="257"
                    r="250"
                    stroke="#fff"
                    strokeWidth="16"
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={1}
                    transform="rotate(-90 257 257)"
                  />
                </mask>
                <g mask="url(#why-stat-left)">
                  <circle cx="257" cy="257" r="250" stroke="currentColor" strokeWidth="4" strokeDasharray="4 16" />
                </g>
              </svg>
              <p className={styles.statMicro}>
                <Words text={t("statLeftMicro")} />
              </p>
              <div className={styles.statInner}>
                <div className={styles.statNumber}>
                  <span className={styles.count} data-to="12">
                    12
                  </span>
                  <span className={styles.statSuffix}>+</span>
                </div>
              </div>
            </div>
            <p className={styles.statDesc}>{t("statLeftDesc")}</p>
          </div>

          {/* Right — two thin overlapping circles behind a huge number */}
          <div className={styles.stat}>
            <div className={`${styles.statCircle} ${styles.statCircleBig}`}>
              <svg className={styles.venn} viewBox="0 0 630 420" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                <defs>
                  <linearGradient id="why-venn" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <circle cx="205" cy="210" r="200" stroke="url(#why-venn)" strokeWidth="1.6" />
                <circle cx="425" cy="210" r="200" stroke="url(#why-venn)" strokeWidth="1.6" />
                <circle cx="315" cy="210" r="90" stroke="url(#why-venn)" strokeWidth="1.6" />
              </svg>
              <div className={styles.statInner}>
                <div className={styles.statNumber}>
                  <span className={styles.count} data-to="24">
                    24
                  </span>
                  /7
                </div>
              </div>
            </div>
            <p className={styles.statDesc}>{t("statRightDesc")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
