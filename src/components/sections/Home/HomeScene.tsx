"use client";

import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { Globe } from "@/components/ui/Globe/Globe";
import { DotMatrix } from "@/components/ui/DotMatrix/DotMatrix";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { TickerTape } from "@/components/sections/TickerTape/TickerTape";
import { About } from "@/components/sections/About/About";
import { Markets } from "@/components/sections/Markets/Markets";
import { Accounts } from "@/components/sections/Accounts/Accounts";
import { MetaTrader } from "@/components/sections/MetaTrader/MetaTrader";
import { WhatWeDo } from "@/components/sections/WhatWeDo/WhatWeDo";
import { FAQ } from "@/components/sections/FAQ/FAQ";
import { IBPromo } from "@/components/sections/IBPromo/IBPromo";
import { Footer } from "@/components/layout/Footer/Footer";
import styles from "./Home.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * HomeScene — persistent background (dot-matrix + corner marks + globe) that
 * stays put while the hero content dissolves away. As you scroll, the SAME
 * planet rises from the bottom of the hero to the centre, shrinks, and spins
 * with momentum; the Features section then forms a 3-column grid around it.
 */
export function HomeScene({ hero, features }: { hero: ReactNode; features: ReactNode }) {
  const t = useTranslations("mt5");
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<HTMLDivElement>(null);
  const spin = useRef(0);

  useGSAP(
    () => {
      const root = rootRef.current;
      const heroEl = heroRef.current;
      const featEl = featuresRef.current;
      const planet = planetRef.current;
      if (!root || !heroEl || !featEl || !planet) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      // --- Planet keeps its initial size (no scroll resize) — it only spins.
      //     Held at its starting position via the CSS transform on .planetLayer. ---

      // --- Scroll-driven spin: feed scroll velocity as angular velocity ---
      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          spin.current = gsap.utils.clamp(-0.16, 0.16, self.getVelocity() * 0.00003);
        },
      });

      // --- Features: pin the grid around the centred planet; reveal title + cards ---
      const featTitle = featEl.querySelector<HTMLElement>("[data-feature-title]");
      const leftCards = gsap.utils.toArray<HTMLElement>('[data-side="left"]', featEl);
      const rightCards = gsap.utils.toArray<HTMLElement>('[data-side="right"]', featEl);

      gsap.set(leftCards, { autoAlpha: 0, xPercent: -35 });
      gsap.set(rightCards, { autoAlpha: 0, xPercent: 35 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: featEl,
          start: "top top",
          end: "+=140%",
          scrub: 0.6,
          pin: true,
          pinSpacing: true,
        },
      });

      if (featTitle) {
        SplitText.create(featTitle, {
          type: "lines",
          aria: "none",
          mask: "lines",
          linesClass: "line",
          onSplit: (self) => {
            gsap.set(self.lines, { yPercent: 100 });
            tl.to(
              self.lines,
              { yPercent: 0, duration: 0.5, ease: "power3.out", stagger: 0.12 },
              0,
            );
          },
        });
      }

      tl.to(
        [leftCards[0], rightCards[0]],
        { autoAlpha: 1, xPercent: 0, duration: 0.5, ease: "power3.out" },
        0.3,
      );
      tl.to(
        rightCards[1],
        { autoAlpha: 1, xPercent: 0, duration: 0.5, ease: "power3.out" },
        "-=0.3",
      );
      tl.to({}, { duration: 0.4 });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={styles.scene}>
      {/* Stage: globe + dots + corners, bounded to the hero + features. */}
      <div className={styles.stage}>
        <div className={styles.stageBg}>
          <div className={styles.bgLayer}>
            <DotMatrix speed={0.02} delay={0.35} opacity={0.6} color="#727d85" />
          </div>

          <div ref={planetRef} className={styles.planetLayer}>
            <div className={styles.planetRise}>
              <Globe spinRef={spin} />
            </div>
          </div>

          <div className={styles.frame}>
            <Reveal variant="blink" delay={0.2}>
              <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
              <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />
            </Reveal>
          </div>
        </div>

        <div className={styles.stageContent}>
          <div ref={heroRef}>{hero}</div>
          <div ref={featuresRef}>{features}</div>
        </div>
      </div>

      {/* After the stage — no globe behind these. */}
      <div className={styles.after}>
        <div className={styles.ticker}>
          <TickerTape />
        </div>
        <About />
        <Markets />
        <Accounts />
        <MetaTrader
          image="/home/roco-office.png"
          alt={t("officeImageAlt")}
          width={1424}
          height={800}
        />
        <WhatWeDo />
        <FAQ />
        <IBPromo />
        <Footer />
      </div>
    </div>
  );
}
