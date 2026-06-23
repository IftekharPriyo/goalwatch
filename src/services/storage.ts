import type { ExtensionStorage } from "../types/storage";

const API_KEY_STORAGE_KEY: keyof ExtensionStorage = "footballApiKey";

function getStorageValue<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(result[key] as T | undefined);
    });
  });
}

function setStorageValue(items: ExtensionStorage): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}

export async function getApiKey(): Promise<string> {
  return (await getStorageValue<string>(API_KEY_STORAGE_KEY)) ?? "";
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await setStorageValue({ [API_KEY_STORAGE_KEY]: apiKey.trim() });
}

