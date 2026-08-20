import { Link } from "@/i18n/navigation";
import type { BlogPost, BlogPostSummary } from "@/lib/blog";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import { BlogVisual } from "./BlogVisual";
import { ArticleShare } from "./ArticleShare";
import styles from "./BlogArticle.module.css";

export type BlogArticleUi = {
  backToBlog: string;
  minuteRead: string;
  published: string;
  updated: string;
  by: string;
  contents: string;
  related: string;
  recent: string;
  readArticle: string;
  fallbackNotice: string;
  educationalNotice: string;
  share: string;
  copyLink: string;
  copied: string;
};

export function BlogArticleView({ post, related, recent, locale, ui }: { post: BlogPost; related: BlogPostSummary[]; recent: BlogPostSummary[]; locale: string; ui: BlogArticleUi }) {
  const formatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" });
  const sourceDir = post.locale === "fa" ? "rtl" : "ltr";
  const isFallback = post.locale !== locale;

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
        <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
        <div className={styles.heroInner} dir={sourceDir}>
          <Link href="/blog" className={styles.back}><span aria-hidden="true">←</span>{ui.backToBlog}</Link>
          {isFallback && <p className={styles.languageNotice}>{ui.fallbackNotice}</p>}
          <div className={styles.meta}>
            <span>{post.category.name}</span>
            <time dateTime={post.publishedAt}>{formatter.format(new Date(post.publishedAt))}</time>
            <span>{post.readingMinutes} {ui.minuteRead}</span>
          </div>
          <h1>{post.title}</h1>
          <p className={styles.excerpt}>{post.excerpt}</p>
          <div className={styles.byline}>{ui.by} {post.author}</div>
        </div>
      </header>

      <div className={styles.visualWrap}>
        <BlogVisual
          seed={post.sourceId}
          label={post.category.name}
          src={post.featuredImage}
          alt={post.featuredImageAlt}
          width={post.featuredImageWidth}
          height={post.featuredImageHeight}
          articleHero
        />
      </div>

      <div className={styles.contentShell}>
        <div className={styles.content} dir={sourceDir}>
          <div className={styles.disclaimer}>{ui.educationalNotice}</div>
          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          <footer className={styles.articleFooter}>
            {!!post.tags.length && <div className={styles.tags}>{post.tags.map((tag) => <Link key={tag.slug} href={`/blog?tag=${tag.slug}`}>#{tag.name}</Link>)}</div>}
            <ArticleShare title={post.title} shareLabel={ui.share} copyLabel={ui.copyLink} copiedLabel={ui.copied} />
            <div className={styles.dates}>
              <span>{ui.published}: <time dateTime={post.publishedAt}>{formatter.format(new Date(post.publishedAt))}</time></span>
              {post.updatedAt !== post.publishedAt && <span>{ui.updated}: <time dateTime={post.updatedAt}>{formatter.format(new Date(post.updatedAt))}</time></span>}
            </div>
          </footer>
        </div>

        <aside className={styles.sidebar}>
          {!!post.tableOfContents.length && (
            <nav className={styles.toc} aria-label={ui.contents}>
              <strong>{ui.contents}</strong>
              <ol>{post.tableOfContents.map((item) => <li key={item.id} className={item.level === 3 ? styles.tocNested : ""}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol>
            </nav>
          )}
          {!!recent.length && (
            <div className={styles.recent}>
              <strong>{ui.recent}</strong>
              {recent.map((item) => <Link key={item.slug} href={`/blog/${item.slug}`}><span>{item.category.name}</span>{item.title}</Link>)}
            </div>
          )}
        </aside>
      </div>

      {!!related.length && (
        <section className={styles.related}>
          <div className={styles.relatedInner}>
            <span className={styles.relatedLabel}>{ui.related}</span>
            <div className={styles.relatedGrid}>
              {related.map((item) => (
                <article key={item.slug}>
                  <Link href={`/blog/${item.slug}`} className={styles.relatedVisual}><span className={styles.srOnly}>{item.title}</span><BlogVisual seed={item.sourceId} label={item.category.name} src={item.featuredImage} alt="" /></Link>
                  <div><span>{item.category.name}</span><h2><Link href={`/blog/${item.slug}`}>{item.title}</Link></h2><Link className={styles.readLink} href={`/blog/${item.slug}`}>{ui.readArticle} ↗</Link></div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
