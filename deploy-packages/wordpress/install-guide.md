# WordPress反映手順（承認文字列: APPROVE_DEPLOY_MOBILISTICA_AUDIT）

順序厳守（リンク切れ防止のため: プラグイン→LP→記事更新の順）。

## 1. プラグイン（手動インストール・自動化しない）

1. 管理画面 > プラグイン > 新規追加 > アップロード → `plugin-zip/mobilistica-mobile-audit.zip`
2. 有効化 → ツール > モバイルEC診断 で管理画面表示を確認
3. （任意）wp-config.phpに `define( 'MOBILISTICA_PSI_API_KEY', '...' );` を追加（サーバー側プロキシ有効化。キーはGoogle Cloud Console「gscga4-claude」プロジェクトでPageSpeed Insights APIを有効化して発行）
4. ステージング相当の検証: `plugin/mobilistica-mobile-audit/tests/verification-checklist.md` を全チェック

## 2. ランディングページ

1. 固定ページ新規作成: タイトル「モバイルECサイト無料診断」/ slug `mobile-commerce-audit` / 親ページ `tools`（無ければ先に作成）
2. `landing-page/mobile-commerce-audit.html` の**コメントブロックより下**をコードエディタモードで貼り付け（`[mobilistica_mobile_audit]`ショートコードが含まれる）
3. Rank Math設定: ファイル冒頭コメントのtitle案・description案から選択、canonical確認
4. 公開後: ページソースでFAQPage Schemaが**二重出力されていないか**確認（Rank Mathとの重複チェック）
5. GA4は未導入のため計測イベントは発火しない（MEASUREMENT_PLAN.mdの前提条件参照。導入は別タスク）

## 3. post-635 更新

`article-update/preflight-check.md` のチェック後、update-payload.json のcontentでPOST（手順は同ファイル内_apply_hint）。

## 4. 反映後検証

`verification-checklist.md` を実施。
