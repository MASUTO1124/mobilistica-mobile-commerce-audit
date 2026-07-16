# SPEC: Web診断UI＋WordPressプラグイン＋LP（web-app/ wordpress-plugin/ landing-page/ scripts/build_web.mjs）

担当: web-wpエージェント。PROJECT_BRIEF.md・core-engine-spec.md（公開契約・特にengine.browser.mjs/psi.mjs/pipeline.mjsがブラウザ互換である点）必読。
コアが未完成でも契約に対して実装してよい（モジュールパスと関数名は固定）。

## アーキテクチャ（確定）

Web版は**クライアントサイド実行**: ブラウザが PSI API を直接fetch（CORS対応済みAPI）→ 同一の pipeline.mjs で解析→描画。
サーバーは対象URLを取得しない＝サーバーSSRF面が存在しない。ただし入力URLは送信前に validateUrlSyntax で検証（防御多層＋PSIクォータ濫用防止）。
APIキーはクライアントに置かない（キーレス既定）。WPプラグインは**任意のプロキシ**（サーバー保管キーでPSIを代理呼び出し）を提供。プロキシも外部へはgoogleapis.comのみアクセス。

## web-app/（静的・ビルドツールなし）

- index.html + app.mjs + styles.css。ESMを直接 `<script type="module">` で読む
- scripts/build_web.mjs: src/のブラウザ互換モジュール（pipeline/analyzers/scoring/recommendations/reports/psi/urlguard(validateのみ)）を web-app/vendor/ へコピーする単純スクリプト（node標準のみ）
- 入力: URL＋サイト種別select(任意: 自動判定/WordPress/WooCommerce/Shopify/その他)。メール入力なし・個人情報なし
- 出力（無料全表示・連絡先強制なし）: 総合スコア/CWV/上位5課題（優先度・売上影響・簡易説明）/改善優先順位/詳細レポートDL(HTML=reports/html.mjs出力をBlob保存, JSON)/GitHubリンク/CLI・Claudeスキル導線/事例(post-635)導線/任意の相談CTA(最後・控えめ)
- UI要件: 375/390/430/768/1024/1440px、キーボード操作、aria-live(ローディング/結果)、focus可視、入力エラー表示、タイムアウト表示と再実行、結果共有(URLの`#u=<encodeURIComponent(url)>`で再現)、印刷CSS、スケルトンでCLS抑制、ダークパターン禁止
- GA4イベントフック: `window.dataLayer?.push()`で audit_form_view/audit_started/audit_completed/audit_failed/report_downloaded/github_clicked/skill_install_clicked/cli_install_clicked/case_study_clicked/consultation_clicked/audit_shared。**URL全体を送らない**（ドメインのSHA-256先頭12桁のみ `site_hash` として送出。実装はコメントで方針明記）
- GA4未導入サイトでも動くこと（dataLayer未定義ガード）

## wordpress-plugin/mobilistica-mobile-audit/

```
mobilistica-mobile-audit.php（ヘッダ・Version 0.1.0・Text Domain: mobilistica-mobile-audit）
includes/class-rest.php class-ratelimit.php class-settings.php
assets/（web-app/と同じvendor構成をプラグイン用にコピー）
templates/form.php  languages/  uninstall.php  readme.txt  tests/（PHPUnitなしでよい: 検証手順書＋簡易phpcsチェックリスト）
```

- ショートコード `[mobilistica_mobile_audit]` → web-appと同一UIをレンダリング（アセットはwp_enqueue、ESM対応のscript type=module）
- REST: `POST /wp-json/mobilistica-audit/v1/psi` {url, strategy} → サーバーがPSIへ代理リクエスト
  - キー: 定数 `MOBILISTICA_PSI_API_KEY`（wp-config.php）または環境変数。**未定義ならプロキシ無効化しクライアント直呼びへフォールバック**（フロントに設定フラグをwp_localize_scriptで渡す。キー自体は絶対に渡さない）
  - nonce(wp_rest)検証＋sanitize（esc_url_raw→独自validate: http/https・localhost/プライベートIPリテラル拒否＝urlguard.mjsと同じ規則のPHP版）
  - rate limit: transientでIPハッシュ(wp_hash(ip+日付salt)・生IP保存しない)あたり10回/10分。超過は429
  - 結果transientキャッシュ: URL+strategyのハッシュで10分
  - capability: 公開エンドポイント（権限不要）だがrate limit必須。管理画面(設定ページ)は manage_options
  - 管理画面: 実行回数(日次カウンタtransient)表示・キャッシュ全削除ボタン(nonce+capability)
  - uninstall.php: transient/optionsを全削除（方針をreadme.txtに明記）
  - 全出力esc_html/esc_attr/esc_url、i18n関数使用、直接アクセスガード(ABSPATH)
- ZIP化はscripts/build_web.mjsに `--plugin-zip` オプションで実装（deploy-packages/wordpress/plugin-zip/へ出力）
- **本番インストールはしない**

## landing-page/mobile-commerce-audit.html

- slug想定: `/tools/mobile-commerce-audit/`（英語slug）。WordPress固定ページ貼り付け用の本文HTML（テーマヘッダ/フッタ無し・記事本文として成立する構造）＋スタンドアロン確認用に完全版も可
- 構成（順序固定）: ①ファーストビュー（h1+一文価値提案+診断フォームアンカーCTA）②URL入力フォーム（web-app埋め込み位置のプレースホルダ`[mobilistica_mobile_audit]`）③何が分かるか④一般的PageSpeed診断との違い⑤EC特有の診断項目⑥診断結果サンプル（examples/sample-audit.json由来の静的表示）⑦使い方⑧CLI・Claude Codeスキル⑨GitHub⑩改善事例（post-635へ）⑪対応環境⑫セキュリティとプライバシー⑬FAQ(5問)⑭相談導線(控えめ)⑮更新履歴
- CTA優先順位: 無料診断>GitHub>スキル導入>事例>相談。売り込み非主役
- SEO: title案3・meta description案3（コメントブロックで併記）、H1は1つ、見出し階層正しく、FAQPage+WebApplication JSON-LD（**Rank Math Pro併用前提の注意コメント**: サイト側でRank MathがWebPage/Breadcrumb出力中の可能性→貼付前に重複確認、の1行）、BreadcrumbList案、canonical/OG/X Cardは「Rank Math側で設定する値の推奨リスト」としてコメント記載（本文にmetaタグを直書きしない＝固定ページ貼付で無効なため）

## 完了条件

web-app/index.htmlをブラウザで開き（vendorはbuild実行後）、モックJSON（`?mock=1`でexamples/sample-audit.json相当を読み込むデバッグフック）で結果画面が描画されること。
プラグインPHPは `php -l` 相当の構文確認（phpが無い環境ならPHPStormなし・目視+コメントで明記）。ZIP生成スクリプト動作。
