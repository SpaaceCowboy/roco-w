# Content admin runbook

Operational procedures for the `/admin` content system. Configuration lives in
`docs/admin-content.md`; dependency findings live in
`docs/dependency-advisories.md`.

## Ownership and alert destinations

| Area | Owner | Where alerts go |
| --- | --- | --- |
| Application logs and `admin.alert` records | TODO: name | TODO: log monitor / on-call channel |
| PostgreSQL backups and restore | TODO: name | TODO |
| Object storage (R2) backups and access | TODO: name | TODO |
| Google OAuth and Workspace MFA policy | TODO: name | TODO |
| Scheduled-publication timer | TODO: name | TODO |

Replace every `TODO` before launch. Alert on `event=admin.alert` in the log
monitor, and on any `outcome=failure` for `admin.publish`,
`admin.cache_refresh`, `admin.media.upload`, and
`admin.scheduled_publication.delay`.

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

- [ ] Workspace MFA policy is enforced; someone has verified it in the Google
      Admin console for every allowed domain. **(Blocked: admin sign-in
      currently uses a personal Google account on the External consent screen,
      not Workspace, so there is no provider MFA policy to enforce. The
      database allowlist still gates access. Decide whether allowlist-only is
      acceptable or move to Workspace.)**
- [ ] Every alert destination and owner above is filled in.
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

- [ ] Unauthenticated `/admin` and every admin API route return 401/redirect.
- [ ] A signed-in, non-allowlisted identity is denied at user create, identity
      binding, and session create.
- [ ] Cross-origin and missing-`Origin` admin mutations return 403.
- [ ] Editor cannot publish or manage users; reviewer cannot manage users; admin
      can do both.
- [ ] Stored-XSS payloads in editor JSON (script tags, event handlers,
      `javascript:`, `data:`, `vbscript:` links, non-HTTPS images) are stripped
      by the renderer.
- [ ] Malicious uploads (wrong MIME, wrong size, wrong checksum, non-image
      bytes, oversized dimensions) are rejected and the object is deleted.
- [ ] Slug changes produce a single permanent redirect; old slugs cannot be
      reclaimed into a loop and cannot collide with live routes.
- [ ] An expired session is treated as unauthenticated on both page and API.
- [ ] Rate limits return 429 with `Retry-After` for autosave, uploads,
      previews, and mutations.
- [ ] Rotating a key does not leave it referenced anywhere in the repository.

## Accessibility and UX checklist

References: `src/app/admin/admin.module.css` and the editor workspace.

Implemented in code and still requiring a manual browser pass: visible
focus-visible outlines on controls, a modal focus trap with Escape-to-close and
focus return, 44px minimum touch targets on admin controls, labelled
`role="status"`/`role="alert"` regions, reduced-motion handling, and RTL editor
direction for Persian and Arabic.

- [ ] Full keyboard path through sign-in, article list, editor, dialogs, and the
      workflow panel; visible focus on every control.
- [ ] Editor, dialogs, and tables usable in Persian and Arabic RTL, with correct
      text direction in fields and alignment.
- [ ] Touch targets at least 44×44 px on mobile for primary actions.
- [ ] Loading and error states are labelled and announced; autosave conflict
      (409) is visible and understandable.
- [ ] Reduced-motion preference disables non-essential animation.
- [ ] Contrast meets WCAG AA in both normal and disabled states.
- [ ] Screen-reader names exist for icon-only buttons and the status regions.
