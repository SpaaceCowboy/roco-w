import gsap from "gsap";

/**
 * chaosBlink — reusable "shimmer" pattern: tokens rest dim/grey and smoothly rise
 * to full prominence then fall back, each on its own random rhythm, so across a
 * line different words (sometimes several at once, sometimes staggered) light up
 * and fade in an endless loop. Matches the titangatequity micro-text effect.
 *
 * Create it inside a `useGSAP(..., { scope })` / `gsap.context` so the returned
 * tweens revert on cleanup. Callers should guard on prefers-reduced-motion (as
 * the section effects already do) — skipped there, tokens simply rest visible.
 */
export function chaosBlink(
  elements: ArrayLike<Element>,
  opts: {
    base?: number; // resting opacity (dim)
    minDelay?: number;
    maxDelay?: number;
    minGap?: number;
    maxGap?: number;
  } = {},
) {
  const { base = 0.32, minDelay = 0, maxDelay = 2.5, minGap = 0.2, maxGap = 2 } = opts;
  const rand = gsap.utils.random;

  return Array.from(elements).map((el) =>
    gsap.fromTo(
      el,
      { opacity: base },
      {
        opacity: 1,
        duration: rand(0.55, 1.3),
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: rand(minDelay, maxDelay),
        repeatDelay: rand(minGap, maxGap),
      },
    ),
  );
}
