# OPERATIONS RUNBOOK — Mobilistica Mobile Commerce Audit

出典: docs/specs/docs-suite-spec.md（OPERATIONS_RUNBOOK項目）・docs/specs/web-wp-spec.md（キャッシュ削除機能仕様）・docs/specs/github-repo-spec.md（dependabot/CI）・docs/CURRENT_STATE_AUDIT.md（既存運用基盤）。

## 1. 週次運用

### 1-1. weekly_autopilotとの関係

- 既存の `weekly_autopilot.py`（全サイト対象の週次自律レポート: GSC全サイト＋下書きストック＋推奨タスク）の対象にMobilisticaを含める
- Mobilisticaは他のwp-mediaメディア運用サイトとは別管理（PROJECT_BRIEF.md・独立プロジェクト）だが、GSC計測・被リンク監視等の**計測基盤は共有**する（MEASUREMENT_PLAN.md「既存計測基盤との接続」参照）
- 週次で確認する項目: GSC監視クエリ（MEASUREMENT_PLAN.md記載の10語候補）の掲載状況、GitHub Insights Traffic記録（14日保持のため週次記録が必須）、被リンク週次監視（link-monitor）の合致件数

### 1-2. PSIクォータ監視

- 本ツールはキーレス動作（低クォータ）を既定とする（PROJECT_BRIEF.md技術方針）。APIキー未設定でも動作を止めないが、キーレス運用時はクォータ制限に達しやすい
- 週次で以下を確認する:
  - Web診断UI・CLI・WPプラグインいずれかの経路で `audit_failed`（PSI取得失敗によるフォールバック発生）の頻度が異常に高くないか（MEASUREMENT_PLAN.mdのGA4イベントで検知）
  - WPプラグインのプロキシ機能を有効化している場合、`MOBILISTICA_PSI_API_KEY` によるクォータ消費状況（Google Cloud Console側でのクォータ確認。本ドキュメントでは手順の存在のみ明記し、実際のクォータ数値は運用開始後に確認する）
  - クォータ逼迫時は、キーレス動作へのフォールバックが正しく機能していることを確認する（core-engine-spec.mdの収集連鎖: PSI→Lighthouse任意→HTML簡易→unavailable）

### 1-3. Issueトリアージ

- GitHub公開後（DEPLOYMENT_PLAN.mdゲート1承認後）、Issue・PRを週次で確認する
- `ISSUE_TEMPLATE/bug_report.yml` / `feature_request.yml`（github-repo-spec.md）に沿った起票を促し、テンプレート外の起票も内容を精査した上で対応する
- 重大な脆弱性報告はGitHub Security Advisories経由（SECURITY.md記載の報告先）で受け付け、通常のIssueトリアージとは別に優先対応する

### 1-4. 依存更新

- 本ツールのコア（src/）はランタイム依存ゼロ（PROJECT_BRIEF.md技術方針）のため、実行時依存の更新作業は本質的に発生しない
- devDependencies（lint等）およびGitHub Actions自体のバージョンは `dependabot.yml`（npm・weekly。GitHub Actions更新監視を含む。github-repo-spec.md）で自動検知する
- 週次でdependabotが作成したPRを確認し、`npm test` が通過することを確認した上でマージ判断を行う

## 2. 障害時対応

### 2-1. PSI API停止時

PSI API（Google PageSpeed Insights API）自体が停止・障害している場合の対応。

- 本ツールの設計上、PSI取得不可時は自動的にローカルLighthouse（任意・導入済みの場合のみ）→HTML簡易診断→`data_status: "unavailable"` の順にフォールバックし、**ツールは止まらない**（core-engine-spec.md収集連鎖）
- 利用者向けの案内文（例）: 「現在、外部診断サービス（Google PageSpeed Insights）が一時的に利用できないため、一部の指標（Core Web Vitals等）が取得できていません。基本的なHTML・HTTPヘッダー診断のみの結果を表示しています。しばらく時間をおいて再度お試しください。」
- この案内はレポートの `limitations[]` を通じて利用者に開示される設計であり、運用側が個別に告知する必要は基本的にない。ただし、障害が長期化する場合はLP・README等に一時案内を追加することを検討する
- 障害の切り分け: Google側の障害か、自ドメインのAPIキー・クォータ起因かを区別する（PSI Status関連の公式情報、または `curl` での直接疎通確認により切り分ける）

### 2-2. WPプラグインのプロキシ障害時

- プロキシ（`POST /wp-json/mobilistica-audit/v1/psi`）が機能しない場合も、クライアント直呼びへの自動フォールバックが機能する設計（web-wp-spec.md「未定義ならプロキシ無効化しクライアント直呼びへフォールバック」）
- WordPress側の障害（WAF・REST API無効化等）を疑う場合は、ConoHa WING側の状態を確認する。ConoHa WINGはSSH不可（FTPSのみ）であるため、ファイル修正が必要な障害対応はFTPS経由で行う（CURRENT_STATE_AUDIT.md）

## 3. キャッシュ削除手順

### 3-1. WPプラグインのtransientキャッシュ

- 対象: PSI結果キャッシュ（URL+strategyハッシュ・10分TTL）、rate limit用IPハッシュtransient
- 手順: WordPress管理画面のMobilisticaプラグイン設定ページ内「キャッシュ全削除ボタン」を使用（nonce+`manage_options`capability保護。web-wp-spec.md）
- 通常運用では10分TTLで自然失効するため、手動削除は「診断ロジック更新直後に古いキャッシュ結果を即座に反映させたい場合」等の限定的なケースで使用する

### 3-2. Web診断UIのブラウザキャッシュ

- Web診断UI自体はサーバーキャッシュを持たない（クライアントサイド実行・DATA_PRIVACY.md）ため、運用側でのキャッシュ削除操作は基本的に不要
- `web-app/vendor/` は `scripts/build_web.mjs` によるビルド成果物であり、src/更新時は再ビルド＋再デプロイでブラウザキャッシュのバスティング（ファイル名にハッシュを含める等）を検討する（具体的なキャッシュバスティング方式は実装詳細に委ね、本ドキュメントでは運用上の注意点のみ記す）

## 4. 運用体制上の注意

- 本プロジェクトはPROJECT_BRIEF.mdのディレクトリ所有権に基づき、担当エージェント（core/cli/web-wp/github/docs）が分業する。運用フェーズにおいても、修正の影響範囲に応じて担当を切り分けることが望ましい
- 週次運用の実務は、既存のメディア運用チームの日次パイプラインとは別管理であることを踏まえ、Mobilistica固有の週次チェックリストとして独立に管理する
