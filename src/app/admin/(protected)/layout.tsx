import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_URL } from "@/config/site-url";
import { requireAdminSession } from "@/lib/admin/session";
import { SignOutButton } from "../SignOutButton";
import { NavLink } from "./NavLink";
import styles from "../admin.module.css";

function ArticlesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V18a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M16 8h3.5A.5.5 0 0 1 20 8.5V18a2 2 0 0 1-2 2" />
      <path d="M7.5 8h5M7.5 12h5M7.5 16h3" />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6a1.5 1.5 0 0 1 1 .44l6.96 6.96a1.5 1.5 0 0 1 0 2.12l-7.6 7.6a1.5 1.5 0 0 1-2.12 0l-6.9-6.96a1.5 1.5 0 0 1-.44-1.06Z" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </svg>
  );
}

function SiteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.3 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.3-3.5-8.5S9.7 5.9 12 3.5Z" />
    </svg>
  );
}

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  return (
    <div className={styles.shell}>
      <a href="#admin-main" className={styles.skipLink}>Skip to content</a>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.sideBrand}>
          <span className={styles.sideMark} aria-hidden="true">R</span>
          <span className={styles.sideBrandText}>
            RocoBroker
            <small>Content studio</small>
          </span>
        </Link>

        <nav className={styles.sideNav} aria-label="Main navigation">
          <NavLink href="/admin" sections={["/admin/posts"]} className={styles.sideNavItem}>
            <ArticlesIcon />
            Articles
          </NavLink>
          <NavLink href="/admin/categories" sections={["/admin/categories"]} className={styles.sideNavItem}>
            <CategoriesIcon />
            Categories
          </NavLink>
          <a href={SITE_URL} className={styles.sideNavItem} target="_blank" rel="noreferrer">
            <SiteIcon />
            View site
          </a>
        </nav>

        <div className={styles.sideFoot}>
          <span className={styles.roleBadge}>{session.role}</span>
          {session.localDevelopment
            ? <span role="status">Local development · sign-in disabled</span>
            : <SignOutButton />}
        </div>
      </aside>
      <div className={styles.main}>{children}</div>
    </div>
  );
}
