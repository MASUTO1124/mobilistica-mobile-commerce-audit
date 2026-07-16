# ROLLBACK GUIDE（WordPress）

詳細は docs/ROLLBACK_PLAN.md 参照。要点:
1. post-635: article-update/rollback-payload.json のcontentでPOST → original-content.htmlのsha256一致を確認
2. LP: 固定ページを下書きに戻す（削除は任意）
3. プラグイン: 無効化→削除（uninstall.phpがtransient全削除。original-backups/は本パッケージ内に保持）
4. wp-config.phpからMOBILISTICA_PSI_API_KEY定義を削除し、Google Cloud側でキー無効化
