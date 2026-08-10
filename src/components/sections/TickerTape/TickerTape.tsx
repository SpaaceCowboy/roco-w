"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { ExternalMediaPlaceholder } from "@/components/ui/CookieConsent/ExternalMediaPlaceholder";
import { useConsentChoice } from "@/lib/consent";

// Same widget the live rocobroker.com uses (TradingView "Ticker Tape"), themed
// to blend with our dark UI. Symbols mirror theirs + Gold (metals are a listed
// market). Free embed — real live quotes, no API key.
const SYMBOLS = [
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "US 100" },
  { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
  { proName: "FX_IDC:GBPUSD", title: "GBP/USD" },
  { proName: "FX_IDC:USDJPY", title: "USD/JPY" },
  { proName: "FX_IDC:AUDUSD", title: "AUD/USD" },
  { proName: "OANDA:XAUUSD", title: "Gold" },
  { proName: "OANDA:XAGUSD", title: "Silver" },
  { proName: "TVC:USOIL", title: "Crude Oil" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
  { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
  { proName: "COINBASE:SOLUSD", title: "Solana" },
];

// Map our locales to TradingView's (falls back to en for anything unsupported).
const TV_LOCALE: Record<string, string> = {
  en: "en",
  de: "de",
  ru: "ru",
  ar: "ar_AE",
  fa: "fa_IR",
  "zh-hans": "zh_CN",
};

/**
 * TickerTape — the scrolling live-price ribbon (TradingView embed). Injects the
 * widget script client-side into its container and tears it down on unmount /
 * locale change.
 */
export function TickerTape() {
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
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: SYMBOLS,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: TV_LOCALE[locale] ?? "en",
    });
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
    };
  }, [allowed, locale]);

  if (!ready) {
    return <div className="tradingview-widget-container" aria-hidden="true" />;
  }
  if (!allowed) return <ExternalMediaPlaceholder compact />;
  return <div className="tradingview-widget-container" ref={ref} aria-hidden="true" />;
}
