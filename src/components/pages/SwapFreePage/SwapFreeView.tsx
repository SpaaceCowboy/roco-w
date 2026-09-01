import { useTranslations } from "next-intl";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import styles from "./SwapFreePage.module.css";

const DASHBOARD = "https://my.rocobroker.com/login";

export function SwapFreeView() {
  const t = useTranslations("swapFreePage");
  const requirements = [t("requirement1"), t("requirement5"), t("requirement6"), t("limitBody")];

  return (
    <div className={styles.page}>
      <PageBackground />

      <section className={styles.hero}>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.inner}>
          <Reveal as="p" variant="blink" className={styles.kicker}>
            {t("eyebrow")}
          </Reveal>
          <Reveal as="h1" variant="slide" className={styles.heroTitle}>
            {t("title")} <span>{t("titleAccent")}</span>
          </Reveal>

          <div className={styles.heroBottom}>
            <Reveal as="p" variant="flicker" className={styles.heroLead}>
              {t("lead")}
            </Reveal>
            <Reveal as="div" variant="blink" delay={0.25} className={styles.heroAction}>
              <Button label={t("cta")} href={DASHBOARD} external />
            </Reveal>
          </div>

          <div className={styles.stats}>
            {[1, 2, 3].map((number) => (
              <Reveal key={number} as="div" variant="flicker" delay={number * 0.1} className={styles.stat}>
                <strong>{t(`stat${number}Value`)}</strong>
                <span>{t(`stat${number}Label`)}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.inner} ${styles.introGrid}`}>
          <div>
            <p className={styles.kicker}>{t("whatKicker")}</p>
            <Reveal as="h2" variant="slide" className={styles.sectionTitle}>
              {t("whatTitle")}
            </Reveal>
          </div>
          <div className={styles.proseColumn}>
            <Reveal as="p" variant="flicker" className={styles.bodyCopy}>
              {t("whatBody")}
            </Reveal>
            <div className={styles.featureList}>
              {[t("feature1"), t("feature2")].map((feature, index) => (
                <div className={styles.feature} key={feature}>
                  <span>0{index + 1}</span>
                  <p>{feature}</p>
                </div>
              ))}
            </div>
            <p className={styles.bodyCopy}>{t("ruleIntro")} {t("warningBody")}</p>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.eligibilitySection}`}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>{t("eligibilityKicker")}</p>
              <Reveal as="h2" variant="slide" className={styles.sectionTitle}>
                {t("eligibilityTitle")}
              </Reveal>
            </div>
            <p className={styles.sectionIntro}>{t("eligibilityIntro")}</p>
          </div>

          <div className={styles.requirements}>
            {requirements.map((requirement, index) => (
              <Reveal as="div" variant="flicker" delay={(index % 3) * 0.08} className={styles.requirement} key={requirement}>
                <span className={styles.check} aria-hidden="true">✓</span>
                <p>{requirement}</p>
              </Reveal>
            ))}
          </div>

          <div className={styles.accountGrid}>
            <article className={`${styles.accountCard} ${styles.accountEligible}`}>
              <p className={styles.cardLabel}>{t("eligibleLabel")}</p>
              <h3>{t("eligibleTitle")}</h3>
              <p>{t("eligibleBody")}</p>
            </article>
            <article className={styles.accountCard}>
              <p className={styles.cardLabel}>{t("excludedLabel")}</p>
              <h3>{t("excludedTitle")}</h3>
              <p>{t("excludedBody")}</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.inner}>
          <div className={styles.ctaPanel}>
            <div>
              <p className={styles.kicker}>{t("ctaKicker")}</p>
              <h2>{t("ctaTitle")}</h2>
              <p>{t("ctaBody")}</p>
            </div>
            <div className={styles.ctaActions}>
              <Button label={t("ctaButton")} href={DASHBOARD} external variant="dark" />
            </div>
          </div>
          <p className={styles.conditions}>{t("conditionsNote")}</p>
        </div>
      </section>
    </div>
  );
}
