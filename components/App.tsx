import { useEffect, useState } from 'react';
import {
  addChildTab,
  addRootTab,
  deleteTab,
  duplicateTab,
  moveTab,
  readStructure,
  renameTab,
  revealTabPanel,
  selectTab,
  sidebarRect,
  toggleChildTabs,
  type StructureState,
} from '../lib/docs/actions';
import { readCaretAnchor, type CaretAnchor } from '../lib/docs/caret';
import { applyDocumentChrome } from '../lib/docs/chrome-style';
import { applyBlockCommand, type BlockCommand } from '../lib/docs/format';
import { countTabs, MAX_TABS } from '../lib/docs/tabs';
import { loadSettings, saveSettings, watchSettings, type NodoSettings } from '../lib/settings';
import { BlockMenu } from './BlockMenu';
import { keepEditorFocus, Sidebar } from './Sidebar';

const fallbackRect = () => ({
  top: 96,
  left: 0,
  width: 268,
  height: Math.max(320, window.innerHeight - 96),
});

export function App() {
  const [settings, setSettings] = useState<NodoSettings | null>(null);
  const [structure, setStructure] = useState<StructureState | null>(null);
  const [rect, setRect] = useState(fallbackRect);
  const [caret, setCaret] = useState<CaretAnchor | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formatAt, setFormatAt] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let stop = () => {};
    void loadSettings().then((loaded) => {
      setSettings(loaded);
      stop = watchSettings(setSettings);
    });
    return () => stop();
  }, []);

  useEffect(() => {
    if (!settings) return;
    applyDocumentChrome(settings);
  }, [settings]);

  useEffect(() => {
    if (!settings?.enabled) return;
    const publish = () => {
      revealTabPanel();
      setStructure(readStructure());
      const nextRect = sidebarRect();
      setRect(
        nextRect
          ? { top: nextRect.top, left: nextRect.left, width: nextRect.width, height: nextRect.height }
          : fallbackRect(),
      );
    };
    publish();
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(publish, 80);
    };
    const observer = new MutationObserver(schedule);
    const watch = () => {
      observer.disconnect();
      const target = document.querySelector('.left-sidebar-container') ?? document.documentElement;
      observer.observe(target, {
        subtree: true,
        childList: true,
        attributes: target.classList.contains('left-sidebar-container'),
        attributeFilter: ['class', 'aria-selected', 'aria-expanded', 'style'],
      });
    };
    watch();
    const interval = window.setInterval(() => {
      watch();
      publish();
    }, 1500);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [settings?.enabled]);

  useEffect(() => {
    if (!settings?.enabled) return;
    let frame = 0;
    const tick = () => {
      const next = readCaretAnchor();
      setCaret((current) => (sameCaret(current, next) ? current : next));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [settings?.enabled]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!settings) return null;

  async function update(partial: Partial<NodoSettings>) {
    const next = { ...settings!, ...partial };
    applyDocumentChrome(next);
    setSettings(next);
    await saveSettings(next);
  }

  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    try {
      const result = await action();
      if (!result.ok && result.message) setNotice(result.message);
      setStructure(readStructure());
    } finally {
      setBusy(false);
    }
  }

  function applyFormat(command: BlockCommand) {
    void applyBlockCommand(command).then((result) => {
      setNotice(
        result.ok
          ? `${command.label}のショートカットを、編集中の位置へ送りました。`
          : '編集位置が見つかりません。文書の本文をクリックしてから、もう一度選んでください。',
      );
    });
  }

  const sidebarRight = rect.left + rect.width;
  const handle =
    caret === null
      ? null
      : {
          left: Math.min(Math.max(sidebarRight + 4, caret.pageLeft - 54), window.innerWidth - 60),
          top: Math.min(Math.max(8, caret.y + caret.height / 2 - 12), window.innerHeight - 28),
        };

  return (
    <>
      {settings.enabled && !settings.showNativeTabs ? (
        <Sidebar
          title={structure?.title ?? ''}
          tabs={structure?.tabs ?? null}
          addDisabled={structure?.addTab === 'disabled' || (structure ? countTabs(structure.tabs) >= MAX_TABS : false)}
          viewOnly={structure?.addTab === 'disabled' && (structure ? countTabs(structure.tabs) < MAX_TABS : false)}
          busy={busy}
          showChrome={settings.showChrome}
          notice={notice}
          rect={rect}
          onAddRoot={() => void run(addRootTab)}
          onSelect={(path) => selectTab(path)}
          onRename={(path, title) => void run(() => renameTab(path, title))}
          onAddChild={(path) => void run(() => addChildTab(path))}
          onDelete={(path) => void run(() => deleteTab(path))}
          onDuplicate={(path) => void run(() => duplicateTab(path))}
          onMove={(path, delta) => void run(() => moveTab(path, delta))}
          onToggle={(path) => toggleChildTabs(path)}
          onNotice={setNotice}
          onToggleChrome={() => void update({ showChrome: !settings.showChrome })}
          onShowNativeTabs={() => void update({ showNativeTabs: true })}
          onDisable={() => void update({ enabled: false })}
        />
      ) : (
        <button
          type="button"
          className="pointer-events-auto absolute bottom-4 left-4 rounded-full border border-[#e6e4de] bg-white px-3 py-1.5 text-sm text-[#37352f] shadow-md"
          onClick={() =>
            void update(settings.enabled ? { showNativeTabs: false } : { enabled: true, showNativeTabs: false })
          }
          onPointerDown={keepEditorFocus}
        >
          {settings.enabled ? 'Nodoのページ' : 'Nodo'}
        </button>
      )}

      {settings.enabled && handle ? (
        <div
          className="pointer-events-auto absolute z-20 flex items-center text-[#37352f]/55"
          style={{ left: handle.left, top: handle.top }}
          onPointerDown={keepEditorFocus}
        >
          <button
            type="button"
            aria-label="ブロックを追加"
            aria-haspopup="menu"
            className="grid h-6 w-6 place-items-center rounded text-lg leading-none hover:bg-[#37352f]/8 hover:text-[#37352f]"
            onClick={() => setFormatAt({ x: handle.left, y: handle.top + 28 })}
          >
            +
          </button>
          <button
            type="button"
            aria-label="ブロックの操作"
            aria-haspopup="menu"
            className="grid h-6 w-6 place-items-center rounded hover:bg-[#37352f]/8 hover:text-[#37352f]"
            onClick={() => setFormatAt({ x: handle.left, y: handle.top + 28 })}
          >
            <BlockGrip />
          </button>
        </div>
      ) : null}

      {settings.enabled && formatAt ? (
        <button
          type="button"
          aria-label="ブロックメニューを閉じる"
          className="pointer-events-auto absolute inset-0 z-20 cursor-default"
          onPointerDown={keepEditorFocus}
          onClick={() => setFormatAt(null)}
        />
      ) : null}
      {settings.enabled && formatAt ? (
        <div
          className="pointer-events-auto absolute z-30"
          style={{ left: Math.min(formatAt.x, window.innerWidth - 312), top: Math.min(formatAt.y, window.innerHeight - 360) }}
          onPointerDown={keepEditorFocus}
        >
          <BlockMenu onSelect={applyFormat} onClose={() => setFormatAt(null)} />
        </div>
      ) : null}

      {settings.enabled && settings.showNativeTabs && notice ? (
        <p className="pointer-events-auto absolute bottom-16 left-4 max-w-xs rounded-lg bg-white px-3 py-2 text-xs leading-5 text-[#5f5d57] shadow-md">
          {notice}
        </p>
      ) : null}
    </>
  );
}

function BlockGrip() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <circle cx="3.5" cy="2.5" r="1.1" fill="currentColor" />
      <circle cx="8.5" cy="2.5" r="1.1" fill="currentColor" />
      <circle cx="3.5" cy="7" r="1.1" fill="currentColor" />
      <circle cx="8.5" cy="7" r="1.1" fill="currentColor" />
      <circle cx="3.5" cy="11.5" r="1.1" fill="currentColor" />
      <circle cx="8.5" cy="11.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function sameCaret(current: CaretAnchor | null, next: CaretAnchor | null): boolean {
  if (current === next) return true;
  if (!current || !next) return false;
  return (
    Math.round(current.x) === Math.round(next.x) &&
    Math.round(current.y) === Math.round(next.y) &&
    Math.round(current.height) === Math.round(next.height) &&
    Math.round(current.pageLeft) === Math.round(next.pageLeft)
  );
}
