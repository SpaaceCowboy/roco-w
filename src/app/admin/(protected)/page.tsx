import Link from "next/link";
import { Suspense } from "react";
import { contentLocales } from "@/lib/admin/content-locales";
import {
  getDashboardSummary,
  listAdminAuthors,
  listAdminCategories,
  listAdminPosts,
} from "@/lib/admin/content-service";
import type { DashboardView } from "@/lib/admin/dashboard-query";
import { adminEvents, reportAdminFailure } from "@/lib/admin/observability";
import { requireAdminSession } from "@/lib/admin/session";
import { NewPostButton } from "./NewPostButton";
import { ArticleTable } from "./ArticleTable";
import { FilterBar } from "./FilterBar";
import { dashboardHref, localeLabels, one, statusLabels, viewHref, viewLabels, type Search } from "./dashboard-helpers";
import styles from "../admin.module.css";

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
    <div className={`${styles.skeleton} ${styles.skeletonTabs}`} />
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

  // View tabs; counts come from the summary query, `all` and `recent` have no cheap count.
  const tabs: Array<{ view: DashboardView; count?: number; urgent?: boolean }> = [
    { view: "all" },
    { view: "attention", count: summary.attention, urgent: summary.attention > 0 },
    { view: "review", count: summary.review },
    { view: "mine", count: summary.mine },
    { view: "scheduled", count: summary.scheduled },
    { view: "untranslated", count: summary.untranslated },
    { view: "recent" },
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
        <h1>Articles</h1>
        <div className={styles.headActions}><NewPostButton /></div>
      </header>

      <nav className={styles.viewTabs} aria-label="Article views">
        {tabs.map((tab) => (
          <Link
            key={tab.view}
            href={viewHref(tab.view)}
            scroll={false}
            aria-current={query.view === tab.view ? "page" : undefined}
            className={styles.viewTab}
            title={viewLabels[tab.view].description}
          >
            {viewLabels[tab.view].label}
            {tab.count !== undefined && <span className={styles.viewCount} data-urgent={tab.urgent || undefined}>{tab.count}</span>}
          </Link>
        ))}
      </nav>

      <section className={styles.listCard} aria-labelledby="article-results-heading">
        <div className={styles.listHead}>
          <h2 id="article-results-heading" className={styles.srOnly}>{viewLabels[query.view].label}</h2>
          <p className={styles.listMeta} aria-live="polite">
            {total
              ? `${resultStart}–${resultEnd} of ${total} localization${total === 1 ? "" : "s"}`
              : "No localizations"}
            {hasFilters ? " · filtered" : ""}
          </p>
          {(hasFilters || query.view !== "all") && <Link className={styles.resetLink} href="/admin" scroll={false}>Reset view</Link>}
        </div>

        <FilterBar raw={raw} query={query} authors={authors} categoryOptions={categoryOptions} chips={chips} hasFilters={hasFilters} />

        <ArticleTable items={items} query={query} raw={raw} role={session.role} />
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
