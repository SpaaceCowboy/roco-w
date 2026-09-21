/**
 * Native guide-series content model.
 *
 * The ROCO step-by-step guides used to be Canva embeds plus downloadable PDFs.
 * They are now first-class Persian articles: this schema carries the same
 * editorial information (ordered steps, callouts, warnings, screenshots) as
 * structured data so the renderer can emit semantic, responsive HTML without a
 * CMS or any per-article JSX.
 */

/** Locales that ship the step-by-step guide series. */
export type GuideLocale = "fa" | "en";

export type GuideScreenshot = {
  /** Public path, e.g. `/guides/registration/registration-form.webp`. */
  src: string;
  /** Descriptive Persian alt text — required for accessibility. */
  alt: string;
  /** Optional visible caption shown under the figure. */
  caption?: string;
  width: number;
  height: number;
};

export type GuideCalloutVariant = "note" | "warning" | "tip" | "review";

export type GuideCallout = {
  variant: GuideCalloutVariant;
  title?: string;
  /** One paragraph per entry. */
  body: string[];
};

export type GuideStep = {
  title: string;
  body?: string;
  /** Short supporting points rendered as a nested bullet list. */
  points?: { label?: string; text: string }[];
  image?: GuideScreenshot;
};

export type GuideDefinition = {
  term: string;
  text: string;
};

export type GuideSection = {
  /** Stable anchor id; used by the in-page table of contents. */
  id: string;
  heading: string;
  /** Lead-in sentence rendered before paragraphs/steps. */
  lead?: string;
  paragraphs?: string[];
  callouts?: GuideCallout[];
  /** Numbered procedure — rendered as a semantic <ol>. */
  steps?: GuideStep[];
  /** Unnumbered supporting list. */
  bullets?: { label?: string; text: string }[];
  /** Term/description pairs (concepts, fees, account types). */
  definitions?: GuideDefinition[];
  table?: { caption?: string; headers: string[]; rows: string[][] };
  image?: GuideScreenshot;
};

export type GuideArticleContent = {
  /** URL slug under the series (unchanged from the legacy guide URLs). */
  slug: string;
  /** Short title used in series lists, navigation and search results. */
  title: string;
  /** Optional longer on-page H1; falls back to `title`. */
  pageTitle?: string;
  /** Meta description / card excerpt. */
  description: string;
  /** Lead paragraph rendered under the H1. */
  lead: string;
  /** Estimated reading time in minutes (Persian). */
  readingMinutes: number;
  /** ISO date the article content was last reviewed. */
  updatedAt: string;
  /** Optional topic chips shown in the hero. */
  topics?: string[];
  /** Opening paragraphs before the first section. */
  intro?: string[];
  sections: GuideSection[];
  /**
   * Procedural claims that could not be independently verified against the
   * current product. Rendered as a review callout so nothing is presented as
   * certain when it is not.
   */
  reviewNotes?: string[];
  /** Internal or official references used while writing. */
  references?: { label: string; href: string }[];
};

export type GuideArticleMeta = Pick<
  GuideArticleContent,
  "slug" | "title" | "description"
>;
