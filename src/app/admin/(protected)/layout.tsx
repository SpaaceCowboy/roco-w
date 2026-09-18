import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/session";
import { SignOutButton } from "../SignOutButton";
import styles from "../admin.module.css";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  return (
    <div className={styles.workspace}>
      <header className={styles.adminHeader}>
        <Link href="/admin" className={styles.brand}>ROCO <span>Content</span></Link>
        <nav aria-label="Admin navigation"><Link href="/admin">Articles</Link></nav>
        <div className={styles.session}><span>{session.role}</span><SignOutButton /></div>
      </header>
      {children}
    </div>
  );
}
