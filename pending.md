# Pending Work

Last updated: 2026-09-29 (Asia/Tehran)

This file contains the remaining blog and admin work in implementation order.

## Blog and admin review follow-up

**Status (2026-09-28): pending.** Complete these items in the order listed.
Keep the work scoped to the admin article editor and the public blog/guide
experience.

### 1. Add visual and source-code editor modes

**Status (2026-09-28): complete in code; authenticated browser QA pending.**

- [x] Add distinct visual and HTML/source views to the admin article editor.
- [x] Preserve links, supported custom HTML/CSS, and article formatting when
  switching between the two modes.
- [x] Make existing links visible and editable instead of losing their target
  or presenting them as indistinguishable plain text.
- [x] Keep source editing inside the existing server-side sanitization and
  approved-content rules; unsupported or unsafe markup must be rejected rather
  than published.

### 2. Support editable two-button CTA blocks

**Status (2026-09-28): complete in code; authenticated browser QA pending.**

- [x] Add an editor-supported CTA block with two configurable buttons.
- [x] Allow editors to change each button's label and destination safely.
- [x] Use it for article sections such as “آماده معامله در بازگشایی بازار
  فارکس هستید؟” without requiring ad hoc markup for routine edits.

### 3. Restore and preserve inline article images

**Status (2026-09-29): preservation complete in code; historical asset recovery
requires an authorized legacy WordPress export and authenticated database audit.**

- [x] Audit the checked-in migration snapshot and add a database audit for
  editor, preview, published-revision, media-record, source, alt-text, and usage
  parity. The original importer intentionally removed inline images, so the
  checked-in 69-post snapshot contains zero recoverable inline image records.
- [x] Ensure managed inline images survive import, save, reopen, preview, and
  publish, with automated source/visual round-trip coverage.
- [x] Preserve the associated media record, canonical source, dimensions, alt
  text, optional title, and usage reference; editors can now edit metadata or
  replace the selected image safely.
- [ ] Run `npm run content:audit-media` against the authenticated production
  database and restore the original image assets from an authorized legacy
  WordPress export or backup. The current public WordPress API no longer exposes
  that source, so the missing binary assets cannot be reconstructed from this
  repository alone.

### 4. Make article preview match the public article

**Status (2026-09-29): complete in code; authenticated responsive browser QA pending.**

- [x] Render draft preview through the complete public article layout,
  including the real featured media, taxonomy, related/recent sections, and an
  article sidebar/table of contents derived from the saved editor document.
- [x] Add a clear “View published article” action when the current localization
  is already published.
- [ ] Verify preview parity for both LTR and RTL articles at desktop and mobile
  widths in an authenticated environment with database content.

### 5. Improve public article typography

**Status (2026-09-29): complete and locally verified.**

- [x] Justify Persian article body text without applying inappropriate
  justification to headings, controls, or short labels.
- [x] Add consistent public styling for article tables.
- [x] Normalize oversized headings and heading-to-content spacing.
- [x] Increase and standardize paragraph-to-paragraph spacing.
- [x] Verify the result across existing English and Persian articles at desktop
  and mobile widths, including a Persian article with multiple tables.

### 6. Reduce the space before the main article content

- [ ] Reduce excessive title and introductory-summary sizing where it pushes
  the article body too far below the fold.
- [ ] Tighten unnecessary vertical spacing in the article header.
- [ ] Move the table of contents closer to the beginning of the article.
- [ ] Check representative long-title and RTL articles at common viewport
  sizes so readers can reach the main content with substantially less
  scrolling.

### 7. Fix guide-sidebar anchor positioning

- [ ] When a guide-sidebar step such as “درخواست IB” is selected, align the
  destination heading near the top of the visible content area.
- [ ] Account for the fixed site header so the heading is neither obscured nor
  left halfway through the viewport.
- [ ] Verify direct anchor URLs, click navigation, browser back/forward, LTR,
  RTL, desktop, and mobile behavior.

## Exit criteria

- The editor can safely switch between visual and source views without losing
  supported links, markup, styling, or media.
- Editors can create and revise the standard two-button CTA without ad hoc
  code.
- Inline images remain present through the complete editorial workflow.
- Preview and published layouts agree on article content, navigation, and
  responsive behavior.
- Public articles have consistent tables, headings, paragraph spacing, and a
  shorter path from the page title to the main content.
- Guide sidebar links consistently place the selected heading below the fixed
  header.
