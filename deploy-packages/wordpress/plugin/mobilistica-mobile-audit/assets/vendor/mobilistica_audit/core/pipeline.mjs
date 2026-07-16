// core/pipeline.mjs — pure function, browser-compatible (no `node:`
// imports). The single point where all analyzer output is combined into an
// AuditResult. Both core/engine.mjs (Node) and core/engine.browser.mjs
// (browser) call analyzeCollected() with whatever they managed to collect —
// this is what guarantees Web/CLI/skill judgement logic never diverges.

import * as performanceAnalyzer from '../analyzers/performance.mjs';
import * as imagesAnalyzer from '../analyzers/images.mjs';
import * as javascriptCssAnalyzer from '../analyzers/javascript_css.mjs';
import * as fontsAnalyzer from '../analyzers/fonts.mjs';
import * as deliveryAnalyzer from '../analyzers/delivery.mjs';
import * as mobileUxAnalyzer from '../analyzers/mobile_ux.mjs';
import * as commerceUxAnalyzer from '../analyzers/commerce_ux.mjs';
import * as technicalSeoAnalyzer from '../analyzers/technical_seo.mjs';
import * as securityHeadersAnalyzer from '../analyzers/security_headers.mjs';
import * as thirdPartyAnalyzer from '../analyzers/third_party.mjs';
import { detectPlatform } from '../analyzers/commerce_ux.mjs';
import { hasHtml, htmlBody, findScriptSrcs, findLinkTags, findImgTags } from '../analyzers/_shared.mjs';
import { derivePriority, deriveEstimatedEffort } from '../scoring/priority.mjs';
import { computeMobileCommerceScore, computeCwvCategoryScore } from '../scoring/mobile_commerce_score.mjs';
import { attachAdvice } from '../recommendations/advisor.mjs';

const ANALYZERS = {
  performance: performanceAnalyzer,
  images: imagesAnalyzer,
  javascript_css: javascriptCssAnalyzer,
  fonts: fontsAnalyzer,
  delivery: deliveryAnalyzer,
  mobile_ux: mobileUxAnalyzer,
  commerce_ux: commerceUxAnalyzer,
  technical_seo: technicalSeoAnalyzer,
  security_headers: securityHeadersAnalyzer,
  third_party: thirdPartyAnalyzer,
};

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4'];

/**
 * @param {object} collected
 *   {psi?, html?, headers?, lighthouse?, robots?, target_url, final_url, strategy}
 * @returns {object} AuditResult (see docs/specs/core-engine-spec.md)
 */
export function analyzeCollected(collected = {}) {
  const target_url = collected.target_url;
  const final_url = collected.final_url || (collected.html && collected.html.finalUrl) || target_url;
  const strategy = collected.strategy || 'mobile';

  const platform = detectPlatform(collected);

  const analyzerResults = {};
  for (const [key, mod] of Object.entries(ANALYZERS)) {
    analyzerResults[key] = key === 'commerce_ux' ? mod.analyze(collected, platform) : mod.analyze(collected);
  }

  let recommendations = [];
  for (const [categoryKey, result] of Object.entries(analyzerResults)) {
    for (const draft of result.findings) {
      recommendations.push(finalizeFinding(draft, categoryKey));
    }
  }
  recommendations = recommendations.map((f) => attachAdvice(f, platform));
  recommendations.sort(byPrioritySalesImpact);

  const coreWebVitals = performanceAnalyzer.buildCoreWebVitals(collected);

  const categoryScores = {
    cwv: computeCwvCategoryScore(coreWebVitals),
    performance: numOrNull(analyzerResults.performance.metrics.score),
    commerce_ux: numOrNull(analyzerResults.commerce_ux.metrics.score),
    mobile_ux: numOrNull(analyzerResults.mobile_ux.metrics.score),
    technical_seo: numOrNull(analyzerResults.technical_seo.metrics.score),
  };
  const scoreResult = computeMobileCommerceScore(categoryScores);

  const dataSources = buildDataSources(collected);
  const resources = buildResources(collected, analyzerResults);
  const limitations = buildLimitations(collected, analyzerResults, scoreResult, dataSources);

  const auditResult = {
    audit_id: generateAuditId(),
    target_url,
    final_url,
    audited_at: new Date().toISOString(),
    strategy,
    platform,
    data_sources: dataSources,
    data_status: dataSources.length > 0 ? 'ok' : 'partial',
    mobile_score: scoreResult.score,
    performance: analyzerResults.performance.metrics,
    core_web_vitals: coreWebVitals,
    resources,
    images: analyzerResults.images.metrics,
    javascript: analyzerResults.javascript_css.metrics.javascript,
    css: analyzerResults.javascript_css.metrics.css,
    fonts: analyzerResults.fonts.metrics,
    third_party: analyzerResults.third_party.metrics,
    mobile_ux: analyzerResults.mobile_ux.metrics,
    commerce_ux: analyzerResults.commerce_ux.metrics,
    technical_seo: analyzerResults.technical_seo.metrics,
    security: buildSecurity(analyzerResults),
    recommendations,
    summary: buildSummary(recommendations, scoreResult, target_url),
    limitations,
  };

  return auditResult;
}

function finalizeFinding(draft, categoryKey) {
  const priority = derivePriority(draft.scores, { p0: Boolean(draft.p0) });
  const estimated_effort = deriveEstimatedEffort(draft.scores);
  return {
    issue_id: draft.issue_id,
    category: categoryKey,
    priority,
    title: draft.title,
    evidence: draft.evidence,
    business_impact: draft.business_impact,
    recommended_fix: draft.recommended_fix,
    implementation_owner: draft.implementation_owner,
    estimated_effort,
    confidence: draft.confidence,
    automatic_fix_possible: draft.automatic_fix_possible,
    scores: draft.scores,
  };
}

function byPrioritySalesImpact(a, b) {
  const pa = PRIORITY_ORDER.indexOf(a.priority);
  const pb = PRIORITY_ORDER.indexOf(b.priority);
  if (pa !== pb) return pa - pb;
  return (b.scores.sales_impact || 0) - (a.scores.sales_impact || 0);
}

function numOrNull(v) {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

function buildDataSources(collected) {
  const sources = [];
  if (collected.psi && collected.psi.ok) sources.push('psi_api');
  if (collected.lighthouse && collected.lighthouse.ok) sources.push('lighthouse_local');
  if (collected.html && collected.html.ok) sources.push('html_fallback');
  return sources;
}

function buildSecurity(analyzerResults) {
  return {
    ...analyzerResults.security_headers.metrics,
    delivery: analyzerResults.delivery.metrics,
  };
}

function buildResources(collected, analyzerResults) {
  const delivery = analyzerResults.delivery.metrics;
  const resources = {
    source: hasHtml(collected) ? 'html_fallback' : 'unavailable',
    total_scripts: null,
    total_stylesheets: null,
    total_images: null,
    cache_control: delivery.cache_control,
    cache_control_present: delivery.cache_control_present,
    cdn_detected: delivery.cdn_detected,
    cdn_provider: delivery.cdn_provider,
    content_encoding: delivery.content_encoding,
    http_protocol_modern: delivery.http_protocol_modern,
    redirect_hop_count: delivery.redirect_hop_count,
    redirect_chain: delivery.redirect_chain,
  };

  if (hasHtml(collected)) {
    const body = htmlBody(collected);
    resources.total_scripts = findScriptSrcs(body).length;
    resources.total_stylesheets = findLinkTags(body).filter((l) => l.rel === 'stylesheet').length;
    resources.total_images = findImgTags(body).length;
  }

  return resources;
}

function buildLimitations(collected, analyzerResults, scoreResult, dataSources) {
  const limitations = [];

  if (dataSources.length === 0) {
    limitations.push('データ取得元（PSI API・Lighthouse・HTML簡易取得）がすべて失敗したため、診断結果は生成できていません。');
  }
  if (!dataSources.includes('psi_api')) {
    limitations.push('PageSpeed Insights APIの結果が取得できなかったため、Core Web Vitalsの一部・PSI由来の詳細監査（未使用JS/CSS等）は評価対象外です。');
  }
  if (!dataSources.includes('lighthouse_local')) {
    limitations.push('ローカルLighthouseは未使用（未導入または任意スキップ）です。');
  }
  if (!dataSources.includes('html_fallback')) {
    limitations.push('対象ページのHTML簡易取得ができなかったため、HTMLベースの推定項目（画像/JS/フォント/モバイルUX/商流UXの一部）は評価対象外です。');
  }

  if (scoreResult.missing && scoreResult.missing.length > 0) {
    limitations.push(`総合スコアの算出において以下の軸はデータ欠損のため分母から除外しています: ${scoreResult.missing.join(', ')}`);
  }

  if (analyzerResults.mobile_ux.metrics.fixed_element_detected || analyzerResults.mobile_ux.metrics.interstitial_detected) {
    limitations.push('固定要素・ポップアップの実表示上の重なりはHTML静的解析による(推定)であり、実際のブラウザ描画（スクロール距離実測等）は確認していません。');
  }
  if (analyzerResults.commerce_ux.metrics.cta_distance_estimate) {
    limitations.push('CTAボタンと商品画像の距離はHTML内の文字数に基づく(推定)であり、実際の画面上の距離とは異なる場合があります。');
  }

  return limitations;
}

function buildSummary(recommendations, scoreResult, target_url) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const f of recommendations) counts[f.priority] = (counts[f.priority] || 0) + 1;

  const top_issues = recommendations.slice(0, 5).map((f) => ({
    issue_id: f.issue_id,
    title: f.title,
    priority: f.priority,
    category: f.category,
  }));

  const scoreText = typeof scoreResult.score === 'number' ? `${scoreResult.score}点（${scoreResult.grade}評価）` : 'データ不足のため算出不可';
  const parts = [`${target_url || '対象サイト'}のモバイルEC診断結果: 総合スコアは${scoreText}です。`];
  if (counts.P0 > 0) {
    parts.push(`購入不能級の重大課題（P0）が${counts.P0}件検出されており、最優先での対応を推奨します。`);
  }
  if (counts.P1 > 0) {
    parts.push(`売上への影響が大きい課題（P1）が${counts.P1}件あります。`);
  }
  if (counts.P0 === 0 && counts.P1 === 0) {
    parts.push('購入導線を直接阻害する重大な課題は検出されていませんが、改善余地のある項目を優先度順に記載しています。');
  }

  return {
    overall_score: scoreResult.score,
    grade: scoreResult.grade,
    top_issues,
    executive_summary_ja: parts.join(' '),
  };
}

/** "ma_"+epoch(ms)+8-hex-char random suffix, per spec. */
export function generateAuditId() {
  const epoch = Date.now();
  const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `ma_${epoch}${hex}`;
}
