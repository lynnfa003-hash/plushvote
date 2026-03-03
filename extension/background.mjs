import { getCollectorByUrl } from "./collectors/index.mjs";
import { DEFAULT_CATEGORY, DEFAULT_PLATFORM_BASE_URL } from "./shared/constants.mjs";
import { buildOriginPattern, normalizePlatformBaseUrl } from "./shared/platform.mjs";
import { toSubmissionPayload } from "./shared/submission.mjs";
import { findSupabaseAccessToken } from "./shared/token.mjs";
import { getDraft, getSettings, saveDraft, saveSettings } from "./shared/storage.mjs";

function getRuntimeError() {
  return chrome.runtime?.lastError ? new Error(chrome.runtime.lastError.message) : null;
}

function queryTabs(queryInfo) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      const error = getRuntimeError();
      if (error) {
        reject(error);
        return;
      }
      resolve(tabs || []);
    });
  });
}

function createTab(createProperties) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(createProperties, (tab) => {
      const error = getRuntimeError();
      if (error) {
        reject(error);
        return;
      }
      resolve(tab);
    });
  });
}

function removeTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.remove(tabId, () => {
      const error = getRuntimeError();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function executeScriptInTab(tabId, func, args = []) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func,
        args
      },
      (results) => {
        const error = getRuntimeError();
        if (error) {
          reject(error);
          return;
        }

        resolve(results?.[0]?.result);
      }
    );
  });
}

function containsPermissions(origins) {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains({ origins }, (result) => {
      const error = getRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(Boolean(result));
    });
  });
}

function waitForTabLoad(tabId, timeoutMs = 9000) {
  return new Promise((resolve) => {
    let finished = false;

    const done = () => {
      if (finished) {
        return;
      }
      finished = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timerId);
      resolve();
    };

    const onUpdated = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === "complete") {
        done();
      }
    };

    const timerId = setTimeout(done, timeoutMs);
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

function collectFromPage(platformId) {
  const IMAGE_EXCLUDE_KEYWORDS = ["avatar", "profile", "icon", "head", "user-avatar", "default-avatar"];

  const normalizeUrl = (url) => {
    if (!url || typeof url !== "string") {
      return "";
    }

    if (url.startsWith("//")) {
      return `https:${url}`;
    }

    return url.trim();
  };

  const pickText = (selectors) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) {
        continue;
      }

      const content = node.getAttribute("content");
      if (content && content.trim()) {
        return content.trim();
      }

      const text = (node.textContent || "").trim();
      if (text) {
        return text;
      }
    }

    return "";
  };

  const collectImages = () => {
    const selectors = [
      "meta[property=\"og:image\"]",
      ".swiper-slide img",
      ".note-scroller img",
      ".note-content img",
      "article img",
      "main img"
    ];

    const seen = new Set();
    const imageUrls = [];

    const isLikelyPostImageUrl = (url) => {
      if (!url || url.startsWith("data:")) {
        return false;
      }

      let parsedUrl;

      try {
        parsedUrl = new URL(url);
      } catch {
        return false;
      }

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return false;
      }

      const lower = url.toLowerCase();
      return !IMAGE_EXCLUDE_KEYWORDS.some((keyword) => lower.includes(keyword));
    };

    const isLikelyAvatarNode = (node) => {
      const attrs = [
        node.getAttribute("class"),
        node.getAttribute("id"),
        node.getAttribute("alt"),
        node.getAttribute("data-testid"),
        node.getAttribute("data-type")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (IMAGE_EXCLUDE_KEYWORDS.some((keyword) => attrs.includes(keyword))) {
        return true;
      }

      return Boolean(node.closest("[class*='avatar'], [class*='author'], [class*='user-profile']"));
    };

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const raw =
          node.getAttribute("content") ||
          node.getAttribute("src") ||
          node.getAttribute("data-src") ||
          node.getAttribute("data-original") ||
          "";

        const normalized = normalizeUrl(raw);
        if (!isLikelyPostImageUrl(normalized) || isLikelyAvatarNode(node) || seen.has(normalized)) {
          return;
        }

        seen.add(normalized);
        imageUrls.push(normalized);
      });
    });

    return imageUrls;
  };

  if (platformId !== "xiaohongshu") {
    return {
      ok: false,
      error: "当前页面暂不支持采集"
    };
  }

  const title =
    pickText(["meta[property=\"og:title\"]", "h1", ".note-content .title", ".content .title"]) ||
    document.title ||
    "";

  const content = pickText([
    "meta[property=\"og:description\"]",
    "meta[name=\"description\"]",
    ".note-content .desc",
    ".content .desc",
    "article"
  ]);

  const imageUrls = collectImages();

  return {
    ok: true,
    data: {
      title,
      content,
      category: "同人创作",
      images: imageUrls
    }
  };
}

function readAuthStorageFromPage() {
  const readEntries = (storageRef) => {
    const entries = [];

    if (!storageRef) {
      return entries;
    }

    for (let index = 0; index < storageRef.length; index += 1) {
      const key = storageRef.key(index);
      if (!key) {
        continue;
      }

      entries.push([key, storageRef.getItem(key)]);
    }

    return entries;
  };

  return {
    localEntries: readEntries(window.localStorage),
    sessionEntries: readEntries(window.sessionStorage)
  };
}

async function ensurePlatformPermission(platformBaseUrl) {
  const originPattern = buildOriginPattern(platformBaseUrl);
  if (!originPattern) {
    return {
      ok: false,
      error: "平台地址不合法，请到插件设置中检查"
    };
  }

  const alreadyGranted = await containsPermissions([originPattern]);
  if (alreadyGranted) {
    return {
      ok: true,
      originPattern
    };
  }

  return {
    ok: false,
    error: "请先在插件页面点击并授权平台访问权限"
  };
}

async function getPlatformAccessToken(platformBaseUrl) {
  const origin = new URL(platformBaseUrl).origin;
  const urlPattern = `${origin}/*`;

  const existingTabs = await queryTabs({ url: [urlPattern] });
  let targetTab = existingTabs[0];
  let createdTabId = null;

  if (!targetTab) {
    targetTab = await createTab({
      url: origin,
      active: false
    });
    createdTabId = targetTab.id;
    await waitForTabLoad(targetTab.id);
  }

  try {
    const storageSnapshot = await executeScriptInTab(targetTab.id, readAuthStorageFromPage);
    const localEntries = Array.isArray(storageSnapshot?.localEntries) ? storageSnapshot.localEntries : [];
    const sessionEntries = Array.isArray(storageSnapshot?.sessionEntries) ? storageSnapshot.sessionEntries : [];

    return findSupabaseAccessToken([...localEntries, ...sessionEntries]);
  } finally {
    if (createdTabId) {
      try {
        await removeTab(createdTabId);
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

async function getActiveTab() {
  const tabs = await queryTabs({ active: true, lastFocusedWindow: true });
  return tabs[0] || null;
}

function toDraftFromCollection(collectionResult, tabUrl) {
  const images = Array.isArray(collectionResult?.images)
    ? collectionResult.images.map((url, index) => ({
        url,
        selected: true,
        order: index
      }))
    : [];

  return {
    sourcePlatform: "xiaohongshu",
    sourceUrl: tabUrl,
    title: (collectionResult?.title || "").trim(),
    content: (collectionResult?.content || "").trim(),
    category: collectionResult?.category || DEFAULT_CATEGORY,
    images,
    updatedAt: new Date().toISOString()
  };
}

async function collectCurrentPage() {
  const tab = await getActiveTab();

  if (!tab?.id || !tab.url) {
    return {
      ok: false,
      error: "未找到可采集的页面"
    };
  }

  const collector = getCollectorByUrl(tab.url);
  if (!collector) {
    return {
      ok: false,
      error: "当前页面不支持采集（仅支持小红书帖子页）"
    };
  }

  const extraction = await executeScriptInTab(tab.id, collectFromPage, [collector.id]);

  if (!extraction?.ok) {
    return {
      ok: false,
      error: extraction?.error || "采集失败，请刷新页面重试"
    };
  }

  const draft = toDraftFromCollection(extraction.data, tab.url);
  await saveDraft(draft);

  await createTab({
    url: chrome.runtime.getURL("preview.html"),
    active: true
  });

  return {
    ok: true,
    draft
  };
}

function buildLoginUrl(platformBaseUrl) {
  const loginUrl = new URL("/login", platformBaseUrl);
  loginUrl.searchParams.set("next", "/submit");
  return loginUrl.toString();
}

async function submitDraft(rawDraft) {
  const settings = await getSettings();
  const platformBaseUrl = normalizePlatformBaseUrl(settings.platformBaseUrl) || DEFAULT_PLATFORM_BASE_URL;

  const permissionCheck = await ensurePlatformPermission(platformBaseUrl);
  if (!permissionCheck.ok) {
    return {
      ok: false,
      code: "PERMISSION_DENIED",
      error: permissionCheck.error
    };
  }

  let payload;

  try {
    payload = toSubmissionPayload(rawDraft);
  } catch (error) {
    return {
      ok: false,
      code: "INVALID_DRAFT",
      error: error instanceof Error ? error.message : "草稿数据不完整"
    };
  }

  const accessToken = await getPlatformAccessToken(platformBaseUrl);
  if (!accessToken) {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      error: "请先在平台登录后再提交",
      loginUrl: buildLoginUrl(platformBaseUrl)
    };
  }

  const endpoint = new URL("/api/submissions", platformBaseUrl).toString();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    const responsePayload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        code: "API_ERROR",
        status: response.status,
        error: responsePayload?.error || "提交失败，请稍后再试"
      };
    }

    return {
      ok: true,
      id: responsePayload?.id || ""
    };
  } catch (error) {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      error: error instanceof Error ? error.message : "网络异常，提交失败"
    };
  }
}

async function inspectActiveTab() {
  const tab = await getActiveTab();
  const settings = await getSettings();

  if (!tab?.url) {
    return {
      ok: true,
      supported: false,
      platformLabel: "",
      tabUrl: "",
      settings
    };
  }

  const collector = getCollectorByUrl(tab.url);
  return {
    ok: true,
    supported: Boolean(collector),
    platformLabel: collector?.label || "",
    tabUrl: tab.url,
    settings
  };
}

async function openLogin() {
  const settings = await getSettings();
  const platformBaseUrl = normalizePlatformBaseUrl(settings.platformBaseUrl) || DEFAULT_PLATFORM_BASE_URL;

  const permissionCheck = await ensurePlatformPermission(platformBaseUrl);
  if (!permissionCheck.ok) {
    return {
      ok: false,
      error: permissionCheck.error
    };
  }

  await createTab({
    url: buildLoginUrl(platformBaseUrl),
    active: true
  });

  return {
    ok: true
  };
}

const handlers = {
  "inspect-active-tab": inspectActiveTab,
  "collect-current-page": collectCurrentPage,
  "get-draft": async () => ({ ok: true, draft: await getDraft() }),
  "save-draft": async (message) => ({ ok: true, draft: await saveDraft(message.draft) }),
  "submit-draft": async (message) => submitDraft(message.draft),
  "get-settings": async () => ({ ok: true, settings: await getSettings() }),
  "save-settings": async (message) => {
    const normalized = normalizePlatformBaseUrl(message?.settings?.platformBaseUrl);

    if (!normalized) {
      return {
        ok: false,
        error: "请输入合法的平台地址（http/https）"
      };
    }

    const saved = await saveSettings({ platformBaseUrl: normalized });
    return {
      ok: true,
      settings: saved
    };
  },
  "open-login": openLogin
};

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    const settings = await getSettings();
    const normalized = normalizePlatformBaseUrl(settings.platformBaseUrl) || DEFAULT_PLATFORM_BASE_URL;

    if (normalized !== settings.platformBaseUrl) {
      await saveSettings({ platformBaseUrl: normalized });
    }
  })();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) {
    sendResponse({
      ok: false,
      error: "未知操作"
    });
    return false;
  }

  void handler(message)
    .then((result) => {
      sendResponse(result);
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "执行失败"
      });
    });

  return true;
});
