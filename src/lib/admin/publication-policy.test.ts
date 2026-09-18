import assert from "node:assert/strict";
import test from "node:test";
import { allowedPublicationSourceStatuses, publicationPermission } from "./publication-policy";

test("publishing requires publisher permission", () => {
  assert.equal(publicationPermission("request_review"), "content:write");
  assert.equal(publicationPermission("publish"), "content:publish");
  assert.equal(publicationPermission("schedule"), "content:publish");
});

test("workflow transitions have narrow source states", () => {
  assert.deepEqual(allowedPublicationSourceStatuses("request_review"), ["draft"]);
  assert.deepEqual(allowedPublicationSourceStatuses("publish"), ["review", "scheduled"]);
  assert.deepEqual(allowedPublicationSourceStatuses("archive"), ["published"]);
  assert.deepEqual(allowedPublicationSourceStatuses("restore"), ["archived"]);
});
