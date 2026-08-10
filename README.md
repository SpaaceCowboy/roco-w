# RocoBroker

Production marketing site and native educational blog for RocoBroker, built with
**Next.js App Router**. The complete interface is multilingual via **next-intl**
(six languages, including RTL Arabic and Persian).

---

## Tech stack

| Piece      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19                 |
| Language   | TypeScript                                         |
| i18n       | next-intl (URL-prefixed locales, RTL, hreflang)    |
| Styling    | Plain CSS / CSS Modules (no Tailwind) — like PV     |
| Brand font | Montserrat (`next/font/google`)                    |
| Hosting    | Vercel (planned)                                   |
| Blog       | Native, file-backed, statically generated            |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000  → redirects to /en
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

---

## Project structure

```
messages/                 # translation dictionaries — one JSON per language
  en.json de.json ru.json ar.json fa.json zh-hans.json
middleware.ts             # detects language, redirects to the right locale prefix
next.config.ts            # Next config + next-intl plugin
src/
  app/
    [locale]/             # every page lives here; [locale] = en | de | ru | ar | fa | zh-hans
      layout.tsx          # root layout: sets <html lang dir>, loads font + i18n provider
      page.tsx            # home
      blog/               # index, article pages, and localized RSS feed
    globals.css           # global baseline + brand and locale font tokens
  i18n/
    routing.ts            # list of locales, default locale, which are RTL
    request.ts            # loads the right messages/*.json per request
    navigation.ts         # locale-aware <Link>, useRouter, etc.
  lib/
    fonts.ts              # locale-aware next/font setup
    blog.ts               # native blog repository and content queries
  content/blog/
    posts.json            # sanitized local article library
scripts/
  import-wordpress-blog.mjs # repeatable one-time legacy content importer
```

---

## How the languages work

Six languages: **English (default), German, Russian, Arabic, Persian/Farsi, Chinese (Simplified).**
Arabic and Farsi are **right-to-left**.

**1. One URL prefix per language** (matches the current WPML site, so SEO carries over):

```
/            → English (default, no prefix)
/de          → German
/ru          → Russian
/ar          → Arabic   (RTL)
/fa          → Farsi    (RTL)
/zh-hans     → Chinese
```

Configured in `src/i18n/routing.ts` (`localePrefix: "as-needed"` = default locale has no prefix).
The `[locale]` folder means each page is written **once** and exists in all languages automatically.

**2. Text lives in dictionaries, not in code.** In a component you write a key:

```tsx
const t = useTranslations("home");
return <h1>{t("placeholder")}</h1>;
```

…and the words live in `messages/<locale>.json`:

```json
// messages/en.json → { "home": { "placeholder": "RocoBroker — coming soon" } }
// messages/de.json → { "home": { "placeholder": "RocoBroker — in Kürze verfügbar" } }
```

To change wording or fix a translation, edit that one JSON file — no code change.

**3. Language detection.** `middleware.ts` picks the language from the URL, then a cookie, then
the browser's `Accept-Language` header, and redirects to the correct prefix. The choice is
remembered in a cookie.

**4. Right-to-left (Arabic + Farsi).** `src/app/[locale]/layout.tsx` renders
`<html lang="ar" dir="rtl">` automatically for RTL locales (see `isRtl()` in `routing.ts`).
Write CSS with **logical properties** (`margin-inline-start`, not `margin-left`) so the browser
mirrors the layout for free.

**5. SEO.** Emit `hreflang` + `x-default` tags per page (to be added when we build real pages).

### Fonts & scripts — important

Montserrat is the brand font but it only covers **Latin + Cyrillic** (English, German, Russian).
It has **no** Arabic, Persian or Chinese glyphs. Locale token overrides therefore use
**Vazirmatn** for Arabic/Persian and **Noto Sans SC** for Simplified Chinese.

---

## The blog

The blog is part of this application at `/blog` and every localized equivalent. It provides:

- search, category and tag filtering, pagination, featured and related posts;
- statically generated article pages, metadata, BlogPosting schema and breadcrumbs;
- article table of contents, recent posts, sharing, educational-risk notices and RSS;
- 69 sanitized legacy articles stored locally in `src/content/blog/posts.json`—eight English
  and 61 Persian. German, Russian, Arabic and Chinese use localized interface copy with an
  explicit English-content notice until translated articles are supplied.

The production application never calls WordPress. `scripts/import-wordpress-blog.mjs` is a
repeatable migration utility that can refresh the local source file during an editorial import.

---

## How to… (recipes)

**Add a new language**
1. Add the code to `locales` in `src/i18n/routing.ts` (and to `rtlLocales` if it's RTL).
2. Create `messages/<code>.json` (copy `en.json`, translate the values).
3. Add translated `blogPage` interface messages. Add native article content when available;
   otherwise the repository deliberately falls back to English with a visible notice.

**Add a new page** — create `src/app/[locale]/<name>/page.tsx`. It automatically exists in every
language. Add any new text keys to every `messages/*.json`.

**Use brand colours** — reference the semantic tokens in `src/app/globals.css`
(`var(--color-fg)`, `var(--color-accent)`, …) rather than raw hex, so a palette change stays in
one place.

### Brand palette (from the Figma brand guide)

**Primary**
| Name          | Hex       | Token         | Use            |
| ------------- | --------- | ------------- | -------------- |
| Gunmetal Gray | `#2A3439` | `--gunmetal`  | text / neutral |
| Electric Lime | `#CCFF00` | `--lime`      | accent / CTAs  |

Gunmetal has a dark→light neutral scale `--gunmetal-950 … --gunmetal-400`; lime has
`--lime-strong` (hover) and `--lime-soft` (tint).

**Secondary:** Dark Blue `#24245C`, Pastel Red `#FF6F61` (`--color-danger`), Deep Sky Blue
`#00BFFF` (`--color-info`), Silver `#C0C0C0` (`--color-border`), White Smoke `#F5F5F5`
(`--color-surface`).

---

## Deployment (planned)

- App → **Vercel**, domain `rocobroker.com` / `www`.
- Turn **Cloudflare proxying ON** (currently DNS-only, which exposes the origin IP).
- Configure `RESEND_API_KEY` and `CONTACT_EMAIL_FROM` in Vercel so the contact
  endpoint can deliver messages. The sender address must use a verified domain;
  `CONTACT_EMAIL_TO` is optional and defaults to the canonical support address.
  See `.env.example` for the expected values.
