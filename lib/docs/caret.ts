import { selectors } from './selectors';

export interface CaretAnchor {
  x: number;
  y: number;
  height: number;
  pageLeft: number;
}

/** 共同編集者の名前付きカーソルを避け、自分のキャレット矩形を読む。 */
export function readCaretAnchor(doc: Document = document): CaretAnchor | null {
  const cursors = [...doc.querySelectorAll(selectors.cursor)];
  const cursor = cursors.find(isLocalCursor) ?? cursors[0];
  if (!cursor) return null;
  const caret = cursor.querySelector(selectors.cursorCaret);
  if (!(caret instanceof HTMLElement)) return null;
  const rect = caret.getBoundingClientRect();
  if (rect.height < 2 || rect.bottom < 0 || rect.top > window.innerHeight) return null;

  const page = [...doc.querySelectorAll(selectors.page)].find((element) => {
    const pageRect = element.getBoundingClientRect();
    return rect.top >= pageRect.top - 8 && rect.top <= pageRect.bottom + 8 && pageRect.width > 0;
  });
  const pageLeft = page?.getBoundingClientRect().left ?? rect.left;
  return { x: rect.left, y: rect.top, height: rect.height, pageLeft };
}

function isLocalCursor(cursor: Element): boolean {
  const name = cursor.querySelector(selectors.cursorName);
  if (!(name instanceof HTMLElement)) return true;
  const text = name.textContent?.trim() ?? '';
  const style = name.getAttribute('style') ?? '';
  return text.length === 0 || /display:\s*none/i.test(style) || name.offsetHeight === 0;
}
