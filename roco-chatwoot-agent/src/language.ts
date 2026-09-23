export type CustomerLanguage = "fa" | "ar" | "zh" | "ru" | "de" | "en";

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function normalizeShared(value: string): string {
  return value.trim().replace(/[.!?،؟]+$/u, "").replace(/\s+/gu, " ");
}

// Short messages in the shared Arabic script that ROCO Persian customers use
// as greetings. Longer Arabic text never hits this list.
const SHARED_FA_GREETINGS = new Set([
  "سلام",
  "هی",
  "های",
  "درود",
  "خوبی",
  "ببخشید",
  "مزاحم شدم",
  "مزاحم میشم",
  "سلام خوبی",
  "سلام علیکم",
]);

function isSharedFaGreeting(message: string): boolean {
  const normalized = normalizeShared(message);
  if (!normalized || normalized.length > 40) return false;
  if (SHARED_FA_GREETINGS.has(normalized)) return true;
  // e.g. "سلام وقت بخیر" — short openers that start with سلام
  return normalized.split(" ").length <= 6 && normalized.startsWith("سلام");
}

export function detectCustomerLanguage(message: string): CustomerLanguage {
  // Persian-specific letters (including Farsi yeh) beat generic Arabic script.
  // Without this, pure Arabic always ties/wins against fa's full-block count
  // and is misread as Persian (fa accepts any Arabic-block reply).
  if (countMatches(message, /[پچژگکی]/g) > 0) return "fa";
  // Shared-script Persian greetings (سلام with no fa-only letters) before ar.
  if (isSharedFaGreeting(message)) return "fa";
  if (countMatches(message, /[؀-ۿ]/g) > 0) return "ar";

  const scores: Array<[CustomerLanguage, number]> = [
    ["zh", countMatches(message, /[一-鿿]/g)],
    ["ru", countMatches(message, /[А-Яа-яЁё]/g)],
    ["de", countMatches(message, /[äöüß]/gi)],
    ["en", countMatches(message, /[A-Za-z]/g)],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const top = scores[0];
  return top && top[1] > 0 ? top[0] : "en";
}

export function responseMatchesCustomerLanguage(message: string, response: string): boolean {
  const language = detectCustomerLanguage(message);
  if (language === "fa") return /[پچژگکی]/.test(response) || /[؀-ۿ]/.test(response);
  // Arabic customers get English replies only — never Arabic-script bot output.
  if (language === "ar") return /[A-Za-z]/.test(response) && !/[؀-ۿ]/.test(response);
  if (language === "zh") return /[一-鿿]/.test(response);
  if (language === "ru") return /[А-Яа-яЁё]/.test(response);
  if (language === "de") return /[A-Za-zÄÖÜäöüß]/.test(response);
  return /[A-Za-z]/.test(response);
}

export function replyLanguageHint(language: CustomerLanguage): string {
  switch (language) {
    case "fa":
      return "Persian (Farsi), using Persian script";
    case "ar":
      return "English only — never Arabic script";
    case "zh":
      return "Simplified Chinese";
    case "ru":
      return "Russian";
    case "de":
      return "German";
    default:
      return "English";
  }
}
