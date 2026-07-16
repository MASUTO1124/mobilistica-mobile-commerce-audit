# ROLLBACK PLAN

本プロジェクトはローカル成果物のみで、本番（GitHub公開・WordPress）には何も反映していない（2026-07-17時点）。
各段階のロールバック手順を反映前に確定しておく。

## 現時点（未公開）のロールバック

| 対象 | 手順 |
|---|---|
| プロジェクト全体 | `C:\Users\tomik\mobilistica-open-source-growth\` を削除するだけ（外部への影響なし） |
| 既存スクリプトへの変更 | 本プロジェクトは既存基盤（content-audit / seo-growth-engine）を**一切変更していない**。復元不要 |
| Claudeスキル | まだ `~/.claude/skills/` へ未インストール。インストール後は `cli/install/uninstall.ps1` で除去（バックアップから復元可） |
| ローカルDB | 本プロジェクトはDBを作成しない（診断結果はユーザーが保存したファイルのみ） |

## GitHub公開後のロールバック（承認: APPROVE_GITHUB_PUBLISH_MOBILISTICA_AUDIT の取り消し）

1. リポジトリ非公開化: `gh repo edit MASUTO1124/mobilistica-mobile-commerce-audit --visibility private`
2. 完全削除する場合: `gh repo delete`（Star・Fork・被リンクも消えるため原則は非公開化に留める）
3. Release取り下げ: `gh release delete <tag>`
4. 既に外部リンクが張られている場合はREADMEに「メンテナンス停止」を明記する方が被リンク資産を守れる

## WordPress反映後のロールバック（承認: APPROVE_DEPLOY_MOBILISTICA_AUDIT の取り消し）

| 対象 | 手順 |
|---|---|
| プラグイン | 管理画面から無効化→削除（uninstall.phpがtransientを自動全削除。投稿・設定への影響なし） |
| LP固定ページ | 非公開（下書きに戻す）→ 不要なら削除。Rank Mathのリダイレクト設定は追加していないため他ページへの影響なし |
| post-635 | `deploy-packages/wordpress/article-update/rollback-payload.json` のcontentでPOST（元の本文へ完全復元。sha256.txtで原本性検証可能） |
| GA4イベント | GA4導入自体が未実施のため現状は対象なし。導入後はgtag設定からイベントを削除 |
| APIキー | `MOBILISTICA_PSI_API_KEY` をwp-config.phpから削除（プラグインは自動でクライアント直呼びへフォールバック）。Google Cloud側でキー無効化 |
| キャッシュ | 管理画面「診断キャッシュ・実行カウンタを削除」ボタン、またはプラグイン削除で自動消去 |
| Search Console | インデックス申請は行わない方針のため取り消し作業なし。LPを非公開化した場合は自然にクロール除外される |

## 検証

ロールバック後、以下で復元を確認する:
- post-635: 公開URLをcurl取得し「自分のサイトで同じ項目を確認する」見出しが**含まれない**こと＋sha256がoriginal-content.htmlと一致
- LP: /tools/mobile-commerce-audit/ が404または非公開
- プラグイン: `wp_options` に `mma_` プレフィックスのtransientが残っていないこと
