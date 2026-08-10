import createNextIntlPlugin from "next-intl/plugin";
import { legacyRedirects } from "./src/config/legacyRedirects.mjs";

// Point the plugin at our i18n request config (message loading per locale).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Baseline security headers for every route. Vercel does not set these for you;
// they are framework-agnostic hardening. No Content-Security-Policy yet — the
// site loads a third-party TradingView embed and inline GSAP styles, so a CSP
// should be tuned in report-only mode before enforcing. HSTS keeps `preload`
// off deliberately: submitting to the preload list is a permanent commitment
// and every subdomain (blog.rocobroker.com, …) must serve HTTPS first.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig = {
  // Produce a self-contained server bundle for VPS/PM2 deployments.
  output: "standalone",
  // Don't advertise the framework.
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Serve modern formats where supported (falls back automatically).
    formats: ["image/avif", "image/webp"],
    // Next 16 requires every `quality` value used by any next/image call to be
    // declared here. Add new values as sections introduce them.
    qualities: [75, 85, 90, 95],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return legacyRedirects;
  },
};

export default withNextIntl(nextConfig);
