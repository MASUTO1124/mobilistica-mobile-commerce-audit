# DEPLOYMENT PLAN — Mobilistica Mobile Commerce Audit

出典: docs/specs/docs-suite-spec.md（DEPLOYMENT_PLAN項目）・docs/PROJECT_BRIEF.md（安全ルール・承認ゲート）・docs/specs/github-repo-spec.md／web-wp-spec.md（成果物構成）・docs/CURRENT_STATE_AUDIT.md（Mobilistica本体の現状・既存デプロイ資産）。

## 1. 承認ゲート（2つ・厳守）

本プロジェクトの本番反映は以下2つの承認文字列が揃うまで実行しない（PROJECT_BRIEF.md 安全ルール）。

| ゲート | 対象 | 承認文字列 |
|---|---|---|
| ゲート1 | GitHubへのpush・公開リポジトリ作成・Release | `APPROVE_GITHUB_PUBLISH_MOBILISTICA_AUDIT` |
| ゲート2 | WordPress本番への書き込み・プラグインインストール・固定ページ作成・記事更新 | `APPROVE_DEPLOY_MOBILISTICA_AUDIT` |

2ゲートは独立しており、どちらか一方の承認が他方の承認を兼ねない（GitHub公開のみ承認された状態でWP本番へ反映してはならず、逆も同様）。

## 2. GitHub公開手順（ゲート1承認後）

1. リポジトリ作成前チェック: 一般名検索で `mobilistica-mobile-commerce-audit` 等の名称衝突がないことを再確認（CURRENT_STATE_AUDIT.md時点では衝突なしを確認済みだが、公開直前に再確認する）
2. `gh repo create MASUTO1124/mobilistica-mobile-commerce-audit --public --source=. --remote=origin`（コマンドは方針の骨子。実行時のオプションはリポジトリの状態に応じて調整）
3. コミュニティファイル一式（README.md・README.ja.md・LICENSE・SECURITY.md・CONTRIBUTING.md・CODE_OF_CONDUCT.md・CHANGELOG.md・ROADMAP.md・SUPPORT.md・.github/配下）が揃っていることを確認（github-repo-spec.md準拠）
4. `git push -u origin main`
5. CI（`.github/workflows/test.yml`）がGitHub Actions上で正常に走ることを確認（node 20/22 matrix→`npm test`）
6. タグ `v0.1.0` を作成しpush → `workflows/release.yml` が **draft** releaseを自動作成することを確認（自動公開はしない設計。github-repo-spec.md）
7. draft releaseの内容を人間が確認した上で、Release公開は別途手動判断で行う

### 検証コマンド（GitHub公開後）

```
gh repo view MASUTO1124/mobilistica-mobile-commerce-audit
gh run list --repo MASUTO1124/mobilistica-mobile-commerce-audit --limit 5
gh release list --repo MASUTO1124/mobilistica-mobile-commerce-audit
```

## 3. WordPress反映手順（ゲート2承認後）

Mobilisticaサイトの現状（CURRENT_STATE_AUDIT.md）: `https://www.mobilistica.com/`（WordPress・ConoHa WING c8650005・**SSH不可=FTPSのみ**）、Rank Math Pro導入済み、WP REST認証はHTTP 200確認済み（`.env`の`WP_MOBILISTICA_*`）。WAFはConoHa WING標準でDELETE/PUT→403のため`POST + X-HTTP-Method-Override`が必須。

### 3-1. プラグインZIP手動インストール

1. `scripts/build_web.mjs --plugin-zip` でプラグインZIPを `deploy-packages/wordpress/plugin-zip/` へ出力（web-wp-spec.md）
2. WordPress管理画面（プラグイン→新規追加→アップロード）から手動インストール、または承認済みの安全な方法でファイル配置
3. 有効化後、管理画面の設定ページで `MOBILISTICA_PSI_API_KEY` 未設定状態でも動作すること（プロキシ無効化・クライアント直呼びへのフォールバック）を確認
4. rate limit・キャッシュ・管理画面のキャッシュ全削除ボタンが機能することを確認

### 3-2. LP固定ページ作成

1. `landing-page/mobile-commerce-audit.html` の本文HTMLをWordPress固定ページ（slug: `/tools/mobile-commerce-audit/`）に貼付
2. ショートコード `[mobilistica_mobile_audit]` の埋め込み位置が正しく反映されることを確認
3. JSON-LD（FAQPage+WebApplication）貼付前に、Rank Math Pro側が既にWebPage/Breadcrumbを出力していないか重複確認（web-wp-spec.md注記）
4. title・meta description・canonical・OG/X CardはRank Math側で設定する（本文への直書きはしない。固定ページ貼付では無効になるため）

### 3-3. post-635更新

- 既存の安全デプロイ方式（`deploy-packages/wordpress/article-update/`。原本/承認版/ロールバック版/sha256のセットで管理する既存のseo-growth-engine deploy-packages方式を踏襲。CURRENT_STATE_AUDIT.md「WordPress安全デプロイ」参照）を使用する
- post-635本文へツールへの導線（LPリンク等）を追記する場合も、この方式でoriginal/approved/rollback/sha256を保持した上で反映する
- **post-635の28→76点実測値の記述自体は変更しない**（別施策の実績としての位置づけを維持。PROJECT_BRIEF.md安全ルール）

### 検証コマンド（WP反映後）

```
curl -sI https://www.mobilistica.com/tools/mobile-commerce-audit/
curl -s https://www.mobilistica.com/wp-json/mobilistica-audit/v1/psi -X POST -o /dev/null -w "%{http_code}\n"
curl -sI https://www.mobilistica.com/?p=635
```

（実URL・エンドポイント名は実装確定後に合わせて調整。HTTP 200／期待するステータスコードの確認をもって完了とする）

## 4. デプロイ順序の原則

1. GitHub公開（ゲート1）とWP反映（ゲート2）は独立した承認判断であり、順序を固定しない（どちらを先に行っても構わない）
2. ただし、WP反映（LP・プラグイン）はGitHubリポジトリへの導線を含むため、**GitHub公開後にWP反映を行う方が導線が矛盾しない**（LPからリンクした先のGitHubリポジトリが非公開のままだと利用者が404に遭遇する）。この観点から実務上はゲート1→ゲート2の順を推奨するが、強制はしない
3. いずれの反映も、事前に承認文字列が明示されたことをログ（会話履歴・作業記録）で確認してから実行する

## 5. ロールバック

本ドキュメントはロールバック手順そのものを扱わない。ROLLBACK_PLAN.mdは統括が実成果物確定後に別途作成する（docs-suite-spec.md明記・本docsエージェントのスコープ外）。
