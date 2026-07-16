# mobilistica-mobile-commerce-audit (Claude Code skill)

ECサイトをモバイル中心に診断するClaude Codeスキル。CLI（`cli/mobilistica-audit.mjs`）を呼び出すラッパーであり、判定ロジックは共通コア（`src/mobilistica_audit/`）と同一。

## インストール

リポジトリルートで:

```bash
# macOS / Linux
bash cli/install/install.sh
# Windows
powershell -File cli/install/install.ps1
```

インストーラーがこのディレクトリを `~/.claude/skills/` へコピーします（既存ファイルはバックアップされます）。

## 呼び出し例

- 「このECサイトをモバイル中心に診断して https://example.com」
- 「この商品ページのLCP改善案を出して」
- 「PageSpeed結果をEC売上への影響順に整理して」
- 「前回診断と比較して」（前回のJSONパスを添えて）
- 「修正用のClaude Code指示を作って」

## アンインストール

```bash
bash cli/install/uninstall.sh        # または cli/install/uninstall.ps1
```
