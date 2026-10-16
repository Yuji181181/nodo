import { levelClassPattern, selectors } from './selectors';

/** 公式ヘルプ: 1文書あたりのタブ上限。 */
export const MAX_TABS = 100;

/**
 * 公式ヘルプ: タブは3階層まで。
 * chapter-container-level は 0 始まりなので、子を作れるのは level 0 と 1。
 */
export const MAX_TAB_LEVEL = 2;

export interface TabNode {
  path: string;
  title: string;
  emoji: string;
  level: number;
  selected: boolean;
  childToggle: 'expanded' | 'collapsed' | 'none';
  children: TabNode[];
}

interface BuiltTab extends TabNode {
  element: HTMLElement;
}

export function canNestUnder(level: number): boolean {
  return level < MAX_TAB_LEVEL;
}

export function countTabs(nodes: readonly TabNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countTabs(node.children), 0);
}

export function findTab(nodes: readonly TabNode[], path: string): TabNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    const child = findTab(node.children, path);
    if (child) return child;
  }
  return null;
}

export function pathAfterSiblingMove(path: string, direction: 'up' | 'down'): string | null {
  const parts = path.split('/').map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part))) return null;
  const last = parts[parts.length - 1] ?? 0;
  if (direction === 'up') {
    if (last <= 0) return null;
    parts[parts.length - 1] = last - 1;
  } else {
    parts[parts.length - 1] = last + 1;
  }
  return parts.join('/');
}

export function readTabTree(root: ParentNode): TabNode[] {
  return buildTabTree(root).map(stripElement);
}

export function findTabElement(root: ParentNode, path: string): HTMLElement | null {
  return flattenBuilt(buildTabTree(root)).find((tab) => tab.path === path)?.element ?? null;
}

export function pathForElement(root: ParentNode, element: Element): string | null {
  const match = flattenBuilt(buildTabTree(root)).find(
    (tab) => tab.element === element || tab.element.contains(element),
  );
  return match?.path ?? null;
}

function buildTabTree(root: ParentNode): BuiltTab[] {
  const containers = [...root.querySelectorAll(selectors.tabContainer)].filter(
    (element): element is HTMLElement => element.nodeType === 1,
  );
  const roots: BuiltTab[] = [];
  const stack: BuiltTab[] = [];

  containers.forEach((element, index) => {
    const level = readLevel(element);
    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= level) stack.pop();
    const parent = stack[stack.length - 1];
    const siblingIndex = parent ? parent.children.length : roots.length;
    const path = parent ? `${parent.path}/${siblingIndex}` : String(siblingIndex);
    const tab = readContainer(element, path, level, index);
    if (parent) parent.children.push(tab);
    else roots.push(tab);
    stack.push(tab);
  });

  return roots;
}

function readContainer(element: HTMLElement, path: string, level: number, index: number): BuiltTab {
  const item = [...element.children].find((child) => child.classList.contains('chapter-item'));
  const treeItem = item?.querySelector(selectors.tabTreeItem);
  const titleNode = item?.querySelector(selectors.tabTitle);
  const title =
    normalizeText(titleNode?.textContent) ||
    treeItem?.getAttribute('aria-label')?.trim() ||
    `ページ ${index + 1}`;
  const selected =
    treeItem?.getAttribute('aria-selected') === 'true' ||
    treeItem?.classList.contains(selectors.tabSelectedClass) === true;

  return {
    path,
    title,
    emoji: readEmoji(item),
    level,
    selected,
    childToggle: readChildToggle(item),
    children: [],
    element,
  };
}

function readLevel(element: Element): number {
  const match = (element.getAttribute('class') ?? '').match(levelClassPattern);
  return match ? Number(match[1]) : 0;
}

function readEmoji(item: Element | undefined): string {
  if (!item) return '';
  for (const node of item.querySelectorAll(selectors.tabEmoji)) {
    const style = node.getAttribute('style') ?? '';
    if (/display:\s*none/i.test(style)) continue;
    const text = normalizeText(node.textContent);
    if (text) return text;
  }
  return '';
}

function readChildToggle(item: Element | undefined): BuiltTab['childToggle'] {
  const arrow = item?.querySelector(selectors.tabArrow);
  if (!arrow) return 'none';
  const style = arrow.getAttribute('style') ?? '';
  if (/display:\s*none/i.test(style)) return 'none';
  return arrow.getAttribute('aria-expanded') === 'false' ? 'collapsed' : 'expanded';
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function stripElement(tab: BuiltTab): TabNode {
  return {
    path: tab.path,
    title: tab.title,
    emoji: tab.emoji,
    level: tab.level,
    selected: tab.selected,
    childToggle: tab.childToggle,
    children: tab.children.map((child) => stripElement(child as BuiltTab)),
  };
}

function flattenBuilt(nodes: readonly BuiltTab[]): BuiltTab[] {
  return nodes.flatMap((node) => [node, ...flattenBuilt(node.children as BuiltTab[])]);
}
