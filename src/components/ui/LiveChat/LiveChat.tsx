"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { CHATWOOT_BASE_URL, CHATWOOT_WEBSITE_TOKEN, chatwootLocale } from "@/config/chat";
import type { Locale } from "@/i18n/routing";

type ChatwootSettings = {
  hideMessageBubble: boolean;
  position: "left" | "right";
  locale: string;
  useBrowserLanguage: boolean;
  darkMode: "light" | "auto";
  type: "standard" | "expanded_bubble";
};

declare global {
  interface Window {
    chatwootSettings?: ChatwootSettings;
    chatwootSDK?: { run: (options: { websiteToken: string; baseUrl: string }) => void };
  }
}

const SCRIPT_ID = "chatwoot-sdk";

/** Loads one Chatwoot Website Inbox widget for the entire localized app. */
export function LiveChat() {
  const locale = useLocale() as Locale;

  useEffect(() => {
    if (!CHATWOOT_WEBSITE_TOKEN) return;

    window.chatwootSettings = {
      hideMessageBubble: false,
      position: "right",
      locale: chatwootLocale(locale),
      useBrowserLanguage: false,
      darkMode: "auto",
      type: "standard",
    };

    const run = () => {
      window.chatwootSDK?.run({
        websiteToken: CHATWOOT_WEBSITE_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.chatwootSDK) run();
      else existing.addEventListener("load", run, { once: true });
      return () => existing.removeEventListener("load", run);
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", run, { once: true });
    document.head.appendChild(script);
    return () => script.removeEventListener("load", run);
  }, [locale]);

  return null;
}
