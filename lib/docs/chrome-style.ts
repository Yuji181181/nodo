/**
 * ページへ注入するスタイル。Tailwind も Preflight も含めない。
 * 文書のページ設定（ページレス、余白、用紙）は変えない。キャンバスも触らない。
 * セレクタは lib/docs/selectors.ts と同じく、Google の画面構造に依存する。
 */
export const chromeStyle = `
html.nodo-mode .kix-appview-editor {
  background-color: #f4f3ef !important;
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
}): void {
  const root = document.documentElement;
  const sidebar = document.querySelector('.left-sidebar-container');
  if (!settings.enabled) {
    root.classList.remove('nodo-mode', 'nodo-chrome', 'nodo-native-tabs');
    document.getElementById(styleId)?.remove();
    sidebar?.removeAttribute('aria-hidden');
    return;
  }

  let style = document.getElementById(styleId);
  if (!(style instanceof HTMLStyleElement)) {
    style = document.createElement('style');
    style.id = styleId;
    style.textContent = chromeStyle;
    (document.head ?? document.documentElement).append(style);
  }

  root.classList.add('nodo-mode');
  root.classList.toggle('nodo-chrome', settings.showChrome);
  root.classList.toggle('nodo-native-tabs', settings.showNativeTabs);
  if (sidebar) {
    if (settings.showNativeTabs) sidebar.removeAttribute('aria-hidden');
    else sidebar.setAttribute('aria-hidden', 'true');
  }
}
