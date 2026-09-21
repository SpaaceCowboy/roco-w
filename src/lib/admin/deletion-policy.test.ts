import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteLocalization, canDeletePost } from "./deletion-policy";

const editor = { role: "editor" as const, userId: "editor-1" };
const otherEditor = { role: "editor" as const, userId: "editor-2" };
const reviewer = { role: "reviewer" as const, userId: "reviewer-1" };
const admin = { role: "admin" as const, userId: "admin-1" };

const draft = (createdById: string | null) => ({ id: "loc-1", status: "draft", createdById });
const published = (createdById: string | null) => ({ id: "loc-1", status: "published", createdById });
const archived = (createdById: string | null) => ({ id: "loc-1", status: "archived", createdById });

test("editors may delete only never-published drafts they created", () => {
  assert.equal(canDeleteLocalization(editor, draft(editor.userId)).allowed, true);
  assert.equal(canDeleteLocalization(editor, draft(otherEditor.userId)).allowed, false);
  assert.equal(canDeleteLocalization(editor, draft(null)).allowed, false);
});

test("reviewers and admins may delete any never-published draft", () => {
  assert.equal(canDeleteLocalization(reviewer, draft("editor-1")).allowed, true);
  assert.equal(canDeleteLocalization(admin, draft("editor-1")).allowed, true);
  assert.equal(canDeleteLocalization(reviewer, draft(null)).allowed, true);
});

test("published content is refused for every role and asks for archive first", () => {
  for (const actor of [editor, reviewer, admin]) {
    const decision = canDeleteLocalization(actor, published(actor.userId));
    assert.equal(decision.allowed, false);
    assert.equal(decision.allowed === false && decision.code, "published_requires_archive");
  }
});

test("archived content is administrator-only", () => {
  assert.equal(canDeleteLocalization(admin, archived("editor-1")).allowed, true);
  assert.equal(canDeleteLocalization(reviewer, archived("editor-1")).allowed, false);
  assert.equal(canDeleteLocalization(editor, archived(editor.userId)).allowed, false);
});

test("whole-post deletion requires every localization to be deletable", () => {
  assert.equal(canDeletePost(admin, [draft("editor-1"), draft("editor-2")]).allowed, true);
  assert.equal(canDeletePost(reviewer, [draft("editor-1"), draft("editor-2")]).allowed, true);
});

test("whole-post deletion is refused when any localization is published", () => {
  const decision = canDeletePost(admin, [draft("editor-1"), published("editor-1")]);
  assert.equal(decision.allowed, false);
  assert.equal(decision.allowed === false && decision.code, "published_requires_archive");
});

test("whole-post deletion of archived content is administrator-only", () => {
  assert.equal(canDeletePost(admin, [archived("editor-1")]).allowed, true);
  assert.equal(canDeletePost(reviewer, [archived("editor-1")]).allowed, false);
});

test("editors cannot delete a post containing someone else's draft", () => {
  const decision = canDeletePost(editor, [draft(editor.userId), draft(otherEditor.userId)]);
  assert.equal(decision.allowed, false);
  assert.equal(decision.allowed === false && decision.code, "forbidden");
});

test("an empty post cannot be deleted", () => {
  assert.equal(canDeletePost(admin, []).allowed, false);
});
