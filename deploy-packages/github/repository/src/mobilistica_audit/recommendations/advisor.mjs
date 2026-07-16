// recommendations/advisor.mjs — pure function, browser-compatible.
// Attaches platform_advice{wordpress?,woocommerce?,shopify?,generic} and
// term("immediate"|"short"|"mid") to a finalized Finding. platform_advice
// is category-level guidance (not per-issue-id-specific) combined with the
// finding's own title, kept intentionally generic where the platform
// cannot be confirmed rather than asserting unverified file paths.

const CATEGORY_HINTS = {
  performance: {
    wordpress: 'WP Rocket / LiteSpeed Cache等のキャッシュ・最適化プラグイン設定を見直してください。',
    woocommerce: 'WooCommerceのカート/ミニカート断片キャッシュ設定（AJAX fragments）が競合していないか確認してください。',
    shopify: 'テーマのapp block数を見直し、不要なShopify Appのアンインストールを検討してください。',
  },
  images: {
    wordpress: 'メディアライブラリの画像最適化プラグイン（EWWW Image Optimizer等）の導入・再圧縮を検討してください。',
    woocommerce: '商品画像アップロード時の自動リサイズ設定（WooCommerce > 設定 > 商品画像サイズ）を確認してください。',
    shopify: 'Shopifyの画像CDN（cdn.shopify.com経由の自動WebP変換）が有効か確認してください。',
  },
  javascript_css: {
    wordpress: 'プラグイン管理画面から未使用プラグインを無効化し、Asset CleanUp等でページ別に読み込みJS/CSSを制御してください。',
    woocommerce: 'チェックアウト以外のページでWooCommerceのJS/CSSを読み込まない設定（Asset CleanUp等）を検討してください。',
    shopify: 'テーマカスタマイズで未使用アプリのscriptタグ埋め込みを削除してください。',
  },
  fonts: {
    wordpress: 'テーマのカスタマイザーでGoogle Fontsの読み込み方法（ローカルホスティング化プラグイン等）を確認してください。',
    generic: 'フォントファイルを自社サーバーやCDNでセルフホストすることで外部接続数を減らせます。',
  },
  delivery: {
    wordpress: 'サーバーパネル（Xserver/ConoHa WING等）のキャッシュ・Brotli圧縮設定を確認してください。',
    shopify: 'Shopifyは標準でCDN配信されますが、カスタムドメインのCache-Control設定に問題がないか確認してください。',
  },
  mobile_ux: {
    wordpress: 'テーマのビジュアルエディタ（フルサイト編集/ページビルダー）でモバイルプレビューを使い実機に近い状態を確認してください。',
    woocommerce: 'カートに追加ボタン・数量セレクタのタップ領域をテーマのCSSで調整してください。',
    shopify: 'テーマエディタのモバイルプレビューでCTAボタンの重なりを確認してください。',
  },
  commerce_ux: {
    wordpress: 'ページビルダー（Elementor等）の商品詳細テンプレートでCTA位置・価格表示を確認してください。',
    woocommerce: 'WooCommerceの商品詳細テンプレート（single-product.php）のカスタマイズ状況を確認してください。',
    shopify: 'product.liquidテンプレートでカートボタン・価格表示のマークアップを確認してください。',
  },
  technical_seo: {
    wordpress: 'Rank Math / Yoast SEO等のSEOプラグイン設定（noindex・OGP・構造化データ）を確認してください。',
    woocommerce: 'WooCommerce商品ページのSEOプラグイン連携（Product schema自動出力設定）を確認してください。',
    shopify: 'テーマのtheme.liquidでOGP/構造化データの出力状況を確認してください。',
  },
  security_headers: {
    wordpress: 'サーバーの.htaccessまたはmu-pluginでセキュリティヘッダーを追加できます（本番反映は必ずバックアップ後に）。',
    generic: 'サーバー/CDN（Cloudflare等）側でセキュリティヘッダーを一括設定できないか確認してください。',
  },
  third_party: {
    wordpress: 'Google Tag Manager経由でタグを一元管理し、不要なタグを整理してください。',
    generic: 'タグマネージャーの導入タグを棚卸しし、重複・未使用タグを削除してください。',
  },
};

export function buildPlatformAdvice(finding, platform) {
  const hints = CATEGORY_HINTS[finding.category] || {};
  const advice = { generic: finding.recommended_fix };
  if (hints.wordpress) advice.wordpress = hints.wordpress;
  if (hints.woocommerce) advice.woocommerce = hints.woocommerce;
  if (hints.shopify) advice.shopify = hints.shopify;
  if (hints.generic) advice.generic = `${advice.generic} ${hints.generic}`;

  // Surface only the advice relevant to the confirmed/likely platform plus
  // generic, to avoid noise — but keep all category hints available since
  // "confidence: estimated" platform detection can still be useful context.
  if (platform && platform.detected && platform.confidence === 'confirmed') {
    const relevant = { generic: advice.generic };
    if (platform.detected === 'wordpress' && advice.wordpress) relevant.wordpress = advice.wordpress;
    if (platform.detected === 'woocommerce') {
      if (advice.wordpress) relevant.wordpress = advice.wordpress;
      if (advice.woocommerce) relevant.woocommerce = advice.woocommerce;
    }
    if (platform.detected === 'shopify' && advice.shopify) relevant.shopify = advice.shopify;
    return relevant;
  }

  return advice;
}

export function deriveTerm(priority) {
  if (priority === 'P0' || priority === 'P1') return 'immediate';
  if (priority === 'P2') return 'short';
  return 'mid';
}

/**
 * @param {object} finalizedFinding Finding with `priority`, `category`, `recommended_fix` already set.
 * @param {{detected:string, confidence:string, evidence:string[]}} platform
 */
export function attachAdvice(finalizedFinding, platform) {
  return {
    ...finalizedFinding,
    platform_advice: buildPlatformAdvice(finalizedFinding, platform),
    term: deriveTerm(finalizedFinding.priority),
  };
}
