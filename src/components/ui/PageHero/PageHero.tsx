"use client";

import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal/Reveal";
import { CornerMark } from "@/components/ui/CornerMark/CornerMark";
import styles from "./PageHero.module.css";

/**
 * PageHero — reusable subpage header, matching the Markets/Accounts brand shell:
 * a corner-cross frame, a large slide-in title on the left with an optional
 * flicker overview on the right, and a hairline. Pair with <PageBackground> for
 * the shared dot-grid. `children` render below the hairline (page-specific
 * header content). `fill` makes it 100svh.
 */
export function PageHero({
  title,
  overview,
  children,
  fill = false,
}: {
  title: string;
  overview?: string;
  children?: ReactNode;
  fill?: boolean;
}) {
  return (
    <div className={`${styles.hero} ${fill ? styles.fill : ""}`}>
      <CornerMark className={`${styles.corner} ${styles.cornerTL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerTR}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBL}`} />
      <CornerMark className={`${styles.corner} ${styles.cornerBR}`} />

      <div className={styles.inner}>
        <div className={styles.headRow}>
          <Reveal as="h1" variant="slide" className={styles.title}>
            {title}
          </Reveal>
          {overview && (
            <Reveal as="p" variant="flicker" className={styles.overview}>
              {overview}
            </Reveal>
          )}
        </div>
        <div className={styles.hair} />
        {children}
      </div>
    </div>
  );
}
