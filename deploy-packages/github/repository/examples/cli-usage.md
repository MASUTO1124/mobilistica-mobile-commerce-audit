# CLI使用例（mobilistica-audit）

`cli/mobilistica-audit.mjs` の実行例集。仕様は `docs/specs/cli-spec.md` を正とする。
本ファイルはcli担当エージェントが `examples/` に追加したもの（`docs/PROJECT_BRIEF.md`「ディレクトリ所有権」参照）。

> 注: 本CLIは `src/mobilistica_audit/` の診断コア（`runAudit()`）を呼び出すだけで、
> 判定ロジック自体は持っていません。コア未実装の間は `MOBILISTICA_AUDIT_MOCK` を使うと
> ネットワークに出ずに動作確認できます（下記「コア未完成時の自己テスト」参照）。

## インストール

開発中はリポジトリ直下から直接実行できます（`package.json` の `bin` 登録・`npm link` は任意）。

```bash
node cli/mobilistica-audit.mjs https://example.com --json
```

グローバルコマンド `mobilistica-audit` として使いたい場合はインストーラーを使います。

```bash
# Linux/Mac
bash cli/install/install.sh --yes

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File cli\install\install.ps1 -Yes

# クロスプラットフォーム（Python）
python cli/install/install.py --yes
```

インストーラーは実行前に「npm link先」と「Claude Codeスキルのコピー先」を必ず表示し、
既存ファイルがある場合は `<name>.bak-YYYYMMDD-HHMMSS` にバックアップしてから上書きします。
`claude-skill/mobilistica-mobile-commerce-audit/` が未実装の場合はエラーにせずスキップします。

削除する場合:

```bash
bash cli/install/uninstall.sh --yes
# または
powershell -ExecutionPolicy Bypass -File cli\install\uninstall.ps1 -Yes
```

## 基本的な使い方

```bash
# 既定: モバイル戦略・md形式でstdoutに出力
mobilistica-audit https://example.com

# デスクトップ戦略で診断
mobilistica-audit https://example.com --strategy desktop

# --mobile-only は --strategy mobile の別名（既定と同じ）
mobilistica-audit https://example.com --mobile-only
```

## CI/パイプライン向け（JSON出力）

`--json` を使うと、ログ（stderr）と結果（stdout）が完全に分離されるため、
`jq` 等でそのままパイプできます。

```bash
mobilistica-audit https://example.com --json | jq '.summary.grade'
```

終了コードで診断結果を分岐させる例:

```bash
mobilistica-audit https://example.com --json > result.json
case $? in
  0) echo "OK: 大きな問題なし" ;;
  1) echo "要対応: P0検出 or データ取得失敗" ;;
  2) echo "引数エラー"; exit 1 ;;
  3) echo "対象サイトに到達できません（SSRF拒否含む）"; exit 1 ;;
  4) echo "内部エラー"; exit 1 ;;
esac
```

## レポート形式・保存

```bash
# HTML/JSON/MD/CSVすべてを ./reports/ に保存（audit_id基準のファイル名）
mobilistica-audit https://example.com --format all --output ./reports

# Markdownだけをファイル保存
mobilistica-audit https://example.com --format md --output ./reports

# 日本語パスもそのまま使えます
mobilistica-audit https://example.com --format json --output "./診断結果"
```

`--format all` は `--output` と併用必須です（保存先が無いとファイル群を書き出せないため）。

## 前回結果との比較

```bash
mobilistica-audit https://example.com --format md --compare ./reports/prev-audit.json
```

`--compare` に渡すのは、以前このCLIで生成した `--format json` （またはAuditResult形式）のファイルです。

## APIキー・タイムアウト・収集方式

```bash
# フラグ指定が最優先。次点で環境変数 PAGESPEED_API_KEY → PSI_API_KEY → キーレス
mobilistica-audit https://example.com --api-key "$PAGESPEED_API_KEY"

# 環境変数だけで渡す場合
PAGESPEED_API_KEY=xxxxx mobilistica-audit https://example.com

# PSIのみ/HTML簡易診断のみに限定
mobilistica-audit https://example.com --collectors psi
mobilistica-audit https://example.com --collectors html

# タイムアウトを30秒に延長
mobilistica-audit https://example.com --timeout 30000
```

## ログレベル

```bash
mobilistica-audit https://example.com --log-level silent   # エラーのみ表示
mobilistica-audit https://example.com --log-level info     # 既定（進捗・制限事項を表示）
mobilistica-audit https://example.com --log-level debug    # スタックトレース等も表示
```

ログは常に stderr に出るため、`--log-level debug` を付けても `--json` のstdout出力は汚れません。

## コア未完成時の自己テスト（MOBILISTICA_AUDIT_MOCK）

診断コア（`src/mobilistica_audit/core/engine.mjs`）が未実装・開発中でも、
`MOBILISTICA_AUDIT_MOCK` にAuditResult形式のJSONファイルを指すパスを設定すると、
CLIはネットワークに一切出ずにそのJSONを診断結果として扱います。

```bash
# リポジトリに同梱の自己テスト用フィクスチャを使う例
MOBILISTICA_AUDIT_MOCK=cli/test-fixtures/mock-audit-normal.json \
  node cli/mobilistica-audit.mjs https://example.com --json

# P0検出パターン（終了コード1になることを確認できる）
MOBILISTICA_AUDIT_MOCK=cli/test-fixtures/mock-audit-p0.json \
  node cli/mobilistica-audit.mjs https://example.com --json
echo "exit: $?"   # => 1

# データ全滅パターン（終了コード1）
MOBILISTICA_AUDIT_MOCK=cli/test-fixtures/mock-audit-unavailable.json \
  node cli/mobilistica-audit.mjs https://example.com --json
echo "exit: $?"   # => 1
```

Windows PowerShellの場合:

```powershell
$env:MOBILISTICA_AUDIT_MOCK = "cli/test-fixtures/mock-audit-normal.json"
node cli/mobilistica-audit.mjs https://example.com --json
Remove-Item Env:\MOBILISTICA_AUDIT_MOCK
```

コア実装完了後に本番のPSI/Lighthouse/HTML収集へ切り替えたい場合は、
単に `MOBILISTICA_AUDIT_MOCK` を設定しなければ通常どおり `runAudit()` が呼ばれます。

## よくあるエラーと終了コード

| 状況 | 終了コード | 例 |
|---|---|---|
| URL未指定・不正なURL構文 | 2 | `mobilistica-audit not-a-url` |
| `--format` に不正な値 | 2 | `mobilistica-audit https://example.com --format yaml` |
| `--format all` を `--output` なしで指定 | 2 | `mobilistica-audit https://example.com --format all` |
| `--compare` のファイルが存在しない/JSON不正 | 2 | `mobilistica-audit https://example.com --compare missing.json` |
| 診断対象に到達できない（SSRF拒否含む） | 3 | プライベートIP・localhost等を指定した場合 |
| 診断は完走したがP0検出、またはデータ全滅 | 1 | HTTPS未対応など購入不能級の課題を検出 |
| 上記以外の内部エラー | 4 | コア未実装状態でモックなしに実行した場合 等 |

## テスト実行

```bash
node --test tests/cli.test.mjs
```

ネットワークには一切アクセスしません（`MOBILISTICA_AUDIT_MOCK` を使用）。
