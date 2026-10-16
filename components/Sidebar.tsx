import { useState, type PointerEvent } from 'react';
import { type TabNode } from '../lib/docs/tabs';
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
  onToggleChrome: () => void;
  onShowNativeTabs: () => void;
  onDisable: () => void;
  rect: { top: number; left: number; width: number; height: number };
}

export function Sidebar(props: SidebarProps) {
  const [options, setOptions] = useState(false);
  const title = props.title || '無題';
  return (
    <aside
      aria-label="ページ"
      className="pointer-events-auto absolute z-10 flex flex-col overflow-hidden border-r border-white/10 bg-[#202020] text-white/90"
      style={{
        top: props.rect.top,
        left: props.rect.left,
        width: props.rect.width,
        height: props.rect.height,
      }}
      onPointerDown={keepEditorFocus}
    >
      <header className="flex items-center gap-2 px-2 pt-2 pb-1">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-[#3a3a3a] text-[11px] text-white/80">
          {title.slice(0, 1)}
        </span>
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h1>
        <button
          type="button"
          aria-label="表示の設定"
          aria-expanded={options}
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-base text-white/80 hover:bg-white/10"
          onClick={() => setOptions((open) => !open)}
        >
          ···
        </button>
      </header>
      {options ? (
        <div role="menu" className="mx-2 mb-1 rounded-md bg-[#2a2a2a] p-1 text-sm shadow-lg">
          <Option label="標準表示" onClick={() => { setOptions(false); props.onDisable(); }} />
          <Option
            label={props.showChrome ? 'Googleのメニューを隠す' : 'Googleのメニューを表示'}
            onClick={() => { setOptions(false); props.onToggleChrome(); }}
          />
          <Option label="元のタブ欄" onClick={() => { setOptions(false); props.onShowNativeTabs(); }} />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        <h2 className="px-2 pt-3 pb-1 text-xs text-white/45">ページ</h2>
        {props.tabs === null ? (
          <p className="px-2 py-2 text-sm text-white/45">読み込み中</p>
        ) : props.tabs.length === 0 ? (
          <p className="px-2 py-2 text-sm leading-5 text-white/55">
            タブ一覧を読み取れませんでした。表示の設定から元のタブ欄を開けます。
          </p>
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
        <button
          type="button"
          className="mt-0.5 flex h-[30px] w-full items-center gap-2 rounded px-2 text-left text-sm text-white/45 hover:bg-white/6 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          disabled={props.addDisabled || props.busy}
          onClick={props.onAddRoot}
        >
          <PlusIcon />
          新規ページを追加
        </button>
        {props.viewOnly ? (
          <p className="px-2 pt-2 text-xs leading-5 text-white/35">閲覧中はページを変更できません。</p>
        ) : null}
      </div>

      {props.notice ? (
        <p className="mx-2 mb-2 rounded-md bg-[#2a2a2a] px-2 py-1.5 text-xs leading-5 text-white/70">{props.notice}</p>
      ) : null}
    </aside>
  );
}

function Option({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="block w-full rounded px-2 py-1.5 text-left text-white/85 hover:bg-white/8"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function keepEditorFocus(event: PointerEvent) {
  const target = event.target;
  if (target instanceof Element && target.closest('[data-allow-focus]')) return;
  event.preventDefault();
}

export function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <path d="M7 2.5 V11.5 M2.5 7 H11.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
