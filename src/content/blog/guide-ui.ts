import type { GuideCalloutVariant, GuideLocale } from "./guide-types";

/**
 * Locale-specific chrome for the guide series (navigation, labels, progress).
 * Article copy lives in `guides/<locale>/`; everything here is UI only.
 */
export type GuideUi = {
  backToBlog: string;
  backToIndex: string;
  backToIndexTitle: string;
  guideCounter: (position: string, total: string) => string;
  guidesCount: (count: string) => string;
  totalReading: (minutes: string) => string;
  lastReviewed: string;
  guideWord: string;
  /** "parts" / "قسمت" — series size label on the blog shelf. */
  parts: string;
  /** Forward indicator for list rows (points in the reading direction). */
  arrow: string;
  /** Back indicator for "back to …" links. */
  backArrow: string;
  minuteRead: string;
  minuteShort: string;
  inThisGuide: string;
  progressLabel: string;
  progressAria: (position: string, total: string) => string;
  sequenceAria: string;
  seriesIndexAria: (title: string) => string;
  tocAria: string;
  previous: string;
  next: string;
  reviewTitle: string;
  referencesHeading: string;
  calloutLabels: Record<GuideCalloutVariant, string>;
};

const ui: Record<GuideLocale, GuideUi> = {
  fa: {
    backToBlog: "بازگشت به وبلاگ",
    backToIndex: "فهرست مجموعه",
    backToIndexTitle: "بازگشت به فهرست راهنماها",
    guideCounter: (position, total) => `راهنمای ${position} از ${total}`,
    guidesCount: (count) => `${count} راهنما`,
    totalReading: (minutes) => `حدود ${minutes} دقیقه مطالعه`,
    lastReviewed: "آخرین بازبینی",
    guideWord: "راهنما",
    parts: "قسمت",
    arrow: "←",
    backArrow: "→",
    minuteRead: "دقیقه مطالعه",
    minuteShort: "دقیقه",
    inThisGuide: "در این راهنما",
    progressLabel: "پیشرفت مجموعه",
    progressAria: (position, total) => `پیشرفت مجموعه: ${position} از ${total}`,
    sequenceAria: "راهنماهای این مجموعه",
    seriesIndexAria: (title) => `فهرست ${title}`,
    tocAria: "فهرست مطالب این راهنما",
    previous: "راهنمای قبلی",
    next: "راهنمای بعدی",
    reviewTitle: "موارد نیازمند تأیید",
    referencesHeading: "منابع و مراجع",
    calloutLabels: { note: "نکته", warning: "هشدار", tip: "پیشنهاد", review: "نیازمند بازبینی" },
  },
  en: {
    backToBlog: "Back to blog",
    backToIndex: "Guide index",
    backToIndexTitle: "Back to the guide index",
    guideCounter: (position, total) => `Guide ${position} of ${total}`,
    guidesCount: (count) => `${count} guides`,
    totalReading: (minutes) => `About ${minutes} min read`,
    lastReviewed: "Last reviewed",
    guideWord: "Guide",
    parts: "parts",
    arrow: "→",
    backArrow: "←",
    minuteRead: "min read",
    minuteShort: "min",
    inThisGuide: "In this guide",
    progressLabel: "Series progress",
    progressAria: (position, total) => `Series progress: ${position} of ${total}`,
    sequenceAria: "Guides in this series",
    seriesIndexAria: (title) => `Index of ${title}`,
    tocAria: "Contents of this guide",
    previous: "Previous guide",
    next: "Next guide",
    reviewTitle: "Items to verify",
    referencesHeading: "References",
    calloutLabels: { note: "Note", warning: "Warning", tip: "Tip", review: "Needs review" },
  },
};

export function getGuideUi(locale: GuideLocale): GuideUi {
  return ui[locale];
}
