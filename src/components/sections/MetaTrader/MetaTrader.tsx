"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { AppleIcon, PlayIcon, WindowsIcon, WebIcon } from "./icons";
import styles from "./MetaTrader.module.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * MetaTrader — "MetaTrader 5 for Every Device": title + subtitle and a row of
 * glass download cards (App Store · Google Play · Windows · Mac · Web Terminal)
 * that reveal on scroll and lift/glow on hover. Links point to the official
 * MT5 downloads (swap for broker-branded URLs when available).
 */
export function MetaTrader({
  image = "/home/mt5-devices.webp",
  alt = "MetaTrader 5 on desktop, tablet and mobile",
  width = 1600,
  height = 901,
}: {
  /** Override the section image (e.g. on the MT5 subpage). Defaults to home. */
  image?: string;
  /** Alt text describing the image (change it when the image changes). */
  alt?: string;
  /** Intrinsic image size — set to the real dimensions to avoid layout shift. */
  width?: number;
  height?: number;
} = {}) {
  const t = useTranslations("mt5");
  const rootRef = useRef<HTMLElement>(null);

  const platforms = [
    {
      key: "ios",
      Icon: AppleIcon,
      pre: t("downloadOn"),
      name: "App Store",
      href: "https://apps.apple.com/app/metatrader-5/id413251709",
    },
    {
      key: "android",
      Icon: PlayIcon,
      pre: t("getItOn"),
      name: "Google Play",
      href: "https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5",
    },
    {
      key: "windows",
      Icon: WindowsIcon,
      pre: t("downloadFor"),
      name: "Windows",
      href: "https://www.metatrader5.com/en/download",
    },
    {
      key: "mac",
      Icon: AppleIcon,
      pre: t("downloadFor"),
      name: "Mac",
      href: "https://www.metatrader5.com/en/download/mac",
    },
    {
      key: "web",
      Icon: WebIcon,
      pre: t("web"),
      name: t("terminal"),
      href: "https://www.metatrader5.com/en/terminal/web",
    },
  ];

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from(gsap.utils.toArray<HTMLElement>(`.${styles.card}`, root), {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.09,
        scrollTrigger: { trigger: root, start: "top 78%" },
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className={styles.mt5}>
      <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

      <div className={styles.inner}>
        <img
          className={styles.deviceImg}
          src={image}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
        <header className={styles.header}>
          <h2 className={styles.title}>
            {t("title")} <span className={styles.titleAccent}>{t("titleAccent")}</span>
          </h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </header>

        <div className={styles.cards}>
          {platforms.map(({ key, Icon, pre, name, href }) => (
            <a
              key={key}
              className={styles.card}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.cardIcon}>
                <Icon />
              </span>
              <span className={styles.cardText}>
                <span className={styles.cardPre}>{pre}</span>
                <span className={styles.cardName}>{name}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
