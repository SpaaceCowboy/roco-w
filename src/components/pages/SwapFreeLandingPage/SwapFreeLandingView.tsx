import { useLocale, useTranslations } from "next-intl";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { Accordion } from "@/components/ui/Accordion/Accordion";
import { LeadForm } from "./LeadForm";
import styles from "./SwapFreeLanding.module.css";

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Calendar day with a check: the day is covered, no swap. (Lucide calendar-check, ISC.) */
function DayCoveredIcon() {
  return (
    <svg className={styles.dayIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

export function SwapFreeLandingView() {
  const t = useTranslations("swapFreeLanding");
  const num = new Intl.NumberFormat(useLocale());

  const faq = [1, 2, 3, 4, 5].map((n) => ({ id: `q${n}`, q: t(`faq${n}q`), a: t(`faq${n}a`) }));

  return (
    <div className={styles.page}>
      <PageBackground />

      {/* Screen 1: the pitch, the 7-day rule and the form. */}
      <section className={styles.hero}>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />

        <div className={`${styles.inner} ${styles.heroGrid}`}>
          <div>
            <Reveal as="p" variant="blink" className={styles.kicker}>
              {t("eyebrow")}
            </Reveal>
            <Reveal as="h1" variant="slide" className={styles.heroTitle}>
              {t("title")} <span>{t("titleAccent")}</span>
            </Reveal>
            <Reveal as="p" variant="flicker" className={styles.heroLead}>
              {t("lead")}
            </Reveal>

            <div className={styles.timeline} role="group" aria-label={t("timelineAria")}>
              <h2 className={styles.timelineTitle}>{t("timelineTitle")}</h2>
              <div className={styles.days}>
                {DAYS.map((d) => (
                  <div className={styles.day} key={d}>
                    <DayCoveredIcon />
                    <span>{num.format(d)}</span>
                  </div>
                ))}
                <div className={`${styles.day} ${styles.dayEnd}`}>
                  {t("timelineEnd")}
                </div>
              </div>
              <p className={styles.timelineNote}>
                <strong>{t("timelineNoteLead")}</strong> {t("timelineNoteBody")}
              </p>
            </div>
          </div>

          <LeadForm />
        </div>
      </section>

      {/* Screen 2: everything else, side by side. */}
      <section className={styles.details}>
        <div className={styles.inner}>
          <div className={styles.detailsGrid}>
            <div>
              <h2 className={styles.sectionTitle}>{t("stepsTitle")}</h2>
              <ol className={styles.steps}>
                {[1, 2, 3, 4].map((n) => (
                  <li key={n}>
                    <span className={styles.stepNo} aria-hidden="true">{num.format(n)}</span>
                    <div>
                      <h3>{t(`step${n}Title`)}</h3>
                      <p>{t(`step${n}Body`)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className={styles.sectionTitle}>{t("eligTitle")}</h2>
              <div className={styles.accounts}>
                <article className={`${styles.accountCard} ${styles.accountEligible}`}>
                  <p className={styles.cardLabel}>{t("eligibleLabel")}</p>
                  <h3>{t("eligibleTitle")}</h3>
                  <p>{t("eligibleNote")}</p>
                </article>
                <article className={styles.accountCard}>
                  <p className={styles.cardLabel}>{t("excludedLabel")}</p>
                  <h3>{t("excludedTitle")}</h3>
                  <p>{t("excludedBody")}</p>
                </article>
              </div>
              <p className={styles.conditions}>{t("excludedNote")}</p>
            </div>
          </div>

          <div className={styles.faqGrid}>
            <h2 className={styles.sectionTitle}>{t("faqTitle")}</h2>
            <Accordion items={faq} />
          </div>

          <p className={styles.conditions}>{t("conditionsNote")}</p>
        </div>
      </section>
    </div>
  );
}
