# Phase 0: 現状調査（2026-07-17）

実ファイル・実API確認に基づく。推測項目は明示。

## Mobilistica本体

| 項目 | 状態 |
|---|---|
| サイト | https://www.mobilistica.com/（WordPress・ConoHa WING c8650005・SSH不可=FTPSのみ） |
| テーマソース | `C:\Users\tomik\wpwork\mobilistica-theme\`（自作プレーンPHP・`[psi_score]`ショートコード保有） |
| バックアップ | `C:\Users\tomik\wpwork\mobilistica-backup-20260714\`（旧記事35本） |
| SEOプラグイン | Rank Math Pro（ライセンス連携済み・isSiteConnected: True） |
| WP REST | `.env`に`WP_MOBILISTICA_*`設定済み（2026-07-17）・認証HTTP 200確認済み |
| WAF | ConoHa WING標準。DELETE/PUT→403のため`POST + X-HTTP-Method-Override`必須 |
| GSC | `https://www.mobilistica.com/` siteOwner登録済み（sites().list()で実確認） |
| GA4 | **未実装**（既存パイプライン全体でGA4連携なし。ga4.pyは存在しない） |
| Clarity | 未設定（設定済みはelorigen/erii/iresの3サイトのみ） |
| 公開記事 | **1本**: post-635「ECサイトのモバイルPageSpeedスコアを28点から76点に改善した実測記録」（2026-07-14） |
| 曜日表 | 火曜・新規週1（2026-07-17運用開始・立ち上げ期） |

## GitHub

- gh CLI v2.96.0 導入済み・認証済み。アカウント: **MASUTO1124**
- 既存リポジトリ: claude-memory-vault / desktop-tutorial（いずれもprivate・本件と無関係）
- `mobilistica-mobile-commerce-audit` 等の既存同名リポジトリなし → 名称衝突なし（外部の一般名検索はGitHub公開承認前チェックで実施）

## 既存の再利用可能資産

| 資産 | 場所 | 本件での扱い |
|---|---|---|
| pagespeed skill | `~/.claude/skills/pagespeed/`（psi_analyze.py・`PSI_API_KEY`任意） | PSI API呼び出しパターンの参考。キーレス動作は実績あり |
| psi-optimize.php v3 | mu-plugin・12サイト配置済み | 改善「実施側」の資産。診断ツールからの推奨文言に整合させる |
| seo-growth-engine | `~/.claude/skills/seo-growth-engine/` | mobilistica用config/競合分析/Opportunity 57件・記事クラスタ優先度の供給元 |
| content_audit.py＋4ゲート | `~/.claude/skills/content-audit/scripts/` | LP・記事更新案の品質ゲートに使用 |
| gsc.py / rewrite_candidates.py | 同上 | 計測フェーズで使用（mobilistica登録済み 2026-07-17） |
| ga4.py | **存在しない** | GA4計測は「設計のみ」（MEASUREMENT_PLAN.mdに実装前提条件を記載） |
| 既存スクリーンショット機能 | ui-check skill等 | Chrome headless（`chrome.exe --headless --screenshot`）で代替 |
| WordPress安全デプロイ | seo-growth-engine deploy-packages方式 | 同方式を踏襲（original/approved/rollback/sha256） |

## APIキー状況

- `PAGESPEED_API_KEY` / `PSI_API_KEY`: **未設定**。PSI APIはキーレスで低クォータ動作可（実績あり）→ キーレス既定＋環境変数で拡張の設計とする
- `YOUTUBE_API_KEY`: 設定済み（本件無関係）

## 技術選定: Node.js（確定）

| 判断軸 | Node.js | Python |
|---|---|---|
| Lighthouse本体 | **同一言語**（npmパッケージ・ローカル実行連携が自然） | subprocess経由のみ |
| ブラウザ共有 | **同一ESMモジュールをそのまま実行可**（PSI APIはCORS対応→クライアント直呼び可） | 不可（Web版だけ別実装になり「共通コア」要件違反） |
| ランタイム | v24.12.0導入済み・fetch/test標準内蔵→**ランタイム依存ゼロで実装可能** | 3.12導入済み |
| 既存資産 | psi_analyze.pyは80行程度→移植容易 | 既存はPythonだがPSI呼び出しのみ |

**結論**: 共通コア要件（Web/CLI/スキルで判定ロジック単一）を満たせるのはNode.jsのみ。ランタイム依存ゼロ（Node標準機能のみ）とし、Lighthouseは任意インストールのオプション扱い。

## 独立プロジェクトとして新規作成

Mobilisticaサイト本体のアプリケーションリポジトリは存在しない（テーマソースのみ）ため、指示どおり
`C:\Users\tomik\mobilistica-open-source-growth\` を新規作成。テーマ改修は本件スコープ外
（LP・プラグインは独立成果物としてdeploy-packagesに格納し、本番反映は承認後）。
