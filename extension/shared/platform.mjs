export function normalizePlatformBaseUrl(rawUrl) {
  if (typeof rawUrl !== "string") {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${cleanPath === "/" ? "" : cleanPath}`;
  } catch {
    return null;
  }
}

export function buildOriginPattern(platformBaseUrl) {
  const normalized = normalizePlatformBaseUrl(platformBaseUrl);
  if (!normalized) {
    return null;
  }

  return `${new URL(normalized).origin}/*`;
}
