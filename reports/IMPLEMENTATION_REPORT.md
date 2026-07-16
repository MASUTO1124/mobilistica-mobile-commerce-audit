# IMPLEMENTATION REPORT（2026-07-17）

## 実装アプローチ

スペックファイル駆動の並列開発: 統括が`docs/PROJECT_BRIEF.md`＋`docs/specs/`5本に公開契約（モジュールパス・関数名・JSON形状・優先度式）を固定し、4エージェント（core/cli/github/docs）並列＋統括直接実装（web-app/plugin/LP/skill）で構築。契約駆動のため統合時のドリフトは2件のみ（レポート関数名・CWVデータ形状）で、いずれも即日修正済み。

## 完成した機能（完了条件との対応）

| 完了条件 | 状態 |
|---|---|
| 共通診断エンジン | ✅ src/mobilistica_audit/（analyzers10種・依存ゼロNode ESM） |
| PSI APIフォールバック／ローカルLighthouse／簡易HTML診断 | ✅ 4段フォールバック連鎖（PSI→LH任意→HTML→unavailable明示）。実診断でPSI 429→HTML自動切替を実証 |
| EC固有診断／優先順位スコア | ✅ commerce_ux（ページ種別・カートボタン・信頼要素）＋7軸→P0-P4式（priority.mjs・境界値テスト済み） |
| HTML/JSON/Markdown/CSVレポート | ✅ ＋Claude Code修正指示（「確認すべき場所」「実装候補」分離） |
| CLI | ✅ exit code 0-4・--compare・--output・UTF-8・モックフック |
| Claude Codeスキル／インストーラー | ✅ claude-skill/＋install.{sh,ps1,py}/uninstall（バックアップ付き） |
| Web診断UI | ✅ クライアントサイド実行（サーバーは対象URLを取得しない設計）・モック描画をスクリーンショットで実証 |
| WordPressプラグインZIP | ✅ 78,265 bytes・nonce/rate limit/IPハッシュ/transientキャッシュ/uninstall完備・未インストール |
| 専用LP | ✅ 15セクション・SEO案3種・FAQPage+WebApplication Schema・捏造ゲート通過 |
| post-635内部リンク更新案 | ✅ deploy-packages/wordpress/article-update/（original/approved/payloads/diff/sha256） |
| GitHub公開用リポジトリ | ✅ ローカルコミット済み（remote未設定・push未実行）・README 2言語・Actions 3本 |
| 3形態の判定ロジック単一性 | ✅ scripts/verify_single_core.mjs でvendor配布物とsrc/の**バイト一致を機械検証**（23ファイル・不一致0） |
| Mobilistica実サイトdry-run診断 | ✅ トップ＋post-635実施（MOBILISTICA_BASELINE.md） |
| 本番書き込み | **0件**（GitHub公開0・WP書き込み0） |

## 技術選定

Node.js >= 20 / ESM / ランタイム依存ゼロ。理由: ①PSI APIがCORS対応→同一モジュールをブラウザ直実行可（共通コア要件の唯一解） ②Lighthouse本体がNode製 ③依存ゼロ＝サプライチェーンリスクなし・npm audit対象なし。詳細: docs/CURRENT_STATE_AUDIT.md・docs/ARCHITECTURE.md。

## 実装中に発見・修正した実バグ

1. プラットフォーム誤検出: 記事本文の「WooCommerce」言及だけでwoocommerce(confirmed)判定（post-635実診断で発覚）→構造マーカー限定に修正＋回帰テスト2件
2. Web UIのCWV表示: {value,rating}形を数値として扱いNaN表示（スクリーンショット検証で発覚）→修正
3. 390pxで欧文語のはみ出し→overflow-wrap追加
4. CLIレポートローダーの関数名候補にコアの実名(renderHtmlReport等)が無い→追加
5. `node --test tests/`（ディレクトリ指定）がNode v24.12.0 Windows版で常時MODULE_NOT_FOUND→globパターン指定に回避（コア班が別環境再現で特定）
