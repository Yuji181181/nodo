import { useEffect, useRef, useState } from 'react';
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
import {
  focusEditorLine,
  pageSeams,
  readCaretAnchor,
  readHoverLine,
  readVisiblePages,
  type CaretAnchor,
  type HoverLine,
  type PageFrame,
} from '../lib/docs/caret';
import { applyDocumentChrome } from '../lib/docs/chrome-style';
import { applyBlockCommand, type BlockCommand } from '../lib/docs/format';
import { countTabs, MAX_TABS, type TabNode } from '../lib/docs/tabs';
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
  const [pages, setPages] = useState<PageFrame[]>([]);
  const [hoverLine, setHoverLine] = useState<HoverLine | null>(null);
  const layoutRef = useRef({ sidebarRight: 0 });
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
    const hoverRef: { current: HoverLine | null } = { current: null };
    const tick = () => {
      const next = readCaretAnchor();
      setCaret((current) => (sameCaret(current, next) ? current : next));
      const nextPages = readVisiblePages();
      setPages((current) => (samePages(current, nextPages) ? current : nextPages));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    const onMove = (event: PointerEvent) => {
      const next = readHoverLine(event.clientX, event.clientY);
      const current = hoverRef.current;
      if (current && pointerOnHandle(current, event.clientX, event.clientY, layoutRef.current.sidebarRight)) return;
      if (sameHover(current, next)) return;
      hoverRef.current = next;
      setHoverLine(next);
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
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
  layoutRef.current.sidebarRight = sidebarRight;
  const pageFrame = pages[0] ?? null;
  const handle = hoverLine
    ? { left: Math.max(sidebarRight + 8, hoverLine.left), top: hoverLine.top, focusX: hoverLine.focusX, focusY: hoverLine.focusY }
    : caret
      ? {
          left: Math.max(sidebarRight + 8, caret.pageLeft + 52),
          top: caret.y,
          focusX: caret.x + 8,
          focusY: caret.y + caret.height / 2,
        }
      : null;
  const page = selectedPage(structure?.tabs ?? null);
  const pageTitle = page?.title || structure?.title || '無題';
  const titleLift = page?.emoji ? 118 : 78;
  const showTitle = pageFrame !== null && pageFrame.top > titleLift;

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

      {settings.enabled
        ? pages.map((pageRect) => (
            <div
              key={`${Math.round(pageRect.top)}-${Math.round(pageRect.left)}`}
              className="pointer-events-none absolute z-0"
              style={{
                left: pageRect.left,
                top: pageRect.top,
                width: pageRect.width,
                height: pageRect.height,
                boxShadow: 'inset 0 0 0 4px #ffffff',
              }}
            />
          ))
        : null}
      {settings.enabled
        ? pageSeams(pages).map((seam) => (
            <div
              key={`seam-${Math.round(seam.top)}`}
              className="pointer-events-none absolute z-0 bg-white"
              style={{ left: seam.left, top: seam.top, width: seam.width, height: seam.height }}
            />
          ))
        : null}

      {settings.enabled && showTitle && pageFrame ? (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: pageFrame.left + 96,
            top: pageFrame.top - titleLift,
            width: Math.max(240, pageFrame.width - 180),
          }}
        >
          {page?.emoji ? <p className="mb-1 text-[32px] leading-none">{page.emoji}</p> : null}
          <p className="truncate text-[40px] leading-[1.2] font-bold tracking-[-0.02em] text-[#37352f]">{pageTitle}</p>
        </div>
      ) : null}

      {settings.enabled && handle ? (
        <div
          className="pointer-events-auto absolute z-20 flex items-center text-[#9b9a97]"
          style={{ left: handle.left, top: handle.top }}
          onPointerDown={keepEditorFocus}
        >
          <button
            type="button"
            aria-label="ブロックを追加"
            aria-haspopup="menu"
            className="grid h-6 w-6 place-items-center rounded text-lg leading-none hover:bg-[#37352f]/8 hover:text-[#37352f]"
            onClick={() => {
              focusEditorLine(handle.focusX, handle.focusY);
              setFormatAt({ x: handle.left + 28, y: handle.top + 28 });
            }}
          >
            +
          </button>
          <button
            type="button"
            aria-label="ブロックの操作"
            aria-haspopup="menu"
            className="grid h-6 w-6 place-items-center rounded hover:bg-[#37352f]/8 hover:text-[#37352f]"
            onClick={() => {
              focusEditorLine(handle.focusX, handle.focusY);
              setFormatAt({ x: handle.left + 28, y: handle.top + 28 });
            }}
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

function selectedPage(tabs: readonly TabNode[] | null): TabNode | null {
  if (!tabs) return null;
  for (const tab of tabs) {
    if (tab.selected) return tab;
    const child = selectedPage(tab.children);
    if (child) return child;
  }
  return null;
}

function pointerOnHandle(line: HoverLine, x: number, y: number, sidebarRight: number): boolean {
  const left = Math.max(sidebarRight + 8, line.left);
  return x >= left - 8 && x <= left + 64 && y >= line.top - 8 && y <= line.top + 32;
}

function samePages(current: readonly PageFrame[], next: readonly PageFrame[]): boolean {
  if (current.length !== next.length) return false;
  return current.every((page, index) => sameFrame(page, next[index] ?? null));
}

function sameFrame(current: PageFrame | null, next: PageFrame | null): boolean {
  if (current === next) return true;
  if (!current || !next) return false;
  return (
    Math.round(current.left) === Math.round(next.left) &&
    Math.round(current.top) === Math.round(next.top) &&
    Math.round(current.width) === Math.round(next.width)
  );
}

function sameHover(current: HoverLine | null, next: HoverLine | null): boolean {
  if (current === next) return true;
  if (!current || !next) return false;
  return Math.round(current.left) === Math.round(next.left) && Math.round(current.top) === Math.round(next.top);
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
