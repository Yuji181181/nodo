/**
 * Google ドキュメントの画面内セレクタ。
 *
 * 公式の拡張用 API ではない。2026-10-16 に、公開文書
 * https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit
 * の編集画面で確認したクラス名をまとめている。Google が UI を更新したら、
 * まずこのファイルを直す。
 */
export const selectors = {
  tabRoot: '.topLevelChapterContainerChaptered',
  tabContainer: '.chapter-container',
  tabItem: '.chapter-item',
  tabTitle: '.chapter-label-content',
  tabTreeItem: '[role="treeitem"]',
  tabSelectedClass: 'chapter-item-label-and-buttons-container-selected',
  tabArrow: '.chapterItemArrowContainer',
  tabEmoji: '.chapterItemIconEmoji',
  tabMenuButton: '.chapter-overflow-menu-button [role="button"]',
  tabMenu: '.chapter-overflow-menu',
  menuItem: '.goog-menuitem',
  menuContent: '.goog-menuitem-content',
  menuDisabledClass: 'goog-menuitem-disabled',
  addTab: '.kix-outlines-widget-header-add-chapter-button',
  addTabDisabledClass: 'kix-outlines-widget-header-add-chapter-button-disabled',
  renameInput: '.chapter-label-container input',
  nativeSidebar: '.left-sidebar-container',
  outlineItem: '.navigation-item',
  editorFrame: 'iframe.docs-texteventtarget-iframe',
  editor: '[contenteditable="true"]',
  cursor: '.kix-cursor',
  cursorCaret: '.kix-cursor-caret',
  cursorName: '.kix-cursor-name',
  page: '.kix-page-paginated',
  title: '#docs-title-input-label-inner',
} as const;

export const levelClassPattern = /chapter-container-level-(\d+)/;
