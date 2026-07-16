# SPEC: CLI（cli/）

担当: cliエージェント。PROJECT_BRIEF.md・core-engine-spec.md（公開契約部分）必読。
コアは `src/mobilistica_audit/core/engine.mjs` の `runAudit(url, options)` を呼ぶだけ。**判定ロジックをCLI側に書かない**。
coreが未完成でも契約(スペック)に対して実装し、モック(examples/sample-audit.json想定形)で自己テストしてよい。

## コマンド

```
node cli/mobilistica-audit.mjs <url> [options]
  --format html|json|md|csv|all   (既定: md をstdout。--output指定時はファイル群)
  --strategy mobile|desktop        (既定 mobile)  --mobile-only は --strategy mobile の別名
  --compare <previous.json>
  --output <dir>                   (audit_id基準のファイル名で保存。dirはUTF-8/日本語パス対応)
  --api-key <key>                  (優先度: フラグ > PAGESPEED_API_KEY > PSI_API_KEY > キーレス)
  --collectors auto|psi|html       --timeout <ms>  --log-level silent|info|debug
  --json                           (--format json --output無しの短縮: stdoutへJSONのみ)
  --version --help
```

package.json に `"bin": {"mobilistica-audit": "cli/mobilistica-audit.mjs"}` を追記（他フィールドは触らない）。
shebang `#!/usr/bin/env node`。

## 要件

- exit code: 0=成功 / 1=診断は走ったがP0検出 or データ全滅 / 2=引数不正 / 3=対象到達不能(SSRF拒否含む) / 4=内部エラー
- stdoutは`--json`時に純JSON（ログはstderr）→ CI/パイプ利用可
- Windows/Mac/Linux対応: パス結合はnode:path、出力はUTF-8明示、CRLF環境でも壊れない読み書き
- タイムアウト・APIキー無しフォールバックはcoreに委譲し、CLIはlimitationsを人間可読で表示
- エラーはスタックを--log-level debug時のみ表示。認証情報・APIキーを出力しない

## インストーラー（cli/install/）

install.sh / install.ps1 / install.py / uninstall.sh / uninstall.ps1:
- 機能: ①`npm link`または`npm install -g <このリポジトリパス>`の実行 ②Claude Codeスキル(claude-skill/mobilistica-mobile-commerce-audit/)を `~/.claude/skills/` へコピー
- **実行前にインストール先パスを表示**し、非対話時は`--yes`必須。既存ファイルは`<name>.bak-YYYYMMDD-HHMMSS`にバックアップしてから上書き
- uninstallはコピー先スキルとnpm linkを除去（バックアップは残す）
- claude-skill/が未完成の場合はスキップメッセージ（エラーにしない）

## テスト（tests/cli.test.mjs — tests/所有はcoreだがこの1ファイルのみ追加可）

引数パース（不正URL→exit2 / --format不正→exit2）、--json出力が有効JSON、--compare読込。
runAuditはモック注入（`MOBILISTICA_AUDIT_MOCK=examples/sample-audit.json` 環境変数があればネットワークに出ずそれを返すフックをCLI内に実装）で実行。

## 完了条件

`node cli/mobilistica-audit.mjs --help` 正常。モックでの `--json` 実行が有効JSONを返す。examples/にCLI使用例md追加。
