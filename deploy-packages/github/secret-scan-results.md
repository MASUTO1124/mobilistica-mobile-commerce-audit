# シークレットスキャン結果（2026-07-17）

対象: リポジトリ全ファイル（src/ cli/ web-app/ wordpress-plugin/ landing-page/ claude-skill/ .github/ marketing/ docs/ examples/ tests/）＋git履歴（コミット1件）

## 実施したスキャン

1. **ハードコード秘密値パターン**: `(api[_-]?key|password|secret|token)\s*[:=]\s*['"][A-Za-z0-9_-]{16,}` → **0件**
   （環境変数名 PAGESPEED_API_KEY / PSI_API_KEY / MOBILISTICA_PSI_API_KEY の参照のみ＝値の記載なし）
2. **AIzaプレフィックス（Google APIキー実値）**: `AIza[A-Za-z0-9_-]{35}` → **0件**
3. **個人情報・環境識別子**: `tomikir2|C:\Users\tomik|c8650005|kaimonopedia` → **0件**
   （cli/install/はインストール先として `~/.claude/skills/` の相対表記のみ使用）
4. **.env系ファイルの混入**: git status / archive内 → **0件**（.gitignoreで多層防御済み）

## 判定

**PASS** — 公開ブロッカーとなる秘密情報・個人情報は検出されなかった。
再スキャン手順: 本ファイル記載の4パターンを `grep -rn` で再実行（公開直前にも実施すること）。
