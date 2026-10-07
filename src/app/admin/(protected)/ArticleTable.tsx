import Link from "next/link";
import { publishedArticlePath } from "@/config/blog-routing";
import { contentLocales } from "@/lib/admin/content-locales";
import type { listAdminPosts } from "@/lib/admin/content-service";
import type { DashboardSort } from "@/lib/admin/dashboard-query";
import { hasAdminPermission, type AdminRole } from "@/lib/admin/permissions";
import { BulkActions, SelectAll } from "./BulkActions";
import { DeletePostDialog } from "./DeletePostDialog";
import { Popover } from "./Popover";
import { RelativeTime } from "./RelativeTime";
import { RowWorkflowAction } from "./RowWorkflowAction";
import { BULK_FORM_ID, dashboardHref, displayPath, localeLabels, quickAction, statusLabels, viewHref, viewLabels, type Search } from "./dashboard-helpers";
import styles from "../admin.module.css";

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
    <Link className={styles.sortLink} href={dashboardHref(raw, { sort: field, order: nextOrder })} scroll={false}>
      {label}<span aria-hidden="true">{active ? (activeOrder === "asc" ? " ↑" : " ↓") : " ↕"}</span>
    </Link>
  </th>;
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

type Result = Awaited<ReturnType<typeof listAdminPosts>>;

export function ArticleTable({ items, query, raw, role }: { items: Result["items"]; query: Result["query"]; raw: Search; role: AdminRole }) {
  const hasFilters = Boolean(query.locale || query.status || query.author || query.category || query.from || query.to || query.q);
  const canArchive = hasAdminPermission(role, "content:archive");
  const canDraft = hasAdminPermission(role, "content:publish") || hasAdminPermission(role, "content:review");
  const selectable = canArchive || canDraft;
  return <>
        {selectable && <BulkActions canArchive={canArchive} canDraft={canDraft} />}
        <div className={styles.tableWrap}>
          <table className={styles.articleTable}>
            <caption className={styles.srOnly}>{viewLabels[query.view].label}, sortable article localizations</caption>
            <thead><tr>
              {selectable && <th className={styles.selectCell}><SelectAll /></th>}
              <SortHeading field="title" label="Article" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="locale" label="Locale" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <th>Languages</th>
              <SortHeading field="status" label="Status" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <SortHeading field="updated" label="Updated" raw={raw} activeSort={query.sort} activeOrder={query.order} />
              <th><span className={styles.srOnly}>Actions</span></th>
            </tr></thead>
            <tbody>{items.map((item) => {
              const quick = quickAction(role, item.status);
              const path = displayPath(item.locale, item.slug);
              return <tr key={item.id}>
                {selectable && <td className={styles.selectCell} data-label="Select">
                  <input type="checkbox" form={BULK_FORM_ID} name="ids" value={item.id} data-status={item.status} data-title={item.title} aria-label={`Select ${item.title}`} />
                </td>}
                <td data-label="Article">
                  <Link className={styles.tableTitleLink} href={`/admin/posts/${item.id}`} dir="auto">{item.title}</Link>
                  <span className={styles.rowMeta}>
                    <span>{item.effectiveAuthor}</span>
                    <span aria-hidden="true">·</span>
                    {item.status === "published"
                      ? <a className={styles.publicPathLink} href={publishedArticlePath(item.locale, item.slug)} target="_blank" rel="noreferrer" dir="ltr">{path}</a>
                      : <span className={styles.publicPath} dir="ltr">{path}</span>}
                  </span>
                </td>
                <td data-label="Locale"><span className={styles.localeTag}>{item.locale}</span></td>
                <td data-label="Languages">
                  <span className={styles.coverageList}>
                    {contentLocales.map((locale) => {
                      const present = !item.missingLocales.includes(locale);
                      return <span key={locale} className={styles.coverageDot} data-present={present} title={`${localeLabels[locale]}: ${present ? "available" : "missing"}`}>
                        {locale === "zh-hans" ? "zh" : locale}
                      </span>;
                    })}
                  </span>
                  <span className={styles.srOnly}>
                    {item.missingLocales.length ? `Missing: ${item.missingLocales.map((locale) => localeLabels[locale]).join(", ")}` : "All six languages available"}
                  </span>
                </td>
                <td data-label="Status"><span className={styles.status} data-status={item.status}><i className={styles.statusDot} aria-hidden="true" />{statusLabels[item.status] ?? item.status}</span></td>
                <td data-label="Updated"><RelativeTime value={item.updatedAt.toISOString()} /></td>
                <td data-label="Actions"><div className={styles.rowActions}>
                  <Link className={styles.tableLink} href={`/admin/posts/${item.id}`}>Edit<span className={styles.srOnly}> {item.title}</span></Link>
                  <Popover
                    className={styles.rowMenu}
                    summaryClassName={styles.rowMenuButton}
                    label={`More actions for ${item.title}`}
                    summary={<MoreIcon />}
                  >
                    <div className={styles.rowMenuList}>
                      {quick && <RowWorkflowAction localizationId={item.id} action={quick.action} label={quick.label} />}
                      <DeletePostDialog
                        localizationId={item.id}
                        version={item.version}
                        title={item.title}
                        locale={item.locale}
                        localization={item.deletion.localization}
                        post={item.deletion.post}
                      />
                    </div>
                  </Popover>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
          {!items.length && <div className={styles.emptyState}>
            <strong>No articles found</strong>
            <p>{query.q ? `Nothing matches “${query.q}”.` : "Try another view or remove one of the active filters."}</p>
            {(hasFilters || query.view !== "all") && <Link className={styles.primaryActionLink} href={hasFilters ? viewHref(query.view) : "/admin"}>{hasFilters ? "Clear filters" : "Show all articles"}</Link>}
          </div>}
        </div>
  </>;
}
