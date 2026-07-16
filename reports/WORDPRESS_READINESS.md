# WORDPRESS READINESS

- プラグインZIP: deploy-packages/wordpress/plugin-zip/mobilistica-mobile-audit.zip（78,265 bytes・sha256はsha256.txt）**未インストール**
- LP: deploy-packages/wordpress/landing-page/（固定ページ貼付用・SEO設定3案付き・捏造ゲートPASS）
- post-635更新案: article-update/（original実取得済み2026-07-17・追記のみのdiff・rollback-payload完備・contentのみ更新でtitle/slug/meta等は別承認）
- 手順: install-guide.md（プラグイン→LP→記事の順序固定）/ preflight-check.md / verification-checklist.md / rollback-guide.md
- 前提: GitHubリポジトリ公開が先（リンク切れ防止）。GA4イベントはサイトへのGA4導入（未実施）が前提条件
- **承認文字列: `APPROVE_DEPLOY_MOBILISTICA_AUDIT`**（受領まで本番書き込みは一切実行しない）
