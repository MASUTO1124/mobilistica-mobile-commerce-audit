// analyzers/performance.mjs — pure function, browser-compatible.
// Core Web Vitals rating table + performance-axis metrics (unused JS/CSS,
// render-blocking resources, main-thread work, dom size, long tasks,
// dependency-chain depth, server response time) from PSI audits.

import { finding, numericAudit, auditItems } from './_shared.mjs';

export const THRESHOLDS = Object.freeze({
  lcp_ms: { good: 2500, poor: 4000 },
  inp_ms: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  tbt_ms: { good: 200, poor: 600 },
  fcp_ms: { good: 1800, poor: 3000 },
  si_ms: { good: 3400, poor: 5800 },
  ttfb_ms: { good: 800, poor: 1800 },
});

/** @returns {'good'|'needs-improvement'|'poor'|null} */
export function rateWebVital(name, value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const t = THRESHOLDS[name];
  if (!t) return null;
  if (value <= t.good) return 'good';
  if (value > t.poor) return 'poor';
  return 'needs-improvement';
}

/** Builds the top-level `core_web_vitals` field for AuditResult. */
export function buildCoreWebVitals(collected) {
  const metrics = (collected && collected.psi && collected.psi.ok && collected.psi.metrics) || {};
  const out = {};
  for (const name of Object.keys(THRESHOLDS)) {
    const value = typeof metrics[name] === 'number' ? metrics[name] : null;
    out[name] = { value, rating: rateWebVital(name, value) };
  }
  return out;
}

export function analyze(collected) {
  const psi = collected && collected.psi;
  const audits = psi && psi.ok ? psi.audits : null;
  const categoryScore = psi && psi.ok && typeof psi.categories?.performance === 'number' ? psi.categories.performance : null;

  const cwv = buildCoreWebVitals(collected);
  const findings = [];

  const metrics = {
    score: categoryScore,
    unused_js_bytes: null,
    unused_css_bytes: null,
    render_blocking_count: null,
    mainthread_work_ms: null,
    bootup_time_ms: null,
    dom_size: null,
    long_tasks_count: null,
    network_dependency_depth: null,
    server_response_ms: cwv.ttfb_ms.value,
  };

  if (cwv.lcp_ms.rating === 'poor' || cwv.lcp_ms.rating === 'needs-improvement') {
    const poor = cwv.lcp_ms.rating === 'poor';
    findings.push(
      finding({
        id: 'perf-lcp-slow',
        title: 'LCP（最大コンテンツ描画）が遅く、表示完了前に離脱される可能性',
        evidence: [`LCP実測: ${Math.round(cwv.lcp_ms.value)}ms（目安: 2500ms以下が良好）`],
        business_impact: '表示完了までの体感速度が遅いほど、モバイル購入者は開くのを待たずに離脱しやすくなります。特に商品詳細・カートページのLCP遅延は購入直前の離脱に直結します。',
        recommended_fix: 'LCP要素（多くはヒーロー画像や見出し）の遅延読み込みを避け、fetchpriority="high"の付与・画像圧縮・レンダリングブロックの解消を行ってください。',
        implementation_owner: 'frontend',
        confidence: psi && psi.fieldData ? 80 : 60,
        automatic_fix_possible: false,
        axisScores: {
          sales_impact: poor ? 4 : 2,
          cwv_impact: poor ? 5 : 3,
          mobile_ux_impact: poor ? 4 : 2,
          seo_impact: 2,
          difficulty: 3,
          cost: 2,
          certainty: psi && psi.fieldData ? 3 : 2,
        },
      }),
    );
  }

  if (cwv.tbt_ms.rating === 'poor' || cwv.tbt_ms.rating === 'needs-improvement') {
    const poor = cwv.tbt_ms.rating === 'poor';
    findings.push(
      finding({
        id: 'perf-tbt-high',
        title: 'メインスレッドのブロック時間が長く、タップ操作の反応が遅れる',
        evidence: [`TBT実測: ${Math.round(cwv.tbt_ms.value)}ms（目安: 200ms以下が良好）`],
        business_impact: 'JS実行でメインスレッドが専有されると、カートボタン等のタップ反応が遅れ「反応しない」と誤解されカゴ落ちにつながります。',
        recommended_fix: '長時間実行スクリプトの分割（コード分割）、不要なサードパーティJSの削除・遅延読み込みを行ってください。',
        confidence: 60,
        axisScores: {
          sales_impact: poor ? 3 : 2,
          cwv_impact: poor ? 4 : 2,
          mobile_ux_impact: poor ? 4 : 3,
          seo_impact: 1,
          difficulty: 3,
          cost: 2,
          certainty: 2,
        },
      }),
    );
  }

  if (audits) {
    const unusedJs = numericAudit(audits, 'unused-javascript');
    if (unusedJs) {
      const items = auditItems(audits, 'unused-javascript');
      const bytes = items.reduce((sum, it) => sum + (it.wastedBytes || 0), 0);
      metrics.unused_js_bytes = bytes || unusedJs.numericValue || 0;
      if (metrics.unused_js_bytes > 100 * 1024) {
        findings.push(
          finding({
            id: 'perf-unused-js',
            title: '未使用JavaScriptがダウンロード帯域を圧迫している',
            evidence: [`未使用JS推定: 約${Math.round(metrics.unused_js_bytes / 1024)}KB（PSI unused-javascript監査）`],
            business_impact: '通信環境の弱いモバイル回線では読み込みが遅れ、離脱率上昇につながります。',
            recommended_fix: '未使用プラグイン/ライブラリの読み込み停止、コード分割、Tree Shakingの適用を検討してください。',
            implementation_owner: 'frontend',
            confidence: 65,
            axisScores: { sales_impact: 2, cwv_impact: 3, mobile_ux_impact: 2, seo_impact: 1, difficulty: 3, cost: 2, certainty: 3 },
          }),
        );
      }
    }

    const unusedCss = numericAudit(audits, 'unused-css-rules');
    if (unusedCss) {
      const items = auditItems(audits, 'unused-css-rules');
      const bytes = items.reduce((sum, it) => sum + (it.wastedBytes || 0), 0);
      metrics.unused_css_bytes = bytes || unusedCss.numericValue || 0;
    }

    const renderBlocking = auditItems(audits, 'render-blocking-resources');
    metrics.render_blocking_count = renderBlocking.length;
    if (renderBlocking.length >= 3) {
      findings.push(
        finding({
          id: 'perf-render-blocking',
          title: 'レンダリングをブロックするリソースが多い',
          evidence: [`レンダリングブロックリソース: ${renderBlocking.length}件`],
          business_impact: '初回表示が遅れ、特に電波の弱い屋外でのモバイル購入で機会損失につながります。',
          recommended_fix: 'CSSのcritical化・不要なJSのdefer/async化・不要なwebフォントプリロードの見直しを行ってください。',
          confidence: 60,
          axisScores: { sales_impact: 2, cwv_impact: 3, mobile_ux_impact: 2, seo_impact: 1, difficulty: 2, cost: 1, certainty: 3 },
        }),
      );
    }

    const mainThread = numericAudit(audits, 'mainthread-work-breakdown');
    if (mainThread) metrics.mainthread_work_ms = mainThread.numericValue;

    const bootup = numericAudit(audits, 'bootup-time');
    if (bootup) metrics.bootup_time_ms = bootup.numericValue;

    const domSize = numericAudit(audits, 'dom-size');
    if (domSize) {
      metrics.dom_size = domSize.numericValue;
      if (domSize.numericValue && domSize.numericValue > 1500) {
        findings.push(
          finding({
            id: 'perf-dom-size',
            title: 'DOMノード数が多く、描画・スクロール性能に影響',
            evidence: [`DOMノード数: ${domSize.numericValue}（目安: 1500以下）`],
            business_impact: '過大なDOMは低スペックのモバイル端末でスクロール時のカクつきを招き、商品一覧の閲覧離脱につながります。',
            recommended_fix: '無限スクロールの仮想化、不要なマークアップ（ページビルダー由来の入れ子div等）の削減を検討してください。',
            confidence: 55,
            axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 3, seo_impact: 0, difficulty: 4, cost: 3, certainty: 2 },
          }),
        );
      }
    }

    const longTasks = auditItems(audits, 'long-tasks');
    metrics.long_tasks_count = longTasks.length;

    const depTree = audits['network-dependency-tree'] || audits['critical-request-chains'];
    if (depTree && depTree.details && depTree.details.chains) {
      metrics.network_dependency_depth = maxChainDepth(depTree.details.chains);
    }

    const serverResponse = numericAudit(audits, 'server-response-time');
    if (serverResponse && serverResponse.numericValue !== null) {
      metrics.server_response_ms = serverResponse.numericValue;
      if (serverResponse.numericValue > THRESHOLDS.ttfb_ms.poor) {
        findings.push(
          finding({
            id: 'perf-server-response-slow',
            title: 'サーバー応答時間（TTFB）が遅い',
            evidence: [`サーバー応答: ${Math.round(serverResponse.numericValue)}ms（目安: 800ms以下）`],
            business_impact: 'サーバー側の遅延は全ページに波及し、ページ表示前の離脱（直帰率上昇）に直結します。',
            recommended_fix: 'キャッシュプラグイン導入・PHP/DBクエリの見直し・サーバーリソース増強・CDN導入を検討してください。',
            implementation_owner: 'server',
            confidence: 70,
            axisScores: { sales_impact: 3, cwv_impact: 3, mobile_ux_impact: 1, seo_impact: 2, difficulty: 3, cost: 3, certainty: 3 },
          }),
        );
      }
    }
  }

  return { metrics, findings };
}

function maxChainDepth(chains, depth = 0) {
  let max = depth;
  for (const key of Object.keys(chains || {})) {
    const node = chains[key];
    if (node && node.children) {
      max = Math.max(max, maxChainDepth(node.children, depth + 1));
    }
  }
  return max;
}
