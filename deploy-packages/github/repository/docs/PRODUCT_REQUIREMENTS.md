# PRODUCT REQUIREMENTS — Mobilistica Mobile Commerce Audit

出典: docs/PROJECT_BRIEF.md（プロダクト定義・技術方針・安全ルール）。Phase1（要件定義）準拠。
本ドキュメントは要件のみを扱う。実装詳細は docs/specs/core-engine-spec.md ほか各specを正とする。

## 1. プロダクト概要

- 英名: **Mobilistica Mobile Commerce Audit** / 日本語表示名: **モバイルECサイト無料診断**
- 運営: Mobilistica（mobilistica.com・株式会社MASUTO）
- 一言で: ECサイトのURLを入力すると、モバイル中心に表示速度・Core Web Vitals・画像・JS・UI・購入導線・技術SEOを検査し、**売上影響の言葉に翻訳した優先順位付きレポート**を返す無料診断ツール
- 提供形態: Web診断UI / CLI / Claude Codeスキルの3形態。判定ロジックは単一の診断コア（`src/mobilistica_audit/`）から提供し、複製実装は禁止（PROJECT_BRIEF.md 技術方針）

## 2. 対象ユーザー

- EC運営者（Shopify / WooCommerce / WordPress物販）
- 制作会社・ECコンサル
- マーケティング担当者
- 「モバイル売上が伸びない」課題を抱える事業者

## 3. 解決する課題

一般的なPageSpeed系診断ツールは技術スコア（LCP・CLS等）を提示するだけで、EC運営者が「結局どこから直せば売上が上がるのか」を判断できない。技術知識と経営判断の間に翻訳ギャップがある。

## 4. 独自価値（PSI結果の再表示との差別化）

PSI（PageSpeed Insights）APIの結果をそのまま表示するだけのツールは差別化にならない（PROJECT_BRIEF.md 明記）。本プロダクトは以下の翻訳・構造化レイヤーを付加する。

| 差別化要素 | 内容 |
|---|---|
| EC文脈への翻訳 | 技術指標を「購入導線」「商品ページ」「カート」等のEC特有の観点で再解釈（commerce_ux分析） |
| 売上影響の言葉 | 各Finding（課題）に `business_impact` を必須付与し、売上・導線影響を日本語で説明 |
| 優先順位付け | 7軸スコア（sales_impact / mobile_ux_impact / seo_impact / cwv_impact / difficulty / cost / certainty）から P0〜P4 の優先度を機械的に導出（式は core-engine-spec.md 準拠） |
| 難易度・担当分類 | `estimated_effort`（small/medium/large）と `implementation_owner`（operator/designer/frontend/backend/server/seo）を各Findingに付与し、「誰が・どのくらいの手間で直すか」を明示 |
| 環境別改善案 | `platform_advice` によりWordPress/WooCommerce/Shopify/genericそれぞれに適した改善文を出し分け |
| 期間3区分 | `term`（immediate/short/mid）で着手タイミングを分類 |
| 前後比較 | `options.previous`（過去のAuditResult）を渡すとBefore/After差分をレポート各形式で表示 |
| 3形式保存 | HTML（自己完結・印刷対応）/ Markdown（経営者向け要約＋技術詳細の2部構成）/ CSV（findings一覧・UTF-8 BOM付き） |
| Claude修正指示 | `claude_instructions.mjs` が「確認すべき場所（探索手順）」と「実装候補（確認後の修正）」を分離して出力し、実在確認していないファイルパスを断定表記しない |

## 5. 提供機能（Phase1スコープ）

1. URL入力によるモバイル診断実行（`strategy=mobile` 既定、desktop選択可）
2. 総合スコア（mobile_score 0-100）とグレード（A〜E）の算出
3. Core Web Vitals（LCP/INP/CLS/TBT/FCP/SI/TTFB）の取得・評価
4. 課題（Finding）ごとの優先度・売上影響・修正方法・担当・工数の提示
5. プラットフォーム自動判定（WordPress/WooCommerce/Shopify/other/unknown、confidence付き）
6. データ欠損時のフォールバック動作（PSI API→ローカルLighthouse任意→HTML簡易診断→取得不可の明示。**APIキーが無くても停止しない**）
7. レポートのHTML/Markdown/CSV出力、および過去結果との比較表示
8. Web/CLI/Claude Codeスキルの3形態での同一結果提供

## 6. 非スコープ（本プロダクトが行わないこと）

- ログイン操作・購入操作・本番注文の自動化（PROJECT_BRIEF.md 安全ルール）
- 「確実に順位が上がる」「売上が必ず増える」「SEO効果を保証」「完全自動で成功」「すべてのECサイトに対応」「人間確認不要」等の誇張・保証表現
- post-635の実測値（28→76点）を本ツールの効果として記述すること（別施策の実績であり、事例参照としてのみ扱う）
- 個人情報の収集（メールアドレス入力必須化・診断結果の運営側保存等。詳細はDATA_PRIVACY.md）
- 高頻度・大量アクセスによる外部サイトへの実診断（Mobilistica自身のURL2件＋少数の公開URLのみを検証対象とする）
- WordPress本番への自動書き込み・プラグインインストール・記事更新（承認ゲート必須。DEPLOYMENT_PLAN.md参照）
- GitHubへの自動push・公開リポジトリ作成・Release（承認ゲート必須。DEPLOYMENT_PLAN.md参照）

## 7. 共通データ契約（要件レベルの要約）

`runAudit()` は AuditResult JSON を返す。詳細フィールドは docs/specs/core-engine-spec.md を正とする。要件上のポイントのみ以下に記す。

- 各Finding（recommendations[]要素）は7軸スコア・優先度P0〜P4・担当・工数・確信度（confidence 0-100）・自動修正可否（automatic_fix_possible）を必ず持つ
- collectors='auto' の場合、全データソースが取得不可でも `data_status: "unavailable"` のAuditResultを返し、例外を投げない（ツールが「止まらない」ことを要件とする）
- Web/CLI/Claude Codeスキル間の結果差異は収集データの差のみに由来し、判定ロジックの差異は存在しない

## 8. 成功指標

成功指標（KPI・計測方法・評価時点）は本ドキュメントでは定義しない。docs/MEASUREMENT_PLAN.md を正とする。

## 9. 対象外の判断が必要な事項

- 有料化・課金モデルの要否は本フェーズでは未定義（Phase1では無料診断のみ）
- 多言語対応（英語レポート等）はROADMAP.md（github-repo-spec.md準拠）で「誠実なロードマップ」として言及されるのみで、Phase1要件には含めない
