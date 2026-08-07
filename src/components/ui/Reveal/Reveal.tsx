"use client";

import { createElement, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText);

type Variant = "slide" | "flicker" | "blink";

type Props = {
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  variant?: Variant;
  delay?: number;
  stagger?: number;
  className?: string;
};

/**
 * On-load reveal, ported from the orbit-matter reference (animated-copy.js):
 *  - "slide":   line-by-line mask reveal (yPercent 100 → 0) — for headlines
 *  - "flicker": characters fade in at random — for subtext
 *  - "blink":   whole element blinks a few times then stays — for small objects
 *
 * Uses SplitText's `onSplit` so the `from` state is applied before paint (no
 * flash) and re-runs cleanly after fonts load / on resize; useGSAP handles
 * cleanup. Skipped under prefers-reduced-motion.
 */
export function Reveal({
  children,
  as = "div",
  variant = "slide",
  delay = 0,
  stagger = 0.1,
  className,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      if (variant === "blink") {
        gsap.fromTo(
          el,
          { opacity: 0 },
          { opacity: 1, duration: 0.1, ease: "power2.inOut", delay, repeat: 4 },
        );
        return;
      }

      if (variant === "slide") {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          linesClass: "line",
          onSplit: (self) =>
            gsap.fromTo(
              self.lines,
              { yPercent: 100 },
              { yPercent: 0, duration: 0.75, ease: "power3.out", delay, stagger },
            ),
        });
        return;
      }

      // flicker — fade fragments in at random. Perso-Arabic is cursive: splitting
      // into characters would break the letter joins, so under RTL we flicker
      // whole WORDS instead (joining is preserved within each word). LTR keeps
      // the per-character effect.
      const isRtl = getComputedStyle(el).direction === "rtl";
      SplitText.create(el, {
        type: isRtl ? "words" : "words,chars",
        autoSplit: true,
        onSplit: (self) =>
          gsap.fromTo(
            isRtl ? self.words : self.chars,
            { opacity: 0 },
            {
              opacity: 1,
              duration: 0.05,
              ease: "power2.inOut",
              delay,
              stagger: { amount: 0.5, each: 0.1, from: "random" },
            },
          ),
      });
    },
    { scope: ref },
  );

  return createElement(as, { ref, className }, children);
}
