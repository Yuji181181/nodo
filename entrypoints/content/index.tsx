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
