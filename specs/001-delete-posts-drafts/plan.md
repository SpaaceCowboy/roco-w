# Implementation Plan: Delete Posts and Drafts

**Branch**: `001-delete-posts-drafts` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-delete-posts-drafts/spec.md`

## Summary

Add permanent deletion of admin content: a single never-published localization,
or an entire post with all localizations. Permissions are scoped (editors delete
their own drafts; reviewers/admins any draft; only admins delete archived
content). Published content must be archived first. Every deletion runs through
the existing mutation pipeline — same-origin, session, permission, rate limit,
Zod, transaction, append-only audit — and immediately disappears from the
workspace and public site. No storage migration is required: `ON DELETE
CASCADE` already covers localizations, revisions, slug history, and media
usages, and the app-level permission is code, not schema.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16 App Router, React 19

**Primary Dependencies**: Drizzle ORM + `pg`, Zod, existing admin service/API/observability modules

**Storage**: PostgreSQL; no new migration (uses existing cascades and `audit_events`)

**Testing**: `node --test` via `tsx`, colocated `*.test.ts`

**Target Platform**: Linux server (PM2 + Apache), same as the rest of the admin panel

**Project Type**: Web application (Next.js standalone)

**Performance Goals**: single deletion completes well under a second; no effect on unrelated queries

**Constraints**: atomic; server re-verifies permission/state/version; no content or PII in audit

**Scale/Scope**: internal admin panel, tens of editors, tens of thousands of rows at most

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
| --- | --- | --- |
| I. Repository boundaries | Deletion lives in the admin content service, not in a page or client | PASS |
| II. Localization/RTL | Dialog and copy are admin-only English (see Assumptions); no public path/locale change; new UI uses logical CSS | PASS |
| III. Security/privacy | Server-side `content:delete` + ownership/state policy, same-origin, rate limit, append-only audit without content/PII | PASS |
| IV. Data integrity/reversibility | Deletion is atomic, version-checked, and permanent by explicit product decision; published content is protected by archive-first; slug history cascades and the URL 404s | PASS |
| V. Test-verified/documented | Pure policy tests + service/API tests, `typecheck`/`lint`/`test`/`build`, changelog + docs updated | PASS |

No violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-delete-posts-drafts/
├── spec.md
├── plan.md              # this file
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/lib/admin/
├── permissions.ts                 # add content:delete to the role matrix
├── deletion-policy.ts             # NEW pure ownership/state rules
├── deletion-policy.test.ts        # NEW unit tests
├── content-validation.ts          # add deleteContentSchema
├── content-service.ts             # add deleteAdminContent()
├── errors.ts                      # add ContentDeletionError (testable)
├── api.ts                         # map ContentDeletionError to HTTP status
└── observability.ts               # add admin.content.delete event stream

src/app/api/admin/posts/[id]/route.ts   # add DELETE handler
src/app/admin/(protected)/
├── page.tsx                       # row-level delete affordance + dialog
└── DeletePostDialog.tsx           # NEW typed-confirmation client dialog
```

**Structure Decision**: single web application. The change extends the existing
`src/lib/admin` service/policy/API pattern and the protected dashboard; no new
package or module boundary is introduced.

## Complexity Tracking

No constitution violations.
