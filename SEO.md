# SEO

## Language targeting policy

hreflang alternates are **language-only** — no country/region subtags:
`en, de, ru, ar, fa, zh-Hans` (+ `x-default` → English).

This means each locale targets **speakers of that language anywhere in the
world**, never a country. In particular **`ru` reaches Russian-speaking people
worldwide** (diaspora, expats) and is **not geo-targeted to Russia**. We do not
set any country/region signal (no `ru-RU`, no `og:locale` territory, no
geo-meta). If a hosting/CDN geo feature is ever added, keep Russia untargeted.

Config lives in `src/lib/seo.ts` (`HREFLANG` map + helpers).

## Canonical URL policy

Legitimate URLs from the previous WordPress/WPML site remain the public
canonical URLs. The language-neutral Next.js paths are internal implementation
routes and are localized through `src/i18n/routing.ts`.

- Canonical tags, hreflang, sitemap entries, and internal links use the
  historical public paths.
- Superseded internal paths and duplicate campaign URLs permanently redirect
  once to the selected canonical URL.
- English and Persian articles retain their historical root-level slugs.
- Obsolete template, team-profile, and uncategorized URLs remain `404` rather
  than redirecting to unrelated content.
- A legacy document URL is preserved only when the current app contains an
  exact equivalent file.

## Implemented (built pages)

Internal built routes include `/`, `/accounts`, `/faq`, `/contact`,
`/legal-documents`, `/about`, `/social-trading`, `/payment-methods`,
`/platforms/metatrader-5`, `/calendar`, `/promotions`, `/partnership`, and
`/markets/{forex,commodities,metals,crypto,stocks,indices}`. Their public URLs
are resolved by locale through `src/i18n/routing.ts`.

- **`metadataBase`** + per-page **canonical** URLs (`src/app/[locale]/layout.tsx`,
  each page's `generateMetadata` via `buildMetadata`).
- **hreflang alternates** for every locale + `x-default` on every page and in the
  sitemap.
- **OpenGraph + Twitter** cards (title, description, url, site name, image).
  `og:locale` is intentionally omitted (country-neutral — see policy).
- **`robots.txt`** (`src/app/robots.ts`) — allow all, points to the sitemap.
- **`sitemap.xml`** (`src/app/sitemap.ts`) — all routes with `xhtml:link`
  hreflang alternates.
- **Structured data (JSON-LD):**
  - Home → `FinancialService` (brand, logo, socials, `knowsAbout` the services
    we offer: forex, commodities, metals, stocks, crypto, indices, CFDs, MT5).
  - FAQ → `FAQPage` (all Q&As → rich results).
- Titles use the template `%s — RocoBroker`; descriptions come from real page
  content (services/benefits), translated across all 6 locales.

## Before launch

- [ ] Set **`NEXT_PUBLIC_SITE_URL`** to the real production origin (defaults to
      `https://rocobroker.com`). Everything else derives from it.
- [ ] Provide a dedicated **OG share image** (1200×630) instead of reusing the
      home banner (`OG_IMAGE` in `src/lib/seo.ts`).
- [ ] Verify in Google Search Console + Bing; submit the sitemap.
- [ ] Remove the temporary `· build Mxx` marker in the footer.

Consider additional JSON-LD where it fits: `BreadcrumbList` on deep pages,
`Service` per market/account type, and `VideoObject` for future video content.
