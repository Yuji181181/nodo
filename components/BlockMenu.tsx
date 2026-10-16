import { blockCommands, type BlockCommand } from '../lib/docs/format';

interface BlockMenuProps {
  onSelect: (command: BlockCommand) => void;
  onClose: () => void;
}

export function BlockMenu({ onSelect, onClose }: BlockMenuProps) {
  return (
    <div
      role="menu"
      aria-label="書式"
      className="w-64 rounded-xl border border-[#e6e4de] bg-white p-1.5 text-[#37352f] shadow-[0_12px_40px_rgba(55,53,47,0.16)]"
    >
      <p className="px-2 py-1.5 text-xs text-[#8b897f]">カーソルがある段落に適用します</p>
      {blockCommands.map((command) => (
        <button
          key={command.id}
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-[#f7f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#37352f]"
          onClick={() => {
            onSelect(command);
            onClose();
          }}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#f7f6f3] text-xs font-medium">
            {badge(command.id)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm">{command.label}</span>
            <span className="block text-xs text-[#8b897f]">{command.description}</span>
          </span>
          <span className="text-[11px] text-[#a8a69d]">{command.shortcut.replaceAll('+', ' ')}</span>
        </button>
      ))}
    </div>
  );
}

function badge(id: BlockCommand['id']): string {
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
      return '1';
  }
}
