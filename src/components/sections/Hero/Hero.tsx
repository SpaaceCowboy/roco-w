import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CTA_JOIN } from "@/config/nav";
import styles from "./Hero.module.css";

/**
 * Hero — headline + subtext block. Reveals on load (title slides line-by-line,
 * subtext characters flicker in) then simply scrolls away like normal content.
 * The globe, dot-matrix, and corner marks are persistent background layers owned
 * by HomeScene.
 */
export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.center}>
          <div className={styles.headline}>
            <Reveal as="h1" variant="slide" delay={0.4} className={styles.title}>
              {t("title")}
            </Reveal>
            <span className={styles.ctaWrap}>
              <Button label={t("tradeNow")} href={CTA_JOIN.href} external variant="primary" />
            </span>
          </div>
        </div>

        <Reveal as="p" variant="flicker" delay={0.9} className={styles.subtext}>
          {t.rich("subtext", {
            w: (chunks) => <span className={styles.subStrong}>{chunks}</span>,
            g: (chunks) => <span className={styles.subMuted}>{chunks}</span>,
          })}
        </Reveal>
      </div>
    </section>
  );
}
