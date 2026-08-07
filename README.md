# RocoBroker

Marketing site for RocoBroker, built with **Next.js (App Router)** and modeled on the
PV Link Energy site. Multilingual via **next-intl** (6 languages, incl. RTL). The **blog stays
on WordPress** — this app only links out to it.

> Status: **foundation/scaffold only.** No page layouts or designs yet — those are built
> section by section.

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
| Blog       | External — WordPress + WPML at `blog.rocobroker.com` |

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
      page.tsx            # home (placeholder for now)
    globals.css           # baseline styles + brand tokens (colours are placeholders)
  i18n/
    routing.ts            # list of locales, default locale, which are RTL
    request.ts            # loads the right messages/*.json per request
    navigation.ts         # locale-aware <Link>, useRouter, etc.
  lib/
    fonts.ts              # Montserrat setup
    blog.ts               # builds the external blog.rocobroker.com URL per language
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
It has **no** Arabic, Persian or Chinese glyphs. Those currently fall back to the stack in
`globals.css` (`--font-brand`). When we style the `ar` / `fa` / `zh-hans` pages we should add
dedicated script fonts via `next/font/google`, e.g.:

- Arabic → **Noto Sans Arabic** or **Cairo**
- Persian → **Vazirmatn**
- Chinese (Simplified) → **Noto Sans SC**

---

## The blog

The blog is **not** part of this app. It stays on WordPress + WPML at
**`blog.rocobroker.com`**, where editors keep posting/translating exactly as they do today.
The site's "Blog" link opens that WordPress site in a new tab.

`src/lib/blog.ts` builds the right URL for the visitor's language, e.g. a German visitor goes to
`blog.rocobroker.com/de/`. Usage:

```tsx
import { blogUrl } from "@/lib/blog";

<a href={blogUrl(locale)} target="_blank" rel="noopener">
  {t("nav.blog")}
</a>
```

---

## How to… (recipes)

**Add a new language**
1. Add the code to `locales` in `src/i18n/routing.ts` (and to `rtlLocales` if it's RTL).
2. Create `messages/<code>.json` (copy `en.json`, translate the values).
3. Add its blog path to `localeToBlogPath` in `src/lib/blog.ts`.

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
- WordPress blog → its own host at `blog.rocobroker.com`.
- Turn **Cloudflare proxying ON** (currently DNS-only, which exposes the origin IP).
