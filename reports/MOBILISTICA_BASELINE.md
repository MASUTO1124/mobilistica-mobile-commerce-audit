# MOBILISTICA BASELINE（実サイト診断・2026-07-17）

診断方式: 本ツールCLI・**HTML簡易診断**（PSIキーレスがHTTP 429=共有クォータ枯渇のため自動フォールバック。
CWV・PSI由来監査は未取得。`PAGESPEED_API_KEY`発行後に再診断してこのベースラインを更新すること）。
生データ: reports/live-audits/（JSON/HTML/MD/CSV各2セット・.gitignore対象）

## トップページ https://www.mobilistica.com/

- platform: **wordpress (confirmed)** / モバイルECスコア: **92.5 (A)**（HTML評価軸のみ・CWV除外）
- findings 7件（P0-P2: 0件）:
  - P3 alt属性未設定の画像あり → 記事画像のalt付与（担当: operator）
  - P3 Cache-Controlヘッダー未設定 → ConoHa WINGキャッシュ/ブラウザキャッシュ設定（担当: server）
  - P4 HSTS未設定 ほかP4×4（メタ系軽微）

## post-635（改善実測記事）

- platform: **wordpress (confirmed)**（初回woocommerce誤検出→検出ロジック修正後の値）/ スコア: **88.75 (B)**
- findings 8件（P0-P2: 0件）: 上記共通2件＋記事固有の軽微項目

## 解釈と次のアクション

1. **P0-P2ゼロ＝構造的な重大問題なし**。自作テーマ（2026-07-14デプロイ）の設計が効いている
2. 即効改善はalt付与とCache-Control（いずれもsmall）。psi-optimize.php mu-pluginのmobilistica適用状況を確認する価値あり
3. **CWVベースライン未取得が最大の欠測**。PSIキー発行（gscga4-cloudプロジェクト・無料）→ `mobilistica-audit https://www.mobilistica.com/ --output reports/live-audits` 再実行で完全なベースライン確定
4. LP公開後は本ツール自身でLPを診断し、`--compare`で劣化監視する運用（OPERATIONS_RUNBOOK.md）
