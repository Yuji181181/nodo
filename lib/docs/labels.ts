/**
 * タブメニューの表示文言。2026-10-16 に英語 UI と hl=ja の日本語 UI で採取した。
 * メニュー項目の DOM 順ではなく文言で探す。文言が変わったらここを足す。
 */
export const menuLabels = {
  addSubtab: ['Add subtab', 'サブタブを追加'],
  delete: ['Delete', '削除'],
  duplicate: ['Duplicate', '複製'],
  rename: ['Rename', '名前を変更'],
  moveUp: ['Move up', '上に移動'],
  moveDown: ['Move down', '下に移動'],
} as const;

export const showTabPanelLabels = [
  'Show tabs & outlines',
  'Show document tabs',
  'タブとアウトラインを表示',
  'ドキュメント タブを表示',
];

export function normalizeLabel(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function matchesLabel(text: string, aliases: readonly string[]): boolean {
  const normalized = normalizeLabel(text);
  return aliases.some((alias) => normalized === alias);
}

export function menuItemLabel(item: Element): string {
  const content = item.querySelector('.goog-menuitem-content') ?? item;
  const accel = content.querySelector('.goog-menuitem-accel');
  const raw = normalizeLabel(content.textContent ?? '');
  const accelText = normalizeLabel(accel?.textContent ?? '');
  if (accelText && raw.endsWith(accelText)) return raw.slice(0, -accelText.length).trim();
  return raw;
}
