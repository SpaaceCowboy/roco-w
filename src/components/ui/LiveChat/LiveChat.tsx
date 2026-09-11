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
    chatwootSDK?: {
      run: (options: { websiteToken: string; baseUrl: string; customCSS?: string }) => void;
    };
    $crisp?: CrispCommand[];
    CRISP_WEBSITE_ID?: string;
    CRISP_RUNTIME_CONFIG?: { locale: string };
  }
}

const CHATWOOT_SCRIPT_ID = "chatwoot-sdk";
const CRISP_SCRIPT_ID = "crisp-sdk";
const CHATWOOT_HOST_STYLE_ID = "chatwoot-host-styles";

const CHATWOOT_HOST_CSS = `
  .woot-widget-holder {
    width: 440px !important;
    height: min(720px, calc(100vh - 96px)) !important;
    max-width: calc(100vw - 32px) !important;
    max-height: calc(100vh - 32px) !important;
  }

  @media (max-width: 640px) {
    .woot-widget-holder {
      width: calc(100vw - 16px) !important;
      height: calc(100dvh - 80px) !important;
      max-width: none !important;
      max-height: none !important;
      right: 8px !important;
      bottom: 8px !important;
    }
  }
`;

const PERSIAN_CHATWOOT_CSS = `
  *,
  *::before,
  *::after {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.55);
    border-radius: 999px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.8);
  }

  html,
  body {
    direction: rtl !important;
  }

  p,
  textarea,
  input,
  [contenteditable="true"] {
    direction: rtl !important;
    text-align: right !important;
  }
`;

function installChatwootHostStyles() {
  let style = document.getElementById(CHATWOOT_HOST_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = CHATWOOT_HOST_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = CHATWOOT_HOST_CSS;
}

function loadChatwoot(locale: Locale) {
  if (!CHATWOOT_WEBSITE_TOKEN) return;

  installChatwootHostStyles();

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
      ...(locale === "fa" ? { customCSS: PERSIAN_CHATWOOT_CSS } : {}),
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
