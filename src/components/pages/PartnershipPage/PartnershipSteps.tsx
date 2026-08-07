"use client";

import { Fragment, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import styles from "./PartnershipSteps.module.css";

const STEPS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const;

/**
 * PartnershipSteps — the IB "how it works" steps (benefits-section scroll layout,
 * reskinned): a pinned stage with the step number in a dotted circle on the left
 * (About "12+" pattern) and a bigger corner-marked card on the right whose title
 * flickers in (bigger, centred) with a small subtext under it. As you scroll the
 * number slides through 01–07 and the active card cross-fades. CSS-sticky + rAF
 * (Lenis-safe). Steps are the client-provided IB instructions.
 */
export function PartnershipSteps() {
  const t = useTranslations("partnershipPage");
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      chaosBlink(gsap.utils.toArray(`.${styles.microWord}`, rootRef.current!));
    },
    { scope: rootRef },
  );

  useEffect(() => {
    const section = sectionRef.current;
    const num = numRef.current;
    if (!section || !num) return;
    const n = STEPS.length;
    let raf = 0;
    let running = false;
    let cur = -1;

    const setActive = (idx: number) => {
      if (idx === cur) return;
      cur = idx;
      num.style.transform = `translateY(-${idx}em)`;
      panelRefs.current.forEach((el, i) => {
        if (!el) return;
        // re-trigger the flicker by removing then re-adding the class
        el.classList.remove(styles.active);
        if (i === idx) {
          // force reflow so the animation restarts
          void el.offsetWidth;
          el.classList.add(styles.active);
        }
      });
    };
    const loop = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      setActive(Math.min(n - 1, Math.floor(p * n)));
      raf = running ? requestAnimationFrame(loop) : 0;
    };
    const io = new IntersectionObserver(
      ([e]) => {
        running = e.isIntersecting;
        if (running && !raf) raf = requestAnimationFrame(loop);
      },
      { threshold: 0 },
    );
    io.observe(section);
    setActive(0);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div ref={rootRef} className={styles.sticky}>
        <div className={styles.inner}>
          <div className={styles.grid}>
            {/* Left — number in a dotted circle (About "12+" pattern) */}
            <div className={styles.ringCol}>
              <div className={styles.ring}>
                <svg className={styles.ringSvg} viewBox="0 0 514 514" fill="none" aria-hidden="true">
                  <circle cx="257" cy="257" r="250" stroke="currentColor" strokeWidth="4" strokeDasharray="4 16" strokeLinecap="round" />
                </svg>
                <div className={styles.ringInner}>
                  <p className={styles.ringMicro}>
                    {t("ringMicro")
                      .split(/\s+/)
                      .map((w, i, arr) => (
                        <Fragment key={i}>
                          <span className={styles.microWord}>{w}</span>
                          {i < arr.length - 1 ? " " : null}
                        </Fragment>
                      ))}
                  </p>
                  <span className={styles.numWindow}>
                    <span ref={numRef} className={styles.numStrip}>
                      {STEPS.map((s, i) => (
                        <span key={s} className={styles.num}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className={styles.ringTotal}>/ {String(STEPS.length).padStart(2, "0")}</span>
                </div>
              </div>
            </div>

            {/* Right — kicker above a corner-marked card, title + subtext */}
            <div className={styles.cardCol}>
              <span className={styles.kicker}>{t("stepsKicker")}</span>
              <div className={styles.card}>
              <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  ref={(el) => {
                    panelRefs.current[i] = el;
                  }}
                  className={styles.panel}
                >
                  <h3 className={styles.title}>{t(`${s}t`)}</h3>
                  <p className={styles.desc}>{t(`${s}d`)}</p>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
