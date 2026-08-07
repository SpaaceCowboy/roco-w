# Performance notes

Prioritized improvements. **None of these change the look or how animations
behave** — they're loading/runtime optimizations. Ordered by expected impact.

## Applied now

- **Dot-matrix → CSS on mobile / small tablets (≤1024px).** The decorative WebGL2
  dot grid is replaced by a lightweight CSS radial-dot background below 1024px
  (same colour/spacing/opacity, soft radial fade). The globe stays. This removes
  one live WebGL context on phones/tablets everywhere DotMatrix is used (home +
  every subpage) — desktop is unchanged.

- `decoding="async"` on all lazy `<img>` (off-main-thread image decode).
- Fonts already use `display: swap` + scoped subsets (latin + cyrillic).
- Three.js is already **dynamically imported** in the Globe (loads only when the
  globe nears the viewport), so it stays out of the initial bundle.
- Account detail videos already play only while on-screen (IntersectionObserver)
  with `preload="none"`.

## High impact — recommended (needs a design/QA pass, so left for you)

1. **Mobile WebGL fallback.** The home renders **two** WebGL canvases (Globe +
   DotMatrix). On phones / `prefers-reduced-motion`, swap them for a static
   image or a short muted video — the single biggest mobile win. Hooks already
   exist (both canvases are IntersectionObserver-gated). Also **cap DPR** (Globe
   caps at 2; cap DotMatrix and consider 1.5 on mobile).
2. **`next/image` migration.** Raw `<img>` today; moving the content images to
   `next/image` gives responsive `srcset`, AVIF (config already allows it), and
   built-in lazy/decoding. Do it per-image and re-check layout, since it wraps
   markup.
3. **Gate the Markets videos to visibility** the same way Accounts already does
   (play only when the panel is on-screen). Purely a runtime saving — the video
   is only visible when its tab is active anyway.
4. **Ship smaller mobile video renditions.** The market/account clips are ~1000px
   H.264. A ~640–720px variant served on small screens (or `<source media=…>`)
   would cut a lot of bytes with no visible difference on a phone.

## Medium

5. **Defer the TradingView ticker.** `TickerTape` injects an external script;
   load it on idle / first interaction, and add `<link rel="preconnect">` to its
   origin and to `my.rocobroker.com` (the login/register portal).
6. **Long-cache static media.** On the host (Vercel already does this well for
   `public/`), ensure `Cache-Control: immutable` for the hashed build assets and
   a long max-age for `/home`, `/markets`, `/accounts`, `/faq`, `/documents`
   media. Bust by filename when a file changes.
7. **Code-split below-the-fold sections** on the home page via `next/dynamic`
   (e.g. the ticker, later sections) so the first paint ships less JS.

## Low / housekeeping

- GSAP: keep importing only the plugins in use (ScrollTrigger, SplitText) — avoid
  pulling the full bundle.
- Audit any unused CSS in the larger modules after the design settles.
- Remove the temporary `· build Mxx` footer marker before launch.

> Measure with Lighthouse / WebPageTest on a throttled mobile profile after the
> WebGL fallback (#1) — that's where the mobile numbers move most.
