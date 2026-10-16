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
    <div role="tree" aria-label="ページ" className="flex flex-col gap-0.5">
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
        className={`group relative flex min-h-8 items-center gap-1 rounded-md pr-1 ${
          node.selected ? 'bg-white shadow-[0_1px_2px_rgba(55,53,47,0.08)]' : 'hover:bg-[#efeee9]'
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
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
            className="grid h-5 w-4 shrink-0 place-items-center rounded text-[#8b897f] hover:bg-[#e7e5e1]"
            aria-label={node.childToggle === 'expanded' ? '子ページを閉じる' : '子ページを開く'}
            onClick={() => props.onToggle(node.path)}
          >
            <Chevron open={node.childToggle === 'expanded'} />
          </button>
        )}
        <button
          type="button"
          draggable
          data-allow-focus="true"
          aria-label={`${node.title}を並べ替える`}
          className="grid h-5 w-3 shrink-0 cursor-grab place-items-center text-[#c6c4bc] opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          onDragStart={(event) => {
            dragPath.current = node.path;
            event.dataTransfer.setData('text/plain', node.path);
            event.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => {
            dragPath.current = null;
          }}
        >
          <Grip />
        </button>
        {editing ? (
          <input
            data-allow-focus="true"
            className="min-w-0 flex-1 rounded border border-[#d8d6cf] bg-white px-1.5 py-0.5 text-sm text-[#37352f] outline-none"
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
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded py-1 text-left text-sm text-[#37352f]"
            onClick={() => props.onSelect(node.path)}
            onDoubleClick={() => {
              setDraft(node.title);
              setEditing(true);
            }}
          >
            <span className="w-4 shrink-0 text-center text-xs" aria-hidden="true">
              {node.emoji || '📄'}
            </span>
            <span className="truncate">{node.title}</span>
          </button>
        )}
        <button
          type="button"
          aria-label={`${node.title}の操作`}
          aria-expanded={menuAt !== null}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded text-[#8b897f] hover:bg-[#e7e5e1] focus-visible:opacity-100 ${
            node.selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            setMenuAt((current) => (current ? null : { x: box.right - 176, y: box.bottom + 4 }));
          }}
        >
          ···
        </button>
        {menuAt ? (
          <div
            role="menu"
            className="fixed z-20 w-44 rounded-lg border border-[#e6e4de] bg-white p-1 text-sm shadow-lg"
            style={{ left: Math.max(8, menuAt.x), top: menuAt.y }}
          >
            <MenuButton label="名前を変更" onClick={() => { setMenuAt(null); setDraft(node.title); setEditing(true); }} />
            <MenuButton label="子ページを追加" disabled={!canNestUnder(node.level) || props.busy} onClick={() => { setMenuAt(null); props.onAddChild(node.path); }} />
            <MenuButton label="上へ" disabled={props.busy} onClick={() => { setMenuAt(null); props.onMove(node.path, -1); }} />
            <MenuButton label="下へ" disabled={props.busy} onClick={() => { setMenuAt(null); props.onMove(node.path, 1); }} />
            <MenuButton label="複製" disabled={props.busy} onClick={() => { setMenuAt(null); props.onDuplicate(node.path); }} />
            <MenuButton label="削除" disabled={props.busy} onClick={() => { setMenuAt(null); setConfirmingDelete(true); }} />
          </div>
        ) : null}
      </div>
      {confirmingDelete ? (
        <div className="mx-2 my-1 rounded-lg border border-[#f0d2cf] bg-[#fff7f6] p-2 text-xs text-[#6d3b37]">
          <p>「{node.title}」を Google ドキュメントから削除します。</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-md bg-[#c4554d] px-2 py-1 text-white" onClick={() => { setConfirmingDelete(false); props.onDelete(node.path); }}>
              削除する
            </button>
            <button type="button" className="rounded-md px-2 py-1" onClick={() => setConfirmingDelete(false)}>
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
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-[#f7f6f3] disabled:cursor-not-allowed disabled:text-[#b8b6ae]"
      onClick={onClick}
    >
      {label}
    </button>
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
      <path d="M3 2 L7 5 L3 8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Grip() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true">
      <circle cx="2" cy="2" r="1" fill="currentColor" />
      <circle cx="6" cy="2" r="1" fill="currentColor" />
      <circle cx="2" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="2" cy="10" r="1" fill="currentColor" />
      <circle cx="6" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}
