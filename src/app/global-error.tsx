"use client";

import { useEffect } from "react";

/**
 * Global error boundary — the last resort when even the locale layout fails to
 * render (so no provider, fonts or translations are available). It renders its
 * own <html>/<body> with inline styles, on-brand (dark + red glow, flickering
 * white mark, lime button), in English. Mirrors `app/not-found.tsx`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
        <style>{`@keyframes ge-flicker{0%,100%{opacity:1}42%{opacity:.35}48%{opacity:.9}54%{opacity:.45}60%{opacity:1}}`}</style>
        <div style={{ padding: "2rem" }}>
          <div
            style={{
              fontSize: "clamp(6rem, 22vw, 16rem)",
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              color: "#ffffff",
              textShadow: "0 0 40px rgba(224,75,75,0.35)",
              animation: "ge-flicker 2.6s steps(1) infinite",
            }}
          >
            !
          </div>
          <p style={{ maxWidth: "42ch", margin: "1.25rem auto 1.75rem", opacity: 0.7 }}>
            Something went wrong. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-block",
              padding: "0.85rem 1.6rem",
              borderRadius: "999px",
              background: "#CCFF00",
              color: "#0f1416",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
