# SECURITY AUDIT（2026-07-17）

脅威モデル・設計根拠は docs/SECURITY_DESIGN.md。本書は実施済み検査の結果。

## SSRF（Phase 3必須要件との対応・全て自動テストで担保）

| 要件 | 実装/テスト |
|---|---|
| http/httpsのみ・スキーム拒否 | urlguard.validateUrlSyntax ✅ tests/urlguard |
| localhost・127/8・10/8・172.16/12・192.168/16・link-local・metadata(169.254.169.254)・IPv6ローカル拒否 | assertPublicTarget（dns.lookup all:true全アドレス検証）✅ |
| リダイレクト後の再検証 | redirect:'manual'ループで各ホップvalidate+assertPublic ✅ |
| DNS rebinding | 取得直前再解決。TTL間隙の残余リスクはSECURITY_DESIGN.mdに明記（許容判断） |
| ポート制限 | 80/443/8080/8443のみ ✅ |
| 最大レスポンス/タイムアウト/リダイレクト回数 | 5MB打ち切り・15s・5ホップ ✅ |
| アーキテクチャ面 | **Web版はサーバーが対象URLを取得しない**（ブラウザ→PSI API直）＝サーバーSSRF面が構造的に不存在。WPプロキシの外部通信先はgoogleapis.com固定 |

## XSS

- Web UI: ユーザー由来文字列は全て`esc()`（HTMLエンティティ化）経由で挿入・innerHTML使用箇所は全てエスケープ済みテンプレート
- レポートHTML: コア側でエスケープ（tests/reportsで生成検証）
- WPプラグイン: esc_html/esc_attr/esc_url/wp_json_encode全出力・ABSPATH直接アクセスガード全ファイル

## CSRF・濫用

- WP REST: X-WP-Nonce必須（wp_rest）・レート制限10回/10分・管理操作はcheck_admin_referer＋manage_options
- IP生値非保存（日替わりソルトSHA-256の先頭16桁のみ）

## シークレット

- ハードコードキー0件（deploy-packages/github/secret-scan-results.md・4パターン）
- キー保管: 環境変数/wp-config定数のみ。DB・HTML・ログへ非出力（コード監査済み）
- 依存ゼロ→ dependency audit対象なし（npm audit: 0 packages）。CI上のeslintはロックなしnpx実行（dependabotでActions監視）

## 未実施（MANUAL_REVIEW_ITEMS.mdに記載）

- PHP構文チェック（php -l）: ローカルにPHP未導入のためステージングで実施（plugin/tests/verification-checklist.md手順化済み）
- 実WAF（ConoHa WING）配下でのREST動作確認
