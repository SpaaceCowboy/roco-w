"use client";

import { useSyncExternalStore } from "react";

export const CONSENT_STORAGE_KEY = "roco.cookieConsent.v2";
export const CONSENT_EVENT = "cookie-consent";
export const CONSENT_OPEN_EVENT = "cookie-consent:open";
const TTL_DAYS = 365;
let memorySnapshot: string | null = null;

export type ConsentChoice = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  externalMedia: boolean;
  ts: string;
  expires: string;
};

type OptionalCategories = Pick<ConsentChoice, "analytics" | "marketing" | "externalMedia">;

function parseChoice(raw: string | null | undefined): ConsentChoice | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    if (
      parsed.essential !== true ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      typeof parsed.externalMedia !== "boolean" ||
      typeof parsed.expires !== "string" ||
      new Date(parsed.expires).getTime() < Date.now()
    ) {
      return null;
    }
    return parsed as ConsentChoice;
  } catch {
    return null;
  }
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? memorySnapshot;
  } catch {
    return memorySnapshot;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  const onConsent = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY) {
      memorySnapshot = event.newValue;
      onStoreChange();
    }
  };
  window.addEventListener(CONSENT_EVENT, onConsent);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onConsent);
    window.removeEventListener("storage", onStorage);
  };
}

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  return parseChoice(getSnapshot());
}

export function saveConsent(categories: OptionalCategories): ConsentChoice {
  const choice: ConsentChoice = {
    essential: true,
    ...categories,
    ts: new Date().toISOString(),
    expires: new Date(Date.now() + TTL_DAYS * 864e5).toISOString(),
  };

  const serialized = JSON.stringify(choice);
  memorySnapshot = serialized;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
    window.localStorage.removeItem("roco.cookieConsent.v1");
  } catch {
    // Private mode or a full quota: keep the choice for this page via the event.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
  return choice;
}

export function openConsentSettings(): void {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
}

export function useConsentChoice(): { ready: boolean; choice: ConsentChoice | null } {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => undefined);
  return { ready: raw !== undefined, choice: parseChoice(raw) };
}
