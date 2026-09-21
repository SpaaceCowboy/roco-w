import Link from "next/link";
import { Suspense } from "react";
import { publishedArticlePath } from "@/config/blog-routing";
import { contentLocales } from "@/lib/admin/content-locales";
import { listAdminAuthors, listAdminCategories, listAdminPosts } from "@/lib/admin/content-service";
import { dashboardViews, type DashboardSort, type DashboardView } from "@/lib/admin/dashboard-query";
import { reportAdminFailure } from "@/lib/admin/observability";
import { requireAdminSession } from "@/lib/admin/session";
import { NewPostButton } from "./NewPostButton";
import { RelativeTime } from "./RelativeTime";
import styles from "../admin.module.css";

type Search = Record<string, string | string[] | undefined>;

const viewLabels: Record<DashboardView, { label: string; description: string }> = {
  all: { label: "All articles", description: "Every localization" },
  mine: { label: "My drafts", description: "Drafts you created" },
  review: { label: "Awaiting review", description: "Ready for a decision" },
  scheduled: { label: "Scheduled soon", description: "Due in the next 7 days" },
  recent: { label: "Recently published", description: "Published in the last 30 days" },
  attention: { label: "Needs attention", description: "Scheduled time has passed" },
};

const localeLabels: Record<(typeof contentLocales)[number], string> = {
  en: "English",
  fa: "Persian",
  de: "German",
  ru: "Russian",
  ar: "Arabic",
  "zh-hans": "Simplified Chinese",
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value || undefined;
}

function scalarParams(raw: Search): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const scalar = one(value);
    if (scalar) params.set(key, scalar);
  }
  return params;
}

function dashboardHref(raw: Search, changes: Record<string, string | undefined>, resetCursor = true): string {
  const params = scalarParams(raw);
  if (resetCursor) params.delete("cursor");
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

function viewHref(view: DashboardView): string {
  return view === "all" ? "/admin" : `/admin?view=${view}`;
}

function SortHeading({ field, label, raw, activeSort, activeOrder }: {
  field: DashboardSort;
  label: string;
  raw: Search;
  activeSort: DashboardSort;
  activeOrder: "asc" | "desc";
}) {
  const active = activeSort === field;
  const nextOrder = active && activeOrder === "asc" ? "desc" : "asc";
  return <th aria-sort={active ? (activeOrder === "asc" ? "ascending" : "descending") : "none"}>
    <Link className={styles.sortLink} href={dashboardHref(raw, { sort: field, order: nextOrder })}>
      {label}<span aria-hidden="true">{active ? (activeOrder === "asc" ? " ↑" : " ↓") : " ↕"}</span>
    </Link>
  </th>;
}

function DashboardLoadError({ supportRef, retryHref }: { supportRef: string; retryHref: string }) {
  return <main id="admin-main" tabIndex={-1} className={styles.contentArea}>
    <section className={styles.dashboardError} role="alert">
      <p className={styles.eyebrow}>Dashboard unavailable</p>
      <h1>Articles could not be loaded</h1>
      <p>The content database did not return a usable response. No changes were made.</p>
      <div className={styles.errorActions}>
        <Link className={styles.primaryActionLink} href={retryHref}>Try again</Link>
        <span>Support reference: <code>{supportRef}</code></span>
      </div>
    </section>
  </main>;
}

function DashboardLoading() {
  return <main id="admin-main" className={styles.contentArea} aria-busy="true" aria-label="Loading articles">
    <div className={`${styles.skeleton} ${styles.skeletonHeading}`} />
    <div className={`${styles.skeleton} ${styles.skeletonViews}`} />
    <div className={`${styles.skeleton} ${styles.skeletonFilters}`} />
    <div className={`${styles.skeleton} ${styles.skeletonTable}`} />
    <span className={styles.srOnly}>Loading articles…</span>
  </main>;
}

async function DashboardContent({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireAdminSession();
  const raw = await searchParams;
  const filters = {
    locale: one(raw.locale), status: one(raw.status), author: one(raw.author), category: one(raw.category),
    from: one(raw.from), to: one(raw.to), q: one(raw.q), view: one(raw.view), sort: one(raw.sort),
    order: one(raw.order), cursor: one(raw.cursor),
  };

  let result;
  let authors;
  let categories;
  try {
    [result, authors, categories] = await Promise.all([
      listAdminPosts(filters, session.userId),
      listAdminAuthors(),
      listAdminCategories(filters.locale as (typeof contentLocales)[number] | undefined),
    ]);
  } catch (error) {
    const supportRef = crypto.randomUUID();
    reportAdminFailure("admin.dashboard.load", {
      supportRef,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return <DashboardLoadError supportRef={supportRef} retryHref={dashboardHref(raw, { retry: supportRef }, false)} />;
  }

  const { items, total, page, pageSize, nextCursor, previousCursor, query } = result;
  const hasFilters = Boolean(query.locale || query.status || query.author || query.category || query.from || query.to || query.q);
  const resultStart = total === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const resultEnd = Math.min(resultStart + items.length - 1, total);

  return (
    <main id="admin-main" tabIndex={-1} className={styles.contentArea}>
      <div className={styles.pageHeading}>
        <div><p className={styles.eyebrow}>Editorial workspace</p><h1>Articles</h1><p>Plan, review, and publish every localization from one place.</p></div>
        <NewPostButton />
      </div>

      <nav className={styles.dashboardViews} aria-label="Article views">
        {dashboardViews.map((view) => <Link
          key={view}
          href={viewHref(view)}
          className={styles.dashboardView}
          aria-current={query.view === view ? "page" : undefined}
        >
          <strong>{viewLabels[view].label}</strong>
          <span>{viewLabels[view].description}</span>
        </Link>)}
      </nav>

      <section className={styles.dashboardPanel} aria-labelledby="article-filters-heading">
        <div className={styles.panelHeading}>
          <div><p className={styles.eyebrow}>Find content</p><h2 id="article-filters-heading">Filters</h2></div>
          {(hasFilters || query.view !== "all") && <Link className={styles.clearFilters} href="/admin">Reset dashboard</Link>}
        </div>
        <form className={styles.filters}>
          <input type="hidden" name="view" value={query.view} />
          <input type="hidden" name="sort" value={query.sort} />
          <input type="hidden" name="order" value={query.order} />
          <label className={styles.searchField}>Search<input name="q" defaultValue={query.q} placeholder="Title or slug" /></label>
          <label>Locale<select name="locale" defaultValue={query.locale ?? ""}><option value="">All locales</option>{contentLocales.map((locale) => <option key={locale} value={locale}>{localeLabels[locale]} · {locale}</option>)}</select></label>
          <label>Status<select name="status" defaultValue={query.status ?? ""}><option value="">All statuses</option>{["draft", "review", "scheduled", "published", "archived"].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Author<select name="author" defaultValue={query.author ?? ""}><option value="">All authors</option>{authors.map((author) => <option key={author.id} value={author.id}>{author.name ?? author.email}</option>)}</select></label>
          <label>Category<select name="category" defaultValue={query.category ?? ""}><option value="">All categories</option>{categories.map((category) => <option key={`${category.id}-${category.locale}`} value={category.id}>{category.name}</option>)}</select></label>
          <label>Updated from<input type="date" name="from" defaultValue={one(raw.from)} /></label>
          <label>Updated to<input type="date" name="to" defaultValue={one(raw.to)} /></label>
          <div className={styles.filterActions}>
            <button className={styles.secondaryButton}>Apply filters</button>
            {hasFilters && <Link className={styles.clearFilters} href={viewHref(query.view)}>Clear filters</Link>}
          </div>
        </form>
      </section>

      <section className={styles.resultsSection} aria-labelledby="article-results-heading">
        <div className={styles.resultsHeading}>
          <div><p className={styles.eyebrow}>Results</p><h2 id="article-results-heading">{viewLabels[query.view].label}</h2></div>
          <p aria-live="polite">{total ? `Showing ${resultStart}–${resultEnd} of ${total}` : "No localizations"}</p>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.articleTable}>
            <thead><tr>
              <SortHeading field="title" label="Article" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="locale" label="Locale" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="status" label="Status" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="author" label="Author" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="updated" label="Updated" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <th><span className={styles.srOnly}>Open</span></th>
            </tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}>
              <td data-label="Article">
                <Link className={styles.tableTitleLink} href={`/admin/posts/${item.id}`}>{item.title}</Link>
                {item.status === "published"
                  ? <a className={styles.publicPathLink} href={publishedArticlePath(item.locale, item.slug)} target="_blank" rel="noreferrer">{publishedArticlePath(item.locale, item.slug)}</a>
                  : <span className={styles.publicPath}>{publishedArticlePath(item.locale, item.slug)}</span>}
              </td>
              <td data-label="Locale"><span className={styles.localeBadge} title={localeLabels[item.locale]}>{item.locale}</span></td>
              <td data-label="Status"><span className={`${styles.statusBadge} ${styles[item.status]}`}>{item.status}</span></td>
              <td data-label="Author">{item.effectiveAuthor}</td>
              <td data-label="Updated"><RelativeTime value={item.updatedAt.toISOString()} /></td>
              <td data-label="Action"><Link className={styles.tableLink} href={`/admin/posts/${item.id}`}>Edit</Link></td>
            </tr>)}</tbody>
          </table>
          {!items.length && <div className={styles.emptyState}><strong>No articles found</strong><p>Try another view or remove one of the active filters.</p>{(hasFilters || query.view !== "all") && <Link className={styles.primaryActionLink} href="/admin">Show all articles</Link>}</div>}
        </div>
        {(previousCursor || nextCursor) && <nav className={styles.pagination} aria-label="Article result pages">
          {previousCursor
            ? <Link rel="prev" href={dashboardHref(raw, { cursor: previousCursor }, false)}>← Previous</Link>
            : <span aria-hidden="true" />}
          <span>Page {page}</span>
          {nextCursor
            ? <Link rel="next" href={dashboardHref(raw, { cursor: nextCursor }, false)}>Next →</Link>
            : <span aria-hidden="true" />}
        </nav>}
      </section>
    </main>
  );
}

export default function AdminDashboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  return <Suspense fallback={<DashboardLoading />}><DashboardContent searchParams={searchParams} /></Suspense>;
}
