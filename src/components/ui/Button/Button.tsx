"use client";

import type { ReactNode } from "react";
import styles from "./Button.module.css";

type Props = {
  label: string;
  /** Render as a link when set; otherwise a <button>. */
  href?: string;
  external?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "dark";
  /** lg (default) · md · sm — smaller sizes for dense UI / lower devices. */
  size?: "lg" | "md" | "sm";
  /** For <button> (no href): "button" (default) or "submit" to submit a form. */
  type?: "button" | "submit";
  /** Disable the <button> (ignored for link buttons). */
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Reusable brand button. Renders as an <a> when `href` is given, else a
 * <button>. Hover feedback is handled entirely in CSS so labels stay stable.
 */
export function Button({
  label,
  href,
  external,
  onClick,
  variant = "primary",
  size = "lg",
  type = "button",
  disabled = false,
  className,
}: Props) {
  const sizeCls = size === "lg" ? "" : styles[size];
  const cls = `${styles.btn} ${styles[variant]} ${sizeCls} ${className ?? ""}`.trim();

  const inner = (
    <span className={styles.text}>
      {label}
    </span>
  );

  if (href) {
    return (
      <a
        className={cls}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={onClick}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  );
}
