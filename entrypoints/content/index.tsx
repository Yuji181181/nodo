import { createRoot } from 'react-dom/client';
import { App } from '../../components/App';
import { applyDocumentChrome } from '../../lib/docs/chrome-style';
import './style.css';

export default defineContentScript({
  matches: [
    'https://docs.google.com/document/d/*',
    'https://docs.google.com/document/u/*/d/*',
  ],
  allFrames: false,
  matchAboutBlank: false,
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    if (!location.pathname.includes('/d/')) return;

    const ui = await createShadowRootUi(ctx, {
      name: 'nodo-ui',
      position: 'modal',
      zIndex: 20,
      // クリックやキー操作を Google ドキュメントへ漏らさない。
      // 書式ボタンは pointerdown を preventDefault して、編集位置のフォーカスを残す。
      isolateEvents: [
        'keydown',
        'keyup',
        'keypress',
        'mousedown',
        'mouseup',
        'pointerdown',
        'pointerup',
        'click',
        'contextmenu',
      ],
      onMount(container) {
        container.style.pointerEvents = 'none';
        // 2026-10-16 の編集画面: キャンバスは 22、キャレットは 27、元のサイドバーは 100、メニューはそれ以上。
        // 50 なら行の操作と紙の縁が本文の上に出て、Google のメニューは隠れない。
        container.style.zIndex = '50';
        const root = createRoot(container);
        root.render(<App />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
        applyDocumentChrome({ enabled: false, showChrome: false, showNativeTabs: false });
      },
    });

    ui.mount();
  },
});
