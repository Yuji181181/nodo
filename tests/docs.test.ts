import { describe, expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { pageSeams } from '../lib/docs/caret';
import { chromeStyle } from '../lib/docs/chrome-style';
import { blockCommands, commandById, keyboardInit } from '../lib/docs/format';
import { matchesLabel, menuItemLabel, menuLabels } from '../lib/docs/labels';
import {
  MAX_TABS,
  canNestUnder,
  countTabs,
  pathAfterSiblingMove,
  readTabTree,
} from '../lib/docs/tabs';

const fixture = `
  <div class="topLevelChapterContainerChaptered" role="tree">
    <div class="chapter-container chapter-container-level-0" id="chapter-container-t.0">
      <div class="chapter-item">
        <div role="treeitem" aria-selected="true" aria-label="概要" class="chapter-item-label-and-buttons-container chapter-item-label-and-buttons-container-selected">
          <div class="chapter-label-content">概要</div>
          <div class="chapterItemIconEmoji" style="display: none;">隠し</div>
        </div>
        <div class="navigation-item-list">
          <div class="navigation-item" role="menuitem">これは見出しでありページではない</div>
        </div>
      </div>
    </div>
    <div class="chapter-container chapter-container-level-0" id="chapter-container-t.1">
      <div class="chapter-item">
        <div role="treeitem" aria-selected="false" class="chapter-item-label-and-buttons-container">
          <div class="chapter-label-content">詳細</div>
          <div class="chapterItemIconEmoji">📘</div>
          <div class="chapterItemArrowContainer" role="button" aria-expanded="true" aria-label="サブタブを閉じる"></div>
        </div>
      </div>
      <div class="chapter-container chapter-container-level-1" id="chapter-container-t.2">
        <div class="chapter-item">
          <div role="treeitem" class="chapter-item-label-and-buttons-container">
            <div class="chapter-label-content">子</div>
          </div>
        </div>
        <div class="chapter-container chapter-container-level-2" id="chapter-container-t.3">
          <div class="chapter-item">
            <div role="treeitem" class="chapter-item-label-and-buttons-container">
              <div class="chapter-label-content">孫</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

describe('document tabs', () => {
  test('reads real tabs and ignores the heading outline', () => {
    const { document } = parseHTML(`<html><body>${fixture}</body></html>`);
    const tabs = readTabTree(document);
    expect(tabs.map((tab) => tab.title)).toEqual(['概要', '詳細']);
    expect(tabs[0]?.selected).toBe(true);
    expect(tabs[0]?.emoji).toBe('');
    expect(tabs[1]?.emoji).toBe('📘');
    expect(tabs[1]?.children.map((tab) => tab.title)).toEqual(['子']);
    expect(tabs[1]?.children[0]?.children[0]?.title).toBe('孫');
    expect(tabs[1]?.children[0]?.children[0]?.path).toBe('1/0/0');
    expect(tabs[1]?.children[0]?.children[0]?.level).toBe(2);
    expect(countTabs(tabs)).toBe(4);
    expect(JSON.stringify(tabs)).not.toContain('これは見出し');
  });

  test('follows the published nesting and tab limits', () => {
    expect(canNestUnder(0)).toBe(true);
    expect(canNestUnder(1)).toBe(true);
    expect(canNestUnder(2)).toBe(false);
    expect(MAX_TABS).toBe(100);
    expect(pathAfterSiblingMove('1/1', 'up')).toBe('1/0');
    expect(pathAfterSiblingMove('1/0', 'up')).toBeNull();
    expect(pathAfterSiblingMove('0', 'up')).toBeNull();
    expect(pathAfterSiblingMove('1/2', 'down')).toBe('1/3');
  });
});

describe('tab menu labels', () => {
  test('matches the English and Japanese labels observed in Docs', () => {
    expect(matchesLabel('上に移動', menuLabels.moveUp)).toBe(true);
    expect(matchesLabel('Move down', menuLabels.moveDown)).toBe(true);
    expect(matchesLabel('サブタブを追加', menuLabels.addSubtab)).toBe(true);
    expect(matchesLabel('削除する', menuLabels.delete)).toBe(false);
  });

  test('drops a shortcut hint from the menu label', () => {
    const { document } = parseHTML(
      `<div class="goog-menuitem"><div class="goog-menuitem-content"><span class="goog-menuitem-label">名前を変更</span><span class="goog-menuitem-accel">Enter</span></div></div>`,
    );
    const item = document.querySelector('.goog-menuitem');
    expect(item).not.toBeNull();
    expect(menuItemLabel(item!)).toBe('名前を変更');
  });
});

describe('formatting shortcuts', () => {
  test('uses the documented Linux shortcuts for the current paragraph', () => {
    expect(commandById('paragraph').shortcut).toBe('Ctrl+Alt+0');
    expect(commandById('h1').shortcut).toBe('Ctrl+Alt+1');
    expect(commandById('h2').keyCode).toBe(50);
    expect(commandById('bullet')).toMatchObject({ key: '8', ctrlKey: true, shiftKey: true, altKey: false });
    expect(commandById('numbered')).toMatchObject({ key: '7', ctrlKey: true, shiftKey: true });
    expect(blockCommands).toHaveLength(6);
    expect(keyboardInit(commandById('h3')).altKey).toBe(true);
  });
});

describe('page chrome stylesheet', () => {
  test('stays limited to the Nodo mode and does not restyle the canvas', () => {
    expect(chromeStyle).toContain('html.nodo-mode');
    expect(chromeStyle).toContain('#docs-editor');
    expect(chromeStyle).toContain('background: #ffffff');
    expect(chromeStyle).toContain('.kix-page-paginated');
    expect(chromeStyle).toContain('box-shadow: none');
    expect(chromeStyle).toContain('html.nodo-mode.nodo-dark');
    expect(chromeStyle).toContain('background: #191919');
    expect(chromeStyle).toContain('invert(0.902)');
    expect(chromeStyle).not.toContain('@import');
    expect(chromeStyle).not.toContain('preflight');
    expect(chromeStyle).not.toContain('kix-canvas');
    expect(chromeStyle).not.toContain('pageless');
  });

  test('covers only the seam between stacked pages', () => {
    expect(
      pageSeams([
        { left: 100, top: 80, width: 800, height: 1000 },
        { left: 100, top: 1090, width: 800, height: 1000 },
      ]),
    ).toEqual([{ left: 100, top: 1076, width: 800, height: 18 }]);
    expect(
      pageSeams([
        { left: 0, top: 0, width: 800, height: 400 },
        { left: 0, top: 900, width: 800, height: 400 },
      ]),
    ).toEqual([]);
  });
});
