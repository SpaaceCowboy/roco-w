"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "./Markets.module.css";

const MARKETS = ["forex", "commodities", "metals", "crypto", "stocks", "indices"] as const;

/**
 * Markets — right after the About block. A tall section with a sticky viewport:
 * as you scroll through it the 6-market card row translates horizontally (progress
 * bar fills), starting at card 01 (empty bar) and ending at card 06, after which
 * the page continues below. Progress is computed directly from the section's
 * scroll position (no ScrollTrigger pin) so the start point is always exact.
 * Reduced-motion → native horizontal swipe.
 */
export function Markets() {
  const t = useTranslations("markets");
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const slider = sliderRef.current;
    const wrapper = wrapperRef.current;
    const progress = progressRef.current;
    if (!section || !slider || !wrapper || !progress) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Mobile/tablet: no scroll-driven sticky at all — the CSS turns this into a
    // native horizontal swipe carousel, which can't produce dead/"empty" scroll.
    if (window.matchMedia("(max-width: 900px)").matches) return;

    let raf = 0;
    let running = false;

    // RTL (ar/fa): the flex row is mirrored, so the wrapper overflows to the
    // inline-start (left) — the horizontal translation flips sign and the
    // progress bar fills from the right.
    const rtl = getComputedStyle(section).direction === "rtl";
    const dir = rtl ? 1 : -1;
    progress.style.transformOrigin = rtl ? "right" : "left";

    // Measured ONCE per layout (not per-frame): the horizontal overflow and the
    // scroll distance it maps to. Per-frame reads of window.innerHeight/svh drift
    // on mobile as the toolbar shows/hides, so we freeze them here and only the
    // scroll position is read live in tick(). This kills the "empty scroll" that
    // came from a mismeasured (zero-width) slider at mount.
    let overflow = 0;
    let total = 0;

    const layout = () => {
      const sliderW = slider.clientWidth;
      if (sliderW <= 0) return; // not laid out yet — retry on a later trigger
      const stickyH = stickyRef.current?.offsetHeight ?? window.innerHeight;
      overflow = Math.max(0, wrapper.scrollWidth - sliderW);
      total = overflow; // pinned scroll distance == section.height - stickyH
      section.style.height = `${stickyH + overflow}px`;
    };

    const tick = () => {
      const scrolled = -section.getBoundingClientRect().top;
      const p = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
      wrapper.style.transform = `translate3d(${dir * p * overflow}px, 0, 0)`;
      progress.style.transform = `scaleX(${p})`;
      if (running) raf = requestAnimationFrame(tick);
    };

    // Measure now, again after paint, on full load, on resize, and whenever the
    // slider actually changes size (fonts/late layout on mobile).
    layout();
    requestAnimationFrame(layout);
    window.addEventListener("resize", layout);
    window.addEventListener("load", layout);
    const ro = new ResizeObserver(layout);
    ro.observe(slider);

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!running) {
            running = true;
            raf = requestAnimationFrame(tick);
          }
        } else {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "10px" },
    );
    io.observe(section);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", layout);
      window.removeEventListener("load", layout);
      section.style.height = "";
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.markets}>
      <div ref={stickyRef} className={styles.sticky}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2 className={styles.title}>{t("title")}</h2>
            <p className={styles.subtitle}>{t("subtitle")}</p>
          </div>

          <div className={styles.progressBar}>
            <div ref={progressRef} className={styles.progress} />
          </div>

          <div ref={sliderRef} className={styles.slider}>
            <div ref={wrapperRef} className={styles.wrapper}>
              {MARKETS.map((key, i) => (
                <article key={key} className={styles.block}>
                  <div className={styles.blockHeader}>
                    <p className={styles.num}>{String(i + 1).padStart(2, "0")}</p>
                    <p className={styles.tag}>{t(`${key}.tag`)}</p>
                  </div>

                  <div className={styles.body}>
                    <img
                      className={styles.icon}
                      src={`/home/market-icons/${key}.webp`}
                      alt=""
                      loading="lazy"
          decoding="async"
                    />
                  </div>

                  <div className={styles.blockFooter}>
                    <h3 className={styles.blockTitle}>{t(`${key}.title`)}</h3>
                    <p className={styles.blockDesc}>{t(`${key}.desc`)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
