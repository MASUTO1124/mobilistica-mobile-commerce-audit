# VERIFICATION CHECKLIST（WordPress反映後）

- [ ] LP公開URL https://www.mobilistica.com/tools/mobile-commerce-audit/ がHTTP 200
- [ ] LP上で実URLを1件診断→結果表示（モバイル実機/DevTools 390pxでも確認）
- [ ] 診断結果の「詳細レポートを保存」でHTMLがダウンロードできる
- [ ] post-635 に「自分のサイトで同じ項目を確認する」セクションが表示され、LPへのリンクが機能
- [ ] LPからpost-635への事例リンクが機能（相互リンク完成）
- [ ] ページソースでFAQPage Schema重複なし・APIキー文字列なし（grep "AIza"）
- [ ] PSI: LP自身をPageSpeed Insightsで測定し、Performance低下がないこと（プラグインアセットはショートコード設置ページのみ読込）
- [ ] Search Console: インデックス申請は**行わない**（自然クロールに任せる方針）
- [ ] 7日後: MEASUREMENT_PLAN.mdの初回計測
