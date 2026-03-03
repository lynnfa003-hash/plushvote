import { DEFAULT_PLATFORM_BASE_URL } from "./constants.mjs";

export const SETTINGS_STORAGE_KEY = "plushvote_settings";
export const DRAFT_STORAGE_KEY = "plushvote_draft";

function getRuntimeError() {
  return chrome.runtime?.lastError ? new Error(chrome.runtime.lastError.message) : null;
}

function storageGet(area, key) {
  return new Promise((resolve, reject) => {
    chrome.storage[area].get(key, (result) => {
      const error = getRuntimeError();
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
}

function storageSet(area, value) {
  return new Promise((resolve, reject) => {
    chrome.storage[area].set(value, () => {
      const error = getRuntimeError();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function storageRemove(area, key) {
  return new Promise((resolve, reject) => {
    chrome.storage[area].remove(key, () => {
      const error = getRuntimeError();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function getSettings() {
  const result = await storageGet("sync", SETTINGS_STORAGE_KEY);
  const saved = result?.[SETTINGS_STORAGE_KEY] ?? {};

  return {
    platformBaseUrl: saved.platformBaseUrl || DEFAULT_PLATFORM_BASE_URL
  };
}

export async function saveSettings(nextSettings) {
  await storageSet("sync", {
    [SETTINGS_STORAGE_KEY]: nextSettings
  });

  return nextSettings;
}

export async function getDraft() {
  const result = await storageGet("session", DRAFT_STORAGE_KEY);
  return result?.[DRAFT_STORAGE_KEY] ?? null;
}

export async function saveDraft(draft) {
  await storageSet("session", {
    [DRAFT_STORAGE_KEY]: draft
  });

  return draft;
}

export async function clearDraft() {
  await storageRemove("session", DRAFT_STORAGE_KEY);
}
