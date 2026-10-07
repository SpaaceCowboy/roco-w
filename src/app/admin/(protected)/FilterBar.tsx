import Link from "next/link";
import { contentLocales } from "@/lib/admin/content-locales";
import { dashboardPageSizes } from "@/lib/admin/dashboard-query";
import type { listAdminAuthors, listAdminCategories, listAdminPosts } from "@/lib/admin/content-service";
import { AutoSubmitInput, AutoSubmitSelect } from "./AutoSubmit";
import { FilterForm } from "./FilterForm";
import { LiveSearch } from "./LiveSearch";
import { Popover } from "./Popover";
import { localeLabels, one, statusLabels, viewHref, type Search } from "./dashboard-helpers";
import styles from "../admin.module.css";

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

export function FilterBar({ raw, query, authors, categoryOptions, chips, hasFilters }: {
  raw: Search;
  query: Awaited<ReturnType<typeof listAdminPosts>>["query"];
  authors: Awaited<ReturnType<typeof listAdminAuthors>>;
  categoryOptions: Awaited<ReturnType<typeof listAdminCategories>>;
  chips: Array<{ label: string; href: string }>;
  hasFilters: boolean;
}) {
  const moreCount = [query.author, query.category, one(raw.from), one(raw.to)].filter(Boolean).length;
  // Remount the selects when filters change via links (chips, tabs); the search input syncs itself.
  const formKey = [query.view, query.sort, query.order, query.locale, query.status, query.author, query.category, one(raw.from), one(raw.to), query.pageSize].join("|");
  return <>
        <FilterForm key={formKey} className={styles.listToolbar}>
          <input type="hidden" name="view" value={query.view} />
          <input type="hidden" name="sort" value={query.sort} />
          <input type="hidden" name="order" value={query.order} />
          <label className={styles.searchBox}>
            <SearchIcon />
            <span className={styles.srOnly}>Search articles</span>
            <LiveSearch defaultValue={query.q} />
          </label>
          <label className={styles.inlineFilter}>
            <span className={styles.srOnly}>Locale</span>
            <AutoSubmitSelect name="locale" defaultValue={query.locale ?? ""}><option value="">All locales</option>{contentLocales.map((locale) => <option key={locale} value={locale}>{localeLabels[locale]}</option>)}</AutoSubmitSelect>
          </label>
          <label className={styles.inlineFilter}>
            <span className={styles.srOnly}>Status</span>
            <AutoSubmitSelect name="status" defaultValue={query.status ?? ""}><option value="">All statuses</option>{["draft", "review", "scheduled", "published", "archived"].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</AutoSubmitSelect>
          </label>
          <Popover summary={<>
            <FilterIcon />
            More filters
            {moreCount > 0 && <span className={styles.countBubble}>{moreCount}</span>}
          </>}>
            <div className={styles.filterGrid}>
              <label>Created by<AutoSubmitSelect name="author" defaultValue={query.author ?? ""}><option value="">Anyone</option>{authors.map((author) => <option key={author.id} value={author.id}>{author.name ?? author.email}</option>)}</AutoSubmitSelect></label>
              <label>Category<AutoSubmitSelect name="category" defaultValue={query.category ?? ""}><option value="">All categories</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</AutoSubmitSelect></label>
              <label>Updated from<AutoSubmitInput type="date" name="from" label="Updated from" defaultValue={one(raw.from)} /></label>
              <label>Updated to<AutoSubmitInput type="date" name="to" label="Updated to" defaultValue={one(raw.to)} /></label>
              <label>Per page<AutoSubmitSelect name="pageSize" defaultValue={String(query.pageSize)}>{dashboardPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</AutoSubmitSelect></label>
              <div className={styles.filterActions}>
                {hasFilters && <Link className={styles.resetLink} href={viewHref(query.view)}>Clear filters</Link>}
              </div>
            </div>
          </Popover>
        </FilterForm>

        {chips.length > 0 && <ul className={styles.chips}>
          {chips.map((chip) => <li key={chip.label}>
            <Link className={styles.chip} href={chip.href} scroll={false}>{chip.label}<span aria-hidden="true">×</span><span className={styles.srOnly}> (remove filter)</span></Link>
          </li>)}
          <li><Link className={styles.chipClear} href={viewHref(query.view)} scroll={false}>Clear all</Link></li>
        </ul>}
  </>;
}
