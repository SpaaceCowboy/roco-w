"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { chaosBlink } from "@/lib/animation/chaosBlink";
import { ACCOUNT_COMMON_CONDITIONS } from "@/config/trading";
import { DETAIL_ICONS } from "./benefitIcons";
import styles from "./AccountsPage.module.css";

gsap.registerPlugin(ScrollTrigger);

const REGISTER = "https://my.rocobroker.com/register";
const VALUE_TOKENS = new Set(["noLimit", "rawSpread", "na", "provider", "follower"]);

/** Per-account detail media (keyed by detail key); missing → placeholder. */
const DETAIL_MEDIA: Record<string, { video: string; poster: string }> = {
  lionStd: { video: "/accounts/lion.mp4", poster: "/accounts/lion-poster.webp" },
  lionNano: { video: "/accounts/nano-lion.mp4", poster: "/accounts/nano-lion-poster.webp" },
  cheetahStd: { video: "/accounts/cheetah.mp4", poster: "/accounts/cheetah-poster.webp" },
  cheetahNano: { video: "/accounts/nano-cheetah.mp4", poster: "/accounts/nano-cheetah-poster.webp" },
};
const COMMON = ACCOUNT_COMMON_CONDITIONS;
const ROW_KEYS = [
  "minDeposit", "maxDeposit", "maxBalance", "spread", "commission",
  "leverage", "stopOut", "marginCall", "minVolume", "maxVolume", "social",
] as const;
const APPROACH = ["a1", "a2", "a3", "a4"] as const;

type Variant = {
  name: string; // brand name — kept as-is across locales
  noteKey: "stdNote" | "nanoNote" | "socialNote";
  maxDeposit: string;
  maxBalance: string;
  spread: string;
  commission: string;
  social: string;
  cents?: boolean;
};

const LION: Variant[] = [
  { name: "Lion", noteKey: "stdNote", maxDeposit: "noLimit", maxBalance: "noLimit", spread: "from 1.2 pip", commission: "0", social: "provider" },
  { name: "Nano-Lion", noteKey: "nanoNote", maxDeposit: "$200", maxBalance: "$500", spread: "from 1.2 pip", commission: "0", social: "na", cents: true },
  { name: "Lion Social", noteKey: "socialNote", maxDeposit: "noLimit", maxBalance: "noLimit", spread: "from 1.2 pip", commission: "0", social: "follower" },
];
const CHEETAH: Variant[] = [
  { name: "Cheetah", noteKey: "stdNote", maxDeposit: "noLimit", maxBalance: "noLimit", spread: "rawSpread", commission: "$8", social: "provider" },
  { name: "NANO-Cheetah", noteKey: "nanoNote", maxDeposit: "$200", maxBalance: "$500", spread: "rawSpread", commission: "8 Cent", social: "na", cents: true },
  { name: "Cheetah Social", noteKey: "socialNote", maxDeposit: "noLimit", maxBalance: "noLimit", spread: "rawSpread", commission: "$8", social: "follower" },
];

/**
 * AccountsView — the Accounts subpage. Overview header, then four animated
 * "how our accounts work" blocks, then the two account families (Lion, Cheetah)
 * each as: intro copy → a 3-variant comparison TABLE (Standard / Nano / Social
 * Trade) → the plain-language notes for those variants. Content adapted from
 * rocobroker.com/accounts; brand animations mirror the home sections.
 */
export function AccountsView() {
  const t = useTranslations("accountsPage");
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      chaosBlink(gsap.utils.toArray(`.${styles.kicker}`, root));
      chaosBlink(gsap.utils.toArray(`.${styles.blockNum}`, root));

      gsap.utils.toArray<HTMLElement>("[data-rise]", root).forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    },
    { scope: rootRef },
  );

  // Play the detail videos only while they're on screen (pause off-screen).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const videos = Array.from(root.querySelectorAll("video"));
    if (!videos.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.25 },
    );
    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={rootRef} className={styles.page}>
      {/* Persistent dot-grid — fixed behind every section. */}
      <PageBackground />

      {/* ---- Overview header ---- */}
      <div className={styles.hero}>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.inner}>
          <div className={styles.headRow}>
            <Reveal as="h1" variant="slide" className={styles.title}>
              {t("title")}
            </Reveal>
            <Reveal as="p" variant="flicker" className={styles.overview}>
              {t("overview")}
            </Reveal>
          </div>

          <div className={styles.hair} />

          {/* Approach blocks — staggered like the home Accounts meta-row:
              two top-right, two bottom-left, each on a flowing lime guideline. */}
          <div className={styles.approach}>
            {APPROACH.map((k, i) => (
              <div key={k} className={`${styles.block} ${styles[`pos${i + 1}` as "pos1"]}`} data-rise>
                <span className={styles.guideline} aria-hidden="true" />
                <span className={styles.blockNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3 className={styles.blockTitle}>{t(`approach.${k}.t`)}</h3>
                <p className={styles.blockText}>{t(`approach.${k}.d`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Families ---- */}
      <div className={styles.body}>
        <div className={styles.inner}>
          <Family id="lion" family="lion" title="Lion" variants={LION} detail={["lionStd", "lionNano"]} />
          <Family id="cheetah" family="cheetah" title="Cheetah" variants={CHEETAH} detail={["cheetahStd", "cheetahNano"]} />
        </div>
      </div>
    </section>
  );
}

/** One account family: intro → comparison table → variant notes. */
function Family({
  id,
  family,
  title,
  variants,
  detail,
}: {
  id: string;
  family: "lion" | "cheetah";
  title: string;
  variants: Variant[];
  detail: string[];
}) {
  const t = useTranslations("accountsPage");
  const [hover, setHover] = useState<number | null>(null);

  const v = (x: string) => (VALUE_TOKENS.has(x) ? t(`values.${x}`) : x);
  const cellValue = (va: Variant, row: string): string => {
    switch (row) {
      case "minDeposit": return v("noLimit");
      case "maxDeposit": return v(va.maxDeposit);
      case "maxBalance": return v(va.maxBalance);
      case "spread": return v(va.spread);
      case "commission": return va.commission;
      case "social": return v(va.social);
      default: return COMMON[row as keyof typeof COMMON] ?? "";
    }
  };
  const colClass = (i: number) => (hover === i ? styles.colHi : "");
  const colProps = (i: number) => ({
    onMouseEnter: () => setHover(i),
    onMouseLeave: () => setHover(null),
  });

  return (
    <div id={id} className={styles.family}>
      <div className={styles.familyIntro} data-rise>
        <span className={`${styles.kicker} ${styles[family]}`}>{t(`${family}.kicker`)}</span>
        <h2 className={styles.familyTitle}>
          <span className={styles.familyAccent}>{title}</span>
        </h2>
        <p className={styles.familyText}>{t(`${family}.intro`)}</p>
      </div>

      {/* Comparison table (3 variants). */}
      <div className={styles.matrixWrap} data-rise>
        <div className={styles.matrix} style={{ ["--cols" as string]: variants.length }} role="table">
          <div className={`${styles.cornerCell} ${styles.headCell}`} role="columnheader" />
          {variants.map((va, i) => (
            <div
              key={va.name}
              role="columnheader"
              className={`${styles.accHead} ${styles.headCell} ${colClass(i)}`}
              {...colProps(i)}
            >
              <span className={styles.accName}>{va.name}</span>
              <span className={`${styles.tag} ${va.cents ? styles.tagCents : ""}`}>
                {va.cents ? t("centsNote") : t(`${family}.tag`)}
              </span>
              <Button label={t("cta")} href={REGISTER} external size="sm" className={styles.headCta} />
            </div>
          ))}

          {ROW_KEYS.map((row) => {
            const vals = variants.map((va) => cellValue(va, row));
            const same = vals.every((x) => x === vals[0]);
            return (
              <Fragment key={row}>
                <div className={`${styles.rowLabel} ${same ? styles.sameRow : ""}`} role="rowheader">
                  {t(`labels.${row}`)}
                </div>
                {variants.map((va, i) => (
                  <div
                    key={va.name}
                    role="cell"
                    className={`${styles.cell} ${same ? styles.sameCell : styles.diffCell} ${colClass(i)}`}
                    {...colProps(i)}
                  >
                    {vals[i]}
                  </div>
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Per-account detail — a media panel (image/video) with frosted glass
          benefit boxes floating on top, plus the large description. The Nano
          variant mirrors the Standard one. */}
      <div className={styles.details}>
        {detail.map((dk, idx) => (
          <div key={dk} className={`${styles.detail} ${idx % 2 === 1 ? styles.mirror : ""}`} data-rise>
            <div className={styles.detailMedia}>
              {DETAIL_MEDIA[dk] ? (
                <video
                  className={styles.mediaVideo}
                  src={DETAIL_MEDIA[dk].video}
                  poster={DETAIL_MEDIA[dk].poster}
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-hidden="true"
                />
              ) : (
                /* ASSET NEEDED: image/video for the remaining accounts. */
                <div className={styles.mediaImg}>
                  <span className={styles.mediaTag}>{variants[idx].name}</span>
                  <span className={styles.mediaLabel}>{t("mediaLabel")}</span>
                </div>
              )}
              <div className={styles.glassBoxes}>
                {(["b1", "b2", "b3", "b4"] as const).map((b, bi) => {
                  const Icon = DETAIL_ICONS[dk][bi];
                  return (
                    <div key={b} className={styles.chip}>
                      <span className={styles.chipIcon}>
                        <Icon />
                      </span>
                      <span className={styles.chipText}>{t(`detail.${dk}.${b}.t`)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.detailBody}>
              <span className={styles.noteGuide} aria-hidden="true" />
              <h3 className={styles.detailName}>{variants[idx].name}</h3>
              <p className={styles.detailBig}>{t(`detail.${dk}.desc`)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
