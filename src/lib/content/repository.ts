import type { BlogPost, BlogPostSummary, BlogTaxonomy } from "@/lib/blog";

export interface PublishedContentRepository {
  listPosts(locale: string): Promise<BlogPostSummary[]>;
  listIndexablePosts(locale: string): Promise<BlogPostSummary[]>;
  findPost(locale: string, slug: string): Promise<BlogPost | undefined>;
  listRelatedPosts(post: BlogPost, limit?: number): Promise<BlogPostSummary[]>;
  listCategories(locale: string): Promise<BlogTaxonomy[]>;
  listTags(locale: string): Promise<BlogTaxonomy[]>;
  hasNativeContent(locale: string): Promise<boolean>;
  listStaticParams(): Promise<Array<{ locale: string; slug: string }>>;
}
