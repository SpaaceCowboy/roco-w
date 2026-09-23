export type CustomerLanguage = "fa" | "ar" | "zh" | "ru" | "de" | "en";

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

export function detectCustomerLanguage(message: string): CustomerLanguage {
  // Persian-specific letters (including Farsi yeh) beat generic Arabic script.
  // Without this, pure Arabic always ties/wins against fa's full-block count
  // and is misread as Persian (fa accepts any Arabic-block reply).
  if (countMatches(message, /[پچژگکی]/g) > 0) return "fa";
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
