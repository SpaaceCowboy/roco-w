"use client";

import { useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/Button/Button";
import styles from "./SocialRating.module.css";

gsap.registerPlugin(ScrollTrigger);

const REGISTER = "https://my.rocobroker.com/register";

/**
 * SocialRating — dark "Rating module" section for Social Trading: the ranked
 * leaderboard preview image on the left, with the heading, supporting line and
 * a preview note on the right. Reveals on scroll. Text verbatim from
 * docs/social-trading-source.md.
 */
export function SocialRating() {
  const t = useTranslations("socialTrading");
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.reveal}`, el), {
        opacity: 0,
        y: 26,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 74%" },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <figure className={`${styles.media} ${styles.reveal}`}>
            <Image
              className={styles.image}
              src="/social-trading/rating.webp"
              alt={`${t("rating.title")} ${t("rating.accent")}`}
              width={1400}
              height={934}
              sizes="(max-width: 900px) 100vw, 50vw"
            />
          </figure>
          <p className={`${styles.imgNote} ${styles.reveal}`}>{t("rating.note")}</p>

          <div className={styles.copy}>
            <h2 className={`${styles.title} ${styles.reveal}`}>
              {t("rating.title")} <span className={styles.accent}>{t("rating.accent")}</span>
            </h2>

            <div className={styles.bottom}>
              <p className={`${styles.text} ${styles.reveal}`}>{t("rating.text")}</p>
              <div className={`${styles.cta} ${styles.reveal}`}>
                <Button label={t("cta")} href={REGISTER} external size="lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
