"use client";

import { useCallback, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText);

type Variant = "slide" | "flicker" | "blink";

type Props = {
  children: ReactNode;
  as?: "div" | "h1" | "h2" | "p" | "span";
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
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);

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

      // On mobile, reveal the semantic element as a whole. Avoiding character
      // and line splitting removes dozens of generated nodes and synchronous
      // layout measurements during the critical loading window.
      if (window.matchMedia("(max-width: 1024px)").matches) {
        gsap.fromTo(
          el,
          { opacity: 0, y: variant === "slide" ? 18 : 0 },
          {
            opacity: 1,
            y: 0,
            duration: variant === "slide" ? 0.65 : 0.35,
            ease: "power2.out",
            delay,
          },
        );
        return;
      }

      if (variant === "slide") {
        SplitText.create(el, {
          type: "lines",
          aria: "none",
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
        aria: "none",
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

  // Keep the intrinsic elements explicit. Besides making the supported
  // semantics clear, this lets React verify the ref without reading it while
  // resolving a dynamic element during render.
  switch (as) {
    case "h1":
      return <h1 ref={setRef} className={className}>{children}</h1>;
    case "h2":
      return <h2 ref={setRef} className={className}>{children}</h2>;
    case "p":
      return <p ref={setRef} className={className}>{children}</p>;
    case "span":
      return <span ref={setRef} className={className}>{children}</span>;
    default:
      return <div ref={setRef} className={className}>{children}</div>;
  }
}
