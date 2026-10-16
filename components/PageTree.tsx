import { useRef, useState, type RefObject } from 'react';
import { explainFailure } from '../lib/docs/messages';
import { canNestUnder, findTab, type TabNode } from '../lib/docs/tabs';

interface PageTreeProps {
  tabs: TabNode[];
  busy: boolean;
  onSelect: (path: string) => void;
  onRename: (path: string, title: string) => void;
  onAddChild: (path: string) => void;
  onDelete: (path: string) => void;
  onDuplicate: (path: string) => void;
  onMove: (path: string, delta: number) => void;
  onToggle: (path: string) => void;
  onNotice: (message: string) => void;
}

export function PageTree(props: PageTreeProps) {
  const dragPath = useRef<string | null>(null);
  return (
    <div role="tree" aria-label="ページ" className="flex flex-col">
      {props.tabs.map((node) => (
        <PageRow key={node.path} node={node} depth={0} dragPath={dragPath} {...props} />
      ))}
    </div>
  );
}

function PageRow({
  node,
  depth,
  dragPath,
  ...props
}: PageTreeProps & { node: TabNode; depth: number; dragPath: RefObject<string | null> }) {
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function commitRename() {
    const title = draft.trim();
    setEditing(false);
    if (!title) {
      setDraft(node.title);
      props.onNotice(explainFailure('empty-title'));
      return;
    }
    if (title !== node.title) props.onRename(node.path, title);
  }

  function dropOnThis() {
    const source = dragPath.current;
    dragPath.current = null;
    if (!source || source === node.path) return;
    if (parentPath(source) !== parentPath(node.path)) {
      props.onNotice(explainFailure('cross-parent'));
      return;
    }
    const siblings = siblingNodes(props.tabs, source);
    const from = siblings.findIndex((item) => item.path === source);
    const to = siblings.findIndex((item) => item.path === node.path);
    if (from < 0 || to < 0 || from === to) return;
    props.onMove(source, to - from);
  }

  return (
    <div role="group">
      <div
        role="treeitem"
        aria-selected={node.selected}
        aria-level={depth + 1}
        aria-expanded={node.childToggle === 'none' ? undefined : node.childToggle === 'expanded'}
        draggable={!editing}
        className={`group flex h-[30px] items-center rounded pr-1 text-sm text-white/90 ${
          node.selected ? 'bg-white/10' : 'hover:bg-white/6'
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ paddingLeft: 4 + depth * 14 }}
        onDragStart={(event) => {
          dragPath.current = node.path;
          event.dataTransfer.setData('text/plain', node.path);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          dragPath.current = null;
        }}
        onDragOver={(event) => {
          const source = dragPath.current;
          if (!source || parentPath(source) !== parentPath(node.path)) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          dropOnThis();
        }}
      >
        {node.childToggle === 'none' ? (
          <span className="w-4 shrink-0" />
        ) : (
          <button
            type="button"
            className="grid h-5 w-4 shrink-0 place-items-center rounded text-white/45 hover:bg-white/10"
            aria-label={node.childToggle === 'expanded' ? '子ページを閉じる' : '子ページを開く'}
            onClick={() => props.onToggle(node.path)}
          >
            <Chevron open={node.childToggle === 'expanded'} />
          </button>
        )}
        {editing ? (
          <input
            data-allow-focus="true"
            className="min-w-0 flex-1 rounded bg-[#191919] px-1 py-0.5 text-sm text-white outline-none"
            value={draft}
            aria-label="ページ名"
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitRename();
              }
              if (event.key === 'Escape') {
                setDraft(node.title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            onClick={() => props.onSelect(node.path)}
            onDoubleClick={() => {
              setDraft(node.title);
              setEditing(true);
            }}
          >
            <PageIcon emoji={node.emoji} />
            <span className="truncate">{node.title}</span>
          </button>
        )}
        <span className={`flex shrink-0 items-center text-white/85 ${menuAt || hovered || node.selected ? 'opacity-100' : 'opacity-0'}`}>
          <button
            type="button"
            aria-label={`${node.title}の子ページを追加`}
            disabled={!canNestUnder(node.level) || props.busy}
            className="grid h-6 w-6 place-items-center rounded hover:bg-white/10 disabled:text-white/25"
            onClick={() => props.onAddChild(node.path)}
          >
            <PlusMark />
          </button>
          <button
            type="button"
            aria-label={`${node.title}の操作`}
            aria-expanded={menuAt !== null}
            className="grid h-6 w-6 place-items-center rounded text-sm hover:bg-white/10"
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              setMenuAt((current) => (current ? null : { x: box.right - 180, y: box.bottom + 4 }));
            }}
          >
            ···
          </button>
        </span>
        {menuAt ? (
          <div
            role="menu"
            className="fixed z-30 w-44 rounded-md border border-white/10 bg-[#252525] p-1 text-sm text-white/90 shadow-xl"
            style={{ left: Math.max(8, menuAt.x), top: menuAt.y }}
          >
            <MenuButton label="名前を変更" onClick={() => { setMenuAt(null); setDraft(node.title); setEditing(true); }} />
            <MenuButton label="子ページを追加" disabled={!canNestUnder(node.level) || props.busy} onClick={() => { setMenuAt(null); props.onAddChild(node.path); }} />
            <MenuButton label="上に移動" disabled={props.busy} onClick={() => { setMenuAt(null); props.onMove(node.path, -1); }} />
            <MenuButton label="下に移動" disabled={props.busy} onClick={() => { setMenuAt(null); props.onMove(node.path, 1); }} />
            <MenuButton label="複製" disabled={props.busy} onClick={() => { setMenuAt(null); props.onDuplicate(node.path); }} />
            <MenuButton label="削除" danger disabled={props.busy} onClick={() => { setMenuAt(null); setConfirmingDelete(true); }} />
          </div>
        ) : null}
      </div>
      {confirmingDelete ? (
        <div className="mx-2 my-1 rounded-md bg-[#3a2424] p-2 text-xs text-[#f0c9c6]">
          <p>「{node.title}」を削除します。</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded bg-[#c4554d] px-2 py-1 text-white" onClick={() => { setConfirmingDelete(false); props.onDelete(node.path); }}>
              削除
            </button>
            <button type="button" className="rounded px-2 py-1 text-white/70" onClick={() => setConfirmingDelete(false)}>
              キャンセル
            </button>
          </div>
        </div>
      ) : null}
      {node.childToggle !== 'collapsed'
        ? node.children.map((child) => (
            <PageRow key={child.path} node={child} depth={depth + 1} dragPath={dragPath} {...props} />
          ))
        : null}
    </div>
  );
}

function MenuButton({
  label,
  disabled,
  danger,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={`block w-full rounded px-2 py-1.5 text-left hover:bg-white/8 disabled:cursor-not-allowed disabled:text-white/25 ${
        danger ? 'text-[#ff7369]' : ''
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PlusMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 2.5 V11.5 M2.5 7 H11.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function PageIcon({ emoji }: { emoji: string }) {
  if (emoji) return <span className="w-4 shrink-0 text-center text-xs">{emoji}</span>;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-white/55">
      <path
        d="M4 2.5 H9.2 L12 5.3 V13.5 H4 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M9 2.8 V5.4 H11.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function parentPath(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

function siblingNodes(nodes: readonly TabNode[], path: string): readonly TabNode[] {
  const parent = parentPath(path);
  if (!parent) return nodes;
  return findTab(nodes, parent)?.children ?? [];
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={open ? 'rotate-90' : ''}>
      <path d="M3.2 2.2 L6.8 5 L3.2 7.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
