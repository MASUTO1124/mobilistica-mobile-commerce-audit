---
name: mobilistica-mobile-commerce-audit
description: ECサイトのURLをモバイル中心に診断（表示速度・Core Web Vitals・購入導線・技術SEO）し、売上影響順の改善優先度とClaude Code用修正指示を生成する
argument-hint: "<URL> [--compare 前回JSON] 例: https://example.com/product/123"
disable-model-invocation: false
allowed-tools:
  - Bash(node *)
  - Bash(npx *)
  - Read
  - Write
---

ECサイト向けモバイル診断スキル。診断ロジックはCLIと同一の共通コア（mobilistica-mobile-commerce-audit）を使う。

## 引数
$ARGUMENTS

## 前提確認

診断エンジンの場所を次の順で解決する:
1. `~/mobilistica-open-source-growth/cli/mobilistica-audit.mjs`（開発環境）
2. `npx mobilistica-audit`（npmインストール済み環境）
どちらも無ければ、GitHubリポジトリ（MASUTO1124/mobilistica-mobile-commerce-audit）のREADMEに従った導入をユーザーに案内して終了する。

## 実行手順

### Step 1: 診断実行

```bash
node ~/mobilistica-open-source-growth/cli/mobilistica-audit.mjs "<URL>" --json > /tmp/audit-result.json
```

- `--compare <前回JSON>` が指定されたら付与する
- 環境変数 `PAGESPEED_API_KEY` / `PSI_API_KEY` があれば自動使用される（値を表示・出力しないこと）
- exit code 3（到達不能/SSRF拒否）の場合はURLの妥当性をユーザーに確認する

### Step 2: 結果の報告

JSONを読み、以下の構成で日本語報告する:

1. **総合評価** — モバイルECスコア・グレード・PageSpeedスコア・プラットフォーム判定（confidence が estimated の場合は「推定」と明記）
2. **Core Web Vitals** — LCP/INP/CLS/TTFBと評価
3. **優先課題 上位5件** — priority・タイトル・business_impact・recommended_fix・担当・工数
4. **制約事項** — limitations[] をそのまま列挙（データ取得方式・推定項目）

### Step 3: 用途別の追加対応

- 「LCP改善案を出して」→ recommendations から cwv_impact>=3 の項目に絞り platform_advice を展開
- 「売上への影響順に整理して」→ scores.sales_impact 降順で全件を表形式に
- 「前回と比較して」→ --compare 付き再実行し差分を報告
- 「修正用のClaude Code指示を作って」→ `--format md --output <dir>` で claude_instructions を生成しファイルパスを案内。**指示内の「確認すべき場所」と「実装候補」の区別を保持し、対象サイトの実ファイルパスを断定しない**

## プラットフォーム自動判定の扱い

結果JSONの platform.detected（wordpress/woocommerce/shopify/other/unknown）と confidence を必ず併記する。
confirmed 以外は「〜と推定されます」と表現し、断定しない。

## 安全ルール

- 同一サイトへの連続診断は間隔を空ける（PSI APIクォータ・対象サイト負荷への配慮）
- ログイン操作・購入操作・注文の自動化は行わない
- APIキーの値をチャット・レポートに出力しない
