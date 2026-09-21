"use client";

import { useTranslations } from "next-intl";
import { openConsentSettings } from "@/lib/consent";
import styles from "./ExternalMediaPlaceholder.module.css";

export function ExternalMediaPlaceholder({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("cookies");

  return (
    <div className={`${styles.placeholder} ${compact ? styles.compact : ""}`}>
      <div className={styles.copy}>
        <strong className={styles.title}>{t("externalBlockedTitle")}</strong>
        {!compact && <p className={styles.body}>{t("externalBlockedBody")}</p>}
      </div>
      <button type="button" className={styles.button} onClick={openConsentSettings}>
        {t("openSettings")}
      </button>
    </div>
  );
}
