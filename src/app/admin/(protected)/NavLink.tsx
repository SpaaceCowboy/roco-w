"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Sidebar link marked current when the path equals `href` or sits under one of `sections`
 * (e.g. Articles owns `/admin/posts/*`). Plain data props: server layouts can't pass functions.
 */
export function NavLink({ href, sections = [], className, children }: { href: string; sections?: string[]; className: string; children: ReactNode }) {
  const pathname = usePathname();
  const current = pathname === href || sections.some((section) => pathname === section || pathname.startsWith(`${section}/`));
  return <Link href={href} className={className} aria-current={current ? "page" : undefined}>{children}</Link>;
}
