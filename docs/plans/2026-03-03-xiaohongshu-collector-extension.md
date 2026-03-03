# Xiaohongshu Collector Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension with one-click Xiaohongshu collection, preview editing, and submission to PlushVote existing `/api/submissions` endpoint using browser login state.

**Architecture:** Implement MV3 extension modules (`background`, `popup`, `preview`, `options`) plus a collector adapter layer so additional platforms can be added without changing core workflow. Keep network calls and token retrieval in background service worker. Persist draft/config in Chrome storage.

**Tech Stack:** Chrome Extension Manifest V3, vanilla HTML/CSS/JS modules, Node built-in test runner (`node --test`) for pure utility tests.

---

### Task 1: Scaffold extension structure and shared constants

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/shared/constants.mjs`
- Create: `extension/shared/storage.mjs`
- Create: `extension/README.md`

**Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PLATFORM_BASE_URL } from "../shared/constants.mjs";

test("default platform base url is localhost", () => {
  assert.equal(DEFAULT_PLATFORM_BASE_URL, "http://localhost:3000");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/constants.test.mjs`
Expected: FAIL with module/file not found.

**Step 3: Write minimal implementation**
- Create constants and storage key names used by popup/preview/options/background.
- Add MV3 manifest with minimal permissions and extension pages.

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/constants.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add extension/manifest.json extension/shared/constants.mjs extension/shared/storage.mjs extension/README.md extension/tests/constants.test.mjs
git commit -m "feat(extension): scaffold MV3 structure and shared constants"
```

### Task 2: Implement platform URL normalization and token parsing utilities

**Files:**
- Create: `extension/shared/platform.mjs`
- Create: `extension/shared/token.mjs`
- Test: `extension/tests/platform.test.mjs`
- Test: `extension/tests/token.test.mjs`

**Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlatformBaseUrl } from "../shared/platform.mjs";

test("normalizePlatformBaseUrl trims trailing slash", () => {
  assert.equal(normalizePlatformBaseUrl("http://localhost:3000/"), "http://localhost:3000");
});
```

```js
import test from "node:test";
import assert from "node:assert/strict";
import { findSupabaseAccessToken } from "../shared/token.mjs";

test("findSupabaseAccessToken reads token from supabase auth entry", () => {
  const token = findSupabaseAccessToken([
    ["sb-demo-auth-token", "{\"access_token\":\"abc\"}"]
  ]);
  assert.equal(token, "abc");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/platform.test.mjs extension/tests/token.test.mjs`
Expected: FAIL with missing exports.

**Step 3: Write minimal implementation**
- URL normalization/validation helper.
- Token extractor that scans storage entries and supports nested JSON shapes.

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/platform.test.mjs extension/tests/token.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add extension/shared/platform.mjs extension/shared/token.mjs extension/tests/platform.test.mjs extension/tests/token.test.mjs
git commit -m "feat(extension): add platform normalization and token parsing utils"
```

### Task 3: Build Xiaohongshu collector adapter

**Files:**
- Create: `extension/collectors/types.mjs`
- Create: `extension/collectors/xiaohongshu.mjs`
- Create: `extension/collectors/index.mjs`
- Test: `extension/tests/xiaohongshu-adapter.test.mjs`

**Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { isXiaohongshuUrl } from "../collectors/xiaohongshu.mjs";

test("matches xiaohongshu note url", () => {
  assert.equal(isXiaohongshuUrl("https://www.xiaohongshu.com/explore/abc"), true);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/xiaohongshu-adapter.test.mjs`
Expected: FAIL.

**Step 3: Write minimal implementation**
- URL matcher for Xiaohongshu post URLs.
- DOM extraction for title/content/images with fallback selectors.
- Adapter registry for future platforms.

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/xiaohongshu-adapter.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add extension/collectors/types.mjs extension/collectors/xiaohongshu.mjs extension/collectors/index.mjs extension/tests/xiaohongshu-adapter.test.mjs
git commit -m "feat(extension): add xiaohongshu collector adapter"
```

### Task 4: Implement background workflow (collect, token, submit)

**Files:**
- Create: `extension/background.mjs`
- Modify: `extension/manifest.json`

**Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { toSubmissionPayload } from "../background.mjs";

test("toSubmissionPayload uses first selected image", () => {
  const payload = toSubmissionPayload({
    title: "t",
    content: "c",
    category: "同人创作",
    images: [{ url: "a", selected: false }, { url: "b", selected: true }]
  });
  assert.equal(payload.imageUrl, "b");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test extension/tests/background.test.mjs`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Message handlers: `collect-current-page`, `get-draft`, `save-draft`, `submit-draft`, `open-login`, `get-settings`, `save-settings`.
- Runtime permission request for configured platform origin.
- Token retrieval via `chrome.scripting.executeScript` in platform tab context.
- Submit request to `/api/submissions` with auth header.

**Step 4: Run test to verify it passes**

Run: `node --test extension/tests/background.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add extension/background.mjs extension/manifest.json extension/tests/background.test.mjs
git commit -m "feat(extension): add collection and submission background workflow"
```

### Task 5: Build popup UI for one-click collection

**Files:**
- Create: `extension/popup.html`
- Create: `extension/popup.css`
- Create: `extension/popup.mjs`

**Step 1: Write the failing test**
- Manual contract test in Chrome extension page:
  - Click collect on unsupported page should show unsupported status.
  - Click collect on Xiaohongshu page should open preview page.

**Step 2: Run test to verify it fails**
- Load unpacked extension before implementing UI; expected behavior absent.

**Step 3: Write minimal implementation**
- Button, status text, and route to preview on success.
- Clear error messaging from background response.

**Step 4: Run test to verify it passes**
- Repeat manual contract test; expected behavior works.

**Step 5: Commit**

```bash
git add extension/popup.html extension/popup.css extension/popup.mjs
git commit -m "feat(extension): add one-click popup collection UI"
```

### Task 6: Build preview UI for edit and submit

**Files:**
- Create: `extension/preview.html`
- Create: `extension/preview.css`
- Create: `extension/preview.mjs`

**Step 1: Write the failing test**
- Manual contract test:
  - Preview cannot submit when no image selected.
  - Editing title/content/category persists and submits.

**Step 2: Run test to verify it fails**
- Open preview before implementation; expected controls absent.

**Step 3: Write minimal implementation**
- Render draft fields and image checklist with reorder buttons.
- Save draft edits via message.
- Submit action and success/error feedback.

**Step 4: Run test to verify it passes**
- Repeat manual test and verify expected interactions.

**Step 5: Commit**

```bash
git add extension/preview.html extension/preview.css extension/preview.mjs
git commit -m "feat(extension): add preview and submit flow"
```

### Task 7: Build options page for platform URL config

**Files:**
- Create: `extension/options.html`
- Create: `extension/options.css`
- Create: `extension/options.mjs`

**Step 1: Write the failing test**
- Manual contract test:
  - Invalid URL cannot be saved.
  - Valid URL saves and is reflected in popup/preview actions.

**Step 2: Run test to verify it fails**
- Open options before implementation; expected validation absent.

**Step 3: Write minimal implementation**
- Form to edit platform base URL.
- Validate URL and persist through background `save-settings` message.

**Step 4: Run test to verify it passes**
- Repeat manual options test; expected behavior works.

**Step 5: Commit**

```bash
git add extension/options.html extension/options.css extension/options.mjs
git commit -m "feat(extension): add platform settings options page"
```

### Task 8: Verification and docs

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-03-03-xiaohongshu-collector-extension-design.md` (if any final adjustments)

**Step 1: Write the failing test**
- Define checklist-based acceptance test runbook in docs and execute end-to-end steps.

**Step 2: Run test to verify it fails**
- Execute runbook before final fixes; capture failing steps.

**Step 3: Write minimal implementation**
- Apply final fixes from runbook.
- Add usage section for loading extension and required permissions.

**Step 4: Run test to verify it passes**

Run:
- `node --test extension/tests/*.test.mjs`
- `npm run lint`

Expected: all green.

**Step 5: Commit**

```bash
git add README.md extension docs/plans/2026-03-03-xiaohongshu-collector-extension-design.md docs/plans/2026-03-03-xiaohongshu-collector-extension.md
git commit -m "docs: add extension usage and verification runbook"
```
