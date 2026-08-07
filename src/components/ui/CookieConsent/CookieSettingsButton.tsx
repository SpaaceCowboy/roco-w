"use client";

import { useTranslations } from "next-intl";

/** Reopens the cookie consent banner (footer link). */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("footer");
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent("cookie-consent:open"))}
    >
      {t("cookieSettings")}
    </button>
  );
}
