import test from "node:test";
import assert from "node:assert/strict";
import { toSubmissionPayload } from "../shared/submission.mjs";

test("toSubmissionPayload uses first selected image", () => {
  const payload = toSubmissionPayload({
    title: "Title",
    content: "Desc",
    category: "同人创作",
    images: [
      { url: "https://img/1.jpg", selected: false },
      { url: "https://img/2.jpg", selected: true }
    ]
  });

  assert.equal(payload.imageUrl, "https://img/2.jpg");
  assert.deepEqual(payload.imageUrls, ["https://img/2.jpg"]);
});

test("toSubmissionPayload falls back to first image when no selected flags", () => {
  const payload = toSubmissionPayload({
    title: "Title",
    content: "Desc",
    category: "同人创作",
    images: [{ url: "https://img/1.jpg" }, { url: "https://img/2.jpg" }]
  });

  assert.equal(payload.imageUrl, "https://img/1.jpg");
  assert.deepEqual(payload.imageUrls, ["https://img/1.jpg", "https://img/2.jpg"]);
});
