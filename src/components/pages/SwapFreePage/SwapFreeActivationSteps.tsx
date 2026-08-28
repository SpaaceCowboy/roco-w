"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./SwapFreePage.module.css";

type ActivationStep = {
  tag: string;
  title: string;
  body: string;
};

type SwapFreeActivationStepsProps = {
  kicker: string;
  title: string;
  intro: string;
  steps: ActivationStep[];
};

export function SwapFreeActivationSteps({ kicker, title, intro, steps }: SwapFreeActivationStepsProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const panels = Array.from(section.querySelectorAll<HTMLElement>(`.${styles.activationPanel}`));
    const arrow = section.querySelector<HTMLElement>(`.${styles.activationArrow}`);
    if (panels.length < 2) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let running = false;
    const step = 1 / (panels.length - 1);

    const update = () => {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;

      if (arrow) {
        arrow.style.transform = `translate(-50%, -50%) rotate(${(progress * 360).toFixed(2)}deg)`;
      }

      panels.forEach((panel, index) => {
        const panelProgress = (progress - index * step) / step;
        const opacity = Math.max(0, 1 - Math.abs(panelProgress) * 1.25);
        panel.style.opacity = opacity.toFixed(3);
        panel.style.transform = `translate(-50%, calc(-50% + ${(-panelProgress * 46).toFixed(1)}px))`;
      });

      if (running) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        frame = requestAnimationFrame(update);
      } else if (!entry.isIntersecting) {
        running = false;
        cancelAnimationFrame(frame);
      }
    });

    observer.observe(section);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.activation}
      style={{ "--activation-steps": steps.length } as CSSProperties}
      aria-labelledby="swap-free-activation-title"
    >
      <div className={styles.activationSticky}>
        <div className={styles.activationStage}>
          <div className={styles.activationRings} aria-hidden="true">
            <svg className={styles.activationEllipse} viewBox="0 0 1418 525" fill="none" preserveAspectRatio="none">
              <ellipse cx="709" cy="262.5" rx="708" ry="261.5" stroke="currentColor" strokeDasharray="0.1 3" strokeLinecap="round" />
            </svg>
            <svg className={styles.activationCircle} viewBox="0 0 542 542" fill="none">
              <circle cx="271" cy="271" r="261.5" stroke="currentColor" strokeDasharray="0.1 3" strokeLinecap="round" />
            </svg>
            <div className={styles.activationArrow}>
              <svg viewBox="0 0 542 542" fill="none">
                <path d="M271 0 L285 24 L257 24 Z" fill="var(--color-accent)" />
              </svg>
            </div>
          </div>

          <div className={styles.activationHeading}>
            <p className={styles.kicker}>{kicker}</p>
            <h2 id="swap-free-activation-title">{title}</h2>
            <p>{intro}</p>
          </div>

          {steps.map((step, index) => (
            <article key={step.title} className={styles.activationPanel}>
              <span className={styles.activationNo}>{String(index + 1).padStart(2, "0")}</span>
              <p className={styles.activationTag}>{step.tag}</p>
              <h3>{step.title}</h3>
              <p className={styles.activationBody}>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
