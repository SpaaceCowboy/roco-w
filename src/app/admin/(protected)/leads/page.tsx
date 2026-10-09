import { listLeadsForAdmin } from "@/lib/admin/lead-service";
import { leadStatusLabels } from "@/lib/admin/leads-workbook";
import { requireAdminSession } from "@/lib/admin/session";
import styles from "../../admin.module.css";

export const metadata = { title: "Leads — RocoBroker admin" };

/** "2026-10-09 14:52 UTC" — the same clock the Excel export uses. */
function utc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export default async function LeadsPage() {
  const session = await requireAdminSession();
  const { rows, total } = await listLeadsForAdmin(session);

  return (
    <main id="admin-main" tabIndex={-1} className={styles.mainInner}>
      <header className={styles.pageHead}>
        <h1>Leads</h1>
        {total > 0 && (
          <div className={styles.headActions}>
            {/* A GET form, not a link: the file downloads via Content-Disposition,
                and an error (expired session, rate limit) shows as a page
                instead of being saved as a broken .xlsx. */}
            <form method="get" action="/api/admin/leads/export">
              <button type="submit" className={styles.primaryButton}>Export to Excel</button>
            </form>
          </div>
        )}
      </header>

      <section className={styles.listCard} aria-labelledby="leads-heading">
        <div className={styles.listHead}>
          <h2 id="leads-heading" className={styles.srOnly}>Campaign leads</h2>
          <p className={styles.listMeta}>
            {total === 0
              ? "No leads yet"
              : rows.length < total
                ? `Newest ${rows.length} of ${total} leads · the export includes all`
                : `${total} lead${total === 1 ? "" : "s"}`}
          </p>
        </div>

        {total === 0 ? (
          <div className={styles.emptyState}>
            <strong>No leads yet</strong>
            <p>Submissions from the swap-free landing page will appear here.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.articleTable}>
              <caption className={styles.srOnly}>Campaign leads, newest first</caption>
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Full name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Current status</th>
                  <th>Language</th>
                  <th>utm_source</th>
                  <th>utm_medium</th>
                  <th>utm_campaign</th>
                  <th>utm_content</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <tr key={lead.id}>
                    <td>{utc(lead.createdAt)}</td>
                    <td dir="auto">{lead.name}</td>
                    <td dir="ltr">{lead.phone}</td>
                    <td dir="ltr">{lead.email ?? "—"}</td>
                    <td>{leadStatusLabels[lead.accountStatus]}</td>
                    <td>{lead.locale}</td>
                    <td>{lead.utmSource ?? "—"}</td>
                    <td>{lead.utmMedium ?? "—"}</td>
                    <td>{lead.utmCampaign ?? "—"}</td>
                    <td>{lead.utmContent ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
