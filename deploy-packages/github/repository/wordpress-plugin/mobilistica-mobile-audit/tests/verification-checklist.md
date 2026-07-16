# プラグイン検証チェックリスト（手動・ステージング環境用）

PHPUnitは導入しない（依存ゼロ方針）。インストール前に以下を確認する。

## 構文・規約
- [ ] `php -l` を全PHPファイルに実行しエラーなし（php未導入環境では `find . -name "*.php"` の一覧に対しステージングで実施）
- [ ] 全ファイル先頭に ABSPATH ガードあり（uninstall.phpはWP_UNINSTALL_PLUGIN）
- [ ] 出力は esc_html / esc_attr / esc_url / wp_json_encode 経由のみ
- [ ] 入力は sanitize_text_field / esc_url_raw 経由のみ
- [ ] i18n: ユーザー向け文字列が __() / esc_html_e() でラップされている

## セキュリティ
- [ ] REST: nonce無しPOST → 403
- [ ] REST: `url=http://localhost/` → 400
- [ ] REST: `url=http://192.168.1.1/` → 400
- [ ] REST: `url=ftp://example.com/` → 400
- [ ] REST: 11回連続実行 → 11回目が429
- [ ] APIキー未設定時 → 503（フロントはクライアント直呼びに自動フォールバック）
- [ ] ページソースにAPIキーが含まれない（`grep -i api_key` で確認）
- [ ] debug.log にAPIキーが出力されない

## 機能
- [ ] `[mobilistica_mobile_audit]` でフォーム表示
- [ ] 同一URL2回目が高速（transientキャッシュ命中）
- [ ] 管理画面（ツール > モバイルEC診断）で実行回数表示・キャッシュ削除動作
- [ ] アンインストール → `wp_options` に `mma_` transientが残らない

## 表示
- [ ] 375/390/430/768/1024/1440px で崩れなし
- [ ] キーボードのみで診断実行可能
- [ ] テーマCSSとの競合なし（.mma-embed スコープ確認）
