"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import {
  CHATWOOT_BASE_URL,
  CHATWOOT_WEBSITE_TOKEN,
  CRISP_WEBSITE_ID,
  LIVE_CHAT_PROVIDER,
  chatwootLocale,
  crispLocale,
} from "@/config/chat";
import type { Locale } from "@/i18n/routing";

type ChatwootSettings = {
  hideMessageBubble: boolean;
  position: "left" | "right";
  locale: string;
  useBrowserLanguage: boolean;
  darkMode: "light" | "auto";
  type: "standard" | "expanded_bubble";
};

type CrispCommand = [string, string, ...unknown[]];

declare global {
  interface Window {
    chatwootSettings?: ChatwootSettings;
    chatwootSDK?: { run: (options: { websiteToken: string; baseUrl: string }) => void };
    $crisp?: CrispCommand[];
    CRISP_WEBSITE_ID?: string;
    CRISP_RUNTIME_CONFIG?: { locale: string };
  }
}

const CHATWOOT_SCRIPT_ID = "chatwoot-sdk";
const CRISP_SCRIPT_ID = "crisp-sdk";

function loadChatwoot(locale: Locale) {
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

  const existing = document.getElementById(CHATWOOT_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    if (window.chatwootSDK) run();
    else existing.addEventListener("load", run, { once: true });
    return () => existing.removeEventListener("load", run);
  }

  const script = document.createElement("script");
  script.id = CHATWOOT_SCRIPT_ID;
  script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`;
  script.async = true;
  script.defer = true;
  script.addEventListener("load", run, { once: true });
  document.head.appendChild(script);
  return () => script.removeEventListener("load", run);
}

function loadCrisp(locale: Locale) {
  if (!CRISP_WEBSITE_ID) return;

  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
  window.CRISP_RUNTIME_CONFIG = { locale: crispLocale(locale) };

  if (document.getElementById(CRISP_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = CRISP_SCRIPT_ID;
  script.src = "https://client.crisp.chat/l.js";
  script.async = true;
  document.head.appendChild(script);
}

/** Loads the selected live-chat provider once for the entire localized app. */
export function LiveChat() {
  const locale = useLocale() as Locale;

  useEffect(() => {
    if (LIVE_CHAT_PROVIDER === "crisp") return loadCrisp(locale);
    return loadChatwoot(locale);
  }, [locale]);

  return null;
}
