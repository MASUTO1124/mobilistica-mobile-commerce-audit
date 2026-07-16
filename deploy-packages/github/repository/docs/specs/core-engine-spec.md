# SPEC: 共通診断エンジン（src/ + tests/）

担当: core実装エージェント。PROJECT_BRIEF.md必読。

## モジュール構成と公開契約

```
src/mobilistica_audit/
├─ core/engine.mjs           # Node用エントリ: export async function runAudit(url, options={})
├─ core/engine.browser.mjs   # ブラウザ用エントリ: export async function runAuditBrowser(url, options={})
├─ core/pipeline.mjs         # 純関数: export function analyzeCollected(collected) → AuditResult（両エントリが共用＝判定ロジックの単一点）
├─ collectors/psi.mjs        # ブラウザ互換（global fetchのみ使用）: fetchPsi(url, {strategy, apiKey, fetchImpl, timeoutMs})
├─ collectors/html.mjs       # Node専用: fetchHtml(url, {timeoutMs, maxBytes, fetchImpl}) — SSRFガード必須
├─ collectors/lighthouse_local.mjs # Node専用: 任意。lighthouseがrequire可能/npx実行可能な場合のみ。不可なら {available:false}
├─ analyzers/*.mjs           # 全て純関数 (collected) → {metrics, findings[]}
│   performance / images / javascript_css / fonts / delivery / mobile_ux / commerce_ux / technical_seo / security_headers / third_party
├─ scoring/priority.mjs      # 7軸→P0..P4導出（下記式）
├─ scoring/mobile_commerce_score.mjs # 総合0-100とグレード
├─ recommendations/advisor.mjs # platform別(wordpress/woocommerce/shopify/generic)の改善文＋immediate/short/mid区分
├─ reports/html.mjs md.mjs csv.mjs claude_instructions.mjs # (AuditResult)→string。自己完結HTML(外部依存なし)
├─ schemas/audit_result.schema.json
└─ security/urlguard.mjs     # validateUrlSyntax(純関数・ブラウザ互換) / assertPublicTarget(Node専用・DNS検証)
```

- 純関数系（pipeline/analyzers/scoring/recommendations/reports/psi/urlguardのvalidateUrlSyntax）は `node:` importを一切含めないこと（ブラウザでそのまま動く）。
- `runAudit(url, {strategy='mobile', apiKey, collectors='auto', timeoutMs=60000, fetchImpl})`:
  collectors='auto'→ PSI試行→(lighthouse任意)→HTML簡易→全滅なら data_status:"unavailable" のAuditResultを返す（throwしない。ネットワーク層の例外はlimitationsに記録）。
- `analyzeCollected({psi?, html?, headers?, lighthouse?, target_url, final_url, strategy})` が全判定を行う。Web/CLI/スキルの結果差は収集データの差のみに由来する構造にする。

## AuditResult（トップレベル形。schemas/にJSON Schema化）

audit_id("ma_"+epoch+乱数hex8) / target_url / final_url / audited_at(ISO) / strategy /
platform {detected:"wordpress|woocommerce|shopify|other|unknown", confidence:"confirmed|estimated", evidence[]} /
data_sources[]（"psi_api"|"lighthouse_local"|"html_fallback"） / mobile_score(0-100|null) /
performance{} core_web_vitals{lcp_ms,inp_ms,cls,tbt_ms,fcp_ms,si_ms,ttfb_ms 各null許容+rating} /
resources{} images{} javascript{} css{} fonts{} third_party{} mobile_ux{} commerce_ux{} technical_seo{} security{} /
recommendations[Finding] / summary{overall_score, grade, top_issues[], executive_summary_ja} / limitations[]

## Finding（Phase5準拠・全フィールド必須）

issue_id, category, priority("P0".."P4"), title(ja), evidence[]（実測値のみ。推定は"(推定)"明記）,
business_impact(ja・売上/導線の言葉), recommended_fix(ja), implementation_owner("operator|designer|frontend|backend|server|seo"),
estimated_effort("small|medium|large"), confidence(0-100), automatic_fix_possible(bool),
scores{sales_impact,mobile_ux_impact,seo_impact,cwv_impact,difficulty,cost,certainty 各0-5},
platform_advice{wordpress?,woocommerce?,shopify?,generic} , term("immediate|short|mid")

## 優先度導出（scoring/priority.mjs・この式を実装しテストで固定）

- P0: 購入不能級（例: HTTPS不可・status>=500・viewport欠如+横スクロール確定・mixed content active）
- それ以外: impact = sales_impact*2 + cwv_impact*1.5 + mobile_ux_impact + seo_impact （最大22.5）
  - impact>=14 → P1 / >=9 → P2 / >=4.5 → P3 / それ未満 → P4
- certainty<=1 の場合は1段階降格（P1→P2等）。difficulty/costはpriorityに影響させずestimated_effortへ反映（difficulty+cost>=7→large, >=4→medium, else small）

## 総合スコア（mobile_commerce_score.mjs）

CWV 40%（PSIカテゴリまたはmetric rating換算）＋Performance 20%＋commerce_ux 20%＋mobile_ux 10%＋technical_seo 10%。
データ欠損軸は分母から除外し、summary.limitationsに明記。grade: A>=90/B>=75/C>=60/D>=40/E。

## SSRFガード（security/urlguard.mjs）

validateUrlSyntax: http/httpsのみ・userinfo禁止・ポートは80/443/8080/8443のみ・ホスト名がlocalhost/.local/.internal拒否・IPリテラルは公開範囲のみ許可。
assertPublicTarget(Node): dns.lookup(all:true)で全アドレス検証。拒否: 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16(メタデータ169.254.169.254含む), 0/8, 100.64/10, ::1, fc00::/7, fe80::/10, ::ffff:プライベートv4。
fetchHtml: redirect:'manual'で最大5ホップ、**各ホップでvalidate+assertPublicを再実行**、maxBytes既定5MB（超過時は打ち切りhuge_response記録）、timeout既定15s、Content-Typeがtext/html以外はheaderのみ。DNS再バインディング残余リスクはSECURITY_DESIGN.mdに明記（取得直前に再解決・TTL間隙は許容）。

## analyzers要点（Phase 4全項目をこの10ファイルに割当て）

- performance: PSI metrics/audits(unused-javascript, unused-css-rules, render-blocking-resources, mainthread-work-breakdown, bootup-time, dom-size, long-tasks, network-dependency-tree=依存チェーン深さ, server-response-time)
- images: uses-optimized-images, modern-image-formats(WebP/AVIF), uses-responsive-images, offscreen-images(lazy), lcp-lazy-loaded, prioritize-lcp-image(fetchpriority), width/height欠如(unsized-images), HTML fallback時はimgタグ走査(枚数/alt/loading/寸法属性/巨大src推定)。EC文脈: 商品一覧・詳細・ヒーローの区別はcommerce_uxのページ種別から連携
- javascript_css: bundleサイズ, defer/async欠如(HTML走査), critical CSS不在(render-blocking), jQuery検出, WordPressプラグイン由来候補(wp-content/plugins/のscript src集計)
- fonts: font-display, preload, 外部フォントホスト数, ウェイト数推定(link/css走査), FOIT/FOUTリスク
- delivery: Cache-Control/CDN検出(via header/host)/content-encoding(br,gzip)/HTTP2·3(PSIのuses-http2等)/リダイレクトチェーン
- mobile_ux: viewport, tap-targets, font-size, 固定要素・interstitial検出(HTMLヒューリスティック・(推定)扱い), CLS要因(unsized images/ads)
- commerce_ux: ページ種別判定(top/category/product_list/product_detail/cart/checkout/article) — schema.org Product/Offer, og:type=product, add-to-cartパターン(?add-to-cart=, name="add", cart系class), WooCommerce/Shopifyマーカー。product_detailでは 価格表示/カートボタン検出/Product Schema/Review/AggregateRating/パンくず/画像枚数/CTAまでのDOM距離(推定)。信頼要素(送料・返品・支払いの語)の有無。**ブラウザ実操作が必要な項目(スクロール距離実測等)は"estimated"としlimitationsに記録**
- technical_seo: status, canonical, robots meta/robots.txt(fallback時fetch), sitemap存在, title/description/H1/見出し階層, lang/hreflang, OG/X Card, Schema種別列挙(Organization/WebSite/Product/BreadcrumbList/FAQPage等)+重複検出, img alt率, index可否
- security_headers: HTTPS, HSTS, mixed content(HTML走査), X-Content-Type-Options, CSP有無(情報表示のみP4)
- third_party: PSI third-party-summary or スクリプトホスト集計(解析/広告/チャット分類辞書)

## platform検出

wp-content→wordpress(confirmed)。woocommerce文字列/クラス→woocommerce。cdn.shopify.com/Shopify.theme→shopify。他EC(cart系検出のみ)→other。無し→unknown。断定できないものは confidence:"estimated"。

## reports

- html.mjs: 自己完結（インラインCSS・JSなしor最小・外部リクエスト0）。総合スコア/モバイルECスコア/CWV表/上位5課題(優先度色分け)/各Findingのevidence・business_impact・fix/Before-After比較欄(前回JSON埋込対応)/免責/診断日時/URL。印刷CSS。ダーク配色対応は任意
- md.mjs: 経営者向け要約(冒頭)＋制作者向け技術詳細(後半)の2部構成
- csv.mjs: findings一覧(UTF-8 BOM付き・Excel対応)
- claude_instructions.mjs: **「確認すべき場所」(サイト一般論としての探索手順)と「実装候補」(確認後に適用する修正)を分離**。実在確認していないファイルパスを断定表記しない
- compare: reports各形式は options.previous(AuditResult) を受けたらBefore/After差分を出す

## テスト（tests/・node:test・ネットワーク不使用）

fixtures: normal.html / slow-heavy-images.html / js-heavy.html / product-page.html(Woo風) / huge.html(6MB生成スクリプト可) / psi-response-sample.json(実PSI形状の縮約版を自作)。
必須テスト: urlguard(localhost/127.0.0.1/10.x/172.16-31.x/192.168.x/169.254.169.254/::1/fc00::/ftp:/userinfo/port9999拒否・正常URL許可)、
redirectループ(fetchImplモック5ホップ超で打ち切り)、huge response打ち切り、malformed URL、
priority式の境界値、score欠損軸除外、pipeline: fixture入力→Finding形状(スキーマ全フィールド)検証、
platform検出、commerce_uxページ種別、CSV/HTML/MDが例外なく生成されること。
`npm test`（package.jsonのtest= node --test tests/）で全部走ること。

## package.json（coreが作成）

name:"mobilistica-mobile-commerce-audit", type:"module", engines.node:">=20", scripts.test, version:"0.1.0", license:"MIT", dependenciesなし。

## 完了条件

`node --test tests/` 全パス。`node -e "import('./src/mobilistica_audit/core/pipeline.mjs')"` がエラーなし。
examples/sample-audit.json（fixtureから生成した本物のAuditResult1件）を保存。
