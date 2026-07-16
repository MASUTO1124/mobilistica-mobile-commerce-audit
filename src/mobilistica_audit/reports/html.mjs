// reports/html.mjs — pure function, browser-compatible.
// Self-contained HTML report: inline CSS only, zero external requests,
// zero external JS. Accepts options.previous (AuditResult) for a
// Before/After comparison section.

const PRIORITY_COLOR = {
  P0: '#b91c1c',
  P1: '#c2410c',
  P2: '#a16207',
  P3: '#2563eb',
  P4: '#6b7280',
};

const PRIORITY_LABEL_JA = {
  P0: 'P0（購入不能級）',
  P1: 'P1（緊急）',
  P2: 'P2（重要）',
  P3: 'P3（推奨）',
  P4: 'P4（任意）',
};

/**
 * @param {object} auditResult
 * @param {{previous?:object}} [options]
 * @returns {string} self-contained HTML document body-ready string (full <html> document)
 */
export function renderHtmlReport(auditResult, options = {}) {
  const r = auditResult || {};
  const top5 = (r.recommendations || []).slice(0, 5);
  const cwv = r.core_web_vitals || {};

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>モバイルECサイト無料診断レポート — ${esc(r.target_url || '')}</title>
<style>
${CSS}
</style>
</head>
<body>
<main class="report">
  <header class="report-header">
    <h1>モバイルECサイト無料診断レポート</h1>
    <p class="meta">対象URL: <a href="${escAttr(r.target_url || '')}">${esc(r.target_url || '')}</a></p>
    <p class="meta">診断日時: ${esc(r.audited_at || '')} / 戦略: ${esc(r.strategy || 'mobile')}</p>
  </header>

  <section class="score-panel">
    <div class="score-box grade-${esc(r.summary?.grade || 'na')}">
      <div class="score-number">${r.mobile_score != null ? r.mobile_score : 'N/A'}</div>
      <div class="score-grade">${r.summary?.grade ? `評価: ${esc(r.summary.grade)}` : 'データ不足'}</div>
    </div>
    <p class="executive-summary">${esc(r.summary?.executive_summary_ja || '')}</p>
  </section>

  <section>
    <h2>Core Web Vitals</h2>
    <div class="table-scroll">
    <table>
      <thead><tr><th>指標</th><th>実測値</th><th>評価</th></tr></thead>
      <tbody>
        ${renderCwvRow('LCP（最大コンテンツ描画）', cwv.lcp_ms, 'ms')}
        ${renderCwvRow('INP（応答性）', cwv.inp_ms, 'ms')}
        ${renderCwvRow('CLS（レイアウトずれ）', cwv.cls, '')}
        ${renderCwvRow('TBT（メインスレッド専有）', cwv.tbt_ms, 'ms')}
        ${renderCwvRow('FCP（初回コンテンツ描画）', cwv.fcp_ms, 'ms')}
        ${renderCwvRow('SI（速度指数）', cwv.si_ms, 'ms')}
        ${renderCwvRow('TTFB（サーバー応答）', cwv.ttfb_ms, 'ms')}
      </tbody>
    </table>
    </div>
  </section>

  <section>
    <h2>優先度上位の課題（上位${top5.length}件）</h2>
    ${top5.length === 0 ? '<p>重大な課題は検出されませんでした。</p>' : top5.map(renderFindingCard).join('\n')}
  </section>

  <section>
    <h2>全課題一覧</h2>
    ${(r.recommendations || []).length === 0 ? '<p>課題は検出されませんでした。</p>' : (r.recommendations || []).map(renderFindingCard).join('\n')}
  </section>

  ${options.previous ? renderComparisonSection(r, options.previous) : ''}

  <section>
    <h2>データ取得元・診断範囲の限界</h2>
    <ul>
      ${(r.data_sources || []).map((s) => `<li>使用データ元: ${esc(s)}</li>`).join('\n')}
      ${(r.limitations || []).map((l) => `<li>${esc(l)}</li>`).join('\n')}
    </ul>
  </section>

  <footer class="disclaimer">
    <p>本レポートは自動診断ツール「モバイルECサイト無料診断（Mobilistica）」による参考情報です。効果・順位・売上を保証するものではありません。実装前に必ず本番環境のバックアップを取得してください。</p>
    <p>audit_id: ${esc(r.audit_id || '')}</p>
  </footer>
</main>
</body>
</html>`;
}

function renderCwvRow(label, metric, unit) {
  if (!metric || metric.value == null) {
    return `<tr><td>${esc(label)}</td><td>—</td><td class="rating-na">データなし</td></tr>`;
  }
  const value = unit === 'ms' ? Math.round(metric.value) : metric.value;
  return `<tr><td>${esc(label)}</td><td>${esc(String(value))}${esc(unit)}</td><td class="rating-${esc(metric.rating || 'na')}">${esc(ratingLabel(metric.rating))}</td></tr>`;
}

function ratingLabel(rating) {
  if (rating === 'good') return '良好';
  if (rating === 'needs-improvement') return '要改善';
  if (rating === 'poor') return '不良';
  return 'データなし';
}

function renderFindingCard(f) {
  const color = PRIORITY_COLOR[f.priority] || '#6b7280';
  return `<article class="finding" style="border-left-color:${color}">
    <h3><span class="priority-badge" style="background:${color}">${esc(PRIORITY_LABEL_JA[f.priority] || f.priority)}</span> ${esc(f.title)}</h3>
    <p class="category">カテゴリ: ${esc(f.category)} / 対応目安: ${esc(termLabel(f.term))} / 実装難易度: ${esc(effortLabel(f.estimated_effort))} / 確度: ${esc(String(f.confidence))}%</p>
    <p class="evidence"><strong>実測evidence:</strong> ${(f.evidence || []).map(esc).join(' / ')}</p>
    <p class="impact"><strong>売上・導線への影響:</strong> ${esc(f.business_impact)}</p>
    <p class="fix"><strong>推奨対応:</strong> ${esc(f.recommended_fix)}</p>
  </article>`;
}

function termLabel(term) {
  if (term === 'immediate') return '即時';
  if (term === 'short') return '短期';
  if (term === 'mid') return '中期';
  return term || '—';
}

function effortLabel(effort) {
  if (effort === 'small') return '小';
  if (effort === 'medium') return '中';
  if (effort === 'large') return '大';
  return effort || '—';
}

function renderComparisonSection(current, previous) {
  const beforeScore = previous.mobile_score;
  const afterScore = current.mobile_score;
  const diff = typeof beforeScore === 'number' && typeof afterScore === 'number' ? afterScore - beforeScore : null;
  return `<section class="comparison">
    <h2>Before / After 比較</h2>
    <table>
      <thead><tr><th></th><th>Before</th><th>After</th><th>差分</th></tr></thead>
      <tbody>
        <tr><td>総合スコア</td><td>${beforeScore ?? 'N/A'}</td><td>${afterScore ?? 'N/A'}</td><td>${diff != null ? (diff >= 0 ? `+${diff}` : diff) : '—'}</td></tr>
        <tr><td>P0件数</td><td>${countPriority(previous, 'P0')}</td><td>${countPriority(current, 'P0')}</td><td></td></tr>
        <tr><td>P1件数</td><td>${countPriority(previous, 'P1')}</td><td>${countPriority(current, 'P1')}</td><td></td></tr>
      </tbody>
    </table>
  </section>`;
}

function countPriority(auditResult, p) {
  return ((auditResult && auditResult.recommendations) || []).filter((f) => f.priority === p).length;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escAttr(value) {
  return esc(value);
}

const CSS = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif; background: #f8fafc; color: #0f172a; }
.report { max-width: 960px; margin: 0 auto; padding: 24px 16px 64px; }
.report-header h1 { font-size: 1.5rem; margin-bottom: 4px; }
.meta { color: #475569; font-size: 0.875rem; margin: 2px 0; }
.score-panel { display: flex; gap: 16px; align-items: center; background: #fff; border-radius: 12px; padding: 16px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08); flex-wrap: wrap; }
.score-box { text-align: center; min-width: 96px; }
.score-number { font-size: 2.5rem; font-weight: 700; }
.score-grade { font-size: 0.8rem; color: #475569; }
.executive-summary { flex: 1; min-width: 200px; line-height: 1.6; }
.table-scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; background: #fff; }
th, td { padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 0.875rem; text-align: left; }
.rating-good { color: #15803d; font-weight: 600; }
.rating-needs-improvement { color: #a16207; font-weight: 600; }
.rating-poor { color: #b91c1c; font-weight: 600; }
.rating-na { color: #94a3b8; }
.finding { background: #fff; border-left: 4px solid #6b7280; border-radius: 4px; padding: 12px 14px; margin: 10px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.finding h3 { margin: 0 0 6px; font-size: 1rem; }
.priority-badge { color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; margin-right: 6px; white-space: nowrap; }
.category { font-size: 0.75rem; color: #64748b; margin: 4px 0; }
.finding p { margin: 4px 0; font-size: 0.875rem; line-height: 1.5; }
.disclaimer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #64748b; }
@media (prefers-color-scheme: dark) {
  body { background: #0f172a; color: #e2e8f0; }
  .score-panel, table, .finding { background: #1e293b; }
  th, td { border-color: #334155; }
  .disclaimer { border-color: #334155; }
}
@media print {
  body { background: #fff; }
  .finding { break-inside: avoid; box-shadow: none; }
  a { color: inherit; text-decoration: none; }
}
`;
