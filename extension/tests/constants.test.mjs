import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CATEGORY, DEFAULT_PLATFORM_BASE_URL } from "../shared/constants.mjs";

test("default platform base url is localhost", () => {
  assert.equal(DEFAULT_PLATFORM_BASE_URL, "http://localhost:3000");
});

test("default category is 同人创作", () => {
  assert.equal(DEFAULT_CATEGORY, "同人创作");
});
