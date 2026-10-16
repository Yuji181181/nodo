import { browser } from 'wxt/browser';
import { loadSettings, saveSettings } from '../lib/settings';

export default defineBackground(() => {
  browser.commands.onCommand.addListener((command) => {
    if (command !== 'toggle-nodo') return;
    void loadSettings().then((settings) => saveSettings({ ...settings, enabled: !settings.enabled }));
  });

  // runtime.sendMessage はサービスワーカーまでしか届かない。
  // 入力欄は別フレームなので、そのタブのコンテンツスクリプトへ転送する。
  // 編集欄を見つけたフレームだけが応答する。
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'nodo:apply-format') return;
    const tabId = sender.tab?.id;
    if (tabId === undefined || typeof message.id !== 'string') {
      sendResponse({ ok: false });
      return;
    }
    const forwarded = { type: 'nodo:apply-format', id: message.id };
    void browser.tabs
      .sendMessage(tabId, forwarded)
      .then((response: { ok?: boolean } | undefined) => {
        sendResponse(response?.ok === true ? { ok: true } : { ok: false });
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  });
});
