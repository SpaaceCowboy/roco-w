"use client";

import { useTranslations } from "next-intl";
import { openConsentSettings } from "@/lib/consent";

/** Reopens the cookie consent banner (footer link). */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("footer");
  return (
    <button
      type="button"
      className={className}
      onClick={openConsentSettings}
    >
      {t("cookieSettings")}
    </button>
  );
}
