"use client";

import { useLetterRotate } from "@/lib/hooks/useLetterRotate";
import styles from "./Header.module.css";

type Props = {
  label: string;
  href: string;
  external?: boolean;
  /** "join" = lime→white on hover; "login" = white→lime on hover. */
  variant: "join" | "login";
};

/** Header CTA button (Join Now / Login) with the letter-rotate hover. */
export function NavCta({ label, href, external, variant }: Props) {
  const { ref, start } = useLetterRotate<HTMLSpanElement>();
  const cls = `${styles.linkItem} ${variant === "join" ? styles.ctaJoin : styles.ctaLogin}`;

  return (
    <a
      className={cls}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onMouseEnter={start}
    >
      <span className={styles.linkWrap}>
        <span className={styles.linkText} ref={ref}>
          {label}
        </span>
      </span>
    </a>
  );
}
