import styles from "./BlogVisual.module.css";

export function BlogVisual({ seed, label }: { seed: number; label: string }) {
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
