# Changelog

This file records changes made during the launch-readiness remediation. New
work should be added here in the same change that implements it.

## 2026-08-12

### Locale routing redirect loop

#### Fixed

- Fixed an infinite redirect on the unprefixed default-locale root (`/`) in
  production builds. Next.js 16 re-invokes the middleware on its own internal
  rewrites: next-intl rewrote `/` to `/en`, Next fed `/en` back through the
  middleware, and `localePrefix: "as-needed"` then correctly stripped the
  default-locale prefix and redirected to `/` — two individually correct steps
  composing into a cycle. The middleware now passes re-entrant invocations
  through untouched, identifying them by the `x-next-intl-locale` header
  next-intl stamps on its rewrite. Only production builds were affected; the
  development server does not re-invoke, which is why this reached the VPS.

#### Verification

- Against a production standalone build: `/` 200, `/en` 307 to `/` and
  terminating, all five prefixed locales 200, `fa` rendering `dir="rtl"`,
  `Accept-Language` and `NEXT_LOCALE` detection reaching `/de`, `/fa` and `/ru`,
  `Host: rocobroker.com` 200 so the pending Apache reverse proxy will work, and
  `/metatrader-5` still 308 to `/platforms/metatrader-5`.
- `npx tsc --noEmit` and `npm run lint`: passed.

### Contact endpoint hardening

#### Fixed

- Rejected non-browser submissions to `POST /api/contact`. The same-origin check
  previously treated a *missing* `Origin` header as same-origin, so any client
  that simply omitted the header — `curl`, a script — passed straight through.
  A request must now present either a matching `Origin` or `Sec-Fetch-Site:
  same-origin`.

#### Added

- Added a per-IP rate limit of 5 submissions per 10 minutes, returning 429 with
  a `Retry-After` header. The limiter is in-process and dependency-free, which
  suits the single standalone server under PM2; the module documents why it must
  move to Redis before PM2 cluster mode or a second host.
- Added a distinct rate-limited state to the contact form so the visitor is told
  to wait rather than being shown the generic delivery failure, with copy in all
  six locales.
- Added one structured log line per submission — id, department, locale,
  provider status, attempt count and latency — for both success and failure. The
  id is the same value used as the Resend idempotency key and is now returned to
  the client, so a "nobody answered me" report can be traced end to end. No
  message bodies, addresses or IPs are logged.
- Added a single retry on transient provider failures (408, 429, 5xx, network
  errors and timeouts). The idempotency key is stable across both attempts, so a
  retry after a timeout cannot deliver the same enquiry twice.

#### Verification

- Against a production build: `curl` with no browser headers → 403; a forged
  cross-origin header → 403; the sixth submission inside the window → 429 with
  `Retry-After: 600`.

### Risk disclosure prominence

#### Changed

- Rewrote the footer risk warning in all six locales to state that leverage
  magnifies losses as well as gains, that the entire deposit can be lost, and
  that the products are not suitable for every investor — the previous text
  mentioned volatility and leverage only.
- Moved the warning into its own bounded block with an accent rule and
  full-strength text, separating it from the copyright fine print, and linked it
  to `risk-disclosure.pdf`. Marked up as `role="note"` so assistive technology
  announces it as an aside.

#### Pending

- The wording and its five translations still need compliance sign-off and a
  native-speaker review before they are treated as final.

### Header breakpoint

#### Changed

- Lowered the desktop/mobile swap from 1240px to 1140px. The old value existed
  because the single right-hand cluster needed the room; the centred grid does
  not, so 1280×800 laptops keep the full navigation. Still to be checked
  visually in German and Russian, the widest locales.

## 2026-08-11

### tawk.to live chat

#### Added

- Added the tawk.to live chat widget carried over from the WordPress site,
  mounted once in the locale layout so it survives client-side navigation. The
  embed is injected directly rather than through `next/script`, because the
  `Tawk_API` globals must exist before the remote script executes and
  `next/script` gives no ordering guarantee within a strategy bucket.
- Pinned the chat bubble to the inline end of the viewport, so it mirrors to the
  bottom left in Arabic and Persian.
- Added `NEXT_PUBLIC_TAWK_PROPERTY_ID` and `NEXT_PUBLIC_TAWK_WIDGET_ID`, plus
  optional per-locale widget overrides for the case where a locale is given its
  own dashboard widget (widget language is a dashboard setting, not a runtime
  option). With no property ID configured the component renders nothing and logs
  in development only.
- Added a load-failure listener and a 15-second timeout warning, so a dead
  vendor script degrades to a missing widget instead of a broken page.

#### Changed

- Moved the welcome promo from the inline end to the inline start of the
  viewport so it no longer shares a corner with the chat bubble.

#### Compliance note

- The chat widget loads for every visitor ahead of any cookie-consent choice,
  and tawk.to sets its own visitor cookies at that point. This is the only
  third-party script on the site that runs ungated; the cookie policy text in
  `messages/*.json` still describes TradingView only and needs updating.

### Header layout

#### Changed

- Rebuilt the desktop header as a three-track grid — logo at the inline start,
  navigation centred, language switcher and CTAs at the inline end — replacing
  the previous single right-hand cluster. The two side tracks are each `1fr`, so
  the navigation holds the true centre of the bar regardless of how wide the CTA
  labels render in a given locale.

#### Verification

- `npx tsc --noEmit` and `npm run build`: passed, all routes generated.

## 2026-08-10

### Deployment handoff documentation

#### Added

- Added `currentstate.md` with the deployed commit, isolated VPS runtime and
  PM2 state, unchanged cPanel/mail/WordPress services, pending redirect-loop
  verification, safe resume commands, and the remaining cutover sequence.

### AlmaLinux 8 production-build compatibility

#### Changed

- Converted the Next.js configuration and its legacy-redirect dependency from
  TypeScript to standard ESM so the configuration can load without the native
  SWC binary on hosts using glibc 2.28.
- Switched production builds from the default Turbopack builder to Webpack,
  allowing Next.js to use its WASM compiler fallback when the native Linux SWC
  package requires a newer glibc version.
- Enabled Next.js standalone output for an isolated PM2 deployment that does
  not depend on or modify cPanel's Node.js installation.

#### Verification

- `npm run lint` and `npm run typecheck`: passed.
- Forced the SWC WebAssembly code path used by AlmaLinux 8 and completed the
  Webpack production build successfully, generating all 232 routes.

### Homepage globe restoration

#### Reverted

- Removed the lightweight CSS globe substitute that had been introduced for
  mobile, tablet, and reduced-motion viewports during the runtime performance
  pass.
- Restored the full interactive Three.js globe on every viewport, including
  its particle map, automatic rotation, pointer interaction, and deferred
  viewport-based initialization.
- Restored the homepage's scroll-driven globe rotation and surrounding feature
  animation at mobile and tablet widths. The reduced-motion preference still
  prevents the scroll-driven GSAP sequence, as it did before the performance
  pass.
- Left all unrelated performance work intact. This reversal supersedes only
  the globe-specific mobile fallback and mobile-width animation restriction
  documented later under "Runtime performance optimization."

### Regulatory compliance reconciliation

#### Added

- Added `src/config/compliance.ts` as the canonical application source for:
  - Legal company name: `Roco Broker LTD`
  - Company registration number: `HT01024109`
  - MISA licence number: `BFX2024190`
  - Regulator names and the canonical MISA brokerage-register URL
- Added a localized "Verify on the MISA register" footer link in all six
  languages.

#### Changed

- Updated `src/components/layout/Footer/Footer.tsx` to render regulatory
  identifiers from the canonical compliance configuration and link to the
  official MISA register.
- Updated `src/components/layout/Footer/Footer.module.css` with accessible,
  visible styling for the register link.
- Updated `src/components/pages/AboutPage/AboutView.tsx` to render its
  regulatory statement from the canonical compliance configuration.
- Updated `src/components/pages/FaqPage/FaqView.tsx` to render the regulated
  broker answer from the canonical compliance configuration.
- Updated `src/app/[locale]/faq/page.tsx` so FAQ structured data uses the same
  canonical regulatory values as the visible answer.
- Updated `messages/en.json`, `messages/de.json`, `messages/ru.json`,
  `messages/ar.json`, `messages/fa.json`, and `messages/zh-hans.json`:
  - Removed the conflicting `HT0004400` registration number.
  - Removed the conflicting `BFX40440` licence number.
  - Replaced embedded identifiers in the footer, FAQ, and About copy with
    canonical interpolation placeholders.
  - Standardized the statements on registration `HT01024109` and licence
    `BFX2024190`.

#### Verification

- Confirmed Roco Broker LTD in the MISA brokerage register under licence
  `BFX2024190`; the verification record identifies company number
  `HT01024109`.
- Confirmed the obsolete identifiers no longer occur in application source or
  translations.
- Confirmed all six locale files contain the same 571 translation keys.
- `npm run typecheck`: passed.
- `npm run build`: passed and generated 115 pages.

#### Outstanding compliance work

- `public/documents/social-trade-follower.pdf` and
  `public/documents/social-trade-provider.pdf` still label `BFX2024190` as a
  registration number. The repository has no editable source for these legal
  agreements, so they require compliance-approved replacement PDFs.

### Trading and payment reconciliation

#### Added

- Added `src/config/trading.ts` as the canonical source for shared account
  conditions, including margin call `100%` and stop-out `40%`.
- Added `src/config/payments.ts` as the canonical source for:
  - Iranian Rial payment provider `TCPAY`
  - Supported cryptocurrency methods and networks
  - Fiat payment methods
  - Supported fiat countries and settlement currencies
- Added `src/config/contact.ts` as the canonical source for public contact
  details, social links, office addresses, and the registered address.

#### Changed

- Updated `src/components/pages/AccountsPage/AccountsView.tsx` to use canonical
  account conditions instead of component-local values.
- Updated the FAQ copy in all six locale files:
  - Margin call is now stated as `100%`.
  - Stop-out remains `40%` and is correctly described as the level where
    automatic position closure may begin.
  - Iranian Rial deposits are consistently described as available through
    `TCPAY`.
  - Removed all references to `Top Change`.
- Updated `src/components/pages/FaqPage/keys.ts`, `FaqView.tsx`, and the FAQ
  route's JSON-LD generation to interpolate canonical payment, trading, and
  compliance values.
- Updated the homepage FAQ to interpolate the canonical Rial payment provider.
- Updated `src/components/pages/PaymentsPage/PaymentsView.tsx` to consume
  canonical payment-method, network, country, and currency data.
- Corrected Australia's ISO currency code from `AUS` to `AUD`.
- Updated `src/components/pages/ContactPage/ContactView.tsx` and
  `src/components/layout/Footer/Footer.tsx` to use canonical contact data:
  - Telephone: `+44 7401 131099`
  - WhatsApp: `+44 7723 179486`
  - The two numbers are now explicitly maintained as separate channels.
- Updated homepage FinancialService structured data to use the canonical email,
  telephone number, and social URLs.

#### Source reconciliation

- Used ROCO's public account tables as the deciding source for margin call
  `100%` and stop-out `40%` because they state the conditions consistently for
  every account type.
- Used ROCO's homepage payment-method copy and TCPAY partner listing as the
  deciding source for Iranian Rial deposits; the isolated Top Change FAQ answer
  was treated as stale.
- Used ROCO's public Contact page and Privacy Policy as the deciding sources for
  telephone `+44 7401 131099`; the separate `+44 7723 179486` number remains
  assigned to WhatsApp.

#### Verification

- Confirmed no `Top Change`, `USD/AUS`, or margin-call `0%` contradictions
  remain in application source or translations.
- Confirmed all six locale files still contain the same 571 translation keys.
- `npm run typecheck`: passed.
- `npm run build`: passed and generated 115 pages.

### Legacy URL migration

#### Added

- Added `src/config/legacyRedirects.ts` as the explicit, auditable cutover map
  for 178 legacy URLs:
  - 63 legacy page and campaign URLs mapped to the closest current pages.
  - 42 legacy service and localized market URLs mapped to the current market
    routes across English, German, Russian, Arabic, Persian, and Simplified
    Chinese.
  - 73 blog URLs mapped to `https://blog.rocobroker.com`, comprising four
    localized blog indexes, eight English articles, and 61 Persian articles.
- Added centralized percent-encoding of redirect sources so Next.js matches
  browser-encoded Russian, Arabic, Persian, and Chinese path segments while the
  source declarations remain readable.

#### Changed

- Updated `next.config.ts` to serve the migration map as permanent HTTP 308
  redirects.
- Kept the map explicit rather than adding broad wildcard rules, preventing
  unknown routes from being redirected to unrelated content.
- Deliberately left legacy authentication and named personal/campaign-profile
  routes unmapped so they continue to return 404 instead of becoming public
  landing-page redirects.

#### Source inventory

- Attempted to use the sitemap declared by the public `robots.txt`; the
  declared WordPress sitemap endpoint returned 404 at the time of inventory.
- Recovered the legacy page and article inventory from ROCO's public WordPress
  REST API and recovered localized market slugs from the public site's
  navigation.
- Routed legacy blog content to the dedicated blog subdomain, preserving each
  known article slug and locale.

#### Verification

- Confirmed the compiled Next.js manifest contains all 178 custom redirects as
  HTTP 308 rules, with zero duplicate sources, self-redirects, or redirect
  chains.
- Exercised every compiled redirect against a production-mode local server;
  all 178 returned the exact expected `Location` value.
- Requested all 91 unique internal final destinations directly; every target
  returned HTTP 200 without another redirect.
- Confirmed representative excluded routes `/client-login` and
  `/de/mohamadali` still return HTTP 404.
- `npm run typecheck`: passed.
- `npm run build`: passed and generated 115 pages.

### Conversion-path repairs

#### Added

- Added `src/app/api/contact/route.ts` as a server-side contact-delivery
  endpoint backed by Resend's HTTPS email API.
- Added server-side validation and length limits for every submitted field,
  stable department identifiers, locale capture, same-origin enforcement, a
  bot honeypot, and per-submission idempotency keys.
- Added localized sending, success, and delivery-failure messages to all six
  locale files, preserving translation-key parity at 574 keys per locale.
- Added `.env.example` with the server-only `RESEND_API_KEY`, verified sender,
  and optional recipient configuration required for deployment.
- Added contact-email deployment instructions to `README.md`.

#### Changed

- Updated `src/components/sections/IBPromo/IBPromo.tsx` so its default "Join us
  as IB" CTA links to the locale-aware Partnership page instead of `#`.
- Updated `src/components/pages/ContactPage/ContactView.tsx` to submit JSON to
  `/api/contact` instead of opening the visitor's mail client. The form now:
  - Shows an in-progress label while sending.
  - Prevents duplicate submissions while a request is active.
  - Announces success and failure through an accessible live region.
  - Clears the fields only after successful delivery.
- Updated `src/components/pages/ContactPage/ContactPage.module.css` with hidden
  honeypot and visible success/error status styles.
- Updated `src/components/layout/Footer/Footer.tsx` so MetaTrader 5 is an active
  link to the completed localized MT5 page; removed the outdated "soon" state.
- Updated `src/config/nav.ts` to restore the Resources dropdown with both the
  locale-aware external WordPress blog and the internal FAQ.

#### Verification

- Confirmed invalid contact payloads return HTTP 400.
- Confirmed cross-origin contact submissions return HTTP 403.
- Confirmed honeypot submissions return HTTP 200 without invoking delivery.
- Confirmed a valid request returns a controlled HTTP 503 when the deployment
  mail key is absent rather than falsely reporting success.
- Confirmed rendered English and German homepages contain the correct localized
  Partnership and MetaTrader 5 links.
- Confirmed the obsolete IB `#` target and client-side contact-form `mailto:`
  behavior no longer occur in source.
- Confirmed all six locale files contain the same 574 translation keys.
- `npm run typecheck`: passed.
- `npm run build`: passed and generated 116 routes, including `/api/contact`.

#### Deployment requirement

- Live contact delivery requires `RESEND_API_KEY` and a verified
  `CONTACT_EMAIL_FROM` sender to be configured in Vercel. This repository does
  not contain production email credentials, so no live email was sent during
  local verification.

### Dependency security remediation

#### Changed

- Updated the production framework dependency from Next.js `16.1.3` to
  `16.3.0`, the patched release recommended by the package audit.
- Updated `eslint-config-next` from `16.1.3` to `16.3.0` so framework and lint
  tooling remain version-aligned.
- Regenerated `package-lock.json`; the resolved production dependency tree now
  includes:
  - PostCSS `8.5.23` instead of vulnerable `8.4.31`.
  - Sharp `0.35.3` instead of vulnerable `0.34.5`.
  - Nano ID `3.3.18` instead of a version below `3.3.17`.
- Applied the available non-breaking audit fixes to the development dependency
  tree:
  - `brace-expansion` now resolves to patched `1.1.18` and `5.0.9` branches.
  - `js-yaml` now resolves to patched `4.3.1`.
- Migrated `eslint.config.mjs` from the obsolete FlatCompat adapter to the
  native Next.js 16 flat configurations for Core Web Vitals and TypeScript.
- Removed the now-unused direct `@eslint/eslintrc` development dependency.

#### Security verification

- Initial `npm audit --omit=dev` reported four high-severity affected packages:
  Next.js, PostCSS, Sharp, and Nano ID.
- Final `npm audit --omit=dev`: passed with 0 vulnerabilities.
- Final unfiltered `npm audit`: passed with 0 vulnerabilities across production
  and development dependencies.

#### Regression verification

- `npm run typecheck`: passed.
- `npm run build`: passed under Next.js `16.3.0` and generated all 116 routes.
- Production-mode smoke test passed for all 178 permanent redirects and all 91
  unique internal redirect destinations.
- Contact API invalid-payload behavior remains correct at HTTP 400.
- `npm run lint` now executes instead of crashing in FlatCompat. It currently
  reports 10 application-rule errors and 18 warnings in existing source,
  primarily React hook/ref and raw-image findings reserved for the upcoming
  accessibility and performance remediation; no lint rules were suppressed.

### Third-party widget consent enforcement

#### Added

- Added `src/lib/consent.ts` as the shared, versioned consent store and event
  interface for the application.
- Added a distinct `externalMedia` consent category for third-party market-data
  widgets rather than misclassifying TradingView as analytics or marketing.
- Added `ExternalMediaPlaceholder.tsx` and its CSS module to provide accessible,
  localized blocked states with a direct route back to Cookie settings.
- Added five consent and blocked-widget translation keys in all six locales;
  translation parity is now 579 keys per locale.

#### Changed

- Updated `CookieConsent.tsx` to:
  - Present an off-by-default External market data toggle.
  - Include the category in Accept all, Reject all, and Save choices behavior.
  - Disclose that enabling TradingView shares the visitor IP address and current
    page URL to deliver market data.
  - Use a subscription-backed consent store instead of synchronously setting
    state during its initialization effect.
  - Use the locale-aware application link for the privacy/legal page.
- Bumped consent storage from `roco.cookieConsent.v1` to
  `roco.cookieConsent.v2`. Existing choices are intentionally requested again
  because the old schema did not cover external market-data transfers; the old
  key is removed when a new choice is saved.
- Updated `TickerTape.tsx` and `EconomicCalendar.tsx` so TradingView scripts are
  created only while `externalMedia` consent is active. Revocation removes the
  script and generated iframe immediately.
- Updated `CookieSettingsButton.tsx` and `WelcomePromo.tsx` to use the shared
  consent events and current storage schema.
- Reworded the consent summary in every locale to distinguish essential local
  storage, external market data, analytics, and marketing choices.

#### Source classification

- TradingView's widget documentation states that widgets do not set cookies,
  but do transmit the embedding page URL, widget type, displayed symbol, and IP
  address. The widgets are therefore treated as optional external content and
  blocked until explicit consent.

#### Verification

- Real-browser test with no saved consent:
  - Cookie banner and blocked-widget placeholder were visible.
  - No TradingView scripts, iframes, or network requests were present.
- Accept-all test:
  - Stored `externalMedia: true` under the v2 consent record.
  - Triggered the TradingView ticker script request only after acceptance.
- Selective-revocation test:
  - Stored `externalMedia: false` while preserving the other selected choices.
  - Removed the active TradingView script/iframe immediately.
  - Reloaded with zero TradingView network requests.
- Economic-calendar test:
  - Made zero TradingView requests while external data was disabled.
  - Loaded the events script and generated TradingView iframe only after the
    external-data toggle was enabled.
- Confirmed all six locale files contain the same 579 translation keys.
- `npm run typecheck`: passed.
- `npm run build`: passed and generated all 116 routes.
- `npm run lint`: the changed consent/widget files pass; the repository total is
  now 6 existing application-rule errors and 18 warnings, with no rules
  suppressed.

### Accessibility remediation

#### Added

- Added keyboard-modal behavior to the mobile navigation:
  - Focus moves into the menu when it opens.
  - Tab and Shift+Tab wrap within the expanded mobile header.
  - Attempts to focus content outside the open menu return focus to the menu.
  - Escape closes the menu and restores focus to its toggle.
- Added localized open-menu, close-menu, and mobile-navigation accessible labels
  in all six languages.
- Added visible accent-colored focus outlines to mobile navigation links,
  toggles, calls to action, accordion controls, and language choices.

#### Changed

- Updated the closed mobile panel to be both `inert` and hidden from the
  accessibility tree; its expanded state is exposed as a labelled modal dialog
  with an associated navigation region.
- Disabled GSAP SplitText's automatic ARIA mutation for every animated heading
  and paragraph. This preserves the source element's native semantics and
  prevents prohibited `aria-label` attributes from being added to paragraphs.
- Raised the resting opacity of the reusable animated microcopy shimmer from
  `0.32` to `0.8`, including the FAQ pill, so text remains readable throughout
  the animation.
- Darkened the affected light-section secondary text and market accent colors
  while preserving their existing visual hierarchy.
- Reworked `DotMatrix` viewport detection to use a subscribed external-store
  snapshot instead of synchronously setting state from an effect.
- Made `WhyChooseUs` bar placement a pure precomputed layout instead of
  mutating an accumulator during render.
- Reworked the polymorphic `Reveal` output into explicit semantic elements so
  React can safely validate its animation ref during render.
- Replaced the global 404's internal home anchor with the Next.js link
  component and removed obsolete lint suppressions and an unused GSAP import.

#### Verification

- Lighthouse mobile accessibility improved from `93` to `100`; all automated
  accessibility audits passed. Best Practices and Agentic Browsing also scored
  `100`.
- Real-browser mobile keyboard checks at `390 × 844` confirmed focus entry,
  outside-focus containment, forward and reverse Tab wrapping, Escape close,
  focus return, and inert/ARIA state changes.
- Confirmed the production DOM no longer contains the SplitText-generated
  prohibited paragraph ARIA attribute or the previously reported contrast
  failures.
- Confirmed all six locale files contain the same 582 translation keys.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 0 errors. The remaining 15 warnings are existing
  raw-image optimization findings reserved for the performance pass.
- `npm run build`: passed under Next.js `16.3.0` and generated all 116 routes.

#### Local-audit note

- Lighthouse SEO remains `92` because the localhost audit does not accept the
  production canonical URL. As documented in `verdict.md`, this local-origin
  mismatch is informational and is not a launch defect.

### Runtime performance optimization

#### Measured baseline

- Captured a production cold-load trace at a `390 × 844` mobile viewport with
  Slow 4G networking and 4× CPU throttling:
  - LCP: `893 ms`; CLS: `0.00`.
  - DOM size: 1,021 elements.
  - Forced reflow: `375 ms`.
  - Script payload observed during the trace: 425,766 bytes, including the
    182,355-byte compressed Three.js chunk.
  - Seven font resources totalling 234,140 bytes.
  - The 1,391,339-byte About video, 190,830 bytes of eager image payload, both
    footer QR images, and the WebGL globe all loaded during the initial visit.
- DevTools estimated `0 ms` LCP/FCP savings from the three render-blocking CSS
  files, so they were intentionally not treated as optimization targets.

#### Changed

- Replaced the mobile WebGL globe with a lightweight CSS-lit sphere using the
  existing 2.4 KB map mask. Desktop continues to load and render the complete
  interactive Three.js globe.
- Disabled Lenis smooth scrolling and the homepage's expensive GSAP/ScrollTrigger
  setup at mobile/tablet widths. Mobile keeps native scrolling and visible
  content without pinned animation measurement work.
- Changed mobile `Reveal` animations to animate whole semantic elements instead
  of using SplitText to generate and measure character/line wrappers.
- Disabled offscreen homepage shimmer/reveal setup on mobile for About,
  Accounts, MetaTrader, and FAQ sections.
- Changed the About media from an eager `preload="auto"` video to a source-free
  `preload="none"` element. Its 1.4 MB source is assigned and played only when
  the media block is within 300 px of the viewport; reduced-motion visitors keep
  the poster and never download the clip.
- Disabled unconditional `next/font` preloads so browser Unicode-range matching
  fetches only the fonts needed by the active locale.
- Changed the mobile language switcher to mount its six native-language choices
  only after the language accordion opens, preventing hidden scripts from
  triggering extra font downloads.
- Replaced all 15 raw `<img>` instances with responsive `next/image` components,
  including homepage artwork, market icons, MetaTrader imagery, promotion
  banners, footer QR codes, and About, FAQ, Payments, and Social Trading images.
  Added accurate intrinsic dimensions and responsive `sizes` hints throughout.

#### Measured result

- Repeated the identical Slow 4G/4× CPU production trace:
  - LCP improved from `893 ms` to `739 ms` (`17%` faster); CLS remained `0.00`.
  - DOM size fell from 1,021 to 930 elements (`91` fewer, an `8.9%` reduction).
  - Forced reflow fell from `375 ms` to `16 ms` (`95.7%` reduction).
  - Observed script payload fell from 425,766 to 250,879 bytes (`41.1%`
    reduction).
  - Font requests fell from seven to two and font payload fell from 234,140 to
    78,472 bytes (`66.5%` reduction).
  - Initial Three.js and MP4 transfer fell to zero bytes on mobile.
  - Initial image payload attributed to image elements fell from 190,830 to
    2,651 bytes; the optimized phone artwork is served at its rendered width.
  - Total recorded resource requests fell from 37 to 30.

#### Verification

- Confirmed the desktop 1,440 × 900 experience still creates a full-size
  Three.js canvas and retains the interactive globe.
- Confirmed the About video has no source or network request at startup, then
  loads and completes playback after its media block approaches the viewport.
- Confirmed Persian pages remain RTL and resolve both body and heading text to
  Vazirmatn while loading only two font resources.
- Confirmed the mobile language menu renders zero hidden language choices while
  closed and all six choices after opening.
- Lighthouse mobile: Accessibility `100`, Best Practices `100`, Agentic Browsing
  `100`, and SEO `92` (the documented localhost canonical mismatch).
- Browser console: no errors; one framework-generated unused CSS-preload warning
  remains informational.
- `npm run lint`: passed with 0 errors and 0 warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed and generated all 116 routes.

### Native blog system and legacy content migration

#### Migrated

- Recovered the legacy editorial library through the ROCO WordPress REST API
  and stored it inside the project as a deployment-independent content source:
  - 8 English articles.
  - 61 Persian articles.
  - The old source contained no German, Russian, Arabic, or Simplified Chinese
    articles; those locales now use a translated blog interface, show English
    articles, and disclose the article language clearly.
- Added a repeatable `scripts/import-wordpress-blog.mjs` migration utility that:
  - imports posts, categories, tags, publication dates, and update dates;
  - decodes native Persian slugs and HTML entities;
  - strips scripts, styles, iframes, forms, images, event handlers, arbitrary
    attributes, and unsafe URL protocols;
  - limits article markup to an explicit semantic allowlist;
  - normalizes standalone legacy headings, creates stable heading anchors,
    builds table-of-contents data, and calculates reading time;
  - normalizes template-like English categories into Trading Basics, Market
    Analysis, and Risk & Regulation.
- The generated `src/content/blog/posts.json` contains all 69 complete article
  bodies locally. The production application makes no WordPress request.

#### Added

- Added six localized native blog indexes at `/blog` and each locale-prefixed
  equivalent using the current dark/lime editorial design.
- Added functional article discovery:
  - keyword search across titles, excerpts, categories, and tags;
  - category and tag filters whose state is reflected in the URL;
  - URL-driven pagination with browser back/forward compatibility;
  - featured, latest, related, and recent-article views;
  - responsive layouts with zero horizontal overflow at mobile width.
- Added statically generated native article pages with:
  - sanitized long-form content and correct source-text direction;
  - sticky table of contents and stable anchored headings;
  - publication/update dates, author and reading time;
  - tag navigation, related posts, recent posts, native sharing and copy-link
    controls;
  - a visible educational and leveraged-trading risk notice.
- Added English and localized Persian RSS feeds, including the default-locale
  `/blog/feed.xml` route.
- Added translated blog UI copy in all six message catalogs.

#### Changed

- Replaced the external Blog navigation behavior with locale-aware internal
  application links on desktop and mobile.
- Repointed all eight known English and all 61 known Persian legacy article
  redirects to their native article pages. Old localized blog-index slugs now
  land on the native index; `/blog` and `/de/blog` need no redirects because
  they are direct application routes.
- Added the blog index and 69 source articles to the sitemap, producing 70
  native blog URL entries with source-language canonicals.
- Added Blog and BlogPosting metadata, RSS discovery, canonical handling,
  BlogPosting schema, and BreadcrumbList schema.
- Added a locale-cookie-safe article fallback: an unprefixed English legacy URL
  remains readable even when the visitor currently has Persian selected, while
  retaining the English canonical and displaying a language notice.
- Updated the package description, project README, and component documentation
  to describe the native blog and its import/content workflow.

#### Verification

- Confirmed 69 posts, zero empty bodies, zero duplicate locale/slug pairs, and
  complete redirect coverage for all imported English and Persian slugs.
- Confirmed migrated HTML contains only the allowed semantic tag set and no
  scripts, styles, iframes, forms, inline event handlers, or JavaScript URLs.
- Confirmed all six message catalogs contain the same 624 translation keys.
- Browser-tested English, Chinese-fallback, and Persian-native indexes and
  articles; Persian renders RTL with 61 searchable articles and working
  pagination, while English search correctly narrowed “margin” to two results.
- Confirmed tables of contents target real article heading IDs, article pages
  emit both structured-data blocks, and browser console checks report no
  errors or warnings.
- Confirmed both RSS endpoints, 70 blog sitemap entries, English and Persian
  legacy redirects, and the locale-cookie fallback in production mode.
- Lighthouse mobile: Accessibility `100` and Best Practices `100`. SEO remains
  `92` only because the localhost audit rejects the production canonical URL.
- `npm run lint`: passed with 0 errors and 0 warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed and generated all 232 routes.

#### Editorial note

- Migrated article bodies preserve legacy editorial content. They should still
  receive a separate current-facts, compliance, and promotional-claims review
  before production publication; the migration sanitizes presentation and
  markup but does not certify the underlying statements.

### Six-locale language and localization review

#### Audited

- Reviewed the complete English, German, Russian, Arabic, Persian, and
  Simplified Chinese message catalogs rather than sampling individual pages.
- Confirmed catalog parity at 593 leaf keys per locale, with no missing or
  extra keys and no ICU placeholder or rich-text tag signature mismatches.
- Checked financial-trading terminology, formality, currency formatting,
  metadata length, RTL direction, CJK typography, media alternatives, and
  shared content that previously bypassed the translation catalogs.

#### Changed

- Replaced the hardcoded English 40-country payment list with ISO region codes
  and locale-aware `Intl.DisplayNames` output. Country search now operates on
  the translated names, and the generic local payment-provider label is
  translated in every language.
- Added a controlled Noto Sans SC `next/font` face and Chinese locale token
  overrides, so Simplified Chinese no longer depends on an arbitrary system
  font. Existing Arabic and Persian pages continue to use Vazirmatn.
- Corrected locale-specific language issues, including:
  - financial “trading” terminology in the Arabic, Persian, and Chinese hero;
  - formal address consistency in German and Simplified Chinese;
  - the Cheetah commission display from `8$` to `$8` in all catalogs;
  - concise, translated SEO descriptions for the calendar, MetaTrader 5, and
    partnership routes;
  - clearer localized homepage descriptions for all six locales.
- Added localized accessible labels for header home links, homepage app and
  office imagery, the MetaTrader device and hero images, and the About team
  image instead of reusing English alternatives on translated pages.
- Added a translated notice to the legal-document page explaining that its PDF
  files are currently available only in English. The PDFs themselves were not
  machine-translated because replacing binding legal documents requires
  compliance-approved source translations.
- Changed the calendar, MetaTrader 5, and partnership metadata generators to
  use dedicated summary strings instead of exposing long visible body copy as
  search descriptions.

#### Verification

- Parsed every locale catalog and confirmed 593/593 key parity plus zero ICU or
  rich-text signature mismatches.
- Production-browser checks confirmed the correct `lang` and `dir` values for
  all six locales; Arabic and Persian render RTL, and Simplified Chinese
  resolves to the Noto Sans SC font stack.
- Confirmed localized payment-country output in German, Arabic, Persian, and
  Simplified Chinese, including `Argentinien`, `الأرجنتين`, `آرژانتین`, and
  `阿根廷`, plus translated local-provider labels.
- Confirmed the translated English-only PDF notice on the German legal page.
- Browser console: no errors; only non-blocking WebGL software-fallback and
  framework-generated unused CSS-preload warnings were observed.
- `npm run lint`: passed with 0 errors and 0 warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed and generated all 116 routes.
