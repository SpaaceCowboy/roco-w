"use client";

import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { EconomicCalendar } from "./EconomicCalendar";
import styles from "./CalendarPage.module.css";

const REGISTER = "https://my.rocobroker.com/register";

/**
 * CalendarView — the Economic Calendar subpage. Markets-style dot-grid hero
 * (title + hairline + gradient lead / subtext + CTA), the live TradingView
 * economic-calendar widget in a framed panel, and an "advantages" grid of glass
 * cards. Content from docs/calendar-source.md.
 */
export function CalendarView() {
  const t = useTranslations("calendarPage");

  return (
    <section className={styles.page}>
      {/* Hero band */}
      <div className={styles.hero}>
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
                <Reveal as="h2" variant="slide" className={styles.lead}>
                  {t("lead")} <span className={styles.leadAccent}>{t("leadAccent")}</span>
                </Reveal>
                <Button label={t("cta")} href={REGISTER} external />
              </div>
            </div>
            <Reveal as="p" variant="flicker" className={styles.sub}>
              {t("sub")}
            </Reveal>
          </div>
        </div>
      </div>

      {/* Live calendar widget */}
      <div className={styles.body}>
        <div className={styles.inner}>
          <div className={styles.widgetHead}>
            <span className={styles.microBlock} />
            <span className={styles.micro}>{t("widgetLabel")}</span>
          </div>
          <div className={styles.widgetFrame}>
            <EconomicCalendar />
          </div>
        </div>
      </div>

    </section>
  );
}
