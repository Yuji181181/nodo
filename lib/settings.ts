import { browser } from 'wxt/browser';

export interface NodoSettings {
  enabled: boolean;
  showChrome: boolean;
  showNativeTabs: boolean;
}

export const defaultSettings: NodoSettings = {
  enabled: true,
  showChrome: false,
  showNativeTabs: false,
};

const storageKey = 'nodo-settings';

export async function loadSettings(): Promise<NodoSettings> {
  const stored = await browser.storage.local.get(storageKey);
  return normalizeSettings(stored[storageKey]);
}

export async function saveSettings(settings: NodoSettings): Promise<void> {
  await browser.storage.local.set({ [storageKey]: settings });
}

export function watchSettings(onChange: (settings: NodoSettings) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    area: string,
  ) => {
    if (area !== 'local' || !(storageKey in changes)) return;
    onChange(normalizeSettings(changes[storageKey]?.newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

function normalizeSettings(value: unknown): NodoSettings {
  if (!value || typeof value !== 'object') return { ...defaultSettings };
  const record = value as Partial<NodoSettings>;
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : defaultSettings.enabled,
    showChrome: typeof record.showChrome === 'boolean' ? record.showChrome : defaultSettings.showChrome,
    showNativeTabs:
      typeof record.showNativeTabs === 'boolean' ? record.showNativeTabs : defaultSettings.showNativeTabs,
  };
}
