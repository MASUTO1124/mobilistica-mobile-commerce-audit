# ローンチ告知文（日本語）— Mobilistica Mobile Commerce Audit

> ブログ/長文告知用の下書き。未公開。

## タイトル案

1. 「モバイルECサイト診断ツールをオープンソース公開しました — スコアだけでは『何から直すか』は分からない」
2. 「Mobilistica Mobile Commerce Audit：無料・オープンソース。技術スコアを『売上影響』の言葉に翻訳する診断ツール」
3. 「PageSpeedスコアは62点。でもチェックアウトページの『カートに入れる』ボタンはモバイルで画面外——優先すべきはどちらか」

## 本文下書き

多くのモバイル速度診断ツールは「スコアを出す」ところで止まります。PageSpeed
Insightsを実行すると0〜100点のスコアと、「レンダリングを妨げるリソースの除去」
「次世代フォーマットでの画像配信」といった監査ルール名の羅列が返ってきますが、
そのうちどれがモバイル売上に本当に効いていて、どれが誤差レベルなのかは教えて
くれません。

私たちは、その隙間を埋めるツールとして**Mobilistica Mobile Commerce Audit**
を作り、本日オープンソースとして公開します。

### 一般的なPageSpeed診断との違い

単なるPageSpeedの見た目替えではありません。標準的なモバイル中心の技術診断
（Core Web Vitals・画像・JS/CSS・フォント・配信・セキュリティヘッダー・技術
SEO）に加えて、一般的なツールにはない2点を実装しています。

- **ページ種別・プラットフォームの認識。** トップページ・カテゴリー一覧・商品
  詳細・チェックアウトの各ステップを区別し、WordPress/WooCommerce・Shopify・
  その他の判定も行います。ブログ記事のLCP4秒と、カートに入れる直前のページの
  LCP4秒は、意味が違うからです。
- **リストではなく優先順位。** すべての指摘を7軸（売上影響・モバイルUX影響・
  SEO影響・CWV影響・難易度・コスト・確信度）でスコアリングし、P0〜P4の優先
  順位にまとめます。40個の監査ルールが順不同で並んでいるだけでは「何から直す
  か」の答えにならないためです。

各指摘は、生のLighthouse監査IDではなく、平易な売上影響の一文と具体的な推奨
修正に翻訳されます。

### 3つの使い方、中身は1つのエンジン

- 登録不要の**無料Web診断**: [mobilistica.com/tools/mobile-commerce-audit/](https://www.mobilistica.com/tools/mobile-commerce-audit/)
- スクリプト・CI・複数クライアントサイトの一括診断向けの**CLI**（`mobilistica-audit <url>`）
- コーディングセッション内で診断結果をそのまま活用できる**Claude Codeスキル**
  （開発者や開発エージェントに優先度付き修正指示をそのまま渡せます）

3形態すべてが同一の診断コア（`src/mobilistica_audit/core/pipeline.mjs`）を
呼び出しており、「Web版だけのロジック」が別に存在してズレることはありません。
スコアリングにバグがあれば、それはどこで使っても同じバグであり、修正もどこに
でも同じように反映されます。

### できないこと

順位や売上の向上を保証するものではありません。出力にも、この告知文にも、
そう読めるような表現は意図的に含めていません。ログイン・チェックアウト・
購入の自動操作は行いません。フィールドデータ（実ユーザーのCore Web Vitals・
CrUX）はまだ統合されておらず、現状の指標はラボデータであることを明示して
います。詳細は[READMEの「制限事項」](https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit#limitations)
を参照してください。

### なぜ公開するのか

Mobilisticaは、EC向けモバイルPageSpeedを専門に扱うサイトとして運営しており、
自社の診断のたびに同じ「振り分けロジック」を作り直していました。エンジンを
オープンソース化することで、判定ロジックを誰でも検証できるようにしています
——ある指摘がなぜP3ではなくP1になったのかが追える、という点は、エンジニア
リング工数の配分を左右するツールにとって重要だと考えています。

ライセンスはMITです。コントリビューション、バグ報告、「この優先順位判定は
おかしい、理由はこうだ」といったIssueも歓迎します。詳細は
[CONTRIBUTING.md](https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit/blob/main/CONTRIBUTING.md)
をご覧ください。

**試す:** `npm install -g mobilistica-mobile-commerce-audit && mobilistica-audit https://your-shop.com`

**リポジトリ:** https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit
**Web診断:** https://www.mobilistica.com/tools/mobile-commerce-audit/

---

## 禁止表現チェックリスト（自己検査済み）

以下を含まないことを確認済み:
「確実に順位が上がる」「GitHubリンクだけで上位表示」「売上が必ず増える」
「SEO効果を保証」「完全自動で成功」「すべてのECサイトに対応」「人間確認不要」

本文で行っている主張は、無料・オープンソース・ローカル実行可・技術指摘の
EC文脈への翻訳・優先順位付け・3形態同一エンジン、の事実ベースの範囲に
限定しています。自己検査済み。
