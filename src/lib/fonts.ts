import { Montserrat, Open_Sans, Vazirmatn } from "next/font/google";

/**
 * Montserrat is RocoBroker's brand font. It covers Latin + Cyrillic, so it
 * handles English, German and Russian directly.
 *
 * Note: Montserrat does NOT include Arabic, Persian or CJK glyphs. Those
 * scripts fall back to the stack defined in globals.css (`--font-brand`). When
 * we style the Arabic/Farsi/Chinese pages we should layer proper script fonts
 * (e.g. next/font Google "Noto Sans Arabic", "Vazirmatn", "Noto Sans SC").
 */
export const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
});

/** Secondary typeface — used for supporting/subtext copy. */
export const openSans = Open_Sans({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-open-sans",
  display: "swap",
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
});
