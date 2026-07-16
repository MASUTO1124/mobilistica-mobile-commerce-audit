# GitHub公開チェックリスト（承認文字列: APPROVE_GITHUB_PUBLISH_MOBILISTICA_AUDIT）

## 公開前（承認受領後・順序厳守）

- [ ] 1. secret-scan-results.md の4パターンを再実行（最終スキャン）
- [ ] 2. `npm test` 全パス再確認（現状: 162 pass / 1 skip）
- [ ] 3. marketing/screenshots/ から web-app-mobile-390.png / web-app-desktop-1280.png / html-report-1280.png を `assets/screenshots/` へコピーし、README.md / README.ja.md のプレースホルダを実画像参照に更新→コミット
- [ ] 4. リポジトリ名の最終確認（第一候補: mobilistica-mobile-commerce-audit。gh検索で衝突なし確認済み 2026-07-17）
- [ ] 5. `gh repo create MASUTO1124/mobilistica-mobile-commerce-audit --public --source . --push`
- [ ] 6. リポジトリ設定: Description / Website(LP URL) / Topics(pagespeed, core-web-vitals, ecommerce, lighthouse, claude-code, woocommerce, shopify)
- [ ] 7. GitHub Actions のtest.yml/lint.ymlが緑になることを確認（バッジ有効化）
- [ ] 8. Security > Private vulnerability reporting を有効化（SECURITY.mdの受付先）

## 初回リリース（v0.1.0）

- [ ] 9. `git tag v0.1.0 && git push --tags` → release.ymlがdraft作成
- [ ] 10. first-release-notes.md の内容でdraftを編集→公開
- [ ] 11. README冒頭のInstallコマンドが実際に動くことを別マシン/クリーンな作業ディレクトリで確認

## 公開後24時間以内

- [ ] 12. MEASUREMENT_PLAN.md の「公開前」ベースライン値を記録（Stars=0等）
- [ ] 13. LP（WordPress側・別承認）公開後、README/READMEjaのWeb版リンク疎通確認
