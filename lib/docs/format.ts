import { selectors } from './selectors';

/**
 * 書式は Google ドキュメント公式のキーボードショートカットを、
 * 開いている編集欄へ送る。文書インデックスを公式 API で書き換える方式ではない。
 *
 * ショートカット表はヘルプ「Keyboard shortcuts for Google Docs」の
 * Windows / Chrome OS / Linux 欄（2026-10-16 参照）。
 * Ctrl+Alt+数字が見出し、Ctrl+Shift+8 が箇条書き、Ctrl+Shift+7 が番号付き。
 */
export interface BlockCommand {
  id: 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered';
  label: string;
  description: string;
  shortcut: string;
  key: string;
  code: string;
  keyCode: number;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export const blockCommands: readonly BlockCommand[] = [
  {
    id: 'paragraph',
    label: 'テキスト',
    description: '普通のテキストを入力します。',
    shortcut: 'Ctrl+Alt+0',
    key: '0',
    code: 'Digit0',
    keyCode: 48,
    ctrlKey: true,
    altKey: true,
    shiftKey: false,
  },
  {
    id: 'h1',
    label: '見出し 1',
    description: '大見出しを作成します。',
    shortcut: 'Ctrl+Alt+1',
    key: '1',
    code: 'Digit1',
    keyCode: 49,
    ctrlKey: true,
    altKey: true,
    shiftKey: false,
  },
  {
    id: 'h2',
    label: '見出し 2',
    description: '中見出しを作成します。',
    shortcut: 'Ctrl+Alt+2',
    key: '2',
    code: 'Digit2',
    keyCode: 50,
    ctrlKey: true,
    altKey: true,
    shiftKey: false,
  },
  {
    id: 'h3',
    label: '見出し 3',
    description: '小見出しを作成します。',
    shortcut: 'Ctrl+Alt+3',
    key: '3',
    code: 'Digit3',
    keyCode: 51,
    ctrlKey: true,
    altKey: true,
    shiftKey: false,
  },
  {
    id: 'bullet',
    label: '箇条書きリスト',
    description: 'シンプルな箇条書きリストを作成します。',
    shortcut: 'Ctrl+Shift+8',
    key: '8',
    code: 'Digit8',
    keyCode: 56,
    ctrlKey: true,
    altKey: false,
    shiftKey: true,
  },
  {
    id: 'numbered',
    label: '番号付きリスト',
    description: '番号付きのリストを作成します。',
    shortcut: 'Ctrl+Shift+7',
    key: '7',
    code: 'Digit7',
    keyCode: 55,
    ctrlKey: true,
    altKey: false,
    shiftKey: true,
  },
];

export function commandById(id: BlockCommand['id']): BlockCommand {
  const command = blockCommands.find((item) => item.id === id);
  if (!command) throw new Error(`Unknown block command: ${id}`);
  return command;
}

export function keyboardInit(command: BlockCommand): KeyboardEventInit & { keyCode: number } {
  return {
    key: command.key,
    code: command.code,
    keyCode: command.keyCode,
    ctrlKey: command.ctrlKey,
    altKey: command.altKey,
    shiftKey: command.shiftKey,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
}

export type FormatResult = { ok: true } | { ok: false; reason: 'editor-missing' };

/**
 * 現在の編集位置へ書式ショートカットを送る。
 * 呼び出し側は、ボタンの pointerdown で preventDefault し、キャレットのフォーカスを残す。
 *
 * 編集欄は about:blank の iframe の中にあり、親ページのコンテンツスクリプトからは
 * contentDocument を読めない。親の runtime.sendMessage は他フレームへ届かないので、
 * サービスワーカーが tabs.sendMessage で同じタブのフレームへ転送する。
 * 合成イベントが段落スタイルを実際に変えることは、編集権限のある文書では未検証。
 */
export async function applyBlockCommand(command: BlockCommand): Promise<FormatResult> {
  if (applyInThisFrame(command)) return { ok: true };
  const delivered = await askEditorFrame(command.id);
  return delivered ? { ok: true } : { ok: false, reason: 'editor-missing' };
}

export function applyInThisFrame(command: BlockCommand): boolean {
  const target = frameEditor(document);
  if (!target) return false;
  target.focus();
  const { keyCode, ...init } = keyboardInit(command);
  for (const type of ['keydown', 'keypress', 'keyup'] as const) {
    const event = new KeyboardEvent(type, { ...init, keyCode, which: keyCode } as KeyboardEventInit);
    defineKeyCode(event, keyCode);
    target.dispatchEvent(event);
  }
  return true;
}

function frameEditor(doc: Document): HTMLElement | null {
  const editable = doc.querySelector(`${selectors.editor}[role="textbox"]`);
  if (!editable || editable.getAttribute('contenteditable') !== 'true') return null;
  return editable as HTMLElement;
}

async function askEditorFrame(id: BlockCommand['id']): Promise<boolean> {
  const runtime = extensionRuntime();
  if (!runtime?.sendMessage) return false;
  try {
    const response = (await runtime.sendMessage({ type: 'nodo:apply-format', id })) as
      | { ok?: boolean }
      | undefined;
    return response?.ok === true;
  } catch {
    return false;
  }
}

function extensionRuntime(): { sendMessage: (message: unknown) => Promise<unknown> } | null {
  const globals = globalThis as typeof globalThis & {
    browser?: { runtime?: { sendMessage?: (message: unknown) => Promise<unknown> } };
    chrome?: { runtime?: { sendMessage?: (message: unknown) => Promise<unknown> } };
  };
  const sendMessage = globals.browser?.runtime?.sendMessage ?? globals.chrome?.runtime?.sendMessage;
  if (!sendMessage) return null;
  return { sendMessage: sendMessage.bind(globals.browser?.runtime ?? globals.chrome?.runtime) };
}

function defineKeyCode(event: KeyboardEvent, keyCode: number): void {
  for (const property of ['keyCode', 'which'] as const) {
    try {
      Object.defineProperty(event, property, { get: () => keyCode });
    } catch {
      // Chrome は key から keyCode を埋める。上書きできない場合はそれを使う。
    }
  }
}
