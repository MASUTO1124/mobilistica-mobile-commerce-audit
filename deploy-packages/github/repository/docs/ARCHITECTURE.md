# ARCHITECTURE — Mobilistica Mobile Commerce Audit

出典: docs/CURRENT_STATE_AUDIT.md（技術選定表）・docs/specs/core-engine-spec.md（モジュール構成・公開契約）・docs/specs/web-wp-spec.md（Web/WPアーキテクチャ）・docs/PROJECT_BRIEF.md（ディレクトリ所有権）。

## 1. 技術選定: Node.js（確定・変更禁止）

CURRENT_STATE_AUDIT.md の判断軸をそのまま引用する。

| 判断軸 | Node.js | Python |
|---|---|---|
| Lighthouse本体 | 同一言語（npmパッケージ・ローカル実行連携が自然） | subprocess経由のみ |
| ブラウザ共有 | 同一ESMモジュールをそのまま実行可（PSI APIはCORS対応→クライアント直呼び可） | 不可（Web版だけ別実装になり「共通コア」要件違反） |
| ランタイム | v24.12.0導入済み・fetch/test標準内蔵→ランタイム依存ゼロで実装可能 | 3.12導入済み |
| 既存資産 | psi_analyze.pyは80行程度→移植容易 | 既存はPythonだがPSI呼び出しのみ |

結論: 共通コア要件（Web/CLI/スキルで判定ロジック単一）を満たせるのはNode.jsのみ。ランタイム依存ゼロ（Node標準機能のみ）とし、Lighthouseは任意インストールのオプション扱い。

技術方針（PROJECT_BRIEF.md、変更禁止）:
- Node.js >= 20、ESM（.mjs）、ランタイム依存ゼロ（Node標準のfetch/dns/net/node:testのみ。lint等はdevDependencies可だがコアは依存なし）
- analyzers/scoring/recommendations/reports は純関数・ブラウザ互換（`node:`モジュールをimportしない）。Node専用コードはcollectors/html・collectors/lighthouse_local・cli/のみ

## 2. 共通コア構成（判定ロジックの単一点）

```
src/mobilistica_audit/
├─ core/engine.mjs           # Node用エントリ: runAudit(url, options={})
├─ core/engine.browser.mjs   # ブラウザ用エントリ: runAuditBrowser(url, options={})
├─ core/pipeline.mjs         # 純関数: analyzeCollected(collected) → AuditResult（両エントリが共用＝判定ロジックの単一点）
├─ collectors/psi.mjs        # ブラウザ互換（global fetchのみ使用）: fetchPsi(url, {strategy, apiKey, fetchImpl, timeoutMs})
├─ collectors/html.mjs       # Node専用: fetchHtml(url, {timeoutMs, maxBytes, fetchImpl}) — SSRFガード必須
├─ collectors/lighthouse_local.mjs # Node専用・任意。lighthouseが利用不可なら {available:false}
├─ analyzers/*.mjs           # 全て純関数 (collected) → {metrics, findings[]}
│   performance / images / javascript_css / fonts / delivery / mobile_ux / commerce_ux / technical_seo / security_headers / third_party
├─ scoring/priority.mjs      # 7軸→P0..P4導出
├─ scoring/mobile_commerce_score.mjs # 総合0-100とグレード
├─ recommendations/advisor.mjs # platform別(wordpress/woocommerce/shopify/generic)の改善文＋immediate/short/mid区分
├─ reports/html.mjs md.mjs csv.mjs claude_instructions.mjs # (AuditResult)→string
├─ schemas/audit_result.schema.json
└─ security/urlguard.mjs     # validateUrlSyntax(純関数・ブラウザ互換) / assertPublicTarget(Node専用・DNS検証)
```

### 純関数 / Node専用の境界（重要原則）

pipeline / analyzers / scoring / recommendations / reports / psi.mjs / urlguard.mjsのvalidateUrlSyntaxは `node:` importを一切含めず、ブラウザでそのまま動作する。Node専用コードは collectors/html.mjs・collectors/lighthouse_local.mjs・urlguard.mjsのassertPublicTarget・cli/ に限定される。この境界を破ると「単一コア」原則が崩れるため、実装・レビュー双方でこの境界を維持する。

## 3. 共通コア図（テキスト）

```
                         ┌─────────────────────────┐
                         │   core/pipeline.mjs      │
                         │  analyzeCollected()      │  ← 判定ロジックの単一点
                         │  (純関数・ブラウザ互換)   │
                         └───────────┬──────────────┘
                                     │ collected = {psi?, html?, headers?, lighthouse?, target_url, final_url, strategy}
                 ┌───────────────────┴───────────────────┐
                 │                                        │
   ┌─────────────▼─────────────┐          ┌───────────────▼───────────────┐
   │  core/engine.mjs (Node)    │          │ core/engine.browser.mjs (Browser)│
   │  runAudit(url, options)    │          │ runAuditBrowser(url, options)   │
   │  収集: PSI→Lighthouse(任意)│          │ 収集: PSIのみ（CORS対応API直呼び）│
   │       →HTML簡易→unavailable│          │       →unavailable              │
   └─────────────┬─────────────┘          └───────────────┬─────────────────┘
                 │                                        │
        ┌────────▼────────┐                     ┌────────▼────────┐
        │ CLI (cli/)       │                     │ Web診断UI        │
        │ WPプラグインREST  │                     │ (web-app/)       │
        │ プロキシ経由      │                     │ Claude Codeスキル│
        └──────────────────┘                     └──────────────────┘
```

- 3形態（Web/CLI/Claude Codeスキル）はすべて `core/pipeline.mjs` の `analyzeCollected()` を最終的に呼び出す
- 差異は「どのエントリ（engine.mjs / engine.browser.mjs）から呼ばれるか」＝「どの収集手段（collectors）が使えるか」のみ

## 4. 3形態のデータフロー

### 4-1. Web診断UI（クライアントサイド実行）

```
ブラウザ（利用者端末）
  → validateUrlSyntax(入力URL) [クライアント側の防御多層]
  → engine.browser.mjs: runAuditBrowser(url, options)
    → collectors/psi.mjs: fetchPsi() — ブラウザから直接 PSI API を fetch（CORS対応・キーレス既定）
    → core/pipeline.mjs: analyzeCollected()
  → reports/html.mjs 等でレンダリング（描画はブラウザ内で完結）
```

サーバー（mobilistica.com）は対象URLを取得しない＝サーバー側SSRF面が存在しない（web-wp-spec.md）。

### 4-2. WordPressプラグイン（任意プロキシ経由）

```
ブラウザ（利用者端末）
  → [プロキシ有効時] POST /wp-json/mobilistica-audit/v1/psi {url, strategy}
      → WPサーバー: class-rest.php がサーバー保管キー(MOBILISTICA_PSI_API_KEY)でPSIへ代理リクエスト
        （外部アクセス先はgoogleapis.comのみ。nonce検証・rate limit・10分transientキャッシュ）
      → PSIレスポンスをブラウザへ返却
  → engine.browser.mjs: runAuditBrowser() が受け取ったPSIデータで analyzeCollected()
  → [プロキシ未定義時] クライアント直呼びへ自動フォールバック（4-1と同じ経路）
```

### 4-3. CLI

```
利用者端末（ローカル実行）
  → cli/mobilistica-audit.mjs
  → core/engine.mjs: runAudit(url, options)
    → collectors/psi.mjs: fetchPsi()（Node fetchで直接PSI API呼び出し）
    → [任意] collectors/lighthouse_local.mjs: ローカルLighthouseが利用可能な場合のみ
    → collectors/html.mjs: fetchHtml()（SSRFガード必須・PSI/Lighthouseとも取得不可時のフォールバック）
    → core/pipeline.mjs: analyzeCollected()
  → reports/{html,md,csv,claude_instructions}.mjs でファイル/stdout出力
```

### 4-4. Claude Codeスキル

```
Claude Code（利用者環境）
  → claude-skill/ 経由で cli/mobilistica-audit.mjs を呼び出す想定（CLIをラップ）
  → 以降は 4-3 CLI と同一経路
  → reports/claude_instructions.mjs の出力（確認すべき場所／実装候補の分離）をClaude自身が参照し、
    実装コード修正の提案に利用する
```

## 5. 収集フォールバック連鎖

`runAudit(url, {collectors='auto', ...})` の既定動作（core-engine-spec.md）:

```
① PSI API 試行（PAGESPEED_API_KEY/PSI_API_KEY指定時はキー付き、無ければキーレス低クォータ）
    ↓ 失敗 or strategy非対応
② ローカルLighthouse試行（導入済みの場合のみ・任意。requireまたはnpx実行可能な場合のみ）
    ↓ 失敗 or 未導入
③ 公開HTML + HTTPヘッダー簡易診断（collectors/html.mjs・SSRFガード必須）
    ↓ 失敗（到達不能・タイムアウト等）
④ data_status: "unavailable" のAuditResultを返す（throwしない。例外はlimitationsに記録）
```

- Web版はPSI直呼びのみ（②③はNode専用のため利用不可。プロキシ有効時のみ②相当をWPサーバー側に委譲する設計ではなく、あくまでPSI代理のみ）
- APIキーが無くても停止しない（PROJECT_BRIEF.md 技術方針）ことをこの連鎖全体で担保する

## 6. 判定ロジック単一・収集差はlimitationsに記録という原則

- `analyzeCollected(collected)` はNode/ブラウザいずれの環境でも同一の判定を行う純関数であり、Web/CLI/スキル間で「同じ入力データが与えられれば同じ結果」を返す
- 3形態間の結果差異は「収集できたデータの差」（例: Web版はLighthouseローカル実行不可、CLI版はローカルLighthouseがあれば追加データを取得可能）に起因し、判定基準自体の差異ではない
- 収集できなかった軸・推定値は `limitations[]` に明記し、レポート上でユーザーに開示する（データの欠損を隠さない）
- この原則により、「Web版とCLI版で診断結果の傾向が違う」という事態が生じても、原因は収集層に限定され、判定ロジックのバグではないことを切り分けられる

## 7. ディレクトリ所有権（エージェント間衝突防止）

PROJECT_BRIEF.mdより引用。

| 担当 | 書き込み許可ディレクトリ |
|---|---|
| core | src/ tests/ examples/sample-audit.json |
| cli | cli/ examples/(CLI使用例) |
| web-wp | web-app/ wordpress-plugin/ landing-page/ scripts/build_web.mjs |
| github | リポジトリ直下のコミュニティファイル・.github/ marketing/ |
| docs | docs/（PROJECT_BRIEF.md・CURRENT_STATE_AUDIT.md・specs/は変更禁止） |

他担当のディレクトリへの書き込みは禁止。参照は自由。package.jsonはcoreが作成し、cliがbin追記のみ行う。

## 8. 新規プロジェクトとしての位置づけ

Mobilisticaサイト本体（`www.mobilistica.com`）のアプリケーションリポジトリは存在せず、テーマソース（`C:\Users\tomik\wpwork\mobilistica-theme\`）のみが存在する。そのため本プロジェクトは `C:\Users\tomik\mobilistica-open-source-growth\` に独立プロジェクトとして新規作成されている（CURRENT_STATE_AUDIT.md）。テーマ改修自体は本プロジェクトのスコープ外であり、LP・WordPressプラグインは独立成果物としてdeploy-packagesに格納し、本番反映は承認後に行う（DEPLOYMENT_PLAN.md参照）。
