import { useState } from 'react';
import { blockCommands, type BlockCommand } from '../lib/docs/format';

interface BlockMenuProps {
  onSelect: (command: BlockCommand) => void;
  onClose: () => void;
}

export function BlockMenu({ onSelect, onClose }: BlockMenuProps) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const commands = blockCommands.filter((command) => {
    if (!normalized) return true;
    return `${command.label} ${command.description}`.toLowerCase().includes(normalized);
  });

  return (
    <div
      role="menu"
      aria-label="基本ブロック"
      className="w-[300px] overflow-hidden rounded-[10px] border border-white/10 bg-[#252525] text-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="border-b border-white/10 px-2 py-2">
        <input
          data-allow-focus="true"
          value={query}
          autoFocus
          placeholder="ブロックを検索"
          aria-label="ブロックを検索"
          className="w-full bg-transparent px-1 text-sm text-white outline-none placeholder:text-white/35"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'Enter' && commands[0]) {
              event.preventDefault();
              onSelect(commands[0]);
              onClose();
            }
          }}
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-1">
        <p className="px-2 pt-1.5 pb-1 text-xs text-white/40">基本ブロック</p>
        {commands.length === 0 ? (
          <p className="px-2 py-3 text-sm text-white/40">該当するブロックはありません</p>
        ) : (
          commands.map((command) => (
            <button
              key={command.id}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-white/8"
              onClick={() => {
                onSelect(command);
                onClose();
              }}
            >
              <BlockIcon id={command.id} />
              <span className="min-w-0">
                <span className="block text-sm">{command.label}</span>
                <span className="block truncate text-xs text-white/40">{command.description}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function BlockIcon({ id }: { id: BlockCommand['id'] }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/6 text-[11px] text-white/80">
      {glyph(id)}
    </span>
  );
}

function glyph(id: BlockCommand['id']): string {
  switch (id) {
    case 'paragraph':
      return 'T';
    case 'h1':
      return 'H1';
    case 'h2':
      return 'H2';
    case 'h3':
      return 'H3';
    case 'bullet':
      return '•';
    case 'numbered':
      return '1.';
  }
}
