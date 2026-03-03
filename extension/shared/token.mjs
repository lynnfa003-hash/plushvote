function safeJsonParse(value) {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function findAccessTokenInValue(value, seen = new Set()) {
  if (!value || typeof value !== "object") {
    return "";
  }

  if (seen.has(value)) {
    return "";
  }

  seen.add(value);

  if (typeof value.access_token === "string" && value.access_token) {
    return value.access_token;
  }

  for (const nested of Object.values(value)) {
    if (!nested || typeof nested !== "object") {
      continue;
    }

    const token = findAccessTokenInValue(nested, seen);
    if (token) {
      return token;
    }
  }

  return "";
}

export function isLikelySupabaseTokenKey(key) {
  if (typeof key !== "string") {
    return false;
  }

  return key.includes("auth-token") || key.includes("supabase") || key.includes("sb-");
}

export function findSupabaseAccessToken(storageEntries) {
  if (!Array.isArray(storageEntries)) {
    return "";
  }

  for (const entry of storageEntries) {
    if (!Array.isArray(entry) || entry.length < 2) {
      continue;
    }

    const [key, rawValue] = entry;
    if (!isLikelySupabaseTokenKey(key)) {
      continue;
    }

    const parsed = safeJsonParse(rawValue);
    if (!parsed) {
      continue;
    }

    const token = findAccessTokenInValue(parsed);
    if (token) {
      return token;
    }
  }

  return "";
}
