# Feature Specification: Delete Posts and Drafts

**Feature Branch**: `001-delete-posts-drafts`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "we need to be able to delete posts and drafts" — permanent deletion with a confirmation alert; editors delete their own never-published drafts, reviewers/admins any draft, admins only once-published (archived) content; scope is a whole post or a single draft localization; published content must be archived first and its URL then returns not-found.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete one draft localization (Priority: P1)

An editor who created a bad draft in one language permanently removes that
draft from the editorial workspace, without touching the article's other
translations.

**Why this priority**: This is the most common cleanup action and the smallest
safe slice. It delivers value on its own: an editor can discard their own
mistake immediately.

**Independent Test**: Sign in as an editor, open the workspace, delete a draft
localization the editor created, confirm, and verify the row disappears and no
other localization of that post is affected.

**Acceptance Scenarios**:

1. **Given** an editor owns a never-published draft localization, **When** they
   confirm its deletion, **Then** the localization is permanently removed and
   disappears from the workspace.
2. **Given** a post has two localizations and one never-published draft is
   deleted, **When** the deletion completes, **Then** the remaining localization
   still resolves in the workspace and public site.
3. **Given** the deleted localization was the only localization of its post,
   **When** the deletion completes, **Then** the now-empty post record is also
   removed.

---

### User Story 2 - Delete a whole post (Priority: P2)

A reviewer or administrator permanently removes an entire article, including
all of its localizations, revisions, taxonomy links, and slug history.

**Why this priority**: Articles created by mistake or withdrawn before
publication must be removable as a unit, but this is rarer and more destructive
than deleting a single draft.

**Independent Test**: Create a post with two never-published localizations,
delete the post as an administrator, and verify both localizations and the post
record are gone.

**Acceptance Scenarios**:

1. **Given** an administrator views a post whose localizations are all
   never-published, **When** they confirm whole-post deletion, **Then** the post
   and every localization are permanently removed.
2. **Given** a post has at least one published localization, **When** the actor
   attempts whole-post deletion, **Then** the system refuses and tells the actor
   to archive published content first.
3. **Given** a post has a once-published (archived) localization and the actor
   is not an administrator, **When** they attempt whole-post deletion, **Then**
   the system denies the action.

---

### User Story 3 - Published content is protected (Priority: P3)

An administrator who wants to remove a live article must archive it first;
published content can never be deleted in a single step.

**Why this priority**: This is the guardrail that prevents irreversible damage
to live, indexed URLs. It is a smaller code change than P1/P2 but the highest
consequence if missing.

**Independent Test**: Take a published article, attempt deletion, verify the
action is refused with an instruction to archive; archive it, then delete it as
an administrator and verify the public URL returns not-found.

**Acceptance Scenarios**:

1. **Given** a published localization, **When** any actor attempts deletion,
   **Then** the system refuses with a message to archive or unpublish first.
2. **Given an archived (once-published) localization, **When** an administrator
   confirms deletion, **Then** it is permanently removed and its public URL
   returns not-found.
3. **Given an archived localization, **When** an editor or reviewer attempts
   deletion, **Then** the system denies the action.

---

### User Story 4 - Safe confirmation and clear feedback (Priority: P4)

Every actor must confirm a deletion explicitly before it executes, and must get
clear feedback on success or refusal.

**Why this priority**: Confirmation and honest feedback turn an irreversible
operation into a deliberate one, but they depend on the deletion flows above
existing first.

**Independent Test**: Open a deletion dialog, cancel, and verify nothing
changed; reopen, type the wrong confirmation text, verify the destructive action
stays disabled; type it correctly and verify the row is removed.

**Acceptance Scenarios**:

1. **Given** a deletion dialog is open, **When** the actor cancels or dismisses
   it, **Then** no content is changed.
2. **Given** the actor has not typed the required confirmation text, **When**
   they attempt to submit, **Then** the destructive action is unavailable.
3. **Given** the deletion fails on the server, **When** the actor sees the
   result, **Then** a recoverable error with a non-sensitive support reference
   is shown and no partial deletion occurred.
4. **Given** an actor may not delete an item, **When** they view it, **Then** the
   delete affordance is unavailable and the reason is stated.

---

### Edge Cases

- **Mixed post**: one localization published and another a draft — whole-post
  deletion is refused until the published localization is archived.
- **Scheduled content**: a scheduled localization counts as never-published;
  deleting it cancels the planned publication, and the scheduler finds nothing
  to publish afterward.
- **Concurrent deletion**: a second deletion request for already-removed content
  fails cleanly as not-found rather than erroring or double-logging.
- **Slug reuse**: after deletion, the freed slug can be used by a new article
  (no redirect remains for the deleted article).
- **Media references**: deleting content removes its media *usages*; the stored
  image objects themselves are retained and are out of scope for this feature.
- **Last-admin protection**: deletion is about content only and must not affect
  admin users or roles.
- **Unused taxonomy**: categories and tags are shared and MUST NOT be deleted
  with a post.
- **Long-lived browser tab**: deleting an item already changed in another tab
  fails safely instead of deleting the wrong revision.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow permanently deleting a single never-published
  localization, with no recovery path.
- **FR-002**: When the last localization of a post is deleted, the system MUST
  also remove the empty post record and its dependent data.
- **FR-003**: The system MUST allow permanently deleting a whole post and all of
  its localizations in one action, with the scope made explicit to the actor.
- **FR-004**: The system MUST enforce deletion permissions on the server:
  editors MAY delete only never-published localizations they created;
  reviewers and administrators MAY delete any never-published localization;
  only administrators MAY delete once-published (archived) content.
- **FR-005**: The system MUST refuse to delete any localization whose current
  state is published, and MUST instruct the actor to archive or unpublish it
  first.
- **FR-006**: Whole-post deletion MUST be refused when any localization of the
  post is not deletable by the acting user, and the refusal MUST identify that
  the post contains published or protected content.
- **FR-007**: The system MUST require an explicit confirmation that names the
  target before any deletion executes; dismissing the confirmation MUST leave
  all content unchanged.
- **FR-008**: The system MUST re-verify permission, ownership, and content state
  at the moment of execution; it MUST NOT rely on what the interface displayed.
- **FR-009**: Deletion MUST be atomic: either the whole requested scope is
  removed, or nothing is.
- **FR-010**: The system MUST record every deletion attempt in the append-only
  audit trail with actor, action, target type and identifier, scope, locale,
  previous status, and outcome, and MUST NOT record article content, request
  bodies, or personal data.
- **FR-011**: The system MUST apply abuse rate limits to deletion requests and
  MUST enforce same-origin and valid-session checks before deleting.
- **FR-012**: Deleted content MUST disappear immediately from the editorial
  workspace and the public site, and its former public URL MUST return a
  not-found response.
- **FR-013**: Deletion failures MUST produce a recoverable, non-sensitive error
  message and a support reference; internal details MUST NOT be exposed.
- **FR-014**: The interface MUST show the delete affordance only for content the
  acting user may delete, and MUST state why it is unavailable otherwise.
- **FR-015**: Deleting content MUST NOT delete shared taxonomy terms, stored
  media objects, or administrator accounts.

### Key Entities *(include if feature involves data)*

- **Post**: An article identity that groups one or more localizations.
- **Localization**: One language version of a post with its own slug, status,
  content, and revision history.
- **Revision**: An immutable snapshot of a localization, removed with its
  localization.
- **Slug history**: Prior URLs of a localization, removed with it.
- **Media usage**: The link between a localization and an image, removed with
  the localization while the image record is retained.
- **Audit event**: The append-only record of the deletion attempt and its
  outcome.
- **Admin user**: The actor whose role and ownership decide whether a deletion
  is permitted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized user can permanently delete a draft localization in
  under 15 seconds from opening the workspace, including confirmation.
- **SC-002**: Zero published articles can be deleted without first being
  archived, verified by automated authorization tests covering every role.
- **SC-003**: 100% of deletion attempts, successful or denied, produce an audit
  record that contains no article content or personal data.
- **SC-004**: After a deletion completes, the former public URL returns a
  not-found response and the article is absent from the listing, feed, and
  sitemap in the same request cycle.
- **SC-005**: No deletion attempt by an unauthorized role succeeds (0% success
  rate) across editor, reviewer, and administrator test cases.
- **SC-006**: A deletion of a single localization never removes a sibling
  localization or shared taxonomy term, verified by data checks after the
  operation.

## Assumptions

- Deletion is permanent; there is no trash bin, undo, or restore in this
  feature, by explicit product decision.
- "Never-published" means the localization has no publication history
  (status draft, review, or scheduled) and can be deleted by its creator.
- Once-published content reaches a deletable state only after being archived,
  and only an administrator may then delete it.
- The existing role model (`admin`, `editor`, `reviewer`) is reused; a new
  deletion permission is added to it.
- Existing data relationships already cascade when a post or localization is
  removed, so no new storage structure is required.
- Stored image objects are retained after content deletion; orphan cleanup is
  deferred to a later change.
- The public site already excludes content that is not published, so removal
  from public listings follows from the change in stored state.
