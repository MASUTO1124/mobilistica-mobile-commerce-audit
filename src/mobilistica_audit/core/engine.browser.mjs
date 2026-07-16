// core/engine.browser.mjs — browser entry point. No `node:` imports
// anywhere in its import graph (verify: this file -> collectors/psi.mjs +
// security/urlguard.mjs's validateUrlSyntax + core/pipeline.mjs + analyzers
// — none touch `node:` at the top level). PSI is the only collector
// available in-browser: HTML fallback needs Node's DNS-based SSRF guard
// (assertPublicTarget) and would otherwise be trivially bypassable via
// DNS rebinding from arbitrary page script, and cross-origin HTML fetch is
// blocked by CORS for most third-party sites anyway.

import { fetchPsi } from '../collectors/psi.mjs';
import { validateUrlSyntax } from '../security/urlguard.mjs';
import { analyzeCollected } from './pipeline.mjs';

/**
 * @param {string} url
 * @param {{strategy?:'mobile'|'desktop', apiKey?:string, timeoutMs?:number, fetchImpl?:Function}} [options]
 * @returns {Promise<object>} AuditResult
 */
export async function runAuditBrowser(url, options = {}) {
  const { strategy = 'mobile', apiKey, timeoutMs = 45000, fetchImpl = globalThis.fetch } = options;

  const validation = validateUrlSyntax(url);
  if (!validation.valid) {
    return buildUnavailableResult(url, strategy, [`対象URLが無効または許可されていません（${validation.reason}）。`]);
  }

  const collected = { target_url: url, final_url: url, strategy };
  const notes = [];

  try {
    collected.psi = await fetchPsi(url, { strategy, apiKey, fetchImpl, timeoutMs });
    if (!collected.psi.ok) {
      notes.push(`PSI APIの取得に失敗しました（${collected.psi.error}）。APIキー未設定時は低クォータのキーレス動作です。`);
    } else if (collected.psi.finalUrl) {
      collected.final_url = collected.psi.finalUrl;
    }
  } catch (e) {
    const detail = String(e && e.message ? e.message : e);
    collected.psi = { ok: false, error: 'unexpected_error', detail };
    notes.push(`PSI API呼び出し中に例外が発生しました: ${detail}`);
  }

  notes.push('ブラウザ実行では、SSRFガード付きHTML簡易取得・ローカルLighthouseは利用できません（PSI APIの結果のみに基づく診断です）。');

  if (!collected.psi.ok) {
    return buildUnavailableResult(url, strategy, notes);
  }

  const auditResult = analyzeCollected(collected);
  for (const note of notes) {
    if (!auditResult.limitations.includes(note)) auditResult.limitations.push(note);
  }
  return auditResult;
}

function buildUnavailableResult(url, strategy, limitations) {
  return {
    audit_id: null,
    target_url: url,
    final_url: url,
    audited_at: new Date().toISOString(),
    strategy,
    platform: { detected: 'unknown', confidence: 'estimated', evidence: [] },
    data_sources: [],
    data_status: 'unavailable',
    mobile_score: null,
    performance: {},
    core_web_vitals: {},
    resources: {},
    images: {},
    javascript: {},
    css: {},
    fonts: {},
    third_party: {},
    mobile_ux: {},
    commerce_ux: {},
    technical_seo: {},
    security: {},
    recommendations: [],
    summary: {
      overall_score: null,
      grade: null,
      top_issues: [],
      executive_summary_ja: '診断データを取得できなかったため、結果を生成できませんでした。',
    },
    limitations,
  };
}
