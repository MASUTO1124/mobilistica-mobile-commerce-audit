# SPEC: ドキュメント一式（docs/配下・指定10ファイル）

担当: docsエージェント。PROJECT_BRIEF.md・CURRENT_STATE_AUDIT.md・core-engine-spec.md必読（技術的事実はこの3つに準拠。創作しない）。
PROJECT_BRIEF.md / CURRENT_STATE_AUDIT.md / specs/ は編集禁止。以下を新規作成:

1. **PRODUCT_REQUIREMENTS.md** — Phase1準拠: 対象ユーザー/解決課題/価値（PSI再表示との差別化=EC翻訳・売上影響・優先順位・難易度・担当分類・環境別改善案・期間3区分・前後比較・3形式保存・Claude修正指示）/非スコープ（ログイン操作・注文・保証表現）/成功指標はMEASUREMENT_PLAN参照
2. **ARCHITECTURE.md** — Node.js選定理由（CURRENT_STATE_AUDIT.mdの表を引用）・共通コア図（engine/engine.browser→pipeline共有）・3形態のデータフロー図（テキスト図でよい）・収集フォールバック連鎖・「判定ロジック単一・収集差はlimitationsに記録」の原則
3. **SECURITY_DESIGN.md** — SSRF脅威モデル（Web版はサーバー取得なし/CLIはローカル実行者自身/WPプロキシはgoogleapis.com限定）・urlguard規則全列挙・DNS rebinding残余リスクと緩和・APIキー取り扱い（環境変数/wp-config・ログ禁止・クライアント非配布）・WPプラグイン（nonce/rate limit/IPハッシュ化/esc関数）・レポートHTMLのXSS対策（全ユーザー由来文字列のエスケープ）
4. **DATA_PRIVACY.md** — 個人情報を取得しない設計・メール不要・GA4はURL全体を送らずdomainハッシュ・IP生値を保存しない・診断結果の保存はユーザー自身のローカル/ブラウザのみ・WPプロキシのキャッシュは10分transient
5. **SEO_STRATEGY.md** — 方針: 記事量産でなくツール主導のブランド/被リンク獲得。ピラー=LP(/tools/mobile-commerce-audit/)、事例=post-635。クラスター優先度表（下記の初期評価を記載・四半期見直し）:
   P1(3ヶ月以内): モバイルECサイトが遅い原因 / Core Web VitalsとEC売上 / PageSpeedスコアの見方(診断結果の読み方としてLP補完)
   P2: WooCommerce PageSpeed改善 / 商品画像WebP・AVIF / 外部タグ速度低下 / LCP改善(EC文脈)
   P3: Shopify速度(自社実績なし=体験メモ無しのため保留寄り) / INP改善 / CLS改善 / WPプラグイン速度低下
   見送り: ECサイト速度改善費用(商用比較・激戦)・Lighthouse vs PSI(一般解説はweb.devと競合)
   ※すべて執筆前にcannibal_check --preとSEO Growth Engineバックログ照合を必須と明記
6. **GITHUB_GROWTH_STRATEGY.md** — 誠実な成長設計: 初期はニッチ有用性（EC×日本語レポート×Claude連携が差別化）→awesomeリスト提案・Product Hunt・記事連携。スター数を目的化しない。リンクは「利用価値の結果」と明記
7. **MEASUREMENT_PLAN.md** — Phase15準拠。GA4イベント11種の定義表（トリガー/パラメータ/site_hash方針）・**前提条件: mobilisticaサイトへのGA4導入自体が未実施（CURRENT_STATE_AUDIT参照）＝導入タスクを先行条件として明記**・GSC監視クエリ10語・GitHub指標（Insights Traffic=14日保持→定期記録が必要な旨）・評価時点(公開前/7/14/30/60/90日)・トラフィック以外の評価軸（診断完了率/GitHub遷移/インストール/再訪/指名検索/被リンク/Issue・PR/事例回遊）・計測の既存基盤との接続（gsc.py/weekly_autopilot）
8. **DEPLOYMENT_PLAN.md** — 2承認ゲート（APPROVE_GITHUB_PUBLISH_MOBILISTICA_AUDIT / APPROVE_DEPLOY_MOBILISTICA_AUDIT）・GitHub公開手順（gh repo create→push→release draft）・WP反映手順（プラグインZIP手動インストール→LP固定ページ作成→post-635更新はdeploy-packages/wordpress/article-update/使用）・各手順の検証コマンド
9. **OPERATIONS_RUNBOOK.md** — 週次運用（weekly_autopilotとの関係・PSIクォータ監視・Issueトリアージ・依存更新）・障害時（PSI API停止時はフォールバック動作の案内文）・キャッシュ削除手順
10. ROLLBACK_PLAN.md は**作成しない**（統括が実成果物確定後に作成する）

事実の出典が無い数値・実績を書かない。文体は既存docs（CURRENT_STATE_AUDIT.md）に合わせ日本語・簡潔。
