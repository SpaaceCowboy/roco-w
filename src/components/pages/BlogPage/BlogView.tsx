"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { BlogPostSummary, BlogTaxonomy } from "@/lib/blog";
import { PageBackground } from "@/components/ui/PageBackground/PageBackground";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { BlogVisual } from "./BlogVisual";
import styles from "./BlogPage.module.css";

const PAGE_SIZE = 9;

export type BlogUi = {
  eyebrow: string;
  title: string;
  lead: string;
  searchLabel: string;
  searchPlaceholder: string;
  allCategories: string;
  featured: string;
  latest: string;
  readArticle: string;
  minuteRead: string;
  results: string;
  noResults: string;
  noResultsHint: string;
  clearFilters: string;
  previous: string;
  next: string;
  page: string;
  tagsLabel: string;
  fallbackNotice: string;
};

type Props = {
  posts: BlogPostSummary[];
  categories: BlogTaxonomy[];
  tags: BlogTaxonomy[];
  locale: string;
  hasNativeContent: boolean;
  ui: BlogUi;
};

export function BlogView({ posts, categories, tags, locale, hasNativeContent, ui }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }),
    [locale],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return posts.filter((post) => {
      const matchesQuery =
        !needle ||
        `${post.title} ${post.excerpt} ${post.category.name} ${post.tags.map((item) => item.name).join(" ")}`
          .toLocaleLowerCase(locale)
          .includes(needle);
      return (
        matchesQuery &&
        (!category || post.category.slug === category) &&
        (!tag || post.tags.some((item) => item.slug === tag))
      );
    });
  }, [category, locale, posts, query, tag]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const featured = posts[0];

  function updateUrl(next: { q?: string; category?: string; tag?: string; page?: number }) {
    const params = new URLSearchParams();
    const nextQuery = next.q ?? query;
    const nextCategory = next.category ?? category;
    const nextTag = next.tag ?? tag;
    const nextPage = next.page ?? page;
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextCategory) params.set("category", nextCategory);
    if (nextTag) params.set("tag", nextTag);
    if (nextPage > 1) params.set("page", String(nextPage));
    const suffix = params.size ? `?${params}` : "";
    router.replace(`${pathname}${suffix}`, { scroll: false });
  }

  function chooseCategory(value: string) {
    updateUrl({ category: value, page: 1 });
  }

  function chooseTag(value: string) {
    updateUrl({ tag: value === tag ? "" : value, page: 1 });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  function goToPage(value: number) {
    const nextPage = Math.max(1, Math.min(pages, value));
    updateUrl({ page: nextPage });
    document.getElementById("blog-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className={styles.page}>
      <PageBackground />
      <header className={styles.hero}>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />
        <div className={styles.inner}>
          <span className={styles.eyebrow}>{ui.eyebrow}</span>
          <Reveal as="h1" variant="slide" className={styles.title}>{ui.title}</Reveal>
          <Reveal as="p" variant="flicker" className={styles.lead}>{ui.lead}</Reveal>
          {!hasNativeContent && <p className={styles.languageNotice}>{ui.fallbackNotice}</p>}
        </div>
      </header>

      {featured && (
        <div className={`${styles.inner} ${styles.featuredWrap}`}>
          <span className={styles.sectionLabel}>{ui.featured}</span>
          <article className={styles.featuredCard}>
            <Link href={`/blog/${featured.slug}`} className={styles.featuredVisual}>
              <span className={styles.srOnly}>{featured.title}</span>
              <BlogVisual seed={featured.sourceId} label={featured.category.name} />
            </Link>
            <div className={styles.featuredCopy}>
              <PostMeta post={featured} formatter={dateFormatter} minuteRead={ui.minuteRead} />
              <h2><Link href={`/blog/${featured.slug}`}>{featured.title}</Link></h2>
              <p>{featured.excerpt}</p>
              <Link href={`/blog/${featured.slug}`} className={styles.readLink}>{ui.readArticle}<span aria-hidden="true">↗</span></Link>
            </div>
          </article>
        </div>
      )}

      <div id="blog-results" className={`${styles.inner} ${styles.library}`}>
        <div className={styles.libraryHead}>
          <div>
            <span className={styles.sectionLabel}>{ui.latest}</span>
            <p className={styles.resultCount} aria-live="polite">{filtered.length} {ui.results}</p>
          </div>
          <form className={styles.search} role="search" onSubmit={(event) => {
            event.preventDefault();
            const value = String(new FormData(event.currentTarget).get("q") ?? "");
            updateUrl({ q: value, page: 1 });
          }}>
            <label htmlFor="blog-search" className={styles.srOnly}>{ui.searchLabel}</label>
            <span aria-hidden="true">⌕</span>
            <input key={query} id="blog-search" name="q" defaultValue={query} placeholder={ui.searchPlaceholder} />
            <button type="submit">{ui.searchLabel}</button>
          </form>
        </div>

        <div className={styles.filters} aria-label={ui.allCategories}>
          <button aria-pressed={!category} className={!category ? styles.activeFilter : ""} onClick={() => chooseCategory("")}>{ui.allCategories}</button>
          {categories.map((item) => (
            <button key={item.slug} aria-pressed={category === item.slug} className={category === item.slug ? styles.activeFilter : ""} onClick={() => chooseCategory(item.slug)}>{item.name}</button>
          ))}
        </div>

        {!!tags.length && (
          <div className={styles.tagFilters}>
            <span>{ui.tagsLabel}</span>
            {tags.map((item) => <button key={item.slug} aria-pressed={tag === item.slug} onClick={() => chooseTag(item.slug)}>#{item.name}</button>)}
          </div>
        )}

        {visible.length ? (
          <div className={styles.grid}>
            {visible.map((post) => (
              <article key={`${post.locale}-${post.slug}`} className={styles.card}>
                <Link href={`/blog/${post.slug}`} className={styles.cardVisual}>
                  <span className={styles.srOnly}>{post.title}</span>
                  <BlogVisual seed={post.sourceId} label={post.category.name} />
                </Link>
                <div className={styles.cardCopy}>
                  <PostMeta post={post} formatter={dateFormatter} minuteRead={ui.minuteRead} />
                  <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
                  <p>{post.excerpt}</p>
                  <Link href={`/blog/${post.slug}`} className={styles.readLink}>{ui.readArticle}<span aria-hidden="true">↗</span></Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>{ui.noResults}</strong>
            <p>{ui.noResultsHint}</p>
            <button onClick={clearFilters}>{ui.clearFilters}</button>
          </div>
        )}

        {pages > 1 && (
          <nav className={styles.pagination} aria-label={ui.page}>
            <button disabled={safePage === 1} onClick={() => goToPage(safePage - 1)}>{ui.previous}</button>
            <span>{ui.page} {safePage} / {pages}</span>
            <button disabled={safePage === pages} onClick={() => goToPage(safePage + 1)}>{ui.next}</button>
          </nav>
        )}
      </div>
    </section>
  );
}

function PostMeta({ post, formatter, minuteRead }: { post: BlogPostSummary; formatter: Intl.DateTimeFormat; minuteRead: string }) {
  return (
    <div className={styles.meta}>
      <span>{post.category.name}</span>
      <time dateTime={post.publishedAt}>{formatter.format(new Date(post.publishedAt))}</time>
      <span>{post.readingMinutes} {minuteRead}</span>
    </div>
  );
}
