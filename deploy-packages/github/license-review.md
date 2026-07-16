# ライセンスレビュー（2026-07-17）

- **本体**: MIT License（LICENSE同梱・Copyright (c) 2026 Mobilistica / MASUTO Inc.）
- **ランタイム依存**: **ゼロ**（package.json dependencies空・Node標準モジュールのみ）→ 第三者ライセンス義務なし
- **devDependencies**: なし（ESLintはCI上で`npx eslint@9`を都度取得＝配布物に含まれない）
- **任意連携**: Lighthouse（Apache-2.0）はユーザーが自身の環境に任意インストールする外部ツールであり、本リポジトリは同梱・再配布しない（collectors/lighthouse_local.mjsは存在検出のみ）
- **PageSpeed Insights API**: Googleの利用規約に基づくAPI利用。キーはユーザー自身が取得。APIレスポンスの再配布はしない（診断結果はユーザーローカル保存のみ）
- **フォント・画像**: 同梱なし（レポートHTMLはsystem-uiフォントスタック）
- **コード出自**: 全ファイル本プロジェクトで新規作成。既存社内資産からのコード転用なし

## 判定

**PASS** — MIT単独で公開可能。NOTICE等の追加ファイル不要。
