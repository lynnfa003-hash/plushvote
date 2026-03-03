import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("background should not request host permission directly", () => {
  const source = fs.readFileSync(new URL("../background.mjs", import.meta.url), "utf8");
  assert.equal(source.includes("chrome.permissions.request"), false);
});
