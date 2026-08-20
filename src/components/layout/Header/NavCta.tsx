import styles from "./Header.module.css";

type Props = {
  label: string;
  href: string;
  external?: boolean;
  /** "join" = lime→white on hover; "login" = white→lime on hover. */
  variant: "join" | "login";
};

/** Header CTA button (Join Now / Login) with stable CSS-only hover feedback. */
export function NavCta({ label, href, external, variant }: Props) {
  const cls = `${styles.linkItem} ${variant === "join" ? styles.ctaJoin : styles.ctaLogin}`;

  return (
    <a
      className={cls}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      <span className={styles.linkWrap}>
        <span className={styles.linkText}>
          {label}
        </span>
      </span>
    </a>
  );
}
