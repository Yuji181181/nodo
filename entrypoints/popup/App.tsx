import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { loadSettings, saveSettings, watchSettings, type NodoSettings } from '../../lib/settings';

export function App() {
  const [settings, setSettings] = useState<NodoSettings | null>(null);
  const [onDocument, setOnDocument] = useState<boolean | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
    return watchSettings(setSettings);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light', settings?.theme === 'light');
  }, [settings?.theme]);

  useEffect(() => {
    void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url ?? '';
      setOnDocument(/^https:\/\/docs\.google\.com\/document\/(?:u\/\d+\/)?d\//.test(url));
    });
  }, []);

  async function update(partial: Partial<NodoSettings>) {
    if (!settings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  }

  return (
    <main className="w-80 bg-[var(--nodo-sidebar)] p-4 text-[var(--nodo-fg)]">
      <p className="text-xs font-medium tracking-wide text-[var(--nodo-fg-faint)]">Google ドキュメント</p>
      <h1 className="mt-1 text-lg font-semibold">Nodo</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--nodo-fg-soft)]">
        タブをページの一覧として扱い、段落の書式をカーソル位置へ送ります。文書は Google ドキュメントのままです。
      </p>
      {onDocument === false ? (
        <p className="mt-3 rounded-lg bg-[var(--nodo-menu)] px-3 py-2 text-xs leading-5 text-[var(--nodo-fg-soft)]">
          開いているタブは文書の編集画面ではありません。docs.google.com の文書を開いてください。
        </p>
      ) : null}
      {settings ? (
        <div className="mt-4 flex flex-col gap-2">
          <Toggle
            label="Nodoを使う"
            pressed={settings.enabled}
            onClick={() => void update({ enabled: !settings.enabled })}
          />
          <Toggle
            label="ダークモード"
            pressed={settings.theme === 'dark'}
            onClick={() => void update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          />
          <Toggle
            label="Googleのメニュー"
            pressed={settings.showChrome}
            onClick={() => void update({ showChrome: !settings.showChrome })}
          />
          <Toggle
            label="元のタブ欄"
            pressed={settings.showNativeTabs}
            onClick={() => void update({ showNativeTabs: !settings.showNativeTabs })}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--nodo-fg-faint)]">設定を読み込んでいます</p>
      )}
      <p className="mt-4 text-xs leading-5 text-[var(--nodo-fg-faint)]">
        切り替えのショートカットは Ctrl+Shift+Period です。標準表示に戻しても、文書の中身は変わりません。
      </p>
    </main>
  );
}

function Toggle({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className="flex items-center justify-between rounded-lg bg-[var(--nodo-menu)] px-3 py-2 text-left text-sm text-[var(--nodo-fg)] shadow-sm"
      onClick={onClick}
    >
      {label}
      <span className={`rounded-full px-2 py-0.5 text-xs ${pressed ? 'bg-[var(--nodo-fg)] text-[var(--nodo-sidebar)]' : 'bg-[var(--nodo-chip)] text-[var(--nodo-fg-soft)]'}`}>
        {pressed ? 'オン' : 'オフ'}
      </span>
    </button>
  );
}
