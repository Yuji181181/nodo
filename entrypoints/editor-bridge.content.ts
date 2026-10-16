import { applyInThisFrame, blockCommands } from '../lib/docs/format';

/**
 * 本文の入力欄は about:blank の iframe にある。
 * 親ページのコンテンツスクリプトからは、その document に届かない。
 * サービスワーカーから届いた書式メッセージを、このフレームの編集欄へ送る。
 * 編集欄が無いフレームは応答しない。先に失敗応答を返すと、編集欄側の成功を潰す。
 * WXT は `*.content.ts` だけをコンテンツスクリプトとして登録する。
 */
export default defineContentScript({
  matches: [
    'https://docs.google.com/document/d/*',
    'https://docs.google.com/document/u/*/d/*',
  ],
  allFrames: true,
  matchAboutBlank: true,
  runAt: 'document_idle',
  main() {
    if (window.top === window) return;

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== 'nodo:apply-format') return;
      const command = blockCommands.find((item) => item.id === message.id);
      if (!command) {
        sendResponse({ ok: false });
        return true;
      }
      const delivered = applyInThisFrame(command);
      if (!delivered) return;
      sendResponse({ ok: true });
      return true;
    });
  },
});
