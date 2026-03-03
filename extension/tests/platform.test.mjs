import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlatformBaseUrl } from "../shared/platform.mjs";

test("normalizePlatformBaseUrl trims trailing slash", () => {
  assert.equal(normalizePlatformBaseUrl("http://localhost:3000/"), "http://localhost:3000");
});

test("normalizePlatformBaseUrl returns null for invalid input", () => {
  assert.equal(normalizePlatformBaseUrl("notaurl"), null);
});
