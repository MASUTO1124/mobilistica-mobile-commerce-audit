# PROJECT BRIEF — Mobilistica Mobile Commerce Audit

全実装者（エージェント）はこのファイルと担当スペック（docs/specs/）を最初に読むこと。

## プロダクト

- 英名: **Mobilistica Mobile Commerce Audit** / 日本語表示名: **モバイルECサイト無料診断**
- 役割: ECサイトのURLを入力→モバイル中心に表示速度・CWV・画像・JS・UI・購入導線・技術SEOを検査し、**売上影響の言葉に翻訳した優先順位付きレポート**を生成
- 3形態（Web診断UI / CLI / Claude Codeスキル）を**単一の診断コア（src/mobilistica_audit/）**から提供。判定ロジックの複製実装は禁止
- 運営: Mobilistica（mobilistica.com・株式会社MASUTO）。GitHub: MASUTU→ **MASUTO1124**
- リポジトリ名（第一候補確定）: `mobilistica-mobile-commerce-audit`

## 対象ユーザー

EC運営者（Shopify/WooCommerce/WordPress物販）・制作会社・ECコンサル・マーケ担当・モバイル売上が伸びない事業者。
技術診断を「何から直すべきか」「売上にどう効くか」に翻訳することが独自価値。PSI結果の再表示だけでは不可。

## 技術方針（確定・変更禁止）

- **Node.js >= 20、ESM（.mjs）、ランタイム依存ゼロ**（Node標準のfetch/dns/net/node:testのみ。lint等はdevDependencies可だがコアは依存なし）
- analyzers/scoring/recommendations/reports は**純関数・ブラウザ互換**（`node:`モジュールをimportしない）。Node専用コードはcollectors/html・collectors/lighthouse_local・cli/のみ
- データ取得: ①PSI API（`PAGESPEED_API_KEY`または`PSI_API_KEY`、無ければキーレス低クォータ）→②ローカルLighthouse（導入済みの場合のみ・任意）→③公開HTML+HTTPヘッダー簡易診断→④取得不可を明示。**キーが無くても停止しない**
- APIキーのハードコード・ログ出力・HTML出力は禁止
- 出力は日本語主体（レポート）、README正本は英語

## 安全ルール（全員厳守）

- GitHubへのpush/公開リポジトリ作成/Release: **禁止**（承認文字列 `APPROVE_GITHUB_PUBLISH_MOBILISTICA_AUDIT` 待ち）
- WordPress本番への書き込み・プラグインインストール・固定ページ作成・記事更新: **禁止**（`APPROVE_DEPLOY_MOBILISTICA_AUDIT` 待ち）
- 外部サイトへの実診断はMobilistica自身のURL2件＋少数の公開URLのみ。高頻度・大量アクセス禁止
- ログイン・購入操作・本番注文の自動化禁止
- 誇張表現禁止: 「確実に順位が上がる」「売上が必ず増える」「SEO効果を保証」「完全自動で成功」「すべてのECサイトに対応」「人間確認不要」等
- post-635の実測値（28→76点）を「本ツールの効果」として記述しない（別施策の実績。事例参照として扱う）

## 共通データ契約（コアの出力＝全形態の入力）

`runAudit()` は docs/specs/core-engine-spec.md 記載のAuditResult JSONを返す。
Finding（recommendations[]要素）は7軸スコア（sales_impact/mobile_ux_impact/seo_impact/cwv_impact/difficulty/cost/certainty 各0-5）と
priority P0〜P4、implementation_owner、estimated_effort、confidence(0-100)、automatic_fix_possible を必ず持つ。

## ディレクトリ所有権（エージェント間衝突防止）

| 担当 | 書き込み許可ディレクトリ |
|---|---|
| core | src/ tests/ examples/sample-audit.json |
| cli | cli/ examples/(CLI使用例) |
| web-wp | web-app/ wordpress-plugin/ landing-page/ scripts/build_web.mjs |
| github | リポジトリ直下のコミュニティファイル・.github/ marketing/ |
| docs | docs/（PROJECT_BRIEF.md・CURRENT_STATE_AUDIT.md・specs/は変更禁止） |

他担当のディレクトリへの書き込み禁止。参照は自由。package.jsonはcoreが作成し、cliがbin追記のみ行ってよい。
