// tests/pipeline.test.mjs
// core/pipeline.mjs analyzeCollected() — fixture入力からのAuditResult/Finding形状検証、
// platform検出、commerce_uxページ種別判定。ネットワーク不使用（HTML/PSIはfixture直読み）。

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeCollected } from '../src/mobilistica_audit/core/pipeline.mjs';
import { normalizePsi } from '../src/mobilistica_audit/collectors/psi.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const CATEGORIES = [
  'performance',
  'images',
  'javascript_css',
  'fonts',
  'delivery',
  'mobile_ux',
  'commerce_ux',
  'technical_seo',
  'security_headers',
  'third_party',
];
const OWNERS = ['operator', 'designer', 'frontend', 'backend', 'server', 'seo'];
const EFFORTS = ['small', 'medium', 'large'];
const PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'];
const TERMS = ['immediate', 'short', 'mid'];

function loadFixtureText(name) {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}

function htmlCollected(fixtureName, url, extraHtml = {}) {
  return {
    target_url: url,
    final_url: url,
    strategy: 'mobile',
    html: {
      ok: true,
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      contentType: 'text/html; charset=utf-8',
      finalUrl: url,
      body: loadFixtureText(fixtureName),
      truncated: false,
      headerOnly: false,
      redirect_chain: [],
      ...extraHtml,
    },
  };
}

function loadPsiCollected() {
  const raw = JSON.parse(loadFixtureText('psi-response-sample.json'));
  return { ok: true, strategy: 'mobile', raw, ...normalizePsi(raw) };
}

function assertValidAuditResult(r) {
  for (const key of [
    'audit_id',
    'target_url',
    'final_url',
    'audited_at',
    'strategy',
    'platform',
    'data_sources',
    'mobile_score',
    'performance',
    'core_web_vitals',
    'resources',
    'images',
    'javascript',
    'css',
    'fonts',
    'third_party',
    'mobile_ux',
    'commerce_ux',
    'technical_seo',
    'security',
    'recommendations',
    'summary',
    'limitations',
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(r, key), `AuditResult missing key: ${key}`);
  }
  assert.match(r.audit_id, /^ma_\d+[0-9a-f]{8}$/);
  assert.ok(Array.isArray(r.data_sources));
  assert.ok(Array.isArray(r.recommendations));
  assert.ok(Array.isArray(r.limitations));
  assert.ok(['confirmed', 'estimated'].includes(r.platform.confidence));
  assert.ok(['wordpress', 'woocommerce', 'shopify', 'other', 'unknown'].includes(r.platform.detected));
}

function assertValidFinding(f) {
  assert.equal(typeof f.issue_id, 'string');
  assert.ok(CATEGORIES.includes(f.category), `unexpected category: ${f.category}`);
  assert.ok(PRIORITIES.includes(f.priority), `unexpected priority: ${f.priority}`);
  assert.equal(typeof f.title, 'string');
  assert.ok(f.title.length > 0);
  assert.ok(Array.isArray(f.evidence));
  assert.ok(f.evidence.length >= 1, `finding ${f.issue_id} has no evidence`);
  assert.equal(typeof f.business_impact, 'string');
  assert.ok(f.business_impact.length > 0);
  assert.equal(typeof f.recommended_fix, 'string');
  assert.ok(f.recommended_fix.length > 0);
  assert.ok(OWNERS.includes(f.implementation_owner), `unexpected owner: ${f.implementation_owner}`);
  assert.ok(EFFORTS.includes(f.estimated_effort), `unexpected effort: ${f.estimated_effort}`);
  assert.equal(typeof f.confidence, 'number');
  assert.ok(f.confidence >= 0 && f.confidence <= 100);
  assert.equal(typeof f.automatic_fix_possible, 'boolean');
  assert.equal(typeof f.scores, 'object');
  for (const axis of ['sales_impact', 'mobile_ux_impact', 'seo_impact', 'cwv_impact', 'difficulty', 'cost', 'certainty']) {
    assert.equal(typeof f.scores[axis], 'number', `finding ${f.issue_id} scores.${axis} missing`);
    assert.ok(f.scores[axis] >= 0 && f.scores[axis] <= 5);
  }
  assert.equal(typeof f.platform_advice, 'object');
  assert.equal(typeof f.platform_advice.generic, 'string');
  assert.ok(TERMS.includes(f.term), `unexpected term: ${f.term}`);
}

describe('analyzeCollected — normal.html（健全なページ）', () => {
  const result = analyzeCollected(htmlCollected('normal.html', 'https://example.mobilistica-test.com/normal'));

  test('AuditResultの必須フィールドが揃っている', () => {
    assertValidAuditResult(result);
  });

  test('全Findingがスキーマ準拠', () => {
    for (const f of result.recommendations) assertValidFinding(f);
  });

  test('data_sourcesにhtml_fallbackが含まれる', () => {
    assert.ok(result.data_sources.includes('html_fallback'));
  });

  test('viewportがあるためP0（no-viewport）は出ない', () => {
    assert.ok(!result.recommendations.some((f) => f.issue_id === 'mux-no-viewport'));
  });
});

describe('analyzeCollected — slow-heavy-images.html（viewport欠如など）', () => {
  const result = analyzeCollected(htmlCollected('slow-heavy-images.html', 'https://example.mobilistica-test.com/heavy'));

  test('viewport欠如によりP0 findingが出る', () => {
    const p0 = result.recommendations.find((f) => f.issue_id === 'mux-no-viewport');
    assert.ok(p0, 'expected mux-no-viewport finding');
    assert.equal(p0.priority, 'P0');
  });

  test('summary.top_issuesの先頭はP0（優先度ソート）', () => {
    assert.equal(result.summary.top_issues[0].priority, 'P0');
  });

  test('全Findingがスキーマ準拠', () => {
    for (const f of result.recommendations) assertValidFinding(f);
  });

  test('複数H1が検出される', () => {
    assert.equal(result.technical_seo.h1_count, 2);
  });

  test('固定要素・ポップアップの推定findingがlimitationsに反映される', () => {
    assert.ok(result.limitations.some((l) => l.includes('(推定)') || l.includes('推定')));
  });
});

describe('analyzeCollected — product-page.html（WooCommerce商品詳細）', () => {
  const result = analyzeCollected(htmlCollected('product-page.html', 'https://shop.mobilistica-test.com/product/cotton-apron/'));

  test('platformがwoocommerce・confirmedと判定される', () => {
    assert.equal(result.platform.detected, 'woocommerce');
    assert.equal(result.platform.confidence, 'confirmed');
  });

  test('commerce_uxのpage_typeがproduct_detail', () => {
    assert.equal(result.commerce_ux.page_type, 'product_detail');
  });

  test('価格・カートボタン・Product Schema・パンくず・信頼要素をすべて検出', () => {
    assert.equal(result.commerce_ux.price_detected, true);
    assert.equal(result.commerce_ux.cart_button_detected, true);
    assert.equal(result.commerce_ux.product_schema_detected, true);
    assert.equal(result.commerce_ux.breadcrumb_detected, true);
    assert.equal(result.commerce_ux.trust_signals_detected, true);
  });

  test('揃っているため cux-no-* findingは出ない', () => {
    const cuxNegatives = result.recommendations.filter((f) => f.category === 'commerce_ux' && f.issue_id.startsWith('cux-no-'));
    assert.deepEqual(cuxNegatives, []);
  });

  test('全Findingがスキーマ準拠', () => {
    for (const f of result.recommendations) assertValidFinding(f);
  });
});

describe('analyzeCollected — top page (path "/") のページ種別判定', () => {
  const result = analyzeCollected(htmlCollected('normal.html', 'https://example.mobilistica-test.com/'));

  test('page_typeがtopと判定される', () => {
    assert.equal(result.commerce_ux.page_type, 'top');
  });
});

describe('analyzeCollected — PSIデータ併用時のCore Web Vitals/Findings', () => {
  const collected = htmlCollected('product-page.html', 'https://shop.mobilistica-test.com/product/cotton-apron/');
  collected.psi = loadPsiCollected();
  const result = analyzeCollected(collected);

  test('data_sourcesにpsi_apiが含まれる', () => {
    assert.ok(result.data_sources.includes('psi_api'));
  });

  test('LCP実測4200msはpoor評価', () => {
    assert.equal(result.core_web_vitals.lcp_ms.value, 4200);
    assert.equal(result.core_web_vitals.lcp_ms.rating, 'poor');
  });

  test('performance.scoreはPSI categories.performance(0.42)由来で42', () => {
    assert.equal(result.performance.score, 42);
  });

  test('LCP遅延・LCP画像lazy・未使用JS等のfindingsが検出される', () => {
    const ids = result.recommendations.map((f) => f.issue_id);
    assert.ok(ids.includes('perf-lcp-slow'));
    assert.ok(ids.includes('img-lcp-lazy-loaded'));
    assert.ok(ids.includes('perf-unused-js'));
  });

  test('全Findingがスキーマ準拠', () => {
    for (const f of result.recommendations) assertValidFinding(f);
  });

  test('mobile_scoreが数値で算出される', () => {
    assert.equal(typeof result.mobile_score, 'number');
    assert.ok(result.mobile_score >= 0 && result.mobile_score <= 100);
  });
});

describe('analyzeCollected — データ欠損時でも例外を投げない', () => {
  test('htmlもpsiも無い最小のcollectedでも例外なく完走する', () => {
    const result = analyzeCollected({ target_url: 'https://example.mobilistica-test.com/', final_url: 'https://example.mobilistica-test.com/', strategy: 'mobile' });
    assertValidAuditResult(result);
    assert.equal(result.mobile_score, null);
    assert.deepEqual(result.data_sources, []);
  });
});

// 回帰テスト(2026-07-17): 本文テキストが「WooCommerce」に言及するだけの解説記事を
// woocommerce(confirmed)と誤検出しない（実サイト診断post-635で発生した実バグ）
test('platform detection is not fooled by article text mentioning WooCommerce', () => {
  const html = '<html><body class="post-template">' +
    '<link rel="stylesheet" href="/wp-content/themes/x/style.css">' +
    '<p>WooCommerceやShopifyの表示速度を改善する方法を解説します。woocommerceの設定は…</p>' +
    '</body></html>';
  const result = analyzeCollected({ html: { ok: true, body: html, headers: {}, status: 200 }, target_url: 'https://example.com/a/', final_url: 'https://example.com/a/', strategy: 'mobile' });
  assert.equal(result.platform.detected, 'wordpress');
});

test('platform detection confirms woocommerce via structural markers', () => {
  const html = '<html><body class="woocommerce-page">' +
    '<script src="/wp-content/plugins/woocommerce/assets/js/frontend/cart-fragments.min.js"></script>' +
    '</body></html>';
  const result = analyzeCollected({ html: { ok: true, body: html, headers: {}, status: 200 }, target_url: 'https://example.com/shop/', final_url: 'https://example.com/shop/', strategy: 'mobile' });
  assert.equal(result.platform.detected, 'woocommerce');
});
