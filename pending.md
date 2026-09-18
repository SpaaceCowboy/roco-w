# Pending Work

Last updated: 2026-09-18 (Asia/Tehran)

Picking up from `currentstate.md`, which records how the deployment is put
together and why. This file is only what is left to do, in the order I would do
it. Repository baseline at the time of writing: `05e2c40`; the deployed commit
is tracked in `currentstate.md`.

The site is serving over HTTPS at `https://rocobroker.com` through Apache after
the apex cutover; `next.rocobroker.com` still works and redirects to the apex.
The public blog remains file-backed until the read cutover below completes.
Item 1 below is required before the site takes public traffic.

---

## Admin blog and SEO system

The existing blog is a build-time library in `src/content/blog/posts.json`.
The work below replaces that file as the writable source of truth without
changing existing public URLs, canonical policy, RSS output, or sitemap
coverage. PostgreSQL will hold content and immutable revisions; article media
will live in S3-compatible object storage rather than the deployment checkout.

### Phase 1 — foundation

**Goal:** establish the database, security boundary, and repository layer before
building editorial screens.

**Status (2026-09-17): complete in code; production activation pending.** The
schema, forward migrations, PostgreSQL connection, file-backed repository
adapter, role matrix, Google OIDC sessions, database allowlist, identity
binding, append-only audit trail, revocation commands, and protected `/admin`
shell are in place. Migrations, auth schema access, integrity constraints,
allowlisting, disabling, and session revocation were verified against a
disposable PostgreSQL 17 instance. The production host still needs a database,
Google OAuth credentials, an initial allowlisted admin, and the documented
environment variables before login can be activated; see
`docs/admin-content.md`.

- Add PostgreSQL connection and migration tooling with forward-only SQL
  migrations.
- Create the initial schema for admin users, roles, posts, localized content,
  immutable revisions, categories, tags, slug history, media, and audit events.
- Add explicit constraints for locale/slug uniqueness, valid publication
  states, and referential integrity.
- Add a content repository interface so public routes and admin features do not
  query the database directly.
- Add OIDC-based admin authentication, backed by a database allowlist. Provider
  MFA is mandatory; an email-domain claim alone never grants access.
- Add server-side role checks for `admin`, `editor`, and `reviewer` and a
  protected `/admin` shell.
- Record authentication and authorization-sensitive actions in the audit log,
  without request bodies, article content, tokens, or PII-heavy log fields.
- Add configuration validation and document the new environment variables.
- Add schema, authorization, and repository tests.

**Exit criteria**

- An unauthenticated request cannot access any admin page or mutation.
- A signed-in but non-allowlisted identity is denied.
- Migrations apply cleanly to an empty PostgreSQL database.
- Role checks and audit writes are covered by automated tests.
- The existing file-backed public blog still builds unchanged.

### Phase 2 — editing and media

**Goal:** create and safely revise multilingual draft content.

**Status (2026-09-17): complete in code; production storage activation
pending.** The protected article list and filters, six-locale TipTap editor,
RTL editing, serialized debounced autosave, optimistic locking, immutable
revision comparison and rollback, signed draft previews, translation creation,
and S3-compatible direct image uploads are implemented. Upload completion
verifies the stored bytes, SHA-256 digest, actual format, dimensions, and size
before creating a media record; saved documents rewrite image sources from the
validated record. A clean PostgreSQL 17 migration and the stale-write/media
constraints passed against a disposable database. Production still needs the
Phase 1 database/auth activation plus the documented R2 bucket, custom domain,
credential, and CORS configuration in `docs/admin-content.md`.

- Build the article list with locale, status, author, category, and date filters.
- Build an RTL-aware rich-text editor for headings, lists, links, quotes,
  tables, images, and approved callouts.
- Store structured editor JSON as the source and separately store sanitized,
  server-rendered HTML for public delivery.
- Add debounced autosave with optimistic locking; reject stale writes instead
  of silently overwriting another session.
- Add translation management for `en`, `fa`, `de`, `ru`, `ar`, and `zh-hans`.
- Add immutable revision snapshots, comparison, and rollback-to-new-draft.
- Add preview tokens and render drafts through the real public article layout.
- Add direct signed uploads to S3-compatible storage, image validation,
  dimensions, checksums, alt text, and usage references.
- Ensure the editor, dialogs, keyboard navigation, touch targets, and focus
  states work in both LTR and RTL.

**Exit criteria**

- An editor can create, autosave, preview, revise, and roll back English and
  Persian drafts without touching `posts.json`.
- Unsafe HTML and upload types are rejected server-side.
- Concurrent edits produce a visible conflict instead of lost work.

### Phase 3 — review, scheduling, and publishing

**Goal:** make publication transactional, observable, and reversible.

**Status (2026-09-17): complete in code; production activation pending.**
Draft/review/publish/schedule/unpublish/archive/restore
transitions, exact approved revisions, actor audit records, UUID idempotency,
concurrent-transition rejection, cache refresh outcome records, and the bounded
scheduled-publication endpoint are implemented. Clean PostgreSQL 17 migrations,
idempotent replay, concurrent publish, archive/restore/unpublish, and due
scheduled publication checks pass. The standard workflow allows authorized
administrators to self-approve and does not impose a separate compliance gate;
one can be added later if the business adopts that process. Failed cache
refreshes are surfaced without rolling back publication and can be retried from
the workflow panel through an authorized retry endpoint. The public site remains
file-backed until the planned Phase 5 read cutover, so public-output parity is
verified there rather than claimed in this phase.

- Implement `draft -> review -> scheduled/published -> archived` transitions.
- Allow self-approval for an authorized solo admin while retaining the reviewer
  and exact approved revision in the audit trail.
- Add an optional compliance-review gate for financial claims, promotions,
  leverage, regulation, and jurisdiction-specific content.
- Publish and unpublish in database transactions using idempotency keys.
- Revalidate the article, localized indexes, sitemap, and RSS after a successful
  state change; surface cache failures as publishing warnings.
- Make scheduled content eligible from `scheduled_at` and use bounded cache
  revalidation so publication does not rely on an in-memory timer.
- Add archive and restore. Permanent deletion remains an explicit admin-only
  operation and is not part of bulk actions.

**Exit criteria**

- Publishing updates the public article, blog listing, RSS, and sitemap.
- Repeated publish requests cannot create conflicting outcomes.
- A failed downstream refresh is visible and retryable.

### Phase 4 — SEO controls

**Goal:** give editors useful controls without allowing accidental indexation
damage.

**Status (2026-09-17): complete in code; public wiring deferred to Phase 5
cutover.** The editor now has SEO title/description, separate robots controls,
featured and 1200×630 social images, social overrides, reviewer-gated canonical
overrides, search/social previews, and editorial checks. SEO and media data are
stored in immutable revisions; the prepared public read model generates
canonical, real-translation-only hreflang, BlogPosting, breadcrumbs, Open Graph,
Twitter, sitemap/feed eligibility, and safe JSON-LD from the exact published
revision. Locale-aware slug history uses transaction-scoped namespace locks,
rejects current/history collisions, and cannot reclaim old routes into loops.
Clean PostgreSQL 17 migrations and service tests verify approved-revision
metadata and redirect history. The current file-backed public routes remain
unchanged until Phase 5 intentionally enables database reads and redirects.

- Add SEO title, meta description, slug, robots, featured image, social title,
  social description, and 1200x630 social-image fields.
- Keep generated same-site canonicals as the default. Custom canonical changes
  require reviewer permission and reject unapproved hosts.
- Generate `BlogPosting`, breadcrumbs, Open Graph, Twitter cards, sitemap data,
  RSS data, and real-translation-only hreflang from published records.
- Use each article's social/featured image instead of the current global OG
  image.
- Add search-result and social-card previews.
- Add editorial checks for missing or duplicate metadata, heading order,
  missing alt text, broken internal links, oversized images, and redirect
  collisions. Do not present keyword density as a ranking guarantee.
- Add slug history with permanent redirects, collision checks, and redirect-loop
  prevention.

**Exit criteria**

- Changing a published slug preserves the previous URL with one permanent
  redirect.
- Canonical, hreflang, structured data, RSS, and sitemap tests pass for native
  translations and fallback content.

### Phase 5 — content migration and read cutover

**Goal:** migrate all current content without losing URLs, rankings, or article
fidelity.

**Status (2026-09-18): complete.** The production import and parity passed
(69/69, 0 mismatches) and the read cutover is live with
`CONTENT_SOURCE=database`. The idempotent `sourceId` importer covers all 69
snapshot articles,
taxonomies, dates, authors, reading time, featured images, table-of-contents,
slugs, immutable revisions, media usage, and audit records. Its dry run reports
zero rejected patterns, text changes, or lost heading anchors; TipTap's expected
table normalization removes 39 `<thead>` wrappers while retaining the header
rows and their text. Public article, index, related-content, RSS, sitemap, SEO,
media, and historical-slug reads now use a repository selected by
`CONTENT_SOURCE`, which remains `file` by default. The fail-closed parity command
checks counts, URLs, metadata, content, media, taxonomy, publication, initial
redirect state, and index eligibility before database activation. The file
fallback and rollback procedure are documented in `docs/admin-content.md` and
the default file-backed production build passes. The production database/R2
configuration is done, the write import succeeded (69 articles, 0 failures),
and `npm run content:parity` returns zero mismatches. The database-backed smoke
test passed and `CONTENT_SOURCE=database` is live; `posts.json` remains the
read-only fallback for one production release and can be removed in a later
explicit change. Note the localized canonical paths: the Persian blog index is
`/fa/وبلاگ` and Persian articles are `/fa/{slug}`; `/fa/blog` and
`/fa/blog/{slug}` are permanent aliases.

- Build an idempotent importer keyed by the existing WordPress `sourceId`.
- Import all 69 English and Persian articles, taxonomy data, dates, authors,
  image metadata, table-of-contents data, and current slugs.
- Sanitize legacy HTML and report rejected or changed elements for review.
- Compare counts, URLs, titles, metadata, HTML, redirects, RSS, and sitemap
  output between the file and database repositories.
- Switch public reads to PostgreSQL behind a configuration flag.
- Retain `posts.json` as a read-only migration snapshot for one production
  release, then remove the fallback in a later explicit change.

**Exit criteria**

- Every existing indexable article resolves at the same public URL and has the
  intended canonical.
- Database-backed output passes parity checks before the read flag is changed.
- Rollback to file-backed reads is documented and tested.

### Phase 6 — production hardening

**Goal:** prove the system can be operated and recovered safely.

**Status (2026-09-18): in progress.** Per-user rate limits (autosave, uploads,
previews, mutations) and preview-page IP limiting are implemented on top of
Better Auth's authentication limit. Structured single-line JSON logging with
consecutive-failure alerting covers auth, media upload, publication, cache
refresh, scheduler delay, and API failures. Security tests cover CSRF/origin,
session expiry, stored-XSS sanitization, and rate-limit behavior, alongside the
existing authorization and redirect tests. `docs/admin-runbook.md` documents
ownership, key rotation, provider outages, the launch checklist, and the
security/accessibility QA checklists; `docs/dependency-advisories.md` classifies
the six known toolchain advisories. The PostgreSQL password was rotated, PM2 log
rotation is configured, and the read cutover is live. The PostgreSQL and R2
restore drills, the scheduled-publication timer install, and origin lockdown
were completed 2026-09-18. Still open: alert destinations and owners are
placeholders, and the manual keyboard/RTL/mobile QA has not been run.

- Exercise backup and point-in-time restore for PostgreSQL and object storage.
- Add structured logs and alerts for authentication failures, upload failures,
  publish failures, scheduled-publication delay, and cache refresh failures.
- Add rate limits to authentication callbacks, previews, uploads, autosave, and
  mutations.
- Run authorization, CSRF/origin, stored-XSS, malicious-upload, redirect, and
  session-expiry tests.
- Run accessibility, keyboard, mobile, Persian RTL, Arabic RTL, and
  reduced-motion QA.
- Add an operational runbook for user access, failed publishes, rollback,
  restore, key rotation, and provider outage.

**Exit criteria**

- A restore drill succeeds from documented steps.
- Security and accessibility checks pass.
- Operational ownership and alert destinations are documented.

### Decisions required before the relevant phase

- **OIDC provider (Phase 1): resolved.** Google Workspace is implemented. MFA
  enforcement remains a Google Workspace policy setting.
- **Object storage (Phase 2):** Cloudflare R2 is preferred; any S3-compatible
  service can be substituted without changing the content model.
- **Compliance workflow (Phase 3): resolved.** Use the standard editorial
  workflow with authorized admin self-approval. No mandatory second-review gate
  is included.

---

## 1. Cookie policy — gate live chat behind consent (blocking for public launch)

The live-chat widget loads for every visitor on every page **before** any
cookie-consent choice, and it sets its own visitor cookies at that moment. The
production provider is the self-hosted Chatwoot inbox
(`NEXT_PUBLIC_LIVE_CHAT_PROVIDER`; `src/config/chat.ts` defaults to `chatwoot`
and keeps tawk.to and Crisp selectable for rollback or testing). Whichever
provider is active, live chat is the only third party on the site that runs
ungated.

**Decision (2026-09-18): gate it.** Move the injection in
`src/components/ui/LiveChat/LiveChat.tsx` behind a new `liveChat` category in
`@/lib/consent`, exactly as the TradingView widgets already are. This means:

- `src/lib/consent.ts` gains a `liveChat: boolean` category and bumps the storage
  key to `roco.cookieConsent.v3` (re-prompt, remove `v2`).
- `LiveChat.tsx` subscribes to `useConsentChoice()` and injects the provider only
  when `liveChat === true`; on revocation it tears the widget down (Chatwoot
  `reset()`, remove the injected script and host style).
- `CookieConsent.tsx` gains an off-by-default live-chat toggle wired into Accept
  all / Reject all / Save, and discloses that the provider sets visitor cookies
  and collects conversations.
- The six-locale copy and translation keys are drafted but need compliance
  sign-off, same as the risk-disclosure wording, before launch.

This is the one item here with actual regulatory exposure — everything else on
this list is operational.

---

## 2. PM2 log rotation

Small, and it removes a real risk before public traffic. PM2's log files grow
without bound, and this host also runs cPanel, Exim, Dovecot and WordPress —
filling the disk takes mail and Apache down with the site.

```bash
cd /home/rocoweb
E="HOME=/home/rocoweb PM2_HOME=/home/rocoweb/.pm2"
P="/home/rocoweb/.local/bin:/opt/rocobroker-node/bin:/usr/bin:/bin"

runuser -u rocoweb -- env $E PATH=$P pm2 install pm2-logrotate
runuser -u rocoweb -- env $E PATH=$P pm2 set pm2-logrotate:max_size 10M
runuser -u rocoweb -- env $E PATH=$P pm2 set pm2-logrotate:retain 14
```

Check afterwards that `pm2 list` still shows `rocobroker-next` online, and that
the module survives `systemctl restart pm2-rocoweb`.

---

## 3. Apex cutover — `rocobroker.com` to Next.js — DONE

**Done (2026-09-18).** The apex is proxied to Next.js with the `Host`-conditional
include; `next.rocobroker.com` redirects to the apex and remains as fallback.
Webmail/cPanel hostnames still serve cPanel. The details below are retained for
rollback reference only.

### 3a. The proxy must be conditioned on `Host`

The apex vhost's `ServerAlias` carries `mail.`, `webmail.`, `cpanel.`,
`webdisk.`, `autoconfig.`, `autodiscover.`, `cpcalendars.` and `cpcontacts.`
A blanket `ProxyPass /` there sends webmail and cPanel logins to Next.js and
locks you out of mail administration.

Proxy only when the request is actually for the website:

```apache
ProxyPreserveHost On
ProxyPass /.well-known !
<If "%{HTTP_HOST} =~ /^(www\.)?rocobroker\.com$/i">
  ProxyPass / http://127.0.0.1:3100/
  ProxyPassReverse / http://127.0.0.1:3100/
</If>
```

Verify **before** reloading, and again after, that `webmail.rocobroker.com` and
`cpanel.rocobroker.com` still serve cPanel and not the Next.js site.

### 3b. Port 80 should redirect, not proxy

On the apex, port 80 should send everything to HTTPS while keeping
`/.well-known` local for ACME. That leaves the app unreachable over plain HTTP,
which matters because header-based trust (see item 4) is only sound if the app
cannot be reached except through the proxy chain.

### 3c. The switch has to be atomic

`src/config/legacyRedirects.mjs` assumes the old WordPress URLs stop being
served by WordPress at the same moment Next.js starts serving them. A window
where both are live means duplicate content and redirect chains against a domain
with existing rankings — the whole reason `localePrefix: "as-needed"` was chosen
in the first place.

Plan the WordPress retirement in the same change, not afterwards. Mail services
must not be touched by it.

### 3d. Order of operations

1. Add the `Host`-conditional include to the apex userdata directories
   (`std` and `ssl`, user `rocobrok`).
2. `/scripts/ensure_vhost_includes --user=rocobrok`
3. `apachectl configtest` — reload **only** on `Syntax OK`.
4. `systemctl reload httpd`
5. Verify in this order: apex serves Next.js, `www.` serves Next.js, webmail
   still serves cPanel, `/metatrader-5` redirects to `/platforms/metatrader-5`,
   contact form delivers.
6. Then orange-cloud the apex in Cloudflare and do item 4.

Keep `next.rocobroker.com` working throughout as a fallback and comparison. Only
remove it once the apex has been stable for a while.

---

## 4. Origin lockdown — after the apex is orange-clouded

Until this is done, `cf-connecting-ip` is forgeable by anyone who reaches
`69.167.169.231` directly, so the per-IP contact rate limit is a brake on casual
abuse rather than a boundary. `src/lib/rateLimit.ts` says so in its comment.

```bash
csf -a $(curl -s https://www.cloudflare.com/ips-v4 | tr '\n' ' ')
```

Then in `/etc/csf/csf.conf` remove `443` from `TCP_IN`.

**Leave port 80 open.** Let's Encrypt validates over port 80 from its own IP
ranges, not Cloudflare's. Closing it breaks AutoSSL renewals for every domain on
this host, including the mail hostnames — and you would not find out for about
sixty days.

**Never touch the SSH port**, and keep a second SSH session open while applying
the change.

---

## 5. Expired origin certificates — unrelated, but outstanding

`bo.rocobroker.com`, `my.rocobroker.com` and `webtrading.rocobroker.com` have
self-signed origin certificates that expired **2026-05-16**. AutoSSL cannot fix
them: they resolve to Cloudflare (`172.67.190.36` and similar) rather than to
this host, so HTTP validation fails every run.

Harmless while the Cloudflare SSL/TLS mode is Flexible or Full. If anyone ever
switches it to **Full (strict)**, the client portal and the webtrader break
immediately — the two subdomains a broker least wants down.

Check the current SSL/TLS mode in Cloudflare, and if these origins should have
valid certificates, Cloudflare Origin CA certificates are the usual answer for
orange-clouded hosts.

Also note the apex certificate is reported "Incomplete" because `cpanel.`,
`webmail.`, `autodiscover.` and friends have no public DNS in Cloudflare.
Harmless for the website; it means webmail-over-HTTPS by hostname has no valid
certificate.

---

## 6. Small tidy-ups

- ~~`/opt/rocobroker-next/.env.production` still carries the unused
  `RESEND_API_KEY` line~~ — removed 2026-09-18.
- Confirm `CONTACT_EMAIL_TO` points at a mailbox somebody actually reads. A
  wrong-but-valid address gives a `200` and a lost enquiry, which looks healthier
  than a failure.

---

## 7. PostgreSQL database password rotation

A `DATABASE_URL` value was pasted into the import session, so the database
password is treated as exposed. Rotate it before the read cutover:

```bash
sudo -u postgres psql -c "ALTER ROLE rocobroker WITH PASSWORD '<new>';"
```

Then update `DATABASE_URL` in `/opt/rocobroker-next/.env.production` (and any
backup/restore invocation or runbook reference), restart the app, and re-run
`npm run content:parity` to confirm the connection.

---

## 8. Scheduled-publication timer — apex URL

The timer command in `docs/admin-content.md` points at
`https://next.rocobroker.com/...`, which now 301s to the apex. Point it at
`https://rocobroker.com/api/admin/scheduled-publications` and confirm the next
run returns 2xx. Keep `SCHEDULED_PUBLISH_SECRET` in the timer's protected
environment file.

---

## 9. Restore drill and alert ownership

The PostgreSQL and object-storage restore drill from `docs/admin-runbook.md`
has not been run, and every ownership/alert destination in that runbook is still
`TODO`. Complete both before the read cutover.
