import { DotMatrix } from "@/components/ui/DotMatrix/DotMatrix";
import styles from "./PageBackground.module.css";

/**
 * PageBackground — a fixed, full-viewport dot-grid that stays behind the whole
 * page (shared by the subpages). Render it as the first child of a
 * position:relative page wrapper whose sections are transparent so it shows
 * through. Decorative only.
 */
export function PageBackground() {
  return (
    <div className={styles.bg} aria-hidden="true">
      <DotMatrix speed={0.02} delay={0.2} opacity={0.5} color="#727d85" />
    </div>
  );
}
