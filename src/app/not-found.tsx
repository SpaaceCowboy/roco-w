/**
 * Global 404 — the fallback for paths that never reach the localized
 * `[locale]/not-found.tsx` (e.g. a non-prefixed deep path). It renders its own
 * <html>/<body> (no layout wraps it) with inline styles so it's self-contained,
 * on-brand (dark + red glow, flickering white 404, lime button).
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 90% at 50% 40%, rgba(224,75,75,0.16), transparent 60%), #12181b",
          color: "#e6eef0",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <style>{`@keyframes nf-flicker{0%,100%{opacity:1}42%{opacity:.35}48%{opacity:.9}54%{opacity:.45}60%{opacity:1}}`}</style>
        <div style={{ padding: "2rem" }}>
          <div
            style={{
              fontSize: "clamp(6rem, 22vw, 16rem)",
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: "#ffffff",
              textShadow: "0 0 40px rgba(224,75,75,0.35)",
              animation: "nf-flicker 2.6s steps(1) infinite",
            }}
          >
            404
          </div>
          <p style={{ maxWidth: "42ch", margin: "1.25rem auto 1.75rem", opacity: 0.7 }}>
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "0.85rem 1.6rem",
              borderRadius: "999px",
              background: "#CCFF00",
              color: "#0f1416",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
