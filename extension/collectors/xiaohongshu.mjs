import { COLLECTOR_IDS } from "./types.mjs";

const TITLE_SELECTORS = [
  "meta[property=\"og:title\"]",
  "h1",
  ".note-content .title",
  ".content .title"
];

const CONTENT_SELECTORS = [
  "meta[name=\"description\"]",
  "meta[property=\"og:description\"]",
  ".note-content .desc",
  ".content .desc",
  "article"
];

const IMAGE_SELECTORS = [
  "meta[property=\"og:image\"]",
  ".swiper-slide img",
  ".note-scroller img",
  ".note-content img",
  "article img",
  "main img"
];

const IMAGE_EXCLUDE_KEYWORDS = ["avatar", "profile", "icon", "head", "user-avatar", "default-avatar"];

function getMetaContent(documentRef, selector) {
  const node = documentRef.querySelector(selector);
  if (!node) {
    return "";
  }

  const content = node.getAttribute("content") || "";
  return content.trim();
}

function getFirstText(documentRef, selectors) {
  for (const selector of selectors) {
    if (selector.startsWith("meta[")) {
      const text = getMetaContent(documentRef, selector);
      if (text) {
        return text;
      }
      continue;
    }

    const node = documentRef.querySelector(selector);
    const text = node?.textContent?.trim() || "";
    if (text) {
      return text;
    }
  }

  return "";
}

function normalizeImageUrl(url) {
  if (typeof url !== "string") {
    return "";
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return trimmed;
}

export function isLikelyPostImageUrl(url) {
  if (typeof url !== "string") {
    return false;
  }

  const normalized = normalizeImageUrl(url);
  if (!normalized || normalized.startsWith("data:")) {
    return false;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return false;
  }

  const lower = normalized.toLowerCase();
  return !IMAGE_EXCLUDE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function collectImageUrls(documentRef) {
  const urls = [];
  const seen = new Set();

  for (const selector of IMAGE_SELECTORS) {
    const nodes = documentRef.querySelectorAll(selector);
    nodes.forEach((node) => {
      const raw = node.getAttribute("content") || node.getAttribute("src") || node.getAttribute("data-src") || "";
      const url = normalizeImageUrl(raw);
      if (!isLikelyPostImageUrl(url) || seen.has(url)) {
        return;
      }

      seen.add(url);
      urls.push(url);
    });
  }

  return urls;
}

export function isXiaohongshuUrl(url) {
  if (typeof url !== "string" || !url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isHostMatched = host === "xiaohongshu.com" || host.endsWith(".xiaohongshu.com");

    if (!isHostMatched) {
      return false;
    }

    const path = parsed.pathname;
    return path.includes("/explore/") || path.includes("/discovery/item/");
  } catch {
    return false;
  }
}

export function collectXiaohongshuFromDocument(documentRef, sourceUrl) {
  const title = getFirstText(documentRef, TITLE_SELECTORS);
  const content = getFirstText(documentRef, CONTENT_SELECTORS);
  const imageUrls = collectImageUrls(documentRef);

  return {
    sourcePlatform: COLLECTOR_IDS.XIAOHONGSHU,
    sourceUrl,
    title,
    content,
    category: "同人创作",
    images: imageUrls.map((url, index) => ({
      url,
      selected: true,
      order: index
    }))
  };
}

export const xiaohongshuAdapter = {
  id: COLLECTOR_IDS.XIAOHONGSHU,
  label: "小红书",
  match: isXiaohongshuUrl
};
