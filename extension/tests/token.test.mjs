import test from "node:test";
import assert from "node:assert/strict";
import { findSupabaseAccessToken } from "../shared/token.mjs";

test("findSupabaseAccessToken reads top-level access token", () => {
  const token = findSupabaseAccessToken([["sb-demo-auth-token", "{\"access_token\":\"abc\"}"]]);
  assert.equal(token, "abc");
});

test("findSupabaseAccessToken reads nested session token", () => {
  const token = findSupabaseAccessToken([["sb-demo-auth-token", "{\"currentSession\":{\"access_token\":\"xyz\"}}"]]);
  assert.equal(token, "xyz");
});

test("findSupabaseAccessToken ignores invalid values", () => {
  const token = findSupabaseAccessToken([["other-key", "123"], ["sb-demo-auth-token", "{}"]]);
  assert.equal(token, "");
});
