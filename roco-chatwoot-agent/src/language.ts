export type CustomerLanguage = "fa" | "ar" | "zh" | "ru" | "de" | "en";

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

export function detectCustomerLanguage(message: string): CustomerLanguage {
  const scores: Array<[CustomerLanguage, number]> = [
    ["fa", countMatches(message, /[پچژگکی]/g) * 3 + countMatches(message, /[؀-ۿ]/g)],
    ["ar", countMatches(message, /[ء-ي]/g)],
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
  if (language === "ar") return /[ء-ي]/.test(response);
  if (language === "zh") return /[一-鿿]/.test(response);
  if (language === "ru") return /[А-Яа-яЁё]/.test(response);
  if (language === "de") return /[A-Za-zÄÖÜäöüß]/.test(response);
  return /[A-Za-z]/.test(response);
}
