import {
  getBlogCategories, getBlogPost, getBlogPostSummaries, getBlogStaticParams,
  getBlogTags, getRelatedBlogPosts, hasNativeBlogContent,
} from "@/lib/blog";
import type { PublishedContentRepository } from "./repository";

/**
 * Compatibility repository used until Phase 5 switches public reads to
 * PostgreSQL. Keeping this adapter explicit makes that cutover reversible.
 */
export const filePublishedContentRepository: PublishedContentRepository = {
  async listPosts(locale) {
    return getBlogPostSummaries(locale);
  },
  async listIndexablePosts(locale) {
    return getBlogPostSummaries(locale);
  },
  async findPost(locale, slug) {
    return getBlogPost(locale, slug);
  },
  async listRelatedPosts(post, limit) {
    return getRelatedBlogPosts(post, limit);
  },
  async listCategories(locale) {
    return getBlogCategories(locale);
  },
  async listTags(locale) {
    return getBlogTags(locale);
  },
  async hasNativeContent(locale) {
    return hasNativeBlogContent(locale);
  },
  async listStaticParams() {
    return getBlogStaticParams();
  },
};
