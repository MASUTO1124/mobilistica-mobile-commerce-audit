# MANUAL REVIEW ITEMS（人間確認が必要な7件）

1. **PSI APIキー発行**（推奨・5分）: キーレスは429頻発。Google Cloud「gscga4-claude」でPageSpeed Insights API有効化→キー発行→`.env`にPAGESPEED_API_KEY追記→ベースライン再取得（MOBILISTICA_BASELINE.md手順3）
2. **PHP構文チェック**: ローカルにPHP未導入のため未実施。ステージングまたは `php -l` 可能な環境でプラグイン5ファイルを確認（verification-checklist.md収録）
3. **実WAF配下でのREST動作**: ConoHa WING標準WAFでのnonce付きPOSTが403にならないか、プラグイン有効化後に1回実測
4. **README用スクリーンショット差込**: marketing/screenshots/の5点から3点をassets/screenshots/へ（release-checklist.md手順3。現READMEはプレースホルダ）
5. **LPのFAQPage Schema重複**: Rank Math Pro併用のため公開後にページソースで二重出力確認
6. **GA4導入判断**: mobilisticaサイト自体がGA4未導入（計測イベント11種は実装済みだが発火先がない）。導入するか、当面GSC+GitHub指標のみで運用するかの判断
7. **ires向け情報**: 該当なし（本件はmobilistica単独・クライアントサイト非関与）
