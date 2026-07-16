// analyzers/third_party.mjs — pure function, browser-compatible.
// Prefers PSI's third-party-summary audit; falls back to classifying
// external <script src> hostnames against a small analytics/ads/chat
// dictionary when only HTML is available.

import { finding, numericAudit, auditItems, hasHtml, htmlBody, findScriptSrcs } from './_shared.mjs';

const CLASSIFY = [
  { re: /google-analytics\.com|googletagmanager\.com|analytics\.google\.com/i, category: 'analytics' },
  { re: /doubleclick\.net|googlesyndication\.com|googleadservices\.com|adservice\.google/i, category: 'ads' },
  { re: /facebook\.net|connect\.facebook\.net|fbcdn\.net/i, category: 'ads' },
  { re: /hotjar\.com|clarity\.ms|mouseflow\.com/i, category: 'analytics' },
  { re: /intercom\.io|tawk\.to|zendesk\.com|livechatinc\.com|line\.me\/R\/ti/i, category: 'chat' },
  { re: /stripe\.com|paypal\.com|amazonpay/i, category: 'payment' },
  { re: /youtube\.com|ytimg\.com|vimeo\.com/i, category: 'embed' },
];

export function analyze(collected) {
  const findings = [];
  const psi = collected && collected.psi;
  const audits = psi && psi.ok ? psi.audits : null;

  const metrics = {
    source: audits ? 'psi' : hasHtml(collected) ? 'html_fallback' : 'unavailable',
    total_third_party_hosts: null,
    total_third_party_bytes: null,
    total_third_party_blocking_ms: null,
    by_category: null,
  };

  if (audits) {
    const items = auditItems(audits, 'third-party-summary');
    const summary = numericAudit(audits, 'third-party-summary');
    metrics.total_third_party_hosts = items.length;
    metrics.total_third_party_bytes = items.reduce((sum, it) => sum + (it.transferSize || 0), 0) || null;
    metrics.total_third_party_blocking_ms = summary?.numericValue ?? items.reduce((sum, it) => sum + (it.blockingTime || 0), 0) ?? null;

    if (metrics.total_third_party_blocking_ms && metrics.total_third_party_blocking_ms > 600) {
      findings.push(
        finding({
          id: 'tp-blocking-time-high',
          title: 'サードパーティスクリプトによるメインスレッドブロックが大きい',
          evidence: [`サードパーティ由来のブロッキング時間: 約${Math.round(metrics.total_third_party_blocking_ms)}ms（PSI third-party-summary）`],
          business_impact: '広告・解析タグ等の外部スクリプトが表示速度・操作性を低下させ、購入直前の離脱要因になり得ます。',
          recommended_fix: '不要なタグの削除、Google Tag Managerでの遅延読み込み設定を検討してください。',
          implementation_owner: 'operator',
          confidence: 60,
          axisScores: { sales_impact: 2, cwv_impact: 3, mobile_ux_impact: 2, seo_impact: 0, difficulty: 2, cost: 1, certainty: 3 },
        }),
      );
    }
  } else if (hasHtml(collected)) {
    const body = htmlBody(collected);
    const scripts = findScriptSrcs(body);
    let selfHost = null;
    try {
      selfHost = new URL(collected.final_url || collected.target_url).hostname;
    } catch {
      selfHost = null;
    }

    const external = scripts
      .map((s) => {
        try {
          return new URL(s.src, collected.final_url || collected.target_url).hostname;
        } catch {
          return null;
        }
      })
      .filter((h) => h && h !== selfHost);

    const uniqueHosts = [...new Set(external)];
    metrics.total_third_party_hosts = uniqueHosts.length;

    const byCategory = {};
    for (const host of uniqueHosts) {
      const match = CLASSIFY.find((c) => c.re.test(host));
      const cat = match ? match.category : 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
    metrics.by_category = byCategory;

    if (uniqueHosts.length >= 8) {
      findings.push(
        finding({
          id: 'tp-too-many-hosts',
          title: 'サードパーティスクリプトの読み込み先ドメインが多い',
          evidence: [`外部ドメインへのscript読み込み: ${uniqueHosts.length}件（HTML簡易走査）`],
          business_impact: '外部ドメインが多いほどDNS/TLS接続コストと表示遅延が増え、購入直前の離脱リスクが上がります。',
          recommended_fix: '重複する解析・広告タグを棚卸しし、Googleタグマネージャー等で一元管理・削減してください。',
          implementation_owner: 'operator',
          confidence: 45,
          axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 0, difficulty: 2, cost: 1, certainty: 3 },
        }),
      );
    }
  }

  return { metrics, findings };
}
