import type { JSONContent } from "@tiptap/core";
import { z } from "zod";
import { editorDocumentSchema } from "@/lib/content/editor/document";
import { contentLocales } from "./content-locales";

export { contentLocales, rtlContentLocales, type ContentLocale } from "./content-locales";

const slugSchema = z.string().trim().min(1).max(180).transform((value) => normalizeSlug(value)).refine(
  (value) => /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(value),
  "Slug may contain letters, numbers, and single hyphens only",
);

export const createPostSchema = z.object({
  locale: z.enum(contentLocales),
  title: z.string().trim().min(1).max(220),
  authorName: z.string().trim().min(1).max(160),
  html: z.string().max(400_000).optional(),
});

export const saveDraftSchema = z.object({
  version: z.number().int().positive(),
  title: z.string().trim().min(1).max(220),
  slug: slugSchema,
  excerpt: z.string().trim().max(600),
  authorName: z.string().trim().min(1).max(160),
  document: editorDocumentSchema,
  seo: z.object({
    title: z.string().trim().max(120).nullable(),
    description: z.string().trim().max(320).nullable(),
    canonicalOverride: z.string().trim().max(2_000).nullable(),
    noIndex: z.boolean(),
    noFollow: z.boolean(),
    socialTitle: z.string().trim().max(120).nullable(),
    socialDescription: z.string().trim().max(320).nullable(),
    featuredMediaId: z.string().uuid().nullable(),
    featuredImageAlt: z.string().trim().max(300),
    socialMediaId: z.string().uuid().nullable(),
  }).superRefine((seo, context) => {
    if (seo.featuredMediaId && !seo.featuredImageAlt) {
      context.addIssue({ code: "custom", path: ["featuredImageAlt"], message: "Featured images require alt text" });
    }
  }),
});

export type SaveDraftInput = Omit<z.infer<typeof saveDraftSchema>, "document"> & { document: JSONContent };

export const createTranslationSchema = z.object({
  locale: z.enum(contentLocales),
  title: z.string().trim().min(1).max(220).optional(),
});

export const postListFiltersSchema = z.object({
  locale: z.enum(contentLocales).optional(),
  status: z.enum(["draft", "review", "scheduled", "published", "archived"]).optional(),
  author: z.string().uuid().optional(),
  category: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
});

export const deleteContentSchema = z.object({
  scope: z.enum(["localization", "post"]),
  expectedVersion: z.number().int().positive(),
});

export type DeleteContentInput = z.infer<typeof deleteContentSchema>;

export function normalizeSlug(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugFromTitle(title: string): string {
  const normalized = normalizeSlug(title.replace(/[^\p{L}\p{N}\s_-]/gu, ""));
  return normalized || `draft-${crypto.randomUUID().slice(0, 8)}`;
}
