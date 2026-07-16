# TEST RESULTS（2026-07-17・実測）

## 自動テスト: `npm test` → **163件中162 pass / 0 fail / 1 skip**

| スイート | 内容 |
|---|---|
| tests/urlguard.test.mjs | SSRF: localhost/127.0.0.1/10.x/172.16-31.x/192.168.x/169.254.169.254/::1/fc00::/userinfo/ftp:/不正ポート拒否＋正常URL許可 |
| tests/html_collector.test.mjs | リダイレクトループ打ち切り（5ホップ超）・各ホップ再検証・巨大レスポンス打ち切り（5MB）・malformed URL・タイムアウト（fetchImplモック） |
| tests/priority.test.mjs | P0条件・impact式境界値（14/9/4.5）・certainty降格・effort導出 |
| tests/score.test.mjs | 重み配分・データ欠損軸の分母除外 |
| tests/pipeline.test.mjs | AuditResult/Finding全フィールド形状・platform検出（誤検出回帰2件含む）・ページ種別判定 |
| tests/reports.test.mjs | HTML/MD/CSV/Claude指示の生成・Before/After比較 |
| tests/cli.test.mjs | 40件: 引数検証（不正URL→exit2等）・--json有効性・--compare・--output・モック実行 |

skip 1件 = コア未実装環境向けのCLI防御テスト（実装済みのため意図的スキップ）。ネットワーク・実サイトアクセスは全テストで不使用（fixture＋fetchImpl注入）。

## 既知の環境注意

`node --test <dir>` 形式はNode v24.12.0（Windows公式）でMODULE_NOT_FOUNDになる既知事象（クリーンディレクトリで再現確認済み・コード起因でない）。package.jsonは `node --test tests/**/*.test.mjs` を使用。

## 実サイト診断（Phase 21初回実行）

- 対象: https://www.mobilistica.com/ ・ post-635（?p=635→正規URLへのリダイレクト追跡成功）
- PSIキーレスがHTTP 429（共有クォータ枯渇）→ **HTML簡易診断へ自動フォールバック**（設計どおり・limitationsに明記される動作を実証）
- 4形式レポート（HTML/JSON/MD/CSV）全生成成功 → reports/live-audits/
- 3形態一致: `scripts/verify_single_core.mjs` → **配布vendor23ファイルがsrc/とバイト一致・不一致0**（CLI/スキルはsrc/直接import）

## UIテスト

- ヘッドレスChromeで390px/1280px実描画スクリーンショット取得（marketing/screenshots/5点）。390pxでCWV表・スコアカード・課題リストの表示確認済み
- 未実施（要ステージング）: 実WordPressテーマ上での競合CSS確認・スクリーンリーダー実機
