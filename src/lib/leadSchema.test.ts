import assert from "node:assert/strict";
import test from "node:test";
import { leadSchema } from "./leadSchema";

const base = { name: "Ali Rezaei", phone: "09123456789", status: "new", consent: true, locale: "fa" };

test("normalises Persian digits and separators in phone", () => {
  const r = leadSchema.parse({ ...base, phone: "۰۹۱۲ ۳۴۵-۶۷۸۹" });
  assert.equal(r.phone, "09123456789");
});

test("phone bounds: 8-15 digits, optional +", () => {
  assert.ok(leadSchema.safeParse({ ...base, phone: "1234567" }).error);
  assert.ok(leadSchema.safeParse({ ...base, phone: "1234567890123456" }).error);
  assert.ok(leadSchema.safeParse({ ...base, phone: "+447401131099" }).success);
  assert.ok(leadSchema.safeParse({ ...base, phone: "0912abc6789" }).error);
});

test("email is optional but validated when present", () => {
  assert.equal(leadSchema.parse(base).email, "");
  assert.ok(leadSchema.safeParse({ ...base, email: "nope" }).error);
  assert.ok(leadSchema.safeParse({ ...base, email: "a@b.co" }).success);
});

test("requires consent, known status and locale", () => {
  assert.ok(leadSchema.safeParse({ ...base, consent: false }).error);
  assert.ok(leadSchema.safeParse({ ...base, status: "gold" }).error);
  assert.ok(leadSchema.safeParse({ ...base, locale: "de" }).error);
});

test("name needs a letter in any script", () => {
  assert.ok(leadSchema.safeParse({ ...base, name: "123" }).error);
  assert.ok(leadSchema.safeParse({ ...base, name: "!!!" }).error);
  assert.ok(leadSchema.safeParse({ ...base, name: "علی" }).success);
});

test("over-long UTMs are truncated, not rejected", () => {
  const r = leadSchema.parse({ ...base, utm_content: "x".repeat(300) });
  assert.equal(r.utm_content.length, 100);
});
