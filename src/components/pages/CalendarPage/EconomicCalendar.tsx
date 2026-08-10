"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { ExternalMediaPlaceholder } from "@/components/ui/CookieConsent/ExternalMediaPlaceholder";
import { useConsentChoice } from "@/lib/consent";

// Map our locales to TradingView's (falls back to en).
const TV_LOCALE: Record<string, string> = {
  en: "en",
  de: "de",
  ru: "ru",
  ar: "ar_AE",
  fa: "fa_IR",
  "zh-hans": "zh_CN",
};

/**
 * EconomicCalendar — the TradingView "Events" (economic calendar) widget, themed
 * dark/transparent to blend with the site (same free embed family as the home
 * TickerTape). Injects the widget script client-side and tears it down on unmount
 * / locale change.
 */
export function EconomicCalendar() {
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const { ready, choice } = useConsentChoice();
  const allowed = ready && choice?.externalMedia === true;

  useEffect(() => {
    if (!allowed) return;
    const el = ref.current;
    if (!el) return;

    el.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "light",
      isTransparent: true,
      width: "100%",
      height: "520",
      locale: TV_LOCALE[locale] ?? "en",
      importanceFilter: "0,1",
    });
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, [allowed, locale]);

  if (!ready) return <div className="tradingview-widget-container" aria-hidden="true" />;
  if (!allowed) return <ExternalMediaPlaceholder />;
  return <div className="tradingview-widget-container" ref={ref} />;
}
