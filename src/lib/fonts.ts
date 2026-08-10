import { Montserrat, Noto_Sans_SC, Open_Sans, Vazirmatn } from "next/font/google";

/**
 * Montserrat is RocoBroker's brand font. It covers Latin + Cyrillic, so it
 * handles English, German and Russian directly.
 *
 * Note: Montserrat does NOT include Arabic, Persian or CJK glyphs. The locale
 * overrides in globals.css therefore apply Vazirmatn to Arabic/Persian and
 * Noto Sans SC to Simplified Chinese.
 */
export const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
  // Locale-specific unicode ranges let the browser fetch only the script used
  // on the current page instead of preloading every declared subset.
  preload: false,
});

/** Secondary typeface — used for supporting/subtext copy. */
export const openSans = Open_Sans({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-open-sans",
  display: "swap",
  preload: false,
});

/**
 * Vazirmatn — a proper Perso-Arabic webfont (correct Persian letterforms ک/ی/گ,
 * Persian digits, tuned metrics). Self-hosted via next/font and applied to the
 * RTL locales (fa, ar) through the `[dir="rtl"]` font-token override in
 * globals.css, so Persian/Arabic no longer depend on a font being installed on
 * the visitor's device.
 */
export const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: false,
});

/** Controlled Simplified-Chinese typeface, demand-loaded by unicode range. */
export const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-noto-sans-sc",
  display: "swap",
  preload: false,
});
