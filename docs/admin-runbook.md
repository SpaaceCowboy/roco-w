# Content admin runbook

Operational procedures for the `/admin` content system. Configuration lives in
`docs/admin-content.md`; dependency findings live in
`docs/dependency-advisories.md`.

## Ownership and alert destinations

A single owner handles every area, and every alert goes to one destination.
Set the destination before launch:

| Area | Owner | Where alerts go |
| --- | --- | --- |
| Application logs and `admin.alert` records | Sole operator | The single destination below |
| PostgreSQL backups and restore | Sole operator | The single destination below |
| Object storage (R2) backups and access | Sole operator | The single destination below |
| Google OAuth and Workspace MFA policy | Sole operator | The single destination below |
| Scheduled-publication timer | Sole operator | The single destination below |

**Single alert destination:** `<SET BEFORE LAUNCH>` — the channel the log monitor
notifies for `event=admin.alert` and for any `outcome=failure` on
`admin.publish`, `admin.cache_refresh`, `admin.media.upload`, and
`admin.scheduled_publication.delay`. Alerts are emitted as structured log
records, so the destination is the monitor's notification target, not an
application setting.

## Grant and revoke access

Grant or change a role (re-running updates the role and re-enables the account):

```bash
npm run admin:allowlist -- --email user@rocobroker.com --role editor --name "Name"
```

Revoke access and delete active sessions in one transaction:

```bash
npm run admin:disable -- --email user@rocobroker.com
```

Google Workspace MFA is enforced by Workspace policy, not application code.
Ownership of that policy is a launch-checklist item below.

## Failed publication

1. Read `event=admin.publish` records for the affected `action` and error code.
2. If a cache refresh failed, the database publication already succeeded; retry
   the refresh from the workflow panel or `POST
   /api/admin/publication-operations/{id}/retry-refresh`.
3. If the transition itself failed with a `409`, reload the article; the state
   changed concurrently. Retry publish with the same idempotency key.
4. If the database call failed, confirm PostgreSQL health, then retry. The UUID
   idempotency key makes an exact retry safe.

## Cache refresh retry

Revalidation targets are `/{locale}/blog/{slug}`, `/{locale}/blog`,
`/{locale}/blog/feed.xml`, and `/sitemap.xml`. Retry is available from the
workflow panel and through the authorized retry endpoint. A refresh failure
never rolls back the publication.

## Database backup and restore

Back up:

```bash
DATABASE_URL=postgresql://... scripts/backup-content-db.sh
```

Restore a dump into a scratch database and verify the application against it:

```bash
DATABASE_URL=postgresql://scratch... scripts/restore-content-db.sh /var/backups/rocobroker-content/content-<timestamp>.dump
```

**Performed 2026-09-18.** A backup was taken with
`scripts/backup-content-db.sh`, restored into a scratch `rocobroker_drill`
database with `scripts/restore-content-db.sh`, and `npm run content:parity`
against the scratch database returned zero mismatches. Database restore
readiness is confirmed. Repeat the drill:

1. Take a backup with `scripts/backup-content-db.sh`.
2. Restore it into an empty scratch PostgreSQL instance.
3. Point a build at the scratch database with `CONTENT_SOURCE=database` and run
   `npm run content:parity`.
4. Confirm representative English and Persian articles, RSS, and sitemap render.

## Object storage backup and restore

Object storage is Cloudflare R2. Back up by enabling bucket versioning and,
where available, object lock; keep a periodic export copy in a second location.
There is no repository script for this because it needs bucket credentials that
must stay out of the deployment checkout.

**Performed 2026-09-18.** Bucket versioning is enabled and a restore of one
deleted object from a prior version was exercised. The bucket's versioning and
backup policy is recorded in `docs/admin-content.md`. Repeat the restore of one
deleted object periodically.

## Key rotation

All secrets live in the protected production environment file on the host, never
in the repository.

- `ADMIN_AUTH_SECRET` (session signing, media grants, preview fallback): rotating
  it invalidates existing admin sessions and any outstanding media upload
  grants and preview links. Rotate during a maintenance window and expect admins
  to sign in again.
- `ADMIN_PREVIEW_SECRET`: rotates preview links only; active previews expire
  within 15 minutes.
- `SCHEDULED_PUBLISH_SECRET`: update the systemd timer environment file and the
  application together, then confirm the next timer run returns 2xx.
- `ADMIN_GOOGLE_CLIENT_SECRET`: rotate in Google Cloud, update the environment
  file, and restart the app.
- R2 access keys: create a replacement bucket-scoped token, update the
  environment file, restart, confirm an upload and a public image load, then
  revoke the old token.

After any rotation, restart the application process and confirm `/admin`
sign-in and one media upload.

## Provider outage

- **Google OIDC down:** admin sign-in is unavailable. Existing sessions continue
  until they expire (eight hours). Publishing and editing keep working for
  signed-in admins. Do not add a fallback login.
- **R2 down:** media uploads fail (`event=admin.media.upload`). Existing
  published media keeps serving if the custom domain is independent of the S3
  API; if the public domain also fails, images are unavailable. Editing text is
  unaffected.
- **PostgreSQL down or unreachable:** admin editing and publishing fail; the
  public site keeps serving from the file fallback only if
  `CONTENT_SOURCE=file`. If `CONTENT_SOURCE=database`, set it back to `file`,
  rebuild, and deploy to restore public reads.

## Launch checklist

- [ ] Admin sign-in requires a second factor. Sign-in is Google OIDC, so this is
      the **Google account's own 2-Step Verification**, not an application
      setting. Enable 2SV (passkey or security key preferred) on the Google
      account used for admin sign-in. A Workspace policy is only needed if the
      identity is moved into a Workspace domain; for a single operator, personal
      2SV is the effective MFA and is sufficient.
- [ ] The single alert destination in the table above is set (owner is the sole
      operator).
- [x] Initial administrators are allowlisted and non-allowlisted sign-in is
      denied.
- [x] `CONTENT_SOURCE=file` until import and parity pass. (Cutover done
      2026-09-18; `posts.json` retained as the fallback.)
- [x] `npm run content:parity` returns zero mismatches against production data.
- [x] PostgreSQL and object-storage backup policies are configured and the
      restore drill above has succeeded.
- [x] The scheduled-publication timer runs and its failures are alerted.
- [x] `npm audit` findings are reviewed against `docs/dependency-advisories.md`.
- [ ] Security checklist below passes.
- [ ] Accessibility/UX checklist below passes.

## Security checklist

`npm test` (43 passing) covers the items marked **[unit-tested]** below;
everything else needs this manual pass against a running instance. Commands use
the apex host — substitute `http://127.0.0.1:3100` for a local run.

> Ordering note: admin mutations verify the `Origin` header **before** the
> session, so a request with no `Origin` returns `403`, not `401`. Send the
> site's own `Origin` to reach the session check.

### 1. Unauthenticated access is denied

- [ ] Protected pages redirect to sign-in (expect `307` to `/admin/sign-in`):
      ```bash
      curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://rocobroker.com/admin
      curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://rocobroker.com/admin/posts/00000000-0000-0000-0000-000000000000
      ```
- [ ] Every admin mutation returns `401` with no cookies:
      ```bash
      for m in \
        "POST /api/admin/posts" \
        "PATCH /api/admin/posts/00000000-0000-0000-0000-000000000000" \
        "POST /api/admin/posts/00000000-0000-0000-0000-000000000000/publication" \
        "POST /api/admin/posts/00000000-0000-0000-0000-000000000000/translations" \
        "POST /api/admin/posts/00000000-0000-0000-0000-000000000000/rollback" \
        "POST /api/admin/posts/00000000-0000-0000-0000-000000000000/preview-token" \
        "POST /api/admin/publication-operations/00000000-0000-0000-0000-000000000000/retry-refresh" \
        "POST /api/admin/media/uploads" \
        "PUT /api/admin/media/uploads" \
      ; do
        method="${m%% *}"; path="${m#* }"
        printf '%s %s -> ' "$method" "$path"
        curl -sS -o /dev/null -w '%{http_code}\n' -X "$method" "https://rocobroker.com$path" \
          -H 'Origin: https://rocobroker.com' -H 'Content-Type: application/json' -d '{}'
      done
      ```
      Expect `401` on every line.
- [ ] The scheduled-publication endpoint (cron target) is guarded by its bearer
      secret, not a session: no token → `401`; the correct
      `SCHEDULED_PUBLISH_SECRET` → `2xx`:
      ```bash
      curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://rocobroker.com/api/admin/scheduled-publications
      ```

### 2. Non-allowlisted identity is denied

- [ ] Sign in with a Google account absent from `admin_users`. Expect sign-in to
      fail, no session cookie, `/admin` redirecting back to `/admin/sign-in`,
      and no `admin_users` row created.

### 3. Cross-origin and missing-Origin mutations are denied [unit-tested: `origin.test.ts`]

- [ ] Missing `Origin` → `403 {"error":"Origin header is required"}`:
      `curl -sS -X POST https://rocobroker.com/api/admin/posts -H 'Content-Type: application/json' -d '{}'`
- [ ] Foreign `Origin` → `403 {"error":"Cross-origin mutation denied"}`:
      `curl -sS -X POST https://rocobroker.com/api/admin/posts -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{}'`

### 4. Role permissions [unit-tested: `permissions.test.ts`]

- [ ] As `editor`: publishing and user management are denied.
- [ ] As `reviewer`: user management is denied; publishing is allowed.
- [ ] As `admin`: both are allowed.

### 5. Stored-XSS payloads are stripped [unit-tested: `document.test.ts`]

- [ ] In the editor, add each payload and confirm the published HTML contains no
      `<script>`, no `on*=` attribute, and no `javascript:`/`data:`/`vbscript:`
      link, with non-HTTPS image sources dropped: `<script>alert(1)</script>`,
      `<img src=x onerror=alert(1)>`, `[x](javascript:alert(1))`,
      `[x](data:text/html;base64,PHNjcmlwdD4=)`, `[x](vbscript:msgbox(1))`,
      `![x](http://insecure.example/a.png)`.

### 6. Malicious uploads are rejected

- [ ] A file with the wrong MIME, an oversize file, a checksum mismatch,
      non-image bytes, or oversize dimensions is rejected, and the uploaded
      object is deleted from R2 (confirm the object is actually gone).

### 7. Slug changes redirect cleanly

- [ ] Changing a published slug produces a single `308` from the old canonical
      to the new one, with no loop.
- [ ] An old slug cannot be reclaimed into a loop and cannot collide with a live
      route (create a post whose slug equals an existing route → `409`).

### 8. Expired sessions are unauthenticated [unit-tested: `session-policy.test.ts`]

- [ ] With an expired session cookie, `/admin` redirects to `/admin/sign-in` and
      an admin API call returns `401`.

### 9. Rate limits return 429 with Retry-After [unit-tested: `rate-limit.test.ts`]

- [ ] Exceeding autosave, upload, preview, or mutation limits returns `429` with
      a positive `Retry-After`; confirm the client surfaces the wait.

### 10. Key rotation leaves no reference in the repository

- [ ] For each rotated secret value, `grep -RIn '<value>' .` (excluding
      `node_modules`) returns no matches.

## Accessibility and UX checklist

Code is implemented; this is the manual browser pass. Reference:
`src/app/admin/admin.module.css` and the editor workspace. Run on desktop and a
narrow viewport, in LTR (English) and RTL (Persian/Arabic).

- [ ] Keyboard: from a cold load, Tab reaches every control in order through
      sign-in, article list, editor, dialogs, and the workflow panel; the focus
      ring is visible on every stop; Shift+Tab reverses; nothing traps focus
      except an open modal.
- [ ] Modal: opening any dialog moves focus inside, Tab cycles within it, Escape
      closes it, and focus returns to the control that opened it.
- [ ] Touch targets: primary actions are at least 44×44 px at mobile width, with
      no overlapping hit areas.
- [ ] Status/error regions: autosave (saving/saved), upload progress, and publish
      results announce via `role="status"`; errors use `role="alert"`.
- [ ] Autosave conflict: reproduce a `409` (edit in two tabs) and confirm the
      conflict is visible and understandable with a clear resolution path.
- [ ] Reduced motion: with the OS preference set, non-essential animation is
      disabled.
- [ ] RTL: in Persian and Arabic, fields, tables, and dialogs render
      right-to-left with correct text direction and alignment, and directional
      icons (back/next) are mirrored.
- [ ] Contrast: text and controls meet WCAG AA in normal, hover, focus, and
      disabled states.
- [ ] Screen reader: icon-only buttons have accessible names, the session/role
      label is read, and the two status regions announce changes.
