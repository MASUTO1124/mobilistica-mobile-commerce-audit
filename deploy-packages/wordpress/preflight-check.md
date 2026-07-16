# PREFLIGHT CHECK（WordPress反映前・全体）

- [ ] 承認文字列 APPROVE_DEPLOY_MOBILISTICA_AUDIT を受領済み
- [ ] GitHubリポジトリ公開済み（LP・プラグイン内のGitHubリンク先が404にならないこと。未公開ならリンク行を一時削除）
- [ ] plugin-zip のsha256が sha256.txt と一致
- [ ] バックアップ: 反映前にUpdraftPlus等でDB+ファイルのスナップショット取得
- [ ] ConoHa WING WAF: プラグインREST(POST)は影響なし想定だが、有効化後に1回実診断してWAFブロックが出ないこと確認
- [ ] 検証はまず非公開（下書きプレビュー）状態で実施
