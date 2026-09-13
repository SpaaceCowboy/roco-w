"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import {
  CHATWOOT_BASE_URL,
  CHATWOOT_WEBSITE_TOKEN,
  CRISP_WEBSITE_ID,
  LIVE_CHAT_PROVIDER,
  TAWK_PROPERTY_ID,
  chatwootLocale,
  crispLocale,
  tawkWidgetIdForLocale,
} from "@/config/chat";
import { isRtl, type Locale } from "@/i18n/routing";

type ChatwootSettings = {
  hideMessageBubble: boolean;
  position: "left" | "right";
  locale: string;
  useBrowserLanguage: boolean;
  darkMode: "light" | "auto";
  type: "standard" | "expanded_bubble";
};

type CrispCommand = [string, string, ...unknown[]];

type TawkApi = {
  customStyle?: unknown;
  switchWidget?: (ids: { propertyId: string; widgetId: string }, cb?: () => void) => void;
};

declare global {
  interface Window {
    chatwootSettings?: ChatwootSettings;
    chatwootSDK?: {
      run: (options: { websiteToken: string; baseUrl: string; customCSS?: string }) => void;
    };
    $crisp?: CrispCommand[];
    CRISP_WEBSITE_ID?: string;
    CRISP_RUNTIME_CONFIG?: { locale: string };
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

const CHATWOOT_SCRIPT_ID = "chatwoot-sdk";
const CRISP_SCRIPT_ID = "crisp-sdk";
const TAWK_SCRIPT_ID = "tawk-embed";
const TAWK_LOAD_TIMEOUT_MS = 15_000;
const CHATWOOT_HOST_STYLE_ID = "chatwoot-host-styles";

const CHATWOOT_HOST_CSS = `
  #cw-widget-holder.woot-widget-holder {
    width: 440px !important;
    height: min(720px, calc(100vh - 96px)) !important;
    max-width: calc(100vw - 32px) !important;
    max-height: calc(100vh - 32px) !important;
  }

  @media (max-width: 640px) {
    #cw-widget-holder.woot-widget-holder {
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
  html {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
  }

  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  html::-webkit-scrollbar-track,
  body::-webkit-scrollbar-track {
    background: transparent;
  }

  html::-webkit-scrollbar-thumb,
  body::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.55);
    border-radius: 999px;
  }

  html::-webkit-scrollbar-thumb:hover,
  body::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.8);
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

function loadTawk(locale: Locale) {
  if (!TAWK_PROPERTY_ID) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[LiveChat] NEXT_PUBLIC_TAWK_PROPERTY_ID is unset — live chat is disabled.",
      );
    }
    return;
  }

  const widgetId = tawkWidgetIdForLocale(locale);
  const api: TawkApi = (window.Tawk_API = window.Tawk_API ?? {});
  const existing = document.getElementById(TAWK_SCRIPT_ID) as HTMLScriptElement | null;

  if (existing) {
    if (existing.dataset.widgetId !== widgetId && typeof api.switchWidget === "function") {
      api.switchWidget({ propertyId: TAWK_PROPERTY_ID, widgetId });
      existing.dataset.widgetId = widgetId;
    }
    return;
  }

  const rtl = isRtl(locale);
  const visibility = { position: rtl ? "bl" : "br", xOffset: 24, yOffset: 24 };
  api.customStyle = {
    visibility: {
      desktop: visibility,
      mobile: { ...visibility, xOffset: 12, yOffset: 12 },
    },
  };
  window.Tawk_LoadStart = new Date();

  const timer = window.setTimeout(() => {
    console.warn(`[LiveChat] tawk.to embed still not loaded after ${TAWK_LOAD_TIMEOUT_MS}ms`);
  }, TAWK_LOAD_TIMEOUT_MS);

  const script = document.createElement("script");
  script.id = TAWK_SCRIPT_ID;
  script.async = true;
  script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${widgetId}`;
  script.charset = "UTF-8";
  script.dataset.widgetId = widgetId;
  script.addEventListener("load", () => window.clearTimeout(timer), { once: true });
  script.addEventListener(
    "error",
    () => {
      window.clearTimeout(timer);
      console.warn("[LiveChat] tawk.to embed failed to load");
    },
    { once: true },
  );
  document.body.appendChild(script);

  return () => window.clearTimeout(timer);
}

/** Loads the selected live-chat provider once for the entire localized app. */
export function LiveChat() {
  const locale = useLocale() as Locale;

  useEffect(() => {
    if (LIVE_CHAT_PROVIDER === "tawk") return loadTawk(locale);
    if (LIVE_CHAT_PROVIDER === "crisp") return loadCrisp(locale);
    return loadChatwoot(locale);
  }, [locale]);

  return null;
}
