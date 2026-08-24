import Image from "next/image";
import styles from "./Home.module.css";

type Stat = { value: string; label: string };

/**
 * Features — the section that forms around the shrunken planet. The left column
 * is one big card: the app mockup (its lower part cropped) with the "300+" stat
 * at the bottom-left. The right column holds two smaller stat cards. A new title
 * replaces the hero headline on top. HomeScene animates them via the data-* hooks.
 */
export function Features({
  title,
  accent,
  imageAlt,
  big,
  cards,
}: {
  title: string;
  accent: string;
  imageAlt: string;
  big: Stat;
  cards: Stat[];
}) {
  return (
    <section className={styles.features}>
      <div className={styles.featInner}>
        <h2 className={styles.newTitle} data-feature-title>
          {title} <span className={styles.gradient}>{accent}</span>
        </h2>

        <div className={styles.grid}>
          <div className={styles.sideLeft}>
            <div className={styles.cardOuter} data-feature-card data-side="left">
              <article className={styles.bigCard}>
                <Image
                  className={styles.bigPhone}
                  src="/home/phone-app.png"
                  alt={imageAlt}
                  width={2752}
                  height={1536}
                  sizes="(max-width: 900px) 100vw, 40vw"
                />
                {/* Subtext top-left, big number bottom-left. */}
                <span className={styles.bigLabel}>{big.label}</span>
                <span className={styles.bigValue}>{big.value}</span>
              </article>
            </div>
          </div>

          {/* Centre column is left empty — the planet sits here. */}
          <div className={styles.centerCol} aria-hidden="true" />

          <div className={styles.sideRight}>
            {cards.map((s) => (
              <Card key={s.label} stat={s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({ stat }: { stat: Stat }) {
  // The wrapper carries the reveal transform; the card itself stays untransformed
  // so its backdrop-filter (frosted glass) renders — same method as the navbar.
  return (
    <div className={styles.cardOuter} data-feature-card data-side="right">
      <article className={styles.card}>
        {/* Subtext top-right, large number bottom-left. */}
        <span className={styles.label}>{stat.label}</span>
        <span className={styles.value}>{stat.value}</span>
      </article>
    </div>
  );
}
