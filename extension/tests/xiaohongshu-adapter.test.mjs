import test from "node:test";
import assert from "node:assert/strict";
import { isLikelyPostImageUrl, isXiaohongshuUrl } from "../collectors/xiaohongshu.mjs";

test("matches xiaohongshu explore url", () => {
  assert.equal(isXiaohongshuUrl("https://www.xiaohongshu.com/explore/abc"), true);
});

test("matches xiaohongshu discovery item url", () => {
  assert.equal(isXiaohongshuUrl("https://www.xiaohongshu.com/discovery/item/abc"), true);
});

test("does not match non xiaohongshu url", () => {
  assert.equal(isXiaohongshuUrl("https://example.com/a"), false);
});

test("post image url should exclude avatar resources", () => {
  assert.equal(isLikelyPostImageUrl("https://sns-avatar-qc.xhscdn.com/avatar/123.jpg"), false);
});

test("post image url should accept normal note image resources", () => {
  assert.equal(isLikelyPostImageUrl("https://sns-img-qc.xhscdn.com/2026/03/03/abc.jpg"), true);
});
