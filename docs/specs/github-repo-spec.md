# SPEC: GitHub公開用ファイル＋紹介素材（リポジトリ直下・.github/・marketing/）

担当: githubエージェント。PROJECT_BRIEF.md必読（特に禁止表現・「28→76点はツールの効果ではない」）。
リポジトリ: MASUTO1124/mobilistica-mobile-commerce-audit（公開はしない。ファイル準備のみ）。

## リポジトリ直下

- README.md（**英語・正本**）: What it does / Who it's for / スクリーンショット枠（`assets/screenshots/`参照・後日差込のプレースホルダ可・存在しない画像を実在するように書かない）/ 30-second example（CLI実行例と出力抜粋）/ Install（npm・installer）/ Use with Claude Code / CLI usage / Web version（mobilistica.com/tools/mobile-commerce-audit/）/ What it checks（診断カテゴリ表）/ Sample report（examples/sample-audit.json・docs参照）/ Limitations / Security / Roadmap / Contributing / License / Links（Mobilistica公式・post-635改善事例）
- README.ja.md: 同構成の日本語版
- LICENSE: MIT（Copyright (c) 2026 Mobilistica / MASUTO Inc.）
- SECURITY.md（脆弱性報告先: GitHubのSecurity Advisories・重大時の対応目安）/ CONTRIBUTING.md（dev setup: Node>=20・npm test・PRガイド）/ CODE_OF_CONDUCT.md（Contributor Covenant 2.1）/ CHANGELOG.md（Keep a Changelog形式・[Unreleased]→0.1.0）/ ROADMAP.md（誠実に: CrUXフィールドデータ対応・多言語レポート・比較ダッシュボード等）/ SUPPORT.md
- バッジ: tests(workflow badge)/license/node>=20 のみ。stars・DL数など実績誇示バッジは初期に載せない

## .github/

- ISSUE_TEMPLATE/bug_report.yml, feature_request.yml（form形式）・PULL_REQUEST_TEMPLATE.md
- dependabot.yml（npm・weekly。依存ゼロでもGitHub Actions更新監視を含める）
- workflows/test.yml（push/PR: node 20/22 matrix→ `npm test`）
- workflows/lint.yml（`npx eslint@9 src cli --no-eslintrc --config .github/eslint.config.mjs` 用の最小flat config同梱）
- workflows/release.yml（tag `v*` push時: npm test→zip作成→**draft** release作成。自動公開しない）

## marketing/（投稿はしない・ローカル素材のみ）

launch-post-ja.md / launch-post-en.md（ブログ/長文告知）、x-posts-ja.md / x-posts-en.md（各5案・140/280字検証）、
linkedin-post-ja.md、product-hunt-draft.md（tagline/description/first comment）、youtube-script-ja.md（3分デモ台本）、
demo-script.md（スクリーンショット撮影手順）、release-notes.md（v0.1.0）。
**禁止表現チェックリストを各ファイル末尾に付け、自己検査済みと明記**: 「確実に順位が上がる/GitHubリンクだけで上位表示/売上が必ず増える/SEO効果を保証/完全自動で成功/すべてのECサイトに対応/人間確認不要」を含まないこと。
事実ベースの訴求のみ: 無料・オープンソース・ローカル実行可・EC文脈への翻訳・優先順位付け・3形態同一エンジン。

## 完了条件

全ファイル作成。README2言語の構成一致。workflows のYAML構文が有効（yamllint不要・目視+インデント注意）。
