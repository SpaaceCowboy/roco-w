"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DotMatrix } from "@/components/ui/DotMatrix/DotMatrix";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import { Tabs } from "@/components/ui/Tabs/Tabs";
import { CATEGORIES, type Category } from "./categories";
import styles from "./MarketsPage.module.css";

const POINTS = ["p1", "p2", "p3"] as const;
const REGISTER = "https://my.rocobroker.com/register";

/** Per-category media — categories without an entry fall back to the placeholder. */
const MEDIA: Partial<Record<Category, string>> = {
  forex: "/markets/forex.mp4",
  metals: "/markets/metals.mp4",
  commodities: "/markets/commodities.mp4",
  stocks: "/markets/stocks.mp4",
  crypto: "/markets/crypto.mp4",
  indices: "/markets/indices.mp4",
};
const POSTERS: Partial<Record<Category, string>> = {
  forex: "/markets/forex-poster.png",
  metals: "/markets/metals-poster.png",
  commodities: "/markets/commodities.png",
  stocks: "/markets/stocks-poster.png",
  crypto: "/markets/crypto-poster.png",
  indices: "/markets/indices-poster.webp",
};

/**
 * MarketsView — the Markets subpage. A full-width title over a hairline, a
 * gradient-accent lead + subtext row, brand tabs switching the six categories,
 * and a per-category panel (kicker + flicker micro, gradient title, intro,
 * guideline feature points, image placeholder). Reuses the home brand kit
 * (DotMatrix, Reveal, Button, corner marks, chaosBlink).
 */
export function MarketsView({ active: initial }: { active: Category }) {
  const t = useTranslations("marketsPage");
  const m = useTranslations("markets");
  const [active, setActive] = useState<Category>(initial);
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      chaosBlink(gsap.utils.toArray(`.${styles.micro}`, rootRef.current!));
    },
    { scope: rootRef, dependencies: [active] },
  );

  return (
    <section ref={rootRef} className={styles.page}>
      {/* Hero band — dark, dot-grid, corner frame. */}
      <div className={styles.hero}>
        <div className={styles.dots} aria-hidden="true">
          <DotMatrix speed={0.02} delay={0.2} opacity={0.5} color="#727d85" />
        </div>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.inner}>
          <Reveal as="h1" variant="slide" className={styles.title}>
            {t("title")}
          </Reveal>

          <div className={styles.hair} />

          <div className={styles.introRow}>
            <div className={styles.introLeft}>
              <div className={styles.introLeadBlock}>
                <h2 className={styles.lead}>
                  {t("lead")} <span className={styles.leadAccent}>{t("leadAccent")}</span>
                </h2>
                <Button label={t("cta")} href={REGISTER} external />
              </div>
            </div>
            <Reveal as="p" variant="flicker" className={styles.sub}>
              {t("sub")}
            </Reveal>
          </div>
        </div>
      </div>

      {/* Tabs + panel. `#markets` is the deep-link target: picking a specific
          topic from the nav dropdown scrolls straight here (not the hero top). */}
      <div id="markets" className={styles.body}>
        <div className={styles.inner}>
          <Tabs
            className={styles.marketTabs}
            ariaLabel={t("title")}
            active={active}
            onChange={(id) => setActive(id as Category)}
            items={CATEGORIES.map((c) => ({ id: c, label: m(`${c}.title`) }))}
          />

          {/* key remounts → the panel fades in on switch */}
          <div key={active} className={styles.panel}>
            <div className={styles.panelText}>
              <div className={styles.microRow}>
                <span className={styles.microBlock} />
                <span className={styles.micro}>{t("micro")}</span>
              </div>
              <h3 className={styles.catTitle}>
                <span className={styles.catAccent}>{m(`${active}.title`)}</span>
              </h3>
              <p className={styles.intro}>{t(`cat.${active}.intro`)}</p>
              <ul className={styles.points}>
                {POINTS.map((p) => (
                  <li key={p} className={styles.point}>
                    <span className={styles.guideline} aria-hidden="true" />
                    <span className={styles.pointText}>{t(`cat.${active}.${p}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.panelMedia}>
              {MEDIA[active] ? (
                <video
                  key={active}
                  className={styles.video}
                  src={MEDIA[active]}
                  poster={POSTERS[active]}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-hidden="true"
                />
              ) : (
                /* ASSET NEEDED: per-category preview image/video (remaining ×5). */
                <div className={styles.placeholder}>
                  <span className={styles.placeholderTag}>{m(`${active}.tag`)}</span>
                  <span className={styles.placeholderLabel}>{t("imageLabel")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
