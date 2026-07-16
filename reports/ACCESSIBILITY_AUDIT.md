# ACCESSIBILITY AUDIT（Web診断UI・2026-07-17）

## 実装済み（コードレビュー＋実描画スクリーンショットで確認）

| 要件 | 実装 |
|---|---|
| キーボード操作 | フォーム/全ボタンはネイティブ要素（div疑似ボタンなし）・Tab順=DOM順 |
| focus表示 | `:focus-visible { outline: 3px solid }` 全対話要素 |
| aria | 結果/ローディング=aria-live="polite"・エラー=role="alert"・フォーム=aria-describedby/aria-required・表にcaption/scope |
| スクリーンリーダー | label紐付け（for/id）・状態変化はlive region経由・スケルトンはaria-hidden |
| 入力エラー | インライン表示（role=alert）・色のみに依存しない（文言併記） |
| ローディング/タイムアウト/再実行 | 90sタイムアウト・中止ボタン・エラーパネルに再実行ボタン |
| contrast | 本文#1a1a1a/#fff（>12:1）・アクセント#1d4ed8白抜き（>7:1）・muted#6b7280はサブ情報のみ（4.8:1） |
| reduced motion | `prefers-reduced-motion: reduce` で全アニメーション停止 |
| ブレークポイント | 375/390/430/768/1024/1440対応（390/1280は実スクリーンショット検証済み） |
| print | 印刷CSSでフォーム/操作UI非表示・結果のみ出力 |
| empty state | 診断前=フォームのみ・結果0件時もlimitations表示 |
| CLS抑制 | ローディングスケルトンが結果領域相当の高さを事前確保 |

## 制約（未実施・要ステージング）

- axe-core等の自動監査ツールは未実行（依存ゼロ方針のためCIに未組込。公開後の改善候補としてROADMAP記載）
- 実スクリーンリーダー（NVDA/VoiceOver）での読み上げ実機確認
- 実WordPressテーマ配下でのfocusスタイル競合確認

判定: **リリース可**（既知の制約はMANUAL_REVIEW_ITEMS.mdに転記済み）
