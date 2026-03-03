import { DEFAULT_CATEGORY } from "./constants.mjs";

function isHttpUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((item, index) => ({
      url: typeof item?.url === "string" ? item.url.trim() : "",
      selected: item?.selected !== false,
      order: typeof item?.order === "number" ? item.order : index
    }))
    .filter((item) => isHttpUrl(item.url))
    .sort((a, b) => a.order - b.order);
}

export function toSubmissionPayload(draft) {
  const name = (draft?.title || draft?.name || "").trim();
  if (!name) {
    throw new Error("标题不能为空");
  }

  const description = (draft?.content || draft?.description || "").trim();
  const category = typeof draft?.category === "string" && draft.category.trim() ? draft.category.trim() : DEFAULT_CATEGORY;

  const normalizedImages = normalizeImages(draft?.images);
  if (!normalizedImages.length) {
    throw new Error("至少选择一张图片");
  }

  const selectedUrls = normalizedImages.filter((item) => item.selected).map((item) => item.url);
  const finalUrls = selectedUrls.length ? selectedUrls : [normalizedImages[0].url];
  const firstImage = finalUrls[0];

  const sourceUrl = typeof draft?.sourceUrl === "string" ? draft.sourceUrl.trim() : "";
  const descriptionWithSource = sourceUrl ? `${description}\n\n来源：${sourceUrl}`.trim() : description;

  return {
    name,
    description: descriptionWithSource,
    category,
    imageUrl: firstImage,
    imageUrls: finalUrls
  };
}
