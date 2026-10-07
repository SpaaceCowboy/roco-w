import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { estedad, montserrat } from "@/lib/fonts";
import "../globals.css";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Content admin — RocoBroker",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { themeColor: "#f5f6f8" };
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${estedad.variable} ${montserrat.variable}`}>
      <body>
        <div className={styles.adminRoot}>{children}</div>
      </body>
    </html>
  );
}
