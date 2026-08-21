"use client";

import { useEffect, useRef, Fragment } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/Button/Button";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import { CTA_JOIN } from "@/config/nav";
import styles from "./About.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText);

// Decorative "barcode" bar widths (fixed so SSR/CSR match). Kept short.
const BARS = [3, 1, 2, 1, 1, 4, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 4, 2, 1, 3];
const BAR_GAP = 1.4;
const BAR_TOTAL = BARS.reduce((a, w) => a + w + BAR_GAP, 0);

/**
 * About ("Who We Are") — white editorial section following the titangatequity
 * intro-section on OUR WIDE 12-col grid: a top row of four small elements
 * (label · 12px sentence · barcode · year) that flicker in — the "2026" letters
 * also drop into place — then a big statement title with a gradient accent, a
 * feature list/CTA aside, and a full-width media block that wipe-reveals +
 * parallaxes. Media is a grey placeholder for now.
 */
export function About() {
  const t = useTranslations("about");
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load and play the media video ONCE, forward, when it nears the viewport — then it
  // holds on the last frame (scrolling back keeps the end state). Forward-only
  // native playback decodes smoothly, so the clip stays high quality. Reduced
  // motion → just show the final frame, no motion.
  useEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    if (!video || !root) return;
    const media = root.querySelector<HTMLElement>("[data-about-media]");
    if (!media) return;

    // The poster is the reduced-motion presentation; do not download or decode
    // the 1.4 MB video for visitors who have requested less motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let played = false;
    const load = () => {
      if (video.src) return;
      video.src = "/home/about.mp4";
      video.load();
    };
    const onInteract = () => {
      load();
      video.play().then(() => {
        played = true;
      }).catch(() => {});
    };
    const play = () => {
      if (played) return;
      load();
      // Start directly (the browser begins playback once it has buffered).
      video.play().then(() => {
        played = true;
      }).catch(() => {
        // Autoplay blocked (e.g. iOS Low Power Mode) — play on first tap.
        window.addEventListener("touchstart", onInteract, { once: true, passive: true });
        window.addEventListener("click", onInteract, { once: true });
      });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) play(); // forward-only; guarded by `played`
      },
      { rootMargin: "300px 0px", threshold: 0.05 },
    );
    io.observe(media);

    return () => {
      io.disconnect();
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("click", onInteract);
    };
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.matchMedia("(max-width: 1024px)").matches
      ) {
        return;
      }

      const enter = (el: Element) => ({ trigger: el, start: "top 82%" as const });
      const rand = gsap.utils.random;

      // Ongoing chaotic blink (shared pattern) on the small micro elements.
      chaosBlink(gsap.utils.toArray(`[data-el1] .${styles.tok}`, root));
      chaosBlink(gsap.utils.toArray(`[data-el2] .${styles.tok}`, root));
      chaosBlink(gsap.utils.toArray("[data-el3] rect", root));

      // 2026: blink + an ongoing small downward drift of each letter.
      const yr = gsap.utils.toArray<HTMLElement>(`[data-el4] .${styles.tok}`, root);
      chaosBlink(yr);
      yr.forEach((c) => {
        gsap.to(c, {
          yPercent: 26,
          duration: rand(1.4, 2.4),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: rand(0, 1.2),
        });
      });

      // Bottom 4-column row — chaotic blink on its tokens + guidelines drawing in.
      chaosBlink(gsap.utils.toArray(`.${styles.cols4} .${styles.tok}`, root));
      const cols = root.querySelector(`.${styles.cols4}`);
      if (cols) {
        gsap.from(gsap.utils.toArray(`.${styles.guideline}`, root), {
          scaleY: 0,
          transformOrigin: "top center",
          duration: 0.8,
          ease: "power2.out",
          stagger: 0.12,
          scrollTrigger: enter(cols),
        });
      }

      // Title: hero-style reveal — line-by-line mask slide (yPercent 100 → 0).
      const title = root.querySelector<HTMLElement>("[data-about-title]");
      if (title) {
        SplitText.create(title, {
          type: "lines",
          aria: "none",
          mask: "lines",
          linesClass: "line",
          onSplit: (self) =>
            gsap.fromTo(
              self.lines,
              { yPercent: 100 },
              {
                yPercent: 0,
                duration: 0.8,
                ease: "power3.out",
                stagger: 0.12,
                scrollTrigger: enter(title),
              },
            ),
        });
      }

      // Everything else (gradient accent, list rows, CTA): fade-up on enter.
      gsap.utils.toArray<HTMLElement>("[data-about-rise]", root).forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 26,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: enter(el),
        });
      });

      // Media: gentle fade-up on enter (the video scrub is handled separately).
      const media = root.querySelector<HTMLElement>("[data-about-media]");
      if (media) {
        gsap.from(media, {
          autoAlpha: 0,
          y: 40,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: enter(media),
        });
      }
    },
    { scope: rootRef },
  );

  const points = [t("point1"), t("point2"), t("point3"), t("point4")];

  return (
    <section ref={rootRef} className={styles.about}>
      <div className={styles.inner}>
        {/* Top row — four small elements */}
        <div className={styles.microRow}>
          <span className={styles.el1} data-el1>
            <Words text={t("kicker")} />
          </span>

          <p className={styles.el2} data-el2>
            <Words text={t("micro")} twoTone />
          </p>

          <span className={styles.el3} data-el3 aria-hidden="true">
            <svg
              viewBox={`0 0 ${BAR_TOTAL} 26`}
              preserveAspectRatio="none"
              width="100%"
              height="26"
            >
              {barRects()}
            </svg>
          </span>

          <span className={styles.el4} data-el4 aria-hidden="true">
            <Chars text="2026" />
          </span>
        </div>

        {/* Statement + aside */}
        <div className={styles.headRow}>
          <h2 className={styles.title} data-about-title>
            {t("titleLead")}{" "}
            <span className={styles.gradient}>{t("titleAccent")}</span>
          </h2>

          <div className={styles.aside}>
            <ul className={styles.list}>
              {points.map((p) => (
                <li key={p} className={styles.item} data-about-rise>
                  <Check />
                  {p}
                </li>
              ))}
            </ul>
            <span className={styles.cta} data-about-rise>
              <Button label={t("cta")} href={CTA_JOIN.href} external variant="primary" />
            </span>
          </div>
        </div>

        {/* Scroll-scrubbed video on the left; blurb on the right, aligned to the
            same column (9) as the feature list / button above. */}
        <div className={styles.media} data-about-media>
          <video
            ref={videoRef}
            className={styles.mediaVideo}
            poster="/home/about-poster.png"
            muted
            playsInline
            preload="none"
            aria-hidden="true"
          />
          <p className={styles.mediaText}>
            {t("overlay")
              .split(" ")
              .map((w, i) => (
                <span key={i} className={i % 2 === 1 ? styles.mediaMuted : undefined}>
                  {w}{" "}
                </span>
              ))}
          </p>
        </div>

        {/* Four-column micro row below the video (label · two tags · vision). */}
        <div className={styles.cols4}>
          <div className={styles.colItem}>
            <span className={styles.microItem}>
              <Words text={t("visionLabel")} />
            </span>
          </div>
          <div className={`${styles.colItem} ${styles.withLine}`}>
            <Guideline delay={0} />
            <span className={styles.microItem}>
              <Words text={t("visionA")} />
            </span>
          </div>
          <div className={`${styles.colItem} ${styles.withLine}`}>
            <Guideline delay={1.1} />
            <span className={styles.microItem}>
              <Words text={t("visionB")} />
            </span>
          </div>
          <div className={`${styles.colItem} ${styles.withLine}`}>
            <Guideline delay={2.2} />
            <p className={styles.microWide}>
              <Words text={t("vision")} twoTone />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Vertical guideline — a faint line with an ongoing gradient "energy" pulse
 *  flowing top→bottom (delay offsets each column's pulse). */
function Guideline({ delay }: { delay: number }) {
  return (
    <span
      className={styles.guideline}
      style={{ "--flow-delay": `${delay}s` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

/** Render text as inline-block word tokens (so transforms apply). */
function Words({ text, twoTone = false }: { text: string; twoTone?: boolean }) {
  const words = text.split(/\s+/);
  return (
    <>
      {words.map((w, i) => {
        const muted = twoTone && w.replace(/[^\p{L}\p{N}]/gu, "").length <= 3;
        return (
          <Fragment key={i}>
            <span className={`${styles.tok} ${muted ? styles.muted : ""}`.trim()}>{w}</span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </>
  );
}

/** Render text as inline-block char tokens. */
function Chars({ text }: { text: string }) {
  return (
    <>
      {[...text].map((c, i) => (
        <span key={i} className={styles.tok}>
          {c}
        </span>
      ))}
    </>
  );
}

function barRects() {
  let x = 0;
  return BARS.map((w, i) => {
    const rect = (
      <rect
        key={i}
        x={x}
        y={0}
        width={w}
        height={26}
        fill="currentColor"
        opacity={0.4 + ((i * 37) % 55) / 100}
      />
    );
    x += w + BAR_GAP;
    return rect;
  });
}

function Check() {
  return (
    <svg
      className={styles.check}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}
