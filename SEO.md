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

## Implemented (built pages)

Built routes: `/`, `/accounts`, `/faq`, `/contact`, `/legal-documents`,
`/markets/{forex,commodities,metals,crypto,stocks,indices}`.

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

## Needed for the remaining (unbuilt) pages

When these are built, wire the same SEO so coverage stays consistent:

- Pages: `/about`, `/social-trading`, `/payment-methods`,
  `/platforms/metatrader-5`, `/calendar`, `/promotions`, `/partnership`.
- For each: add `generateMetadata` via `buildMetadata({ locale, path, title,
  description })`, add the path to `src/app/sitemap.ts`, and remove the `soon`
  flag in `src/config/nav.ts`.
- Consider extra JSON-LD where it fits: `BreadcrumbList` on deep pages, `Service`
  per market/account type, `Article`/`VideoObject` if an education/blog section
  is added.
