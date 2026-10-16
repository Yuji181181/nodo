const reasons: Record<string, string> = {
  disabled:
    'Google ドキュメントがこの操作を無効にしています。閲覧専用、提案モード、またはタブの上限です。',
  missing: '対象のページがタブ一覧に見つかりませんでした。',
  timeout: '画面への反映を確認できませんでした。元のタブ欄を表示して、同じ操作ができるか見てください。',
  'rename-input': '名前の入力欄が開きませんでした。',
  'editor-missing': '編集位置が見つかりません。文書の本文をクリックしてから、もう一度選んでください。',
  'limit-tabs': 'タブは1つの文書につき100個までです。',
  'limit-level': 'タブの階層は3段までです。',
  'menu-closed': 'タブのメニューを開けませんでした。Google ドキュメントの画面が変わった可能性があります。',
  'cross-parent': '別のページの中へ移す操作は、子ページの追加で行ってください。',
  'empty-title': 'ページ名を空にはできません。',
};

export function explainFailure(reason: string): string {
  return reasons[reason] ?? '操作を完了できませんでした。';
}
