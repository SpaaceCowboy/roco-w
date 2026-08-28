import { useTranslations } from "next-intl";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { SwapFreeActivationSteps } from "./SwapFreeActivationSteps";
import styles from "./SwapFreePage.module.css";

const DASHBOARD = "https://my.rocobroker.com/login";

export function SwapFreeView() {
  const t = useTranslations("swapFreePage");
  const requirements = Array.from({ length: 6 }, (_, index) => t(`requirement${index + 1}`));
  const markets = Array.from({ length: 7 }, (_, index) => t(`market${index + 1}`));
  const activationSteps = Array.from({ length: 4 }, (_, index) => ({
    tag: t(`activationStep${index + 1}Tag`),
    title: t(`activationStep${index + 1}Title`),
    body: t(`activationStep${index + 1}Body`),
  }));

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

      <SwapFreeActivationSteps
        kicker={t("activationKicker")}
        title={t("activationTitle")}
        intro={t("activationIntro")}
        steps={activationSteps}
      />

      <section className={styles.section}>
        <div className={`${styles.inner} ${styles.marketsGrid}`}>
          <div>
            <p className={styles.kicker}>{t("marketsKicker")}</p>
            <Reveal as="h2" variant="slide" className={styles.sectionTitle}>
              {t("marketsTitle")}
            </Reveal>
            <p className={styles.bodyCopy}>{t("marketsBody")}</p>
          </div>
          <div className={styles.marketList}>
            {markets.map((market, index) => (
              <Reveal as="div" variant="flicker" delay={(index % 4) * 0.06} className={styles.market} key={market}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {market}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.ruleSection}`}>
        <div className={styles.inner}>
          <div className={styles.ruleHead}>
            <div className={styles.seven} aria-hidden="true">7</div>
            <div>
              <p className={styles.kicker}>{t("ruleKicker")}</p>
              <Reveal as="h2" variant="slide" className={styles.sectionTitle}>
                {t("ruleTitle")}
              </Reveal>
              <p className={styles.sectionIntro}>{t("ruleIntro")}</p>
            </div>
          </div>

          <div className={styles.timeline}>
            {[1, 2, 3].map((step) => (
              <article className={styles.timelineStep} key={step}>
                <p className={styles.stepTag}>{t(`step${step}Tag`)}</p>
                <h3>{t(`step${step}Title`)}</h3>
                <p>{t(`step${step}Body`)}</p>
              </article>
            ))}
          </div>

          <div className={styles.warning}>
            <span aria-hidden="true">!</span>
            <div>
              <h3>{t("warningTitle")}</h3>
              <p>{t("warningBody")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.inner}>
          <div className={styles.limitCard}>
            <p className={styles.kicker}>{t("limitKicker")}</p>
            <h2>{t("limitTitle")}</h2>
            <p>{t("limitBody")}</p>
          </div>
          <div className={styles.ctaPanel}>
            <div>
              <p className={styles.kicker}>{t("ctaKicker")}</p>
              <h2>{t("ctaTitle")}</h2>
              <p>{t("ctaBody")}</p>
            </div>
            <Button label={t("ctaButton")} href={DASHBOARD} external variant="dark" />
          </div>
          <p className={styles.conditions}>{t("conditionsNote")}</p>
        </div>
      </section>
    </div>
  );
}
