import type { PointerEvent } from 'react';
import { countTabs, MAX_TABS, type TabNode } from '../lib/docs/tabs';
import { PageTree } from './PageTree';

interface SidebarProps {
  title: string;
  tabs: TabNode[] | null;
  addDisabled: boolean;
  viewOnly: boolean;
  busy: boolean;
  showChrome: boolean;
  notice: string | null;
  onAddRoot: () => void;
  onSelect: (path: string) => void;
  onRename: (path: string, title: string) => void;
  onAddChild: (path: string) => void;
  onDelete: (path: string) => void;
  onDuplicate: (path: string) => void;
  onMove: (path: string, delta: number) => void;
  onToggle: (path: string) => void;
  onNotice: (message: string) => void;
  onFormat: (anchor: DOMRect) => void;
  onToggleChrome: () => void;
  onShowNativeTabs: () => void;
  onDisable: () => void;
  rect: { top: number; left: number; width: number; height: number };
}

export function Sidebar(props: SidebarProps) {
  const total = props.tabs ? countTabs(props.tabs) : 0;
  return (
    <aside
      aria-label="Nodo"
      className="pointer-events-auto absolute flex flex-col overflow-hidden border-r border-[#e6e4de] bg-[#f7f6f3] text-[#37352f]"
      style={{
        top: props.rect.top,
        left: props.rect.left,
        width: props.rect.width,
        height: props.rect.height,
      }}
      onPointerDown={keepEditorFocus}
    >
      <header className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[#8b897f]">Nodo</p>
          <h1 className="truncate text-sm font-semibold">{props.title || '無題のドキュメント'}</h1>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md px-2 py-1 text-xs text-[#5f5d57] hover:bg-[#efeee9]"
          onClick={props.onDisable}
        >
          標準表示
        </button>
      </header>

      {props.viewOnly ? (
        <p className="mx-3 mb-2 rounded-lg bg-[#efeee9] px-2.5 py-2 text-xs leading-5 text-[#5f5d57]">
          閲覧または提案モードです。ページの変更は、編集できる文書で使えます。
        </p>
      ) : null}
      {props.notice ? (
        <p className="mx-3 mb-2 rounded-lg bg-white px-2.5 py-2 text-xs leading-5 text-[#5f5d57] shadow-sm">
          {props.notice}
        </p>
      ) : null}

      <div className="flex items-center justify-between px-3 pt-1 pb-1">
        <h2 className="text-xs font-medium text-[#8b897f]">ページ</h2>
        <span className="text-[11px] text-[#a8a69d]">
          {total}/{MAX_TABS}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {props.tabs === null ? (
          <p className="px-2 py-3 text-sm text-[#8b897f]">ページを読み込んでいます</p>
        ) : props.tabs.length === 0 ? (
          <div className="px-2 py-3 text-sm leading-6 text-[#5f5d57]">
            <p>タブ一覧を読み取れませんでした。</p>
            <p className="mt-1 text-xs text-[#8b897f]">
              Google ドキュメントの画面が変わった可能性があります。元のタブ欄を表示して操作を続けられます。
            </p>
          </div>
        ) : (
          <PageTree
            tabs={props.tabs}
            busy={props.busy}
            onSelect={props.onSelect}
            onRename={props.onRename}
            onAddChild={props.onAddChild}
            onDelete={props.onDelete}
            onDuplicate={props.onDuplicate}
            onMove={props.onMove}
            onToggle={props.onToggle}
            onNotice={props.onNotice}
          />
        )}
      </div>

      <div className="border-t border-[#e6e4de] p-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[#efeee9] disabled:cursor-not-allowed disabled:text-[#b8b6ae]"
          disabled={props.addDisabled || props.busy || total >= MAX_TABS}
          onClick={props.onAddRoot}
        >
          <span aria-hidden="true">＋</span>
          新しいページ
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[#efeee9]"
          onClick={(event) => props.onFormat(event.currentTarget.getBoundingClientRect())}
        >
          <span aria-hidden="true">¶</span>
          現在の段落の書式
        </button>
        <button
          type="button"
          aria-pressed={props.showChrome}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-[#efeee9]"
          onClick={props.onToggleChrome}
        >
          Googleのメニュー
          <span className="text-xs text-[#8b897f]">{props.showChrome ? '表示中' : '隠す'}</span>
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-[#efeee9]"
          onClick={props.onShowNativeTabs}
        >
          元のタブ欄
          <span className="text-xs text-[#8b897f]">表示</span>
        </button>
      </div>
    </aside>
  );
}

export function keepEditorFocus(event: PointerEvent) {
  const target = event.target;
  if (target instanceof Element && target.closest('[data-allow-focus]')) return;
  event.preventDefault();
}
