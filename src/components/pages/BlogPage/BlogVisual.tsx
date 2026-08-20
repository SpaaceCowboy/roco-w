import Image from "next/image";
import styles from "./BlogVisual.module.css";

type BlogVisualProps = {
  seed: number;
  label: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  articleHero?: boolean;
};

export function BlogVisual({ seed, label, src, alt = "", width, height, articleHero = false }: BlogVisualProps) {
  if (src) {
    return (
      <div
        className={`${styles.visual} ${styles.photo} ${articleHero ? styles.articleHero : ""}`}
        style={articleHero && width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={articleHero
            ? "(max-width: 700px) calc(100vw - 32px), (max-width: 1344px) calc(100vw - 64px), 1280px"
            : "(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 760px"}
          className={styles.image}
          priority={articleHero}
          quality={90}
        />
      </div>
    );
  }

  const variant = Math.abs(seed) % 4;
  return (
    <div className={`${styles.visual} ${styles[`variant${variant}`]}`} aria-hidden="true">
      <div className={styles.grid} />
      <div className={styles.orbit} />
      <div className={styles.orbitSmall} />
      <div className={styles.signal}>
        {Array.from({ length: 18 }, (_, index) => (
          <span
            key={index}
            style={{ "--h": `${12 + (index % 7) * 11}%`, "--o": 0.28 + (index % 5) * 0.12 } as React.CSSProperties}
          />
        ))}
      </div>
      <span className={styles.code}>{String(seed).padStart(4, "0").slice(-4)}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
