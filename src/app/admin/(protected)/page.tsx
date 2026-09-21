import Link from "next/link";
import { Suspense } from "react";
import { publishedArticlePath } from "@/config/blog-routing";
import { contentLocales } from "@/lib/admin/content-locales";
import {
  getDashboardSummary,
  listAdminAuthors,
  listAdminCategories,
  listAdminPosts,
} from "@/lib/admin/content-service";
import { dashboardPageSizes, type DashboardSort, type DashboardView } from "@/lib/admin/dashboard-query";
import { adminEvents, reportAdminFailure } from "@/lib/admin/observability";
import { hasAdminPermission, type AdminRole } from "@/lib/admin/permissions";
import type { PublicationAction } from "@/lib/admin/publication-policy";
import { requireAdminSession } from "@/lib/admin/session";
import { NewPostButton } from "./NewPostButton";
import { DeletePostDialog } from "./DeletePostDialog";
import { AutoSubmitInput, AutoSubmitSelect } from "./AutoSubmit";
import { Popover } from "./Popover";
import { RowWorkflowAction } from "./RowWorkflowAction";
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
  untranslated: { label: "Missing translations", description: "Fewer than six locales" },
};

/** The single most useful next transition for a row, or null when none applies. */
function quickAction(role: AdminRole, status: string): { action: PublicationAction; label: string } | null {
  if (status === "draft" && hasAdminPermission(role, "content:write")) return { action: "request_review", label: "Request review" };
  if (status === "review" && hasAdminPermission(role, "content:publish")) return { action: "publish", label: "Publish" };
  if (status === "published" && hasAdminPermission(role, "content:archive")) return { action: "archive", label: "Archive" };
  return null;
}

const localeLabels: Record<(typeof contentLocales)[number], string> = {
  en: "English",
  fa: "Persian",
  de: "German",
  ru: "Russian",
  ar: "Arabic",
  "zh-hans": "Simplified Chinese",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  review: "In review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
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
  return <main id="admin-main" tabIndex={-1} className={styles.mainInner}>
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
  return <main id="admin-main" className={styles.mainInner} aria-busy="true" aria-label="Loading articles">
    <div className={`${styles.skeleton} ${styles.skeletonHeading}`} />
    <div className={`${styles.skeleton} ${styles.skeletonKpis}`} />
    <div className={`${styles.skeleton} ${styles.skeletonToolbar}`} />
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
    order: one(raw.order), cursor: one(raw.cursor), pageSize: one(raw.pageSize),
  };

  let result;
  let authors;
  let categories;
  let summary;
  try {
    [result, authors, categories, summary] = await Promise.all([
      listAdminPosts(filters, session),
      listAdminAuthors(),
      listAdminCategories(filters.locale as (typeof contentLocales)[number] | undefined),
      getDashboardSummary(session),
    ]);
  } catch (error) {
    const supportRef = crypto.randomUUID();
    reportAdminFailure(adminEvents.dashboardLoad, {
      supportRef,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return <DashboardLoadError supportRef={supportRef} retryHref={dashboardHref(raw, { retry: supportRef }, false)} />;
  }

  const { items, total, page, pageSize, nextCursor, previousCursor, query } = result;
  const hasFilters = Boolean(query.locale || query.status || query.author || query.category || query.from || query.to || query.q);
  const resultStart = total === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const resultEnd = Math.min(resultStart + items.length - 1, total);

  const cards: Array<{ view: DashboardView; label: string; hint: string; value: number; hero?: boolean }> = [
    { view: "attention", label: "Needs attention", hint: "Scheduled time passed", value: summary.attention, hero: true },
    { view: "review", label: "Awaiting review", hint: "Ready for a decision", value: summary.review },
    { view: "mine", label: "My drafts", hint: "Drafts you created", value: summary.mine },
    { view: "scheduled", label: "Scheduled soon", hint: "Due in the next 7 days", value: summary.scheduled },
    { view: "untranslated", label: "Missing translations", hint: "Fewer than six locales", value: summary.untranslated },
  ];

  const chips: Array<{ label: string; href: string }> = [];
  if (query.q) chips.push({ label: `Search: ${query.q}`, href: dashboardHref(raw, { q: undefined }) });
  if (query.locale) chips.push({ label: `Locale: ${localeLabels[query.locale]}`, href: dashboardHref(raw, { locale: undefined }) });
  if (query.status) chips.push({ label: `Status: ${statusLabels[query.status] ?? query.status}`, href: dashboardHref(raw, { status: undefined }) });
  if (query.author) {
    const author = authors.find((entry) => entry.id === query.author);
    chips.push({ label: `Created by: ${author?.name ?? author?.email ?? query.author}`, href: dashboardHref(raw, { author: undefined }) });
  }
  if (query.category) {
    const category = categories.find((entry) => entry.id === query.category);
    chips.push({ label: `Category: ${category?.name ?? query.category}`, href: dashboardHref(raw, { category: undefined }) });
  }
  if (one(raw.from)) chips.push({ label: `From: ${one(raw.from)}`, href: dashboardHref(raw, { from: undefined }) });
  if (one(raw.to)) chips.push({ label: `To: ${one(raw.to)}`, href: dashboardHref(raw, { to: undefined }) });

  // A category has one localization per locale; the filter keys on the category,
  // so collapse the localized duplicates to a single option.
  const categoryOptions = [...new Map(categories.map((category) => [category.id, category])).values()];

  return (
    <main id="admin-main" tabIndex={-1} className={styles.mainInner}>
      <header className={styles.pageHead}>
        <div>
          <p className={styles.eyebrow}>Editorial workspace</p>
          <h1>Articles</h1>
          <p className={styles.pageSub}>Plan, review, and publish every localization from one place.</p>
        </div>
        <div className={styles.headActions}><NewPostButton /></div>
      </header>

      <section className={styles.kpis} aria-label="Editorial overview">
        {cards.map((card) => (
          <Link
            key={card.view}
            href={viewHref(card.view)}
            aria-current={query.view === card.view ? "page" : undefined}
            className={`${styles.kpi} ${card.hero && card.value > 0 ? styles.kpiHero : ""} ${query.view === card.view ? styles.kpiActive : ""}`}
          >
            <span className={styles.kpiLabel}>{card.label}</span>
            <strong className={styles.kpiValue}>{card.value}</strong>
            <span className={styles.kpiHint}>{card.hint}</span>
          </Link>
        ))}
      </section>

      <section className={styles.listCard} aria-labelledby="article-results-heading">
        <div className={styles.listHead}>
          <div>
            <h2 id="article-results-heading">{viewLabels[query.view].label}</h2>
            <p className={styles.listMeta} aria-live="polite">
              {total
                ? `${resultStart}–${resultEnd} of ${total} localization${total === 1 ? "" : "s"}`
                : "No localizations"}
              {hasFilters ? " · filtered" : ""}
            </p>
          </div>
          {(hasFilters || query.view !== "all") && <Link className={styles.resetLink} href="/admin">Reset dashboard</Link>}
        </div>

        <form className={styles.listToolbar} method="get">
          <input type="hidden" name="view" value={query.view} />
          <input type="hidden" name="sort" value={query.sort} />
          <input type="hidden" name="order" value={query.order} />
          <label className={styles.searchBox}>
            <SearchIcon />
            <span className={styles.srOnly}>Search articles</span>
            <input name="q" type="search" defaultValue={query.q} placeholder="Search title or slug" />
          </label>
          <button type="submit" className={styles.ghostButton}>Search</button>
          <Popover summary={<>
            <FilterIcon />
            Filters
            {chips.length > 0 && <span className={styles.countBubble}>{chips.length}</span>}
          </>}>
            <div className={styles.filterGrid}>
              <label>Locale<AutoSubmitSelect name="locale" defaultValue={query.locale ?? ""}><option value="">All locales</option>{contentLocales.map((locale) => <option key={locale} value={locale}>{localeLabels[locale]}</option>)}</AutoSubmitSelect></label>
              <label>Status<AutoSubmitSelect name="status" defaultValue={query.status ?? ""}><option value="">All statuses</option>{["draft", "review", "scheduled", "published", "archived"].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</AutoSubmitSelect></label>
              <label>Created by<AutoSubmitSelect name="author" defaultValue={query.author ?? ""}><option value="">Anyone</option>{authors.map((author) => <option key={author.id} value={author.id}>{author.name ?? author.email}</option>)}</AutoSubmitSelect></label>
              <label>Category<AutoSubmitSelect name="category" defaultValue={query.category ?? ""}><option value="">All categories</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</AutoSubmitSelect></label>
              <label>Updated from<AutoSubmitInput type="date" name="from" label="Updated from" defaultValue={one(raw.from)} /></label>
              <label>Updated to<AutoSubmitInput type="date" name="to" label="Updated to" defaultValue={one(raw.to)} /></label>
              <label>Per page<AutoSubmitSelect name="pageSize" defaultValue={String(query.pageSize)}>{dashboardPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</AutoSubmitSelect></label>
              <div className={styles.filterActions}>
                <button type="submit" className={styles.applyButton}>Apply filters</button>
                {hasFilters && <Link className={styles.resetLink} href={viewHref(query.view)}>Clear filters</Link>}
              </div>
            </div>
          </Popover>
        </form>

        {chips.length > 0 && <ul className={styles.chips}>
          {chips.map((chip) => <li key={chip.label}>
            <Link className={styles.chip} href={chip.href}>{chip.label}<span aria-hidden="true">×</span></Link>
          </li>)}
          <li><Link className={styles.chipClear} href="/admin">Clear all</Link></li>
        </ul>}

        <div className={styles.tableWrap}>
          <table className={styles.articleTable}>
            <caption className={styles.srOnly}>{viewLabels[query.view].label}, sortable article localizations</caption>
            <thead><tr>
              <SortHeading field="title" label="Article" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="locale" label="Locale" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="status" label="Status" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="author" label="Author" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="updated" label="Updated" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <th><span className={styles.srOnly}>Actions</span></th>
            </tr></thead>
            <tbody>{items.map((item) => {
              const quick = quickAction(session.role, item.status);
              return <tr key={item.id}>
                <td data-label="Article">
                  <Link className={styles.tableTitleLink} href={`/admin/posts/${item.id}`}>{item.title}</Link>
                  {item.status === "published"
                    ? <a className={styles.publicPathLink} href={publishedArticlePath(item.locale, item.slug)} target="_blank" rel="noreferrer">{publishedArticlePath(item.locale, item.slug)}</a>
                    : <span className={styles.publicPath}>{publishedArticlePath(item.locale, item.slug)}</span>}
                </td>
                <td data-label="Locale">
                  <span className={styles.localeTag}>{item.locale}</span>
                  <span className={styles.coverage} title={item.missingLocales.length
                    ? `Missing: ${item.missingLocales.map((locale) => localeLabels[locale]).join(", ")}`
                    : "All six locales present"}>
                    <span className={styles.srOnly}>Translation coverage: </span>
                    {contentLocales.length - item.missingLocales.length}/{contentLocales.length}
                  </span>
                </td>
                <td data-label="Status"><span className={styles.status} data-status={item.status}><i className={styles.statusDot} aria-hidden="true" />{statusLabels[item.status] ?? item.status}</span></td>
                <td data-label="Author">{item.effectiveAuthor}</td>
                <td data-label="Updated"><RelativeTime value={item.updatedAt.toISOString()} /></td>
                <td data-label="Actions"><div className={styles.rowActions}>
                  <Link className={styles.tableLink} href={`/admin/posts/${item.id}`}>Edit</Link>
                  {quick && <RowWorkflowAction localizationId={item.id} action={quick.action} label={quick.label} />}
                  <DeletePostDialog
                    localizationId={item.id}
                    version={item.version}
                    title={item.title}
                    locale={item.locale}
                    localization={item.deletion.localization}
                    post={item.deletion.post}
                  />
                </div></td>
              </tr>;
            })}</tbody>
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
