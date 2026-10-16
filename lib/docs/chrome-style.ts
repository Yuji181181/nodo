/**
 * ページへ注入するスタイル。Tailwind も Preflight も含めない。
 * 文書のページ設定（ページレス、余白、用紙）は変えない。
 * ダークモードの本文は、表示上だけ明暗を反転して黒文字を読めるようにする。
 * セレクタは lib/docs/selectors.ts と同じく、Google の画面構造に依存する。
 */
export const chromeStyle = `
html.nodo-mode {
  color-scheme: light;
}
html.nodo-mode,
html.nodo-mode body,
html.nodo-mode #docs-editor,
html.nodo-mode #docs-editor-container,
html.nodo-mode .kix-appview-editor,
html.nodo-mode #docs-header,
html.nodo-mode #docs-header-container {
  background: #ffffff !important;
}
html.nodo-mode .kix-appview-editor {
  padding-top: 120px !important;
}
html.nodo-mode .kix-page-paginated {
  box-shadow: none !important;
  border-color: transparent !important;
}
html.nodo-mode #docs-branding-container {
  display: none !important;
}
html.nodo-mode #docs-title-input-label-inner {
  color: #37352f !important;
  font-weight: 600 !important;
}
html.nodo-mode.nodo-dark {
  color-scheme: dark;
}
html.nodo-mode.nodo-dark,
html.nodo-mode.nodo-dark body,
html.nodo-mode.nodo-dark #docs-editor,
html.nodo-mode.nodo-dark #docs-editor-container,
html.nodo-mode.nodo-dark .kix-appview-editor,
html.nodo-mode.nodo-dark #docs-header,
html.nodo-mode.nodo-dark #docs-header-container {
  background: #191919 !important;
}
html.nodo-mode.nodo-dark .kix-page-paginated {
  filter: invert(0.902) hue-rotate(180deg) !important;
}
html.nodo-mode.nodo-dark #docs-title-input-label-inner {
  color: rgba(255, 255, 255, 0.9) !important;
}
html.nodo-mode.nodo-dark .kix-cursor-caret {
  background-color: #f4f4f4 !important;
  border-color: #f4f4f4 !important;
}
html.nodo-mode:not(.nodo-native-tabs) .left-sidebar-container {
  opacity: 0 !important;
  pointer-events: none !important;
}
html.nodo-mode:not(.nodo-chrome) .docs-menubar,
html.nodo-mode:not(.nodo-chrome) #docs-toolbar,
html.nodo-mode:not(.nodo-chrome) #kix-toolbar,
html.nodo-mode:not(.nodo-chrome) .kix-toolbar,
html.nodo-mode:not(.nodo-chrome) .docs-toolbar-wrapper {
  display: none !important;
}
`.trim();

const styleId = 'nodo-chrome-style';

export function applyDocumentChrome(settings: {
  enabled: boolean;
  showChrome: boolean;
  showNativeTabs: boolean;
  theme?: 'light' | 'dark';
}): void {
  const root = document.documentElement;
  const sidebar = document.querySelector('.left-sidebar-container');
  if (!settings.enabled) {
    root.classList.remove('nodo-mode', 'nodo-dark', 'nodo-chrome', 'nodo-native-tabs');
    document.getElementById(styleId)?.remove();
    sidebar?.removeAttribute('aria-hidden');
    return;
  }

  let style = document.getElementById(styleId);
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement('style');
    style.id = styleId;
    (document.head ?? document.documentElement).append(style);
  }
  style.textContent = chromeStyle;

  root.classList.add('nodo-mode');
  root.classList.toggle('nodo-dark', settings.theme !== 'light');
  root.classList.toggle('nodo-chrome', settings.showChrome);
  root.classList.toggle('nodo-native-tabs', settings.showNativeTabs);
  if (sidebar) {
    if (settings.showNativeTabs) sidebar.removeAttribute('aria-hidden');
    else sidebar.setAttribute('aria-hidden', 'true');
  }
}
