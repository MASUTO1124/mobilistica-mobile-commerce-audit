# SEO AUDIT（LP・2026-07-17）

対象: landing-page/mobile-commerce-audit.html（/tools/mobile-commerce-audit/想定）

## オンページ

| 項目 | 状態 |
|---|---|
| title / meta description | 各3案作成（ファイル冒頭コメント）。Rank Math側設定方式＝固定ページ貼付時の重複防止 |
| H1 | 1つ（「モバイルECサイト無料診断」）・見出し階層h1→h2→h3正常 |
| canonical / OG / X Card | Rank Math設定値として指定済み（コメントブロック） |
| Schema | WebApplication＋FAQPage(JSON-LD)。**SoftwareApplicationは不採用**（Web提供が主のためWebApplicationが適切）。BreadcrumbListはRank Math出力に委譲（重複回避）。FAQPage重複チェックを公開後手順に明記 |
| 内部リンク | LP→post-635（事例）・post-635→LP（article-update承認後）で相互リンク完成。LP→GitHubは外部 |
| alt / indexability | LP内画像なし（サンプルはテキスト表現）・noindex指定なし |
| ダークパターン | なし（結果表示に連絡先不要・CTA優先順位は診断>GitHub>スキル>事例>相談） |

## 既存品質ゲート（Phase 16「既存のcontent_audit.pyを利用」）

`content_audit.py --site mobilistica --file <LP>` 実行結果:
- **捏造ゲート: PASS（blocked=false・マーカー0件）** / AI定型表現スコア: 0（検出なし）
- 総合62点（🟡）— 採点器はSEO記事前提（3,500字/H2×5/FAQ構造等）のため、ツールLPとしては想定内。誇張・保証表現なしは目視でも確認（「保証するものではありません」明記）

## クラスター戦略

docs/SEO_STRATEGY.md参照（P1: モバイルECが遅い原因/CWVとEC売上/PageSpeedの見方、以下P2-P3、見送り2種）。執筆時はcannibal_check --pre＋SEO Growth Engineバックログ照合を必須化。ピラー=本LP、事例=post-635。

## 計測

GSC監視クエリ10語・評価時点（7/14/30/60/90日）は docs/MEASUREMENT_PLAN.md。**GA4はサイト未導入が前提条件**として明記済み。
