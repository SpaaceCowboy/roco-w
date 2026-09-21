import Link from "next/link";
import { publishedArticlePath } from "@/config/blog-routing";
import { contentLocales } from "@/lib/admin/content-locales";
import { listAdminAuthors, listAdminCategories, listAdminPosts } from "@/lib/admin/content-service";
import { NewPostButton } from "./NewPostButton";
import styles from "../admin.module.css";

type Search = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value || undefined;
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const filters = {
    locale: one(raw.locale), status: one(raw.status), author: one(raw.author), category: one(raw.category),
    from: one(raw.from), to: one(raw.to), q: one(raw.q),
  };
  const [items, authors, categories] = await Promise.all([
    listAdminPosts(filters), listAdminAuthors(),
    listAdminCategories(filters.locale as (typeof contentLocales)[number] | undefined),
  ]);
  const hasFilters = Boolean(filters.locale || filters.status || filters.author || filters.category || filters.from || filters.to || filters.q);
  return (
    <main id="admin-main" tabIndex={-1} className={styles.contentArea}>
      <div className={styles.pageHeading}>
        <div><p className={styles.eyebrow}>Editorial workspace</p><h1>Articles</h1><p>{items.length} localization{items.length === 1 ? "" : "s"}</p></div>
        <NewPostButton />
      </div>
      <form className={styles.filters}>
        <label>Search<input name="q" defaultValue={filters.q} placeholder="Title or slug" /></label>
        <label>Locale<select name="locale" defaultValue={filters.locale ?? ""}><option value="">All</option>{contentLocales.map((locale) => <option key={locale}>{locale}</option>)}</select></label>
        <label>Status<select name="status" defaultValue={filters.status ?? ""}><option value="">All</option>{["draft", "review", "scheduled", "published", "archived"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label>Author<select name="author" defaultValue={filters.author ?? ""}><option value="">All</option>{authors.map((author) => <option key={author.id} value={author.id}>{author.name ?? author.email}</option>)}</select></label>
        <label>Category<select name="category" defaultValue={filters.category ?? ""}><option value="">All</option>{categories.map((category) => <option key={`${category.id}-${category.locale}`} value={category.id}>{category.name}</option>)}</select></label>
        <label>From<input type="date" name="from" defaultValue={filters.from} /></label>
        <label>To<input type="date" name="to" defaultValue={filters.to} /></label>
        <div className={styles.filterActions}>
          <button className={styles.secondaryButton}>Apply filters</button>
          {hasFilters && <Link className={styles.clearFilters} href="/admin">Clear</Link>}
        </div>
      </form>
      <div className={styles.tableWrap}>
        <table className={styles.articleTable}>
          <thead><tr><th>Article</th><th>Locale</th><th>Status</th><th>Author</th><th>Updated</th><th><span className={styles.srOnly}>Open</span></th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.id}>
            <td>
              <Link className={styles.tableTitleLink} href={`/admin/posts/${item.id}`}>{item.title}</Link>
              {item.status === "published"
                ? <a className={styles.publicPathLink} href={publishedArticlePath(item.locale, item.slug)} target="_blank" rel="noreferrer">{publishedArticlePath(item.locale, item.slug)}</a>
                : <span className={styles.publicPath}>{publishedArticlePath(item.locale, item.slug)}</span>}
            </td>
            <td><span className={styles.localeBadge}>{item.locale}</span></td>
            <td><span className={`${styles.statusBadge} ${styles[item.status]}`}>{item.status}</span></td>
            <td>{item.createdBy ?? item.authorName}</td>
            <td><time dateTime={item.updatedAt.toISOString()}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(item.updatedAt)}</time></td>
            <td><Link className={styles.tableLink} href={`/admin/posts/${item.id}`}>Edit</Link></td>
          </tr>)}</tbody>
        </table>
        {!items.length && <p className={styles.emptyState}>No articles match these filters.{hasFilters ? <> <Link className={styles.clearFilters} href="/admin">Clear filters</Link></> : null}</p>}
      </div>
    </main>
  );
}
