// analyzers/commerce_ux.mjs — pure function, browser-compatible.
// Page-type classification (top/category/product_list/product_detail/
// cart/checkout/article) + product_detail-specific commerce checks (price,
// cart button, Product schema, reviews, breadcrumb, image count, trust
// copy). Also exports detectPlatform(), used by pipeline.mjs for the
// top-level `platform{}` field since the markers overlap with commerce
// detection (WooCommerce/Shopify).
//
// Items that require real browser rendering (e.g. actual on-screen
// distance from image to CTA) are heuristic string-distance approximations
// only, always confidence-capped and reported as "(推定)" per spec.

import { finding, hasHtml, htmlBody, getMetaProperty, countOccurrences, findImgTags } from './_shared.mjs';

const TRUST_KEYWORDS = [/送料/, /返品/, /返金/, /支払い方法/, /決済方法/, /shipping/i, /return policy/i, /money[- ]back/i, /secure checkout/i, /payment method/i];

export function detectPlatform(collected) {
  if (!hasHtml(collected)) {
    return { detected: 'unknown', confidence: 'estimated', evidence: [] };
  }
  const body = htmlBody(collected);
  const evidence = [];

  if (/wp-content\//i.test(body)) {
    evidence.push('wp-content/ パスを検出');
    // 構造マーカーのみで判定する（本文テキストが「WooCommerce」に言及しているだけの
    // 解説記事を誤検出しないため。実サイト診断で誤confirmedになった実例あり 2026-07-17）:
    // プラグインアセットパス / body・要素クラス / WooCommerce固有のcart fragmentsスクリプトに限定。
    const wooStructural =
      /wp-content\/plugins\/woocommerce\//i.test(body) ||
      /class=["'][^"']*\bwoocommerce(-page|-cart|-checkout)?\b/i.test(body) ||
      /wc-ajax|wc_cart_fragments|woocommerce_params/i.test(body);
    if (wooStructural) {
      evidence.push('WooCommerce構造マーカー（プラグインアセット/クラス/cart fragments）を検出');
      return { detected: 'woocommerce', confidence: 'confirmed', evidence };
    }
    return { detected: 'wordpress', confidence: 'confirmed', evidence };
  }

  if (/cdn\.shopify\.com/i.test(body) || /Shopify\.theme/i.test(body) || /shopify-section/i.test(body)) {
    evidence.push('cdn.shopify.com / Shopify.theme / shopify-section を検出');
    return { detected: 'shopify', confidence: 'confirmed', evidence };
  }

  if (/add-to-cart|add_to_cart|class=["'][^"']*\bcart\b/i.test(body)) {
    evidence.push('カート系マーカーを検出（プラットフォーム断定不可）');
    return { detected: 'other', confidence: 'estimated', evidence };
  }

  return { detected: 'unknown', confidence: 'estimated', evidence };
}

export function detectPageType(collected, body) {
  const url = String(collected?.final_url || collected?.target_url || '').toLowerCase();
  let path = '';
  try {
    path = new URL(url).pathname;
  } catch {
    path = url;
  }

  const ogType = getMetaProperty(body, 'og:type');

  if (/\/(cart|basket)(\/|$|\?)/.test(path)) return 'cart';
  if (/\/(checkout)(\/|$|\?)/.test(path)) return 'checkout';
  if (ogType === 'product' || /"@type"\s*:\s*"Product"/.test(body)) return 'product_detail';

  const productCardCount = countOccurrences(body, /class=["'][^"']*\bproduct(-|_)?(card|item|thumb|grid-item)\b/i);
  const addToCartCount = countOccurrences(body, /add-to-cart|add_to_cart/i);
  if (productCardCount >= 4 || (addToCartCount >= 3 && productCardCount >= 2)) return 'product_list';
  if (/\/(category|shop|collections?|products?)(\/|$|\?)/.test(path)) return 'category';
  if (ogType === 'article' || /<article\b/i.test(body)) return 'article';
  if (path === '' || path === '/') return 'top';
  return 'unknown';
}

export function analyze(collected, platform) {
  const findings = [];
  const resolvedPlatform = platform || detectPlatform(collected);

  const metrics = {
    source: hasHtml(collected) ? 'html_fallback' : 'unavailable',
    page_type: null,
    price_detected: null,
    cart_button_detected: null,
    product_schema_detected: null,
    review_schema_detected: null,
    breadcrumb_detected: null,
    product_image_count: null,
    trust_signals_detected: null,
    cta_distance_estimate: null,
    score: null,
  };

  if (!hasHtml(collected)) {
    return { metrics, findings };
  }

  const body = htmlBody(collected);
  const pageType = detectPageType(collected, body);
  metrics.page_type = pageType;

  metrics.trust_signals_detected = TRUST_KEYWORDS.some((re) => re.test(body));
  metrics.breadcrumb_detected = /"@type"\s*:\s*"BreadcrumbList"/.test(body) || /class=["'][^"']*\bbreadcrumbs?\b/i.test(body);

  if (pageType === 'product_detail') {
    const priceMatch = body.match(/[¥$]\s?[\d,]+|[\d,]+\s?円|class=["'][^"']*\bprice\b[^"']*["']/i);
    metrics.price_detected = Boolean(priceMatch);

    // Base cart-button phrasing plus platform-specific markup patterns:
    // WooCommerce uses name="add-to-cart" on its submit input, Shopify
    // themes commonly render a form[action*="/cart/add"].
    const cartTextMatch = /カートに入れる|カートへ追加|add to cart|add-to-cart|購入する|buy now/i.test(body);
    const cartPatternMatch =
      /\?add-to-cart=/i.test(body) ||
      /name=["']add-to-cart["']/i.test(body) ||
      (resolvedPlatform.detected === 'shopify' && /\/cart\/add/i.test(body));
    metrics.cart_button_detected = cartTextMatch || cartPatternMatch;
    const cartBtnMatch = cartTextMatch ? body.match(/カートに入れる|カートへ追加|add to cart|add-to-cart|購入する|buy now/i) : null;

    metrics.product_schema_detected = /"@type"\s*:\s*"Product"/.test(body);
    metrics.review_schema_detected = /"@type"\s*:\s*"(Review|AggregateRating)"/.test(body);

    const imgs = findImgTags(body);
    metrics.product_image_count = imgs.filter((i) => /product|item|gallery/i.test(i.tag)).length || imgs.length;

    if (cartBtnMatch && imgs.length > 0) {
      const cartIdx = body.search(/カートに入れる|カートへ追加|add to cart|add-to-cart|購入する|buy now/i);
      const firstImgIdx = body.indexOf(imgs[0].tag);
      if (cartIdx >= 0 && firstImgIdx >= 0) {
        const charDistance = Math.abs(cartIdx - firstImgIdx);
        // Rough bucket: <2000 chars ≈ same viewport, >6000 ≈ requires scrolling.
        metrics.cta_distance_estimate = charDistance < 2000 ? 'near' : charDistance < 6000 ? 'moderate' : 'far';
      }
    }

    if (!metrics.cart_button_detected) {
      findings.push(
        finding({
          id: 'cux-no-cart-button',
          title: '商品詳細ページにカート追加/購入ボタンの記述を検出できない',
          evidence: ['「カートに入れる」「add to cart」等の文言・要素を検出できず（HTML簡易走査）'],
          business_impact: '購入導線の入口となるCTAが存在しない、またはJS描画依存で初期HTMLに含まれない場合、購入完了率に直接影響します。',
          recommended_fix: '実機でカート追加ボタンの表示・動作を確認してください。JS描画に依存している場合は、SSR/静的HTML内にもボタンマークアップを含める設計を検討してください。',
          implementation_owner: 'frontend',
          confidence: 40,
          axisScores: { sales_impact: 5, cwv_impact: 0, mobile_ux_impact: 3, seo_impact: 1, difficulty: 3, cost: 2, certainty: 2 },
        }),
      );
    }

    if (!metrics.price_detected) {
      findings.push(
        finding({
          id: 'cux-no-price',
          title: '商品詳細ページに価格表示の記述を検出できない',
          evidence: ['価格らしき文字列（¥/円/$ + 数字、price系クラス）を検出できず（HTML簡易走査）'],
          business_impact: '価格が不明瞭だとカゴ落ち・離脱の直接要因になります。JS描画依存の場合は初期表示で価格が見えない可能性があります。',
          recommended_fix: '実機で価格表示を確認してください。',
          implementation_owner: 'frontend',
          confidence: 35,
          axisScores: { sales_impact: 4, cwv_impact: 0, mobile_ux_impact: 2, seo_impact: 1, difficulty: 2, cost: 1, certainty: 1 },
        }),
      );
    }

    if (!metrics.product_schema_detected) {
      findings.push(
        finding({
          id: 'cux-no-product-schema',
          title: 'Product構造化データ（schema.org）が検出できない',
          evidence: ['JSON-LD等に"@type":"Product"を検出できず'],
          business_impact: '構造化データが無いと検索結果でのリッチリザルト（価格・在庫・評価の表示）機会を逃し、CTR低下につながります。',
          recommended_fix: 'Product/Offer/AggregateRatingのJSON-LDを商品詳細ページに実装してください。',
          implementation_owner: 'seo',
          confidence: 60,
          automatic_fix_possible: false,
          axisScores: { sales_impact: 2, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 4, difficulty: 2, cost: 1, certainty: 4 },
        }),
      );
    }

    if (metrics.cta_distance_estimate === 'far') {
      findings.push(
        finding({
          id: 'cux-cta-far-from-image',
          title: '商品画像からカートボタンまでの距離が遠い可能性（推定）',
          evidence: ['商品画像とカート系CTA文言のHTML内距離が大きく、スクロールが必要になっている可能性（文字数ベースの(推定)値・実表示未確認）'],
          business_impact: 'CTAに到達するまでのスクロール量が多いと、特にモバイルでは購入意欲が薄れる前に離脱しやすくなります。',
          recommended_fix: '実機でファーストビュー内にCTAが収まっているか確認し、レイアウトの見直しを検討してください。',
          implementation_owner: 'designer',
          confidence: 25,
          axisScores: { sales_impact: 2, cwv_impact: 0, mobile_ux_impact: 2, seo_impact: 0, difficulty: 2, cost: 2, certainty: 1 },
        }),
      );
    }
  }

  if ((pageType === 'product_detail' || pageType === 'product_list' || pageType === 'category') && !metrics.trust_signals_detected) {
    findings.push(
      finding({
        id: 'cux-no-trust-signals',
        title: '送料・返品・支払い方法などの信頼要素の記述が見当たらない',
        evidence: ['送料/返品/支払い方法に関する語句を検出できず（HTML簡易走査）'],
        business_impact: '初めての購入者は送料・返品条件・決済手段が不明だと不安を感じ、購入をためらう傾向があります。',
        recommended_fix: '商品ページまたはサイト共通のフッター/購入直前エリアに送料・返品・支払い方法の明記を追加してください。',
        implementation_owner: 'operator',
        confidence: 40,
        axisScores: { sales_impact: 3, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 0, difficulty: 1, cost: 1, certainty: 2 },
      }),
    );
  }

  if (pageType === 'product_detail' && !metrics.breadcrumb_detected) {
    findings.push(
      finding({
        id: 'cux-no-breadcrumb',
        title: 'パンくずリストが検出できない',
        evidence: ['BreadcrumbList構造化データ・breadcrumbクラスを検出できず'],
        business_impact: 'パンくずが無いと回遊性が下がり、関連商品への導線・カテゴリー再訪が減る可能性があります。SEO面でもサイト構造の伝達が弱まります。',
        recommended_fix: 'カテゴリー > 商品名のパンくずリストを実装し、BreadcrumbList構造化データも付与してください。',
        implementation_owner: 'frontend',
        confidence: 55,
        axisScores: { sales_impact: 1, cwv_impact: 0, mobile_ux_impact: 1, seo_impact: 2, difficulty: 1, cost: 1, certainty: 3 },
      }),
    );
  }

  let score = 100;
  if (pageType === 'product_detail') {
    if (metrics.cart_button_detected === false) score -= 30;
    if (metrics.price_detected === false) score -= 25;
    if (metrics.product_schema_detected === false) score -= 15;
    if (metrics.breadcrumb_detected === false) score -= 10;
    if (metrics.cta_distance_estimate === 'far') score -= 10;
  }
  if (metrics.trust_signals_detected === false) score -= 15;
  metrics.score = Math.max(0, Math.min(100, score));

  return { metrics, findings };
}
