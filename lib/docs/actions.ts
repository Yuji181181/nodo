import { matchesLabel, menuItemLabel, menuLabels, showTabPanelLabels } from './labels';
import { explainFailure } from './messages';
import { selectors } from './selectors';
import {
  MAX_TABS,
  canNestUnder,
  countTabs,
  findTabElement,
  pathAfterSiblingMove,
  pathForElement,
  readTabTree,
  type TabNode,
} from './tabs';

export type ActionResult = { ok: true } | { ok: false; reason: string; message: string };

export interface StructureState {
  tabs: TabNode[];
  addTab: 'ready' | 'disabled' | 'missing';
  title: string;
}

let queue: Promise<unknown> = Promise.resolve();

export function readStructure(doc: Document = document): StructureState {
  return {
    tabs: readTabTree(doc),
    addTab: readAddTabState(doc),
    title: readDocumentTitle(doc),
  };
}

export function readDocumentTitle(doc: Document = document): string {
  const explicit = doc.querySelector(selectors.title)?.textContent?.replace(/\s+/g, ' ').trim();
  if (explicit) return explicit;
  return doc.title.replace(/\s+-\s+Google\s+(Docs|ドキュメント)$/u, '').trim();
}

export function readAddTabState(doc: Document = document): StructureState['addTab'] {
  const button = doc.querySelector(selectors.addTab);
  if (!button) return 'missing';
  return button.classList.contains(selectors.addTabDisabledClass) ? 'disabled' : 'ready';
}

export function sidebarRect(doc: Document = document): DOMRect | null {
  const sidebar = doc.querySelector(selectors.nativeSidebar);
  if (!(sidebar instanceof HTMLElement)) return null;
  const rect = sidebar.getBoundingClientRect();
  if (rect.width < 80 || rect.height < 80) return null;
  return rect;
}

export function revealTabPanel(doc: Document = document): void {
  if (sidebarRect(doc) && doc.querySelector(selectors.tabRoot)) return;
  const button = [...doc.querySelectorAll('[role="button"], button')].find((element) => {
    const label = `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('data-tooltip') ?? ''}`;
    return showTabPanelLabels.some((expected) => label.includes(expected));
  });
  if (button instanceof HTMLElement) button.click();
}

export function selectTab(path: string, doc: Document = document): ActionResult {
  const container = findTabElement(doc, path);
  const treeItem = container?.querySelector(selectors.tabTreeItem);
  if (!(treeItem instanceof HTMLElement)) return failure('missing');
  activate(treeItem);
  return { ok: true };
}

export function toggleChildTabs(path: string, doc: Document = document): ActionResult {
  const container = findTabElement(doc, path);
  const arrow = container?.querySelector(selectors.tabArrow);
  if (!(arrow instanceof HTMLElement)) return failure('missing');
  activate(arrow);
  return { ok: true };
}

export function addRootTab(doc: Document = document): Promise<ActionResult> {
  return enqueue(async () => {
    if (countTabs(readTabTree(doc)) >= MAX_TABS) return failure('limit-tabs');
    const wrap = doc.querySelector(selectors.addTab);
    const button = wrap?.querySelector('[role="button"]');
    if (!(button instanceof HTMLElement) || wrap?.classList.contains(selectors.addTabDisabledClass)) {
      return failure('disabled');
    }
    const before = countTabs(readTabTree(doc));
    activate(button);
    const appeared = await waitFor(() => countTabs(readTabTree(doc)) > before);
    return appeared ? { ok: true } : failure('timeout');
  });
}

export function addChildTab(path: string, doc: Document = document): Promise<ActionResult> {
  return enqueue(async () => {
    const tab = readTabTree(doc).length ? findInTree(readTabTree(doc), path) : null;
    if (!tab) return failure('missing');
    if (!canNestUnder(tab.level)) return failure('limit-level');
    if (countTabs(readTabTree(doc)) >= MAX_TABS) return failure('limit-tabs');
    const before = countTabs(readTabTree(doc));
    const result = await clickTabCommand(path, menuLabels.addSubtab, doc);
    if (!result.ok) return result;
    const appeared = await waitFor(() => countTabs(readTabTree(doc)) > before);
    return appeared ? { ok: true } : failure('timeout');
  });
}

export function renameTab(path: string, title: string, doc: Document = document): Promise<ActionResult> {
  const nextTitle = title.trim();
  if (!nextTitle) return Promise.resolve(failure('empty-title'));
  return enqueue(() => commitRename(path, nextTitle, doc));
}

export function deleteTab(path: string, doc: Document = document): Promise<ActionResult> {
  return enqueue(async () => {
    const before = countTabs(readTabTree(doc));
    if (before <= 1) return failure('disabled');
    const result = await clickTabCommand(path, menuLabels.delete, doc);
    if (!result.ok) return result;
    const changed = await waitFor(() => countTabs(readTabTree(doc)) < before);
    return changed ? { ok: true } : failure('timeout');
  });
}

export function duplicateTab(path: string, doc: Document = document): Promise<ActionResult> {
  return enqueue(async () => {
    if (countTabs(readTabTree(doc)) >= MAX_TABS) return failure('limit-tabs');
    const before = countTabs(readTabTree(doc));
    const result = await clickTabCommand(path, menuLabels.duplicate, doc);
    if (!result.ok) return result;
    const changed = await waitFor(() => countTabs(readTabTree(doc)) > before);
    return changed ? { ok: true } : failure('timeout');
  });
}

export function moveTab(path: string, delta: number, doc: Document = document): Promise<ActionResult> {
  if (delta === 0) return Promise.resolve({ ok: true });
  return enqueue(async () => {
    const direction = delta < 0 ? 'up' : 'down';
    const labels = direction === 'up' ? menuLabels.moveUp : menuLabels.moveDown;
    let current = path;
    for (let step = 0; step < Math.abs(delta); step += 1) {
      const container = findTabElement(doc, current);
      if (!container) return failure('missing');
      container.dataset.nodoMark = 'moving';
      const result = await clickTabCommand(current, labels, doc);
      if (!result.ok) {
        delete container.dataset.nodoMark;
        return result;
      }
      const moved = await waitFor(() => {
        const marked = doc.querySelector('[data-nodo-mark="moving"]');
        if (!marked) return false;
        const next = pathForElement(doc, marked);
        return next !== null && next !== current;
      }, 1500);
      const marked = doc.querySelector('[data-nodo-mark="moving"]');
      const next = marked ? pathForElement(doc, marked) : pathAfterSiblingMove(current, direction);
      marked?.removeAttribute('data-nodo-mark');
      if (!moved || !next) return failure('timeout');
      current = next;
    }
    return { ok: true };
  });
}

async function commitRename(path: string, title: string, doc: Document): Promise<ActionResult> {
  const container = findTabElement(doc, path);
  if (!container) return failure('missing');
  const opened = await clickTabCommand(path, menuLabels.rename, doc);
  if (!opened.ok) return opened;
  const input = await waitForValue(() => visibleRenameInput(container));
  if (!input) return failure('rename-input');
  input.focus();
  setInputValue(input, title);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  for (const type of ['keydown', 'keyup'] as const) {
    input.dispatchEvent(
      new KeyboardEvent(type, {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
  }
  const renamed = await waitFor(() => findTabElement(doc, path)?.querySelector(selectors.tabTitle)?.textContent?.trim() === title);
  return renamed ? { ok: true } : failure('timeout');
}

async function clickTabCommand(
  path: string,
  aliases: readonly string[],
  doc: Document,
): Promise<ActionResult> {
  const container = findTabElement(doc, path);
  const button = container?.querySelector(selectors.tabMenuButton);
  if (!(button instanceof HTMLElement)) return failure('missing');
  activate(button);
  const menu = await waitForValue(() => openMenu(doc));
  if (!menu) return failure('menu-closed');
  const item = [...menu.querySelectorAll(selectors.menuItem)].find((candidate) => {
    if (getComputedStyle(candidate).display === 'none') return false;
    return matchesLabel(menuItemLabel(candidate), aliases);
  });
  if (!item) {
    closeMenu(doc);
    return failure('missing');
  }
  if (item.classList.contains(selectors.menuDisabledClass) || item.getAttribute('aria-disabled') === 'true') {
    closeMenu(doc);
    return failure('disabled');
  }
  const target = item.querySelector(selectors.menuContent) ?? item;
  if (target instanceof HTMLElement) activate(target);
  return { ok: true };
}

function openMenu(doc: Document): HTMLElement | null {
  const menu = doc.querySelector(selectors.tabMenu);
  if (!(menu instanceof HTMLElement)) return null;
  if (getComputedStyle(menu).display === 'none') return null;
  return menu;
}

function closeMenu(doc: Document): void {
  const menu = doc.querySelector(selectors.tabMenu);
  if (!(menu instanceof HTMLElement) || getComputedStyle(menu).display === 'none') return;
  const expanded = doc.querySelector(`${selectors.tabMenuButton}[aria-expanded="true"]`);
  if (expanded instanceof HTMLElement) expanded.click();
}

function visibleRenameInput(container: HTMLElement): HTMLInputElement | null {
  const input = container.querySelector(selectors.renameInput);
  if (!(input instanceof HTMLInputElement)) return null;
  if (/display:\s*none/i.test(input.getAttribute('style') ?? '')) return null;
  if (getComputedStyle(input).display === 'none') return null;
  return input;
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
}

function activate(element: HTMLElement): void {
  const view = element.ownerDocument.defaultView ?? window;
  element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, view }));
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view }));
  element.click();
}

function failure(reason: string): ActionResult {
  return { ok: false, reason, message: explainFailure(reason) };
}

function findInTree(nodes: readonly TabNode[], path: string): TabNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    const child = findInTree(node.children, path);
    if (child) return child;
  }
  return null;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function waitFor(predicate: () => boolean, timeout = 2000): Promise<boolean> {
  return waitForValue(() => (predicate() ? true : null), timeout).then((value) => value === true);
}

function waitForValue<T>(read: () => T | null, timeout = 2000): Promise<T | null> {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const value = read();
      if (value !== null && value !== undefined) {
        resolve(value);
        return;
      }
      if (Date.now() - started >= timeout) {
        resolve(null);
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}
