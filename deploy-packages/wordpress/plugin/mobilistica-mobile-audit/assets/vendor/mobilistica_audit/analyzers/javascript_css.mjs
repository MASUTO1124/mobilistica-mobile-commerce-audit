// analyzers/javascript_css.mjs — pure function, browser-compatible.
// HTML-based scan for blocking <script>/<link> tags, jQuery presence, and
// WordPress-plugin-sourced scripts (wp-content/plugins/*). PSI unused-css
// audit is folded in when available. Returns metrics.javascript and
// metrics.css as two sub-objects (pipeline promotes them to top-level
// `javascript{}` / `css{}` per the AuditResult contract).

import { finding, numericAudit, auditItems, hasHtml, htmlBody, findScriptSrcs, findLinkTags } from './_shared.mjs';

export function analyze(collected) {
  const psi = collected && collected.psi;
  const audits = psi && psi.ok ? psi.audits : null;
  const findings = [];

  const javascript = {
    source: hasHtml(collected) ? 'html_fallback' : audits ? 'psi' : 'unavailable',
    total_scripts: null,
    blocking_scripts: null,
    jquery_detected: null,
    wp_plugin_scripts: null,
  };
  const css = {
    source: hasHtml(collected) ? 'html_fallback' : audits ? 'psi' : 'unavailable',
    total_stylesheets: null,
    render_blocking_stylesheets: null,
    unused_css_bytes: null,
  };

  if (hasHtml(collected)) {
    const body = htmlBody(collected);
    const scripts = findScriptSrcs(body);
    javascript.total_scripts = scripts.length;
    const blocking = scripts.filter((s) => !s.async && !s.defer && s.type !== 'module');
    javascript.blocking_scripts = blocking.length;
    javascript.jquery_detected = scripts.some((s) => /jquery/i.test(s.src || ''));
    const wpPluginScripts = scripts.filter((s) => /wp-content\/plugins\//i.test(s.src || ''));
    javascript.wp_plugin_scripts = wpPluginScripts.map((s) => s.src);

    const links = findLinkTags(body);
    const stylesheets = links.filter((l) => l.rel === 'stylesheet');
    css.total_stylesheets = stylesheets.length;
    // Stylesheets without media="print" and without preload pattern are
    // treated as render-blocking in the absence of Lighthouse data.
    css.render_blocking_stylesheets = stylesheets.length;

    if (blocking.length >= 4) {
      findings.push(
        finding({
          id: 'js-blocking-scripts',
          title: 'defer/asyncが付いていないブロッキングスクリプトが多い',
          evidence: [`ブロッキングscript: ${blocking.length}件/全${scripts.length}件（HTML簡易走査）`],
          business_impact: 'HTML解析がスクリプトの読み込み完了まで止まるため、初回表示が遅れモバイル離脱率が上がります。',
          recommended_fix: '表示に必須でないJSにdefer属性（実行順序が重要ならdefer、無関係ならasync）を付与してください。',
          implementation_owner: 'frontend',
          confidence: 55,
          automatic_fix_possible: false,
          axisScores: { sales_impact: 2, cwv_impact: 3, mobile_ux_impact: 2, seo_impact: 1, difficulty: 2, cost: 1, certainty: 2 },
        }),
      );
    }

    if (javascript.jquery_detected) {
      findings.push(
        finding({
          id: 'js-jquery-legacy',
          title: 'jQuery依存のスクリプトを検出',
          evidence: ['HTML内にjQueryを読み込むscriptタグを検出'],
          business_impact: '旧来のjQueryプラグイン群は個別に読み込まれることが多く、リクエスト数・JS実行時間の増加要因になりがちです。',
          recommended_fix: '直ちに削除する必要はありませんが、未使用のjQueryプラグインが無いか棚卸しし、統合・削減を検討してください。',
          implementation_owner: 'frontend',
          confidence: 40,
          automatic_fix_possible: false,
          axisScores: { sales_impact: 0, cwv_impact: 1, mobile_ux_impact: 1, seo_impact: 0, difficulty: 3, cost: 2, certainty: 2 },
        }),
      );
    }

    if (wpPluginScripts.length >= 8) {
      findings.push(
        finding({
          id: 'js-wp-plugin-bloat',
          title: 'WordPressプラグイン由来のスクリプトが多数読み込まれている',
          evidence: [`wp-content/plugins/からのscript: ${wpPluginScripts.length}件（候補: ${wpPluginScripts.slice(0, 5).map(shortSrc).join(', ')} 等）`],
          business_impact: '未使用・重複プラグインのスクリプトはページ全体の表示速度を底上げする形で購入導線に影響します。',
          recommended_fix: '各プラグインが実際に使用中か棚卸しし、未使用プラグインの無効化・統合を検討してください（実装候補は導入プラグイン一覧の実地確認が必要です）。',
          implementation_owner: 'operator',
          confidence: 35,
          automatic_fix_possible: false,
          axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 0, difficulty: 2, cost: 1, certainty: 1 },
        }),
      );
    }
  }

  if (audits) {
    const unusedCss = numericAudit(audits, 'unused-css-rules');
    if (unusedCss) {
      const items = auditItems(audits, 'unused-css-rules');
      const bytes = items.reduce((sum, it) => sum + (it.wastedBytes || 0), 0);
      css.unused_css_bytes = bytes || unusedCss.numericValue || 0;
      if (css.unused_css_bytes > 50 * 1024) {
        findings.push(
          finding({
            id: 'css-unused-rules',
            title: '未使用CSSがページ読み込みを圧迫',
            evidence: [`未使用CSS推定: 約${Math.round(css.unused_css_bytes / 1024)}KB（PSI unused-css-rules監査）`],
            business_impact: 'CSSファイルが肥大化すると初回描画までの待ち時間が伸び、離脱要因になります。',
            recommended_fix: 'クリティカルCSSの分離、未使用CSSフレームワーク部分の削除を検討してください。',
            implementation_owner: 'frontend',
            confidence: 55,
            axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 0, difficulty: 3, cost: 2, certainty: 2 },
          }),
        );
      }
    }
  }

  return { metrics: { javascript, css }, findings };
}

function shortSrc(src) {
  const m = String(src).match(/wp-content\/plugins\/([^/]+)\//);
  return m ? m[1] : src;
}
