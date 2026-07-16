# GITHUB GROWTH STRATEGY — Mobilistica Mobile Commerce Audit

出典: docs/specs/docs-suite-spec.md（GITHUB_GROWTH_STRATEGY項目）・docs/specs/github-repo-spec.md（README/marketing構成・禁止表現）・docs/CURRENT_STATE_AUDIT.md（GitHubアカウント状況）。

## 1. 基本方針: 誠実な成長設計

GitHubスター数・フォロワー数それ自体を目的化しない。成長は「ツールが実際に役立つこと」の結果として位置づける。

- リポジトリ: `MASUTO1124/mobilistica-mobile-commerce-audit`（gh CLI v2.96.0導入済み・認証済み。既存同名リポジトリなし＝名称衝突なし。CURRENT_STATE_AUDIT.md）
- **公開自体はしない**（承認文字列 `APPROVE_GITHUB_PUBLISH_MOBILISTICA_AUDIT` 待ち。DEPLOYMENT_PLAN.md参照）。本ドキュメントはファイル準備段階の成長戦略を定義する

## 2. 差別化ポイント（初期のニッチ有用性）

スター数を狙う前に、「なぜこのツールを使う理由があるか」を明確にする。

| 差別化要素 | 内容 |
|---|---|
| EC特化 | 一般的なPageSpeed診断ではなく、EC（購入導線・商品ページ）に特化した診断項目（commerce_ux分析） |
| 日本語レポート | 出力レポートは日本語主体（PROJECT_BRIEF.md技術方針）。日本語圏のEC運営者・制作会社にとって参入障壁が低い |
| Claude Code連携 | Claude Codeスキルとして直接利用可能。`claude_instructions.mjs` が「確認すべき場所」と「実装候補」を分離出力し、AIエージェントによる修正作業と直結する設計は他のPageSpeed系OSSツールに少ない特徴 |
| 3形態・単一エンジン | Web/CLI/Claude Codeスキルが同一判定ロジックを共有し、利用シーンを選ばない |
| ランタイム依存ゼロ | Node標準機能のみで動作し、導入障壁が低い |

## 3. 成長の段階的アプローチ

### 段階1: ニッチ有用性の確立（公開直後〜）

- README（英語正本）・README.ja.md・LP（`/tools/mobile-commerce-audit/`）を通じて「何ができるか」を明確に伝える
- 実際に動くサンプル（`examples/sample-audit.json`）とCLIの30秒デモ例をREADMEに掲載し、「試せばわかる」を体現する
- バッジはtests(workflow badge)/license/node>=20のみとし、スター数・DL数など実績誇示バッジは初期に載せない（github-repo-spec.md）

### 段階2: 発見経路の拡張

- **awesomeリスト提案**: 関連するawesome-listへのPR提案（例: awesome-performance系、awesome-ecommerce系）。ツールとして実質的な価値がある前提で提案する
- **Product Hunt**: `product-hunt-draft.md`（tagline/description/first comment）を準備済みの上で、承認・公開判断後に投稿を検討
- **記事連携**: SEO_STRATEGY.mdのクラスター記事・LP・post-635からGitHubへの導線を設置し、記事経由の発見を促す

### 段階3: コミュニティ形成（中長期）

- Issue・PRへの丁寧な対応（CONTRIBUTING.md・CODE_OF_CONDUCT.md・SUPPORT.mdに基づく）
- ROADMAP.mdに基づく誠実な機能追加（CrUXフィールドデータ対応・多言語レポート・比較ダッシュボード等。github-repo-spec.md）
- 依存関係の健全性維持（dependabot.yml・weekly運用。OPERATIONS_RUNBOOK.md参照）

## 4. リンク獲得の考え方

- **「リンクは利用価値の結果」**と位置づける。リンク獲得それ自体を目的とした施策（相互リンク依頼・リンク購入等）は行わない
- ツールを実際に使った制作会社・EC運営者・技術ブログが、自然な文脈で紹介・言及することを成長の主経路とする
- SEO文脈での被リンク獲得施策（link-acquisitionスキル等の一般的なリンク獲得手法）を適用する場合も、「一次データ・独自診断結果」という本ツールの実体的価値を根拠にする（Linkable Asset的な位置づけ）

## 5. 禁止事項（github-repo-spec.md準拠）

marketing/配下の全ファイル（launch-post-ja/en.md・x-posts-ja/en.md・linkedin-post-ja.md・product-hunt-draft.md・youtube-script-ja.md等）は以下の表現を含まないことを自己検査済みとして明記する。

- 「確実に順位が上がる」「GitHubリンクだけで上位表示」「売上が必ず増える」「SEO効果を保証」「完全自動で成功」「すべてのECサイトに対応」「人間確認不要」

訴求は事実ベースのみとする: 無料・オープンソース・ローカル実行可・EC文脈への翻訳・優先順位付け・3形態同一エンジン。

## 6. 計測との接続

GitHubの成長指標（Insights Traffic・Star数推移・Issue/PR数等）の定義・計測タイミングはMEASUREMENT_PLAN.mdを正とする。本ドキュメントは戦略・方針のみを扱う。
