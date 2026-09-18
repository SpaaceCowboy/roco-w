# Content admin operations

The internal content panel is served at `/admin`. It uses Google OpenID Connect
for authentication and `admin_users` as the application authorization
allowlist. A valid Google login alone never grants access.

## Required configuration

Apply database migrations before enabling authentication:

```bash
npm run db:migrate
```

Set these in `.env.production`:

```dotenv
DATABASE_URL=postgresql://...
DATABASE_POOL_MAX=10
ADMIN_AUTH_BASE_URL=https://rocobroker.com
ADMIN_AUTH_SECRET=<at least 32 random characters>
ADMIN_GOOGLE_CLIENT_ID=<Google OAuth web client ID>
ADMIN_GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
ADMIN_GOOGLE_HOSTED_DOMAIN=rocobroker.com
CONTENT_MEDIA_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CONTENT_MEDIA_S3_REGION=auto
CONTENT_MEDIA_S3_ACCESS_KEY_ID=<bucket-scoped R2 access key>
CONTENT_MEDIA_S3_SECRET_ACCESS_KEY=<bucket-scoped R2 secret>
CONTENT_MEDIA_S3_BUCKET=rocobroker-content
CONTENT_MEDIA_PUBLIC_BASE_URL=https://media.rocobroker.com
# Optional; otherwise ADMIN_AUTH_SECRET signs draft previews.
ADMIN_PREVIEW_SECRET=<at least 32 random characters>
SCHEDULED_PUBLISH_SECRET=<at least 32 random characters>
# Optional; the configured public site host is already allowed.
ADMIN_ALLOWED_CANONICAL_HOSTS=www.rocobroker.com
# Keep file-backed until the migration parity command passes.
CONTENT_SOURCE=file
```

Generate the session secret with a cryptographically secure generator, for
example `openssl rand -base64 48`. Do not commit it.

Create a Google OAuth **Web application** client and register an authorized
redirect URI matching the configured origin exactly:

```text
https://rocobroker.com/api/auth/callback/google
```

The apex cutover is complete, so the redirect URI and `ADMIN_AUTH_BASE_URL`
above are the live values. Keep `https://next.rocobroker.com/api/auth/callback/google`
registered as a second redirect URI only while `next.rocobroker.com` remains a
fallback origin.

`ADMIN_GOOGLE_HOSTED_DOMAIN` is optional but recommended for Workspace. The
database allowlist remains mandatory even when the domain restriction is set.
Enforce MFA through the Google Workspace authentication policy; the application
does not treat possession of an ordinary Google account as evidence of MFA.

## Bootstrap an administrator

Run migrations, then allowlist the exact verified Google email:

```bash
npm run admin:allowlist -- \
  --email owner@rocobroker.com \
  --role admin \
  --name "Owner"
```

Available roles are `admin`, `reviewer`, and `editor`. Re-running the command
updates the role and re-enables the account, but does not replace an identity
already bound to another Google login.

On first successful login, the allowlist row is permanently bound to the local
authentication user. Google provider identifiers are held by the auth account
record, while Google access, refresh, and ID tokens are deliberately discarded.

## Disable access

```bash
npm run admin:disable -- --email owner@rocobroker.com
```

This disables the allowlist row and deletes all of that user's active sessions
in one transaction. It does not delete their audit history.

## Session policy

- Maximum session lifetime: eight hours.
- Server-side session lookup on protected requests; no cookie session cache.
- Account linking disabled.
- Authentication endpoints rate-limited.
- Missing or partial authentication configuration fails closed.
- `/admin` and its sign-in page are `noindex` and do not use locale routing.

## Rate limits and operational logging

Admin mutations are protected by per-signed-in-user fixed-window limits on top
of Better Auth's own per-IP authentication limit (20 requests per minute):

- Autosave (`PATCH` article): 120 requests per minute.
- Create, publish, rollback, translation, and refresh-retry: 40 per minute.
- Media upload URL issuance and completion: 30 per minute.
- Draft preview token issuance: 30 per minute.
- Draft preview page access: 30 per minute per client IP, enforced in middleware
  before the page renders.

Exceeded limits return HTTP 429 with a `Retry-After` header. The limiter is
in-process and resets on deploy; move it to Redis before running PM2 in cluster
mode or adding a second application host.

The application emits one-line JSON records with `event` and `outcome` fields
for `admin.auth`, `admin.rate_limit`, `admin.media.upload`, `admin.publish`,
`admin.cache_refresh`, `admin.scheduled_publication.delay`, and `admin.api`.
After `ADMIN_ALERT_FAILURE_THRESHOLD` consecutive failures on one stream
(default 5) it emits an `admin.alert` record; a success clears the streak.
Records never contain article bodies, tokens, email addresses, or other
customer data. Ship them to the log monitor and alert on `event=admin.alert`.

## Article image storage

The media adapter uses the S3 protocol and is configured for Cloudflare R2 by
default. Use a dedicated bucket and a token limited to object read/write/delete
for that bucket. The application never exposes the storage credential.

Uploads use a five-minute signed PUT. The browser-provided type, size, checksum,
and dimensions are not trusted: after upload, the server downloads the object,
checks its SHA-256 digest, detects its real image format and dimensions, and
only then creates the media database row. Rejected objects are deleted.
Accepted formats are JPEG, PNG, WebP, and AVIF, up to 10 MiB and 12,000 pixels
on either edge.

Configure the R2 bucket CORS policy to allow `PUT` from the exact admin origins
and the two signed headers. Keep staging and production origins explicit:

```json
[
  {
    "AllowedOrigins": [
      "https://next.rocobroker.com",
      "https://rocobroker.com"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "x-amz-meta-sha256"],
    "MaxAgeSeconds": 300
  }
]
```

Attach `CONTENT_MEDIA_PUBLIC_BASE_URL` to the bucket through the intended custom
domain. Apply a restrictive `Content-Security-Policy` and
`X-Content-Type-Options: nosniff` on that hostname. Draft editor saves rewrite
all image URLs from database media records, so a client cannot substitute an
unapproved remote source for a valid media ID.

## Draft workflow

- Autosave waits 1.2 seconds after editing stops and uses the current row
  version. A stale version returns HTTP 409 and the editor stops saving until
  the user reloads; it never silently overwrites the other session.
- Every accepted save creates an immutable revision. Restoring a revision makes
  a new draft revision rather than mutating history.
- Each post can have one localization for each of `en`, `fa`, `de`, `ru`, `ar`,
  and `zh-hans`. Persian and Arabic editors render RTL.
- Preview links are HMAC-signed, expire after 15 minutes, are `noindex`, and
  render through the normal public article component. They contain no content.

## Review, publishing, and scheduling

The workflow is `draft -> review -> scheduled/published -> archived`. Editors
can request review. Reviewers and administrators can return content to draft;
reviewers and administrators can publish; archive and restore require the
archive permission. Publishing records the exact immutable revision and
reviewer identity. Publish, unpublish, archive, restore, and scheduling requests
use UUID idempotency keys and are safe to retry with the same payload.

After a state change, the article, localized index, localized feed, and sitemap
are revalidated. A refresh failure does not roll back the database publication;
it is stored and returned as an operational warning.

Run scheduled publication through the application so cache revalidation uses
the same path as an interactive publish. The endpoint processes at most 50 due
items per invocation and derives a stable idempotency key per approved
revision. Example systemd timer command:

```bash
curl --fail --silent --show-error \
  --max-time 30 \
  --retry 2 \
  --request POST \
  --header "Authorization: Bearer ${SCHEDULED_PUBLISH_SECRET}" \
  https://rocobroker.com/api/admin/scheduled-publications
```

The host runs curl 7.61 (AlmaLinux 8), which predates `--fail-with-body` and
`--retry-all-errors`; the flags above are the compatible set. Keep the secret in
the timer's protected environment file, not in the unit or the repository. The
endpoint returns non-2xx when the batch itself fails; cache refresh warnings are
returned per item for alerting.

## SEO and route policy

- Article title and excerpt are safe fallbacks for SEO title and description;
  editors can override both and see search-result and social-card previews.
- Canonicals are generated from `NEXT_PUBLIC_SITE_URL`, locale, and the approved
  revision slug. Only reviewers and administrators can set a custom canonical,
  and only HTTPS hosts in the allowlist are accepted.
- `noindex` and `nofollow` are separate controls. Database-backed sitemap and
  feed reads exclude `noindex` records.
- Hreflang only includes translations that are independently published. English
  is `x-default` when an English translation exists.
- SEO and media fields are copied into every immutable revision. Public metadata
  reads the exact published revision, never the mutable working draft.
- Slug changes reserve the old locale/slug route. Current and historical routes
  share a locked namespace during saves, and historical slugs cannot be
  reclaimed; this prevents collisions and redirect loops.
- The editorial checker reports missing or duplicate metadata, heading-level
  jumps, missing featured-image alt text, unresolved known internal links, and
  social images that differ from 1200×630 or exceed 2 MB. These are editorial
  checks, not ranking guarantees.

## Legacy content migration and public-read cutover

Keep `CONTENT_SOURCE=file` while migrating. The importer is keyed by the legacy
WordPress `sourceId`, creates immutable published revision 1, imports taxonomy,
dates, author, reading time, table of contents, featured image metadata, and
uploads the existing WebP files to object storage. It refuses to overwrite a
post whose source ID exists without the exact import fingerprint.

Run the conversion-only audit first. It does not connect to PostgreSQL or R2:

```bash
npm run content:import -- --dry-run
```

The current snapshot contains 69 posts. The expected summary has zero failures,
zero text changes, zero lost heading IDs, and reports `<thead>` normalization;
TipTap retains those header cells as table header rows but omits that wrapper.
Review the full report before the write run.

Take a PostgreSQL backup and confirm R2 versioning/backup policy, then run:

```bash
npm run content:import
npm run content:parity
```

The parity command fails non-zero on any count, URL, title, excerpt, taxonomy,
date, author, image metadata, table-of-contents, normalized HTML, text, initial
redirect, publication, or sitemap/RSS eligibility mismatch. Re-running the
import after success is safe and reports all posts as skipped.

Only after parity returns zero mismatches, set `CONTENT_SOURCE=database` and
build/deploy the application. `CONTENT_MEDIA_PUBLIC_BASE_URL` is consumed by
the Next.js image allowlist at build time, so it must be present during the
build as well as at runtime. Smoke-test the English and Persian index, one
article with a table, RSS, sitemap, canonicals, social images, and an old-slug
redirect before shifting traffic.

Rollback does not require a database restore: set `CONTENT_SOURCE=file`, rebuild
and deploy. The checked-in `src/content/blog/posts.json` remains the read-only
fallback for at least one production release. Database writes made while the
fallback is active remain intact and can be reconciled before a later cutover.
