# MEASUREMENT PLAN — Mobilistica Mobile Commerce Audit

出典: docs/specs/docs-suite-spec.md（MEASUREMENT_PLAN項目・Phase15準拠）・docs/specs/web-wp-spec.md（GA4イベント一覧・site_hash方針）・docs/CURRENT_STATE_AUDIT.md（GA4/GSC現状）。

## 0. 前提条件（先行必須タスク）

**mobilisticaサイトへのGA4導入自体が現時点で未実施**である（CURRENT_STATE_AUDIT.md「GA4: 未実装（既存パイプライン全体でGA4連携なし。ga4.pyは存在しない）」）。

そのため、以下のGA4計測はすべて「GA4導入完了後に有効化される」設計として記述する。**GA4導入（測定ID発行・サイトへのタグ設置）を本計測プランの実行における先行条件タスクとして明記する**。GA4未導入の状態でもWeb診断UI自体は `dataLayer` 未定義ガードにより正常動作する（web-wp-spec.md）が、計測データは取得されない。

GSC（Google Search Console）は `https://www.mobilistica.com/` がsiteOwnerとして登録済み（CURRENT_STATE_AUDIT.md）であり、GSC側の計測は導入作業なしに開始可能。

## 1. GA4イベント定義（11種）

全イベントは `window.dataLayer?.push()` で送出（web-wp-spec.md）。**URL全体は送らず、ドメインのSHA-256ハッシュ先頭12桁を `site_hash` として送出**する方針を全イベント共通とする（詳細はDATA_PRIVACY.md参照）。

| イベント名 | トリガー | 主なパラメータ | site_hash方針 |
|---|---|---|---|
| `audit_form_view` | 診断フォームが画面に表示された時 | — | 送出なし（診断対象URL未確定のため） |
| `audit_started` | 利用者が診断を実行した時 | `strategy`(mobile/desktop), `site_hash` | 送出する（診断対象ドメインのハッシュ） |
| `audit_completed` | 診断が正常完了しレポートが描画された時 | `strategy`, `site_hash`, `grade`(A〜E), `data_sources`(取得できたデータソース種別) | 送出する |
| `audit_failed` | 診断が全データソース取得不可（`data_status: unavailable`）またはエラー終了した時 | `strategy`, `site_hash`, `error_type` | 送出する |
| `report_downloaded` | レポートDLボタン押下時 | `format`(html/json/md/csv), `site_hash` | 送出する |
| `github_clicked` | GitHubリンククリック時 | `link_location`(ヘッダー/フッター/結果画面等) | 送出なし（診断対象と無関係の導線） |
| `skill_install_clicked` | Claude Codeスキル導入リンククリック時 | `link_location` | 送出なし |
| `cli_install_clicked` | CLIインストール導線クリック時 | `link_location` | 送出なし |
| `case_study_clicked` | 事例（post-635）導線クリック時 | `link_location` | 送出なし |
| `consultation_clicked` | 相談CTAクリック時 | `link_location` | 送出なし |
| `audit_shared` | 結果共有（`#u=`フラグメントURL）コピー・共有操作時 | `site_hash`, `share_method` | 送出する |

## 2. GSC監視クエリ（初期候補・10語）

以下はSEO_STRATEGY.mdのコンテンツクラスター（P1/P2）から派生した**監視対象クエリの初期候補**である。ツール未公開の現時点では実測順位データが存在しないため、実績値ではなく「今後GSCで追跡すべきクエリ」として提示する。公開後のGSC実測に基づき四半期ごとに見直す（SEO_STRATEGY.md見直し方針と連動）。

1. モバイル ECサイト 遅い 原因
2. Core Web Vitals EC 売上
3. PageSpeed スコア 見方
4. WooCommerce PageSpeed 改善
5. 商品画像 WebP AVIF
6. 外部タグ 速度 低下
7. LCP改善 EC
8. ECサイト 表示速度 診断
9. モバイルEC 無料診断
10. PageSpeed Insights EC サイト

## 3. GitHub指標

- GitHub Insights（Traffic: views/clones/referrers）は**14日間しか保持されない**仕様のため、定期的な手動記録（スクリーンショットまたは数値のログ化）が必要（docs-suite-spec.md明記）
- 記録頻度: 週次を基本とし、OPERATIONS_RUNBOOK.mdの週次運用に組み込む
- 記録対象: Star数、Fork数、Watcher数、Traffic views/clones（直近14日分）、Issue/PR件数（Open/Closed）、Referring sites上位

## 4. 評価時点

以下の時点で計測値をレビューする。

| 時点 | 内容 |
|---|---|
| 公開前 | ベースライン確認（GSC登録状況・GA4導入状況・GitHub初期状態） |
| 公開後7日 | 初動確認（診断完了率・GitHubクリック率の異常値有無） |
| 公開後14日 | GitHub Insights Trafficの記録（14日保持のため、この時点で確実に1回は記録） |
| 公開後30日 | 初期トレンド評価。P1クラスター記事とツール導線の効果測定開始 |
| 公開後60日 | クラスター優先度の中間見直し材料 |
| 公開後90日 | SEO_STRATEGY.mdの四半期見直しと連動した本格評価 |

## 5. トラフィック以外の評価軸

トラフィック（PV・セッション数）のみで成功を判断しない。以下を評価軸として併用する。

| 評価軸 | 内容 |
|---|---|
| 診断完了率 | `audit_started` に対する `audit_completed` の比率 |
| GitHub遷移率 | 診断結果画面から `github_clicked` への遷移率 |
| インストール数 | `skill_install_clicked` / `cli_install_clicked` のクリック数（実際のインストール完了は計測対象外。導線クリックのみ） |
| 再訪 | 同一利用者の複数回診断実行（Web版はサーバー保存なしのため、GA4クライアントID等での推定に限る） |
| 指名検索 | GSCで「mobilistica」「モバイルECサイト無料診断」等の指名検索クエリの出現・推移 |
| 被リンク | 既存の被リンク週次監視の仕組み（link-monitor）をMobilisticaにも適用し、新規被リンクの検知 |
| Issue・PR | GitHub上のコミュニティ活動量（3.GitHub指標と連動） |
| 事例回遊 | `case_study_clicked` によるpost-635への遷移、および post-635からツールへの逆導線のクリック |

## 6. 既存計測基盤との接続

- GSCデータ取得: 既存の `gsc.py`（`~/.claude/skills/content-audit/scripts/` 等に存在する既存資産）にMobilisticaが2026-07-17付けで登録済み（CURRENT_STATE_AUDIT.md「gsc.py / rewrite_candidates.py — 計測フェーズで使用（mobilistica登録済み 2026-07-17）」）であり、これを流用する
- 週次自動レポート: `weekly_autopilot.py` の対象サイトにMobilisticaを含めることで、他サイトと同様の週次モニタリングサイクルに乗せる（実際の登録作業自体はOPERATIONS_RUNBOOK.mdの週次運用タスクとして扱う）
- Clarity（行動分析）は現時点で未設定（elorigen/erii/iresの3サイトのみ設定済み。CURRENT_STATE_AUDIT.md）。Mobilisticaへの導入要否は本計測プランのスコープ外の検討事項とする
- GA4は `ga4.py` に相当する自動取得スクリプトが現時点で存在しないため、GA4導入後の分析は当面手動確認、または既存パイプラインへの `ga4.py` 追加を待つ運用とする
