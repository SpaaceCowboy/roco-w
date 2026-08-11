"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { isRtl, type Locale } from "@/i18n/routing";
import { TAWK_PROPERTY_ID, widgetIdForLocale } from "@/config/chat";

/*
 * tawk.to live chat, mounted once in the locale layout so the widget survives
 * client-side navigation.
 *
 * CONSENT: this loads on every page for every visitor, before any cookie-consent
 * choice is made — tawk.to sets its own visitor cookies (__tawkuuid and friends)
 * at that point. That is a deliberate product decision, but it is the one place
 * on the site where a third party runs ungated, so it needs a line in the cookie
 * policy and a look at the next privacy review. Gating it later means moving the
 * injection behind a category in `@/lib/consent`.
 *
 * The embed is injected by hand rather than via next/script because the
 * `Tawk_API` globals must exist before the remote script executes, and
 * next/script gives no ordering guarantee between an inline config block and a
 * src script in the same strategy bucket.
 */

type TawkApi = {
  customStyle?: unknown;
  switchWidget?: (ids: { propertyId: string; widgetId: string }, cb?: () => void) => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

const SCRIPT_ID = "tawk-embed";
const LOAD_TIMEOUT_MS = 15_000;

export function LiveChat() {
  const locale = useLocale() as Locale;
  const rtl = isRtl(locale);
  const widgetId = widgetIdForLocale(locale);

  useEffect(() => {
    if (!TAWK_PROPERTY_ID) {
      // Loud in dev, silent in prod: a missing chat widget must never break a page.
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[LiveChat] NEXT_PUBLIC_TAWK_PROPERTY_ID is unset — live chat is disabled.",
        );
      }
      return;
    }

    const api: TawkApi = (window.Tawk_API = window.Tawk_API ?? {});
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    // Already injected: only act if this locale maps to a different widget.
    if (existing) {
      if (existing.dataset.widgetId !== widgetId && typeof api.switchWidget === "function") {
        api.switchWidget({ propertyId: TAWK_PROPERTY_ID, widgetId });
        existing.dataset.widgetId = widgetId;
      }
      return;
    }

    // Must be assigned before the embed runs — tawk.to reads it once at startup.
    // Mirrors to the leading corner in Arabic/Persian.
    const visibility = { position: rtl ? "bl" : "br", xOffset: 24, yOffset: 24 };
    api.customStyle = {
      visibility: {
        desktop: visibility,
        mobile: { ...visibility, xOffset: 12, yOffset: 12 },
      },
    };
    window.Tawk_LoadStart = new Date();

    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      console.warn(`[LiveChat] tawk.to embed still not loaded after ${LOAD_TIMEOUT_MS}ms`);
    }, LOAD_TIMEOUT_MS);

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${widgetId}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    script.dataset.widgetId = widgetId;
    script.addEventListener("load", () => {
      window.clearTimeout(timer);
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[LiveChat] tawk.to embed loaded in ${Date.now() - startedAt}ms`);
      }
    });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      console.warn("[LiveChat] tawk.to embed failed to load");
    });

    document.body.appendChild(script);
    return () => window.clearTimeout(timer);
  }, [rtl, widgetId]);

  return null;
}
