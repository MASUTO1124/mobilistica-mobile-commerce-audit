# package.json パッチ（cli担当分）

このリポジトリの `package.json` は core担当エージェントが作成する
（docs/specs/core-engine-spec.md「package.json（coreが作成）」節）。

cliエージェントの書き込み許可は `cli/` `tests/cli.test.mjs` `examples/*.md` のみで、
`package.json` へは **`bin` フィールドの追記のみ** 許可されている
（`docs/PROJECT_BRIEF.md`「ディレクトリ所有権」節）。

package.json がまだ存在しないため、本ファイルに追記すべき内容を記載する。
**coreエージェント、またはpackage.json作成後の担当者は、以下を `package.json` にマージしてください。**

## 追記するフィールド

```json
{
  "bin": {
    "mobilistica-audit": "cli/mobilistica-audit.mjs"
  }
}
```

## 補足

- エントリファイル `cli/mobilistica-audit.mjs` には `#!/usr/bin/env node` シェバンを実装済み。
- POSIX環境（Linux/Mac）で `npm link` / `npm install -g` した際に実行ビットが必要になる場合がある。
  `npm publish` / `npm link` は package.json の `bin` エントリに対して自動的に実行ビットを付与するため、
  通常は追加対応不要。ローカルでシェバン経由の直接実行（`./cli/mobilistica-audit.mjs`）を試す場合のみ、
  POSIX環境で `chmod +x cli/mobilistica-audit.mjs` が必要になることがある。
- 他フィールド（`name` / `type` / `engines` / `scripts` / `version` / `license` 等）はcore側の記載
  （docs/specs/core-engine-spec.md「package.json（coreが作成）」節）に従うため、本パッチはbin追記のみに限定する。
- 動作確認: `node cli/mobilistica-audit.mjs --help` は package.json の有無に関わらず動作する
  （cli/lib/help.mjs が package.json 不在時もクラッシュしないフォールバックを実装済み）。
