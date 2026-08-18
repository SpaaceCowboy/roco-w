"use client";

import { useEffect } from "react";

/*
 * Temporary LiveChat.com test. The component stays mounted in the locale layout
 * so the widget survives client-side navigation.
 *
 * CONSENT: like the previous tawk.to integration, this loads before a visitor
 * makes a cookie-consent choice. Revisit that decision before making this
 * provider permanent.
 */

type LiveChatWidgetApi = {
  _q: unknown[][];
  _h: ((...args: unknown[]) => unknown) | null;
  _v: string;
  on: (...args: unknown[]) => unknown;
  once: (...args: unknown[]) => unknown;
  off: (...args: unknown[]) => unknown;
  get: (...args: unknown[]) => unknown;
  call: (...args: unknown[]) => unknown;
  init: () => void;
};

declare global {
  interface Window {
    __lc?: {
      license?: number;
      integration_name?: string;
      product_name?: string;
      asyncInit?: boolean;
    };
    LiveChatWidget?: LiveChatWidgetApi;
  }
}

const LICENSE_ID = 19903719;
const SCRIPT_ID = "livechat-tracking";

export function LiveChat() {
  useEffect(() => {
    window.__lc = window.__lc ?? {};
    window.__lc.license = LICENSE_ID;
    window.__lc.integration_name = "manual_onboarding";
    window.__lc.product_name = "livechat";

    if (window.LiveChatWidget || document.getElementById(SCRIPT_ID)) {
      return;
    }

    const queue: unknown[][] = [];
    const enqueue = (command: unknown[]) => {
      if (widget._h) {
        return widget._h(...command);
      }
      return queue.push(command);
    };

    const widget: LiveChatWidgetApi = {
      _q: queue,
      _h: null,
      _v: "2.0",
      on: (...args) => enqueue(["on", args]),
      once: (...args) => enqueue(["once", args]),
      off: (...args) => enqueue(["off", args]),
      get: (...args) => {
        if (!widget._h) {
          throw new Error("[LiveChatWidget] You can't use getters before load.");
        }
        return enqueue(["get", args]);
      },
      call: (...args) => enqueue(["call", args]),
      init: () => {
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.async = true;
        script.type = "text/javascript";
        script.src = "https://cdn.livechatinc.com/tracking.js";
        document.head.appendChild(script);
      },
    };

    window.LiveChatWidget = widget;

    if (!window.__lc.asyncInit) {
      widget.init();
    }
  }, []);

  return (
    <noscript>
      <a href={`https://www.livechat.com/chat-with/${LICENSE_ID}/`} rel="nofollow">
        Chat with us
      </a>
      {", powered by "}
      <a
        href="https://www.livechat.com/?welcome"
        rel="noopener nofollow"
        target="_blank"
      >
        LiveChat
      </a>
    </noscript>
  );
}
