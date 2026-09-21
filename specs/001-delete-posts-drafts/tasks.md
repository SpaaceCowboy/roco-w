---

description: "Task list for Delete Posts and Drafts"

---

# Tasks: Delete Posts and Drafts

**Input**: Design documents from `/specs/001-delete-posts-drafts/`

**Prerequisites**: plan.md, spec.md

Tests are required by the project constitution for security-sensitive
behavior, so policy and deletion-path tests are included.

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Add `content:delete` to the permission matrix in `src/lib/admin/permissions.ts`
- [x] T002 [P] Create pure deletion policy in `src/lib/admin/deletion-policy.ts` and tests in `src/lib/admin/deletion-policy.test.ts`
- [x] T003 [P] Add `deleteContentSchema` to `src/lib/admin/content-validation.ts`
- [x] T004 Add `ContentDeletionError` to `src/lib/admin/errors.ts` and map it in `src/lib/admin/api.ts`
- [x] T005 [P] Add a `contentDelete` event stream to `src/lib/admin/observability.ts`

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T006 Implement `deleteAdminContent()` in `src/lib/admin/content-service.ts` with atomic transaction, version check, policy enforcement, audit, and post revalidation

## Phase 3: User Story 1 - Delete one draft localization (P1)

**Goal**: An editor permanently removes a single never-published draft they own.

**Independent Test**: Delete a draft localization as its creator; sibling localizations survive; last-localization deletion removes the post.

- [x] T007 [US1] Add the `DELETE` handler to `src/app/api/admin/posts/[id]/route.ts`
- [x] T008 [P] [US1] Create the typed-confirmation dialog in `src/app/admin/(protected)/DeletePostDialog.tsx`
- [x] T009 [US1] Wire the row delete affordance and policy-aware visibility into `src/app/admin/(protected)/page.tsx`
- [x] T010 [US1] Cover ownership/state rules in `src/lib/admin/deletion-policy.test.ts`

## Phase 4: User Story 2 - Delete a whole post (P2)

**Goal**: A reviewer or administrator removes an entire article and all localizations.

**Independent Test**: Delete a two-localization draft post; both localizations and the post record are gone.

- [x] T011 [US2] Support `scope: "post"` in the service and dialog
- [x] T012 [US2] Add whole-post deletion tests, including refusal when any localization is published

## Phase 5: User Story 3 - Published content is protected (P3)

**Goal**: Published content can never be deleted directly; archived content is admin-only.

**Independent Test**: Deletion of a published localization is refused; after archiving, only an administrator can delete it.

- [x] T013 [US3] Enforce archive-first and admin-only-archived in `deletion-policy.ts` and test both

## Phase 6: User Story 4 - Safe confirmation and feedback (P4)

**Goal**: Explicit, accessible confirmation and honest success/refusal feedback.

**Independent Test**: Cancel changes nothing; wrong confirmation keeps the action disabled; failures show a support reference.

- [x] T014 [US4] Implement typed confirmation, focus trap, cancel, and error/support-reference states in `DeletePostDialog.tsx`
- [x] T015 [US4] Ensure deletion failures surface a non-sensitive support reference via existing admin API error handling

## Phase 7: Verification and Documentation

- [x] T016 Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`
- [x] T017 Add a changelog entry in `changelog.md`
- [x] T018 Document deletion behavior and permissions in `docs/admin-content.md`
- [x] T019 Verify the final diff against the constitution (no bulk delete, audit has no content/PII, no source regression)
