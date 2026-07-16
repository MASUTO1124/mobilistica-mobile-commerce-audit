# PREFLIGHT CHECK: post-635 更新（承認文字列 APPROVE_DEPLOY_MOBILISTICA_AUDIT が必要）

- [ ] WP管理画面でpost-635の最終更新日時が `2026-07-14T23:20:29`（original取得時点）のままであること（変わっていたら再取得からやり直す）
- [ ] LP（/tools/mobile-commerce-audit/）が先に公開されていること（リンク先404防止。LP公開→記事更新の順）
- [ ] GitHubリポジトリが公開済みであること（GitHubリンクを含むため。未公開ならその行を削って反映）
- [ ] content.diff の追加が「まとめ」の後の1セクション＋リスト2項目のみであること（削除行が無いこと）
- [ ] cannibal_check / dup_check は不要（本文追記のみ・新規記事ではない）
- [ ] 反映はcontentのみ。title/slug/status/meta等は変更しない
- [ ] 反映方法: update-payload.json の _apply_hint 参照（ConoHa WAFのためPOST使用）
- [ ] 反映後: 公開URLをcurlで取得し、追加セクションの見出し「自分のサイトで同じ項目を確認する」が含まれることを確認
