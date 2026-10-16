import { selectors } from './selectors';

export interface CaretAnchor {
  x: number;
  y: number;
  height: number;
  pageLeft: number;
}

export interface PageFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HoverLine {
  left: number;
  top: number;
  focusX: number;
  focusY: number;
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

/** 画面に見えているページ枠。キャンバスの中身は読まない。 */
export function readVisiblePages(doc: Document = document): PageFrame[] {
  return [...doc.querySelectorAll(selectors.page)]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 200 && rect.bottom > 0 && rect.top < window.innerHeight)
    .sort((a, b) => a.top - b.top)
    .map((rect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
}

/** 画面に見えている先頭のページ枠。 */
export function readPageFrame(doc: Document = document): PageFrame | null {
  return readVisiblePages(doc)[0] ?? null;
}

/** 隣り合うページの継ぎ目。ページ設定は変えず、紙の境界だけを隠すために使う。 */
export function pageSeams(
  pages: readonly PageFrame[],
): Array<{ left: number; top: number; width: number; height: number }> {
  const seams: Array<{ left: number; top: number; width: number; height: number }> = [];
  for (let index = 0; index < pages.length - 1; index += 1) {
    const current = pages[index];
    const next = pages[index + 1];
    if (!current || !next) continue;
    const gap = next.top - (current.top + current.height);
    if (gap < -8 || gap > 80) continue;
    seams.push({
      left: current.left,
      top: current.top + current.height - 4,
      width: current.width,
      height: Math.max(8, gap + 8),
    });
  }
  return seams;
}

/**
 * ポインタがページ上にあるとき、その高さにブロック操作用の行を置く。
 * 段落の DOM は無いので、見た目の行間隔に揃えるだけ。
 */
export function readHoverLine(x: number, y: number, doc: Document = document): HoverLine | null {
  const page = [...doc.querySelectorAll(selectors.page)].find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 200 && y >= rect.top && y <= rect.bottom && x >= rect.left - 20 && x <= rect.right;
  });
  if (!page) return null;
  const rect = page.getBoundingClientRect();
  const line = 32;
  const snapped = rect.top + Math.floor(Math.max(0, y - rect.top) / line) * line + 4;
  return {
    left: rect.left + 52,
    top: Math.min(snapped, rect.bottom - 28),
    focusX: rect.left + Math.min(220, rect.width * 0.35),
    focusY: Math.min(snapped + 16, rect.bottom - 8),
  };
}

/** 開いている編集面のその高さへクリックを送る。信頼済みイベントにはならない。 */
export function focusEditorLine(x: number, y: number, doc: Document = document): void {
  const target = doc.elementFromPoint(x, y);
  if (!target) return;
  const init: MouseEventInit = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
  for (const type of ['mousemove', 'mousedown', 'mouseup', 'click'] as const) {
    target.dispatchEvent(new MouseEvent(type, init));
  }
}

function isLocalCursor(cursor: Element): boolean {
  const name = cursor.querySelector(selectors.cursorName);
  if (!(name instanceof HTMLElement)) return true;
  const text = name.textContent?.trim() ?? '';
  const style = name.getAttribute('style') ?? '';
  return text.length === 0 || /display:\s*none/i.test(style) || name.offsetHeight === 0;
}
