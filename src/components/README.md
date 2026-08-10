# Components structure

Organized by responsibility (atomic-design-ish), most reusable first:

## `ui/` — reusable primitives (atoms + molecules)

Generic, page-agnostic building blocks used across the app.

- `Button`, `Tabs`, `Accordion`, `Reveal`, `CornerMark` — interaction / text primitives
- `PageHero`, `PageBackground` — the shared subpage header + fixed dot-grid
- `DotMatrix`, `Globe` — WebGL visual primitives

## `layout/` — app chrome

Rendered by the root layout, present on every page.

- `Header` (nav, dropdowns, mobile menu, language switcher, logo)
- `Footer`
- `SmoothScroll` (Lenis)

## `sections/` — home-page sections (organisms)

The composed blocks that make up the home page.

- `Home` (composition: `Home`, `HomeScene`, `Features`)
- `Hero`, `About`, `Markets`, `Accounts`, `WhatWeDo`, `MetaTrader`, `FAQ`,
  `IBPromo`, `TickerTape`

## `pages/` — subpage views

The top-level view component for each non-home route (rendered by
`src/app/[locale]/<route>/page.tsx`).

- `MarketsPage`, `AccountsPage`, `ContactPage`, `LegalPage`, `FaqPage`, `BlogPage`

---

Imports use the `@/components/<group>/<Name>/…` alias. Non-component shared code
lives in `@/lib` (helpers), `@/config` (nav), `@/i18n` (routing), `@/app` (routes).

## `src/lib`

- `lib/hooks/` — React hooks (`useLetterRotate`)
- `lib/animation/` — GSAP / scroll helpers (`chaosBlink`, `smoothScroll`)
- `lib/fonts.ts` — locale font config
- `lib/blog.ts`, `lib/blogFeed.ts` — local article repository and RSS generation
