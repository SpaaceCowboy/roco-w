## Verdict

The redesign is a major visual and structural improvement over the old rocobroker.com homepage (https://rocobroker.com/): stronger branding, cleaner hierarchy, proper responsive behavior, one H1 per page, six-language architecture, and removal of the old template-like testimonials.

However, it is not launch-ready yet. The main blockers are content/compliance contradictions, missing migration redirects, broken conversion paths, dependency vulnerabilities, and consent/accessibility issues—not the visual design.

### What works well

- Distinctive, premium editorial design with consistent dark/lime branding.
- Responsive at 390px and 1440px with no horizontal overflow.
- RTL support is thoughtfully implemented for Persian and Arabic.
- All 570 translation keys exist in every language.
- Production build succeeds and generates 115 localized pages.
- TypeScript passes.
- Canonicals, hreflang, sitemap, robots, Open Graph and structured data are broadly well implemented.
- Mobile lab performance is strong: 781ms LCP and 0 CLS under Slow 4G and 4× CPU throttling—comfortably within Google’s recommended thresholds. [Core Web Vitals guidance](https://web.dev/articles/vitals)

## Launch blockers

1. Regulatory facts contradict each other.

   The footer, About page and Privacy Policy use registration HT01024109 and license BFX2024190, while the FAQ uses HT0004400 and BFX40440 in all six languages. See `messages/en.json:531`.

   The social-trading PDFs also label BFX2024190 as the registration number rather than the license number. These details need written compliance approval and one central source of truth. The official MISA site strongly recommends direct license verification; I could not independently complete that verification through its public search. [MISA registry](https://www.mwaliregistrar.net/)

2. Trading and payment information conflicts.

   - FAQ: margin call 0%; account tables: margin call 100%.
   - FAQ: Rial deposits are available through TCPAY; another answer says Rial deposits are unavailable but possible through Top Change.
   - Contact phone: +44 7401 131099; footer phone: +44 7723 179486.
   - Australia is listed with invalid currency code AUS instead of AUD in `src/components/pages/PaymentsPage/PaymentsView.tsx:76`.

   Account conditions, supported payment rails, networks, countries, phone numbers and restricted jurisdictions should come from centralized structured data rather than duplicated component and translation strings.

3. There is no old-URL migration plan.

   Indexed old routes such as `/services/forex-trading/`, `/services/commodities/`, `/services/crypto-currencies/` and `/pamm-account/` have no permanent redirects to the new routes. See the [old services structure](https://rocobroker.com/services/) and [PAMM page](https://rocobroker.com/pamm-account/).

   This risks losing rankings and backlinks immediately after launch. A complete 301 map is also needed for localized WPML slugs such as the old Persian accounts URL.

4. Important conversion paths are broken or unreliable.

   - The homepage “Join us as IB” CTA defaults to `#` in `src/components/sections/IBPromo/IBPromo.tsx:14`.
   - The contact form does not send anything to ROCO; it only opens the visitor’s mail client via `mailto:` in `src/components/pages/ContactPage/ContactView.tsx:85`.
   - MetaTrader 5 is fully built, but the footer still marks it “soon” in `src/components/layout/Footer/Footer.tsx:43`.
   - The external blog integration exists in code, but no navigation item actually links to it.

5. Promotional claims need terms and compliance review.

   The 40% bonus is described as “non-losable” with profit “always available for withdrawal,” but there is no linked promotion agreement, eligibility definition, expiry date, withdrawal formula or jurisdiction restriction. See `messages/en.json:675`.

   The popup repeats the offer globally. These claims should not launch until approved terms are available beside every promotion CTA.

6. Production dependencies currently fail the security audit.

   `npm audit --omit=dev` reports three high-severity vulnerable dependency groups involving Next.js, PostCSS and Sharp. The project pins Next.js 16.1.3 in `package.json:13`; the audit recommends moving to a fixed Next.js release.

7. Cookie consent is not technically enforced.

   TradingView is loaded immediately regardless of consent in `src/components/sections/TickerTape/TickerTape.tsx:43`, while the banner claims analytics and marketing remain off until selected. The economic-calendar widget has the same architectural issue.

   Either classify and document these embeds as necessary, or load them only after the appropriate consent category. There is also no Content Security Policy yet, as acknowledged in `next.config.ts:7`.

## Design, accessibility and performance priorities

- The new design is visually much stronger, but trust evidence appears too late. Put the verified legal entity, license, risk statement and jurisdiction restrictions near the first conversion point—not only in the footer.

- The homepage is approximately 13,250px tall for modest content. The pinned sequences are attractive but create excessive scroll effort, especially for users who want account conditions quickly.

- Lighthouse mobile results: Accessibility 93, Best Practices 100, SEO 92. The SEO deduction was caused by auditing localhost with a production canonical, so it is not itself a launch defect.

- Confirmed accessibility failures:

  - Low-contrast animated microcopy, sometimes around 1.86:1.
  - GSAP SplitText generates a prohibited `aria-label` on a paragraph.
  - The mobile menu has no Escape handling or focus trap.

- Runtime performance needs attention despite excellent LCP:

  - 1,025 DOM elements.
  - 308ms forced reflow under mobile throttling.
  - About 271KB gzipped initial JavaScript.
  - The immediately activated Three.js globe adds roughly 182KB gzipped.
  - Seven font files load on English, partly because hidden mobile language options remain in the DOM.
  - `/home/about.mp4` is 1.4MB and uses `preload="auto"` in `src/components/sections/About/About.tsx:235`.
  - Most images still use raw `<img>` rather than responsive `next/image`.

## Content and localization

- The redesign correctly removes the old homepage’s obvious placeholder testimonials, which materially improves trust.
- Several claims remain too generic or unsupported: “trusted global,” “secure,” “thousands of traders,” “deep liquidity,” and “fast execution.”
- Educational resources are promised, but the blog is absent from navigation.
- The payment-country table remains English in every locale.
- Legal PDFs remain English even when the surrounding page is Arabic, Persian, Russian, German or Chinese.
- Chinese uses a system fallback rather than a controlled CJK webfont.
- The Privacy Policy needs legal editing: it calls GDPR the “Global Data Protection Regulation,” skips section 10, promises an “Effective Date” that is not present, and lacks important processing/legal-basis detail.

- Several metadata descriptions are too long—Calendar 335 characters, Partnership 279, MT5 258—while the homepage description is too generic at 42 characters.

## Verification summary

- `npm run build`: passed.
- `npm run typecheck`: passed.
- Translation key parity: passed for all six languages.
- `npm run lint`: failed because the legacy FlatCompat ESLint configuration throws a circular-structure error.
- `npm audit --omit=dev`: failed with three high-severity groups.
- Responsive visual audit: passed for overflow and core layout.
- No files were changed during this audit.

Recommended order: compliance/content reconciliation → old-URL redirect map → conversion fixes → dependency/security upgrade → accessibility fixes → runtime optimization → native-language review of every locale.
