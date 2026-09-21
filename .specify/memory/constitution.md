<!--
Sync Impact Report
==================
Version change: (unversioned template scaffold) -> 1.0.0
Ratification: 2026-09-21 (initial adoption; no prior constitution existed)
Modified principles: none (initial adoption)
Added sections:
  - Core Principles I-V
  - Technology and Deployment Constraints
  - Development Workflow and Quality Gates
  - Governance
Removed sections: none
Follow-up TODOs:
  - RATIFICATION_DATE is recorded as the initial adoption date. Confirm whether
    an earlier governance document predates it; if so, amend the date.
  - Operational alert destinations and manual QA ownership remain open items
    owned by docs/admin-runbook.md, not by this constitution.
-->

# RocoBroker Constitution

## Core Principles

### I. Repository and Architecture Boundaries

The public site and the admin panel MUST share one application and one data
contract. Public routes and components MUST read content only through the
`PublishedContentRepository` interface (`src/lib/content/repository.ts`); they
MUST NOT import the database client or issue SQL directly. The active backend
is selected solely by `CONTENT_SOURCE` (`file` or `database`, default `file`),
and `file` MUST remain a working fallback until the database read path is
explicitly retired in its own change.

- Server-only modules MUST declare `import "server-only"`; client components
  MUST NOT import them.
- Framework entry points MUST stay thin: routing, layout, and rendering in
  `src/app`, reusable logic in `src/lib`.
- New behavior MUST extend the existing abstractions (repository, service,
  policy, validation modules) rather than bypassing them.
- The production application MUST NOT call WordPress. Import utilities under
  `scripts/` are migration tools, not runtime dependencies.

Rationale: one contract keeps the file and database backends interchangeable
and allows the public read path to be cut over and rolled back safely.

### II. Localization and RTL Are Structural (NON-NEGOTIABLE)

Every user-visible string MUST live in `messages/<locale>.json`; hard-coded
display copy in components is prohibited. The single source of locale truth is
`src/i18n/routing.ts`: `en`, `de`, `ru`, `ar`, `fa`, `zh-hans`, with
`defaultLocale: "en"` and `localePrefix: "as-needed"`.

- Existing public `pathnames` MUST be preserved. A URL change requires a
  documented permanent redirect and slug-history entry, never a silent rename.
- Adding a locale requires the locale code, an RTL classification when
  applicable, and all six message catalogs to stay complete; partial locales
  MUST fall back to English with a visible notice.
- Arabic and Persian MUST render right-to-left through `isRtl` and
  `dir="rtl"`. Layout CSS MUST use logical properties
  (`margin-inline-start`, not `margin-left`); physical-direction CSS is
  prohibited.
- `hreflang` and canonical output MUST reference real translations only, never
  fallback content.
- UI changes MUST be verified in at least one LTR and one RTL locale, at
  desktop and mobile widths, with keyboard navigation.

Rationale: locale is a first-class routing dimension, not a translation layer
added afterward; violating it breaks established SEO URLs and RTL usability.

### III. Security and Privacy Boundaries (NON-NEGOTIABLE)

Authentication alone grants nothing. Access MUST require a signed-in, verified
identity that is present and active in the `admin_users` allowlist; the system
MUST fail closed when auth configuration or a session is missing or expired.

- Every mutation MUST enforce a server-side role permission check
  (`admin`, `editor`, `reviewer`); client-side checks are never authorization.
- Sender identity and same-origin enforcement (`Origin` header) MUST gate admin
  and contact mutations, and MUST derive the expected origin from trusted proxy
  headers, not from `request.url`.
- All external input MUST be validated server-side with Zod, HTML MUST be
  sanitized before storage or render, and uploads MUST be verified by actual
  bytes, format, dimensions, checksum, and size before a record is created.
- The audit log is append-only at the database level. Request bodies, article
  content, tokens, credentials, and PII MUST NOT be written to audit records or
  structured logs; only identifiers, counts, status codes, and latency belong
  there.
- Secrets MUST be at least 32 characters, supplied only through environment
  configuration, and never committed to the repository.
- Third-party embeds and widgets (analytics, marketing, external media, live
  chat) MUST load only after the matching cookie-consent category is granted
  and MUST tear down on revocation.
- Rate limits MUST be applied to authentication callbacks, autosave, uploads,
  previews, and mutations. Limits are abuse brakes and MUST NOT be described as
  a security boundary.

Rationale: the admin panel controls public financial content on a
TLS-terminating proxy; a forged `Origin`, a stale session, or an unvalidated
upload is a direct publication risk.

### IV. Data Integrity and Reversibility

PostgreSQL is the content authority when enabled, and its invariants MUST be
enforced in the database, not only in application code.

- Migrations under `drizzle/` are forward-only. Applied migrations MUST NOT be
  edited; changes require a new `npm run db:generate` migration, validated with
  `npm run db:check` and `npm run db:migrate`.
- Published content MUST be reproducible from immutable revision snapshots.
  Rollback creates a new draft; history is never rewritten.
- Publication transitions MUST run in a database transaction with an
  idempotency key, MUST reject concurrent or stale writes through optimistic
  locking, and MUST reject invalid state transitions.
- Schema changes MUST include foreign keys, uniqueness, and check constraints
  for locale/slug uniqueness, valid publication states, and referential
  integrity.
- Slug history MUST preserve old URLs with one permanent redirect and MUST
  reject collisions, current-route reuse, and redirect loops.
- PostgreSQL and object-storage backups MUST exist, and restore MUST be
  exercised from documented steps before the content cutover is trusted.
- Permanent deletion MUST remain an explicit, individually authorized action;
  it MUST NOT be exposed as a bulk operation.

Rationale: editorial mistakes and operator error must be recoverable, and a
URL with existing rankings must never dead-end or loop.

### V. Test-Verified, Documented Change (NON-NEGOTIABLE)

No change is complete until it is proven and recorded.

- Tests are colocated as `*.test.ts` and run with `npm test` (`node --test`
  via `tsx`). Pure policy, validation, permission, and token logic MUST be
  separated from `server-only` modules so it remains unit-testable, as
  `session-policy.ts` demonstrates.
- Every change MUST pass `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` (Webpack) before deployment.
- Security-sensitive behavior MUST have automated coverage for origin/CSRF,
  session expiry, permissions, stored-XSS sanitization, and rate limiting.
- The content parity check (`npm run content:parity`) is fail-closed: a
  non-zero mismatch count MUST block a content-source change.
- User-visible changes MUST be recorded in `changelog.md` in the same commit
  that implements them.
- Deployment-affecting changes MUST update `currentstate.md`; remaining work
  MUST be tracked in `pending.md`.
- Compliance-sensitive copy (risk disclosures, cookie/live-chat disclosure)
  MUST be signed off before public launch.

Rationale: the repository is the operational record for a live regulated
brokerage site; undocumented or unverified drift is the primary failure mode.

## Technology and Deployment Constraints

The stack is fixed unless an amendment justifies a change:

- **Application**: Next.js 16 App Router + React 19, TypeScript `strict`.
  Production builds use Webpack so the SWC WASM fallback works on AlmaLinux 8
  (glibc 2.28); `output: "standalone"` is required.
- **Data**: PostgreSQL 17 accessed through Drizzle ORM (`pg` pool); article
  media in S3-compatible object storage (Cloudflare R2), never in the checkout.
- **Content editing**: TipTap editor JSON is the source of truth; sanitized,
  server-rendered HTML is stored separately for public delivery.
- **Localization**: next-intl with the request, routing, and navigation modules
  in `src/i18n/`.
- **Validation**: Zod at every trust boundary; `sanitize-html` for HTML.

Deployment constraints:

- The app runs under PM2 owned by systemd (`pm2-rocoweb`), bound privately to
  `127.0.0.1:3100`. Start, stop, and restart through `systemctl`, never a second
  PM2 daemon.
- Apache terminates TLS and proxies through host-conditional vhost includes in
  cPanel userdata; `ProxyPreserveHost On` and a local `/.well-known` exception
  are load-bearing and MUST NOT be removed.
- Configuration lives in `/opt/rocobroker-next/.env.production` (mode 600).
  `NEXT_PUBLIC_*` values are inlined at build time; a runtime-only value never
  reaches the browser.
- The Node runtime MUST be referenced through the `/opt/rocobroker-node`
  symlink, never a versioned path.
- Security headers in `next.config.mjs` MUST remain on every route. A
  Content-Security-Policy MUST be introduced in report-only mode before it is
  enforced; HSTS `preload` MUST NOT be enabled until every subdomain serves
  HTTPS.
- Scheduled publication runs through the systemd timer/service in `deploy/`
  against the apex endpoint, using `SCHEDULED_PUBLISH_SECRET` from a root-owned
  environment file.

## Development Workflow and Quality Gates

1. **Specify before building.** Non-trivial work proceeds through the Spec Kit
   flow (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`,
   `/speckit-implement`). The implementation plan MUST pass a constitution
   check against these principles.
2. **Smallest correct change.** Prefer existing modules and the standard
   library over new abstractions or dependencies; a new dependency requires an
   explicit justification.
3. **Verify locally.** Run `npm run typecheck`, `npm run lint`, `npm test`, and
   `npm run build` before requesting review or deploying.
4. **Review security and recovery.** Changes touching auth, uploads,
   publishing, redirects, or migrations require an independent review of the
   permission, validation, idempotency, and rollback paths.
5. **Run manual QA for user-facing work.** Keyboard, screen-reader, mobile, and
   RTL passes follow `docs/admin-runbook.md` checklists.
6. **Record the change.** Update `changelog.md`, and `currentstate.md` /
   `pending.md` when deployment state or remaining work changes.
7. **Deploy the documented way.** Follow the deploy procedure in
   `currentstate.md`, then verify both the root response and the contact probe;
   a healthy root alone is not proof of a healthy deployment.

## Governance

This constitution supersedes other development practices. Where repository
documentation and this document conflict, this document wins and the
documentation MUST be corrected.

- **Amendments** require a written proposal, an explicit version bump, and
  review for impact on existing features and deployed configuration. Amendments
  MUST be recorded in `changelog.md`.
- **Versioning** follows semantic versioning: MAJOR for backward-incompatible
  principle removal or redefinition, MINOR for a new principle or materially
  expanded guidance, PATCH for clarifications and non-semantic edits.
- **Compliance** is verified at every implementation plan (constitution check)
  and every review. Unjustified complexity or a violated NON-NEGOTIABLE
  principle MUST block merge until remediated or the constitution is amended.
- **Runtime guidance** lives in `docs/admin-content.md` (configuration,
  publishing, migration), `docs/admin-runbook.md` (operations, security, QA),
  `currentstate.md` (deployment state), and `pending.md` (remaining work).

**Version**: 1.0.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-09-21
