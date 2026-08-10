"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setLenis } from "@/lib/animation/smoothScroll";

gsap.registerPlugin(ScrollTrigger);

/**
 * Global smooth scrolling (Lenis), synced to GSAP's ticker so ScrollTrigger
 * animations scrub buttery-smooth against the eased scroll position. Disabled
 * under prefers-reduced-motion (native scroll).
 */
export function SmoothScroll() {
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 1024px)").matches
    ) {
      return;
    }

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    setLenis(lenis); // so the mobile menu can pause it while the panel is open

    const onRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onRaf);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
