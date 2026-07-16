// core/engine.mjs — Node entry point. Orchestrates collectors in the order
// fixed by the spec (PSI API -> optional local Lighthouse -> HTML
// fallback), then delegates ALL judgement logic to pipeline.analyzeCollected
// (shared with core/engine.browser.mjs). Never throws for
// network/API-key-absence reasons — degrades to a `data_status:"unavailable"`
// AuditResult instead (PROJECT_BRIEF: "キーが無くても停止しない").

import { fetchPsi } from '../collectors/psi.mjs';
import { fetchHtml } from '../collectors/html.mjs';
import { runLighthouseLocal } from '../collectors/lighthouse_local.mjs';
import { validateUrlSyntax } from '../security/urlguard.mjs';
import { analyzeCollected } from './pipeline.mjs';

const ROBOTS_TIMEOUT_MS = 8000;
const ROBOTS_MAX_BYTES = 100 * 1024;

/**
 * @param {string} url
 * @param {{strategy?:'mobile'|'desktop', apiKey?:string, collectors?:'auto'|'psi'|'html', timeoutMs?:number, fetchImpl?:Function}} [options]
 * @returns {Promise<object>} AuditResult
 */
export async function runAudit(url, options = {}) {
  const {
    strategy = 'mobile',
    apiKey,
    collectors = 'auto',
    timeoutMs = 60000,
    fetchImpl = globalThis.fetch,
  } = options;

  const validation = validateUrlSyntax(url);
  if (!validation.valid) {
    return buildUnavailableResult(url, strategy, [`対象URLが無効または許可されていません（${validation.reason}）。`]);
  }

  const collected = { target_url: url, final_url: url, strategy };
  const collectionNotes = [];

  const wantPsi = collectors === 'auto' || collectors === 'psi';
  const wantHtml = collectors === 'auto' || collectors === 'html';

  if (wantPsi) {
    collected.psi = await safeFetchPsi(url, { strategy, apiKey, fetchImpl, timeoutMs: Math.min(timeoutMs, 45000) }, collectionNotes);
    if (collected.psi.ok && collected.psi.finalUrl) collected.final_url = collected.psi.finalUrl;
  }

  if (collectors === 'auto') {
    try {
      const lh = await runLighthouseLocal(url, { strategy, timeoutMs });
      if (lh && lh.available) {
        collected.lighthouse = lh;
        if (!lh.ok) collectionNotes.push('ローカルLighthouseの実行に失敗しました（HTML簡易診断にフォールバックします）。');
      }
    } catch (e) {
      collectionNotes.push(`ローカルLighthouse実行中に例外が発生しました: ${safeMessage(e)}`);
    }
  }

  if (wantHtml) {
    collected.html = await safeFetchHtml(url, { timeoutMs, fetchImpl }, collectionNotes);
    collected.headers = collected.html.headers || null;
    if (collected.html.ok && collected.html.finalUrl) {
      collected.final_url = collected.html.finalUrl;
      collected.robots = await safeFetchRobots(collected.html.finalUrl, fetchImpl);
    }
  }

  const anySuccess = Boolean(
    (collected.psi && collected.psi.ok) || (collected.lighthouse && collected.lighthouse.ok) || (collected.html && collected.html.ok),
  );

  if (!anySuccess) {
    return buildUnavailableResult(url, strategy, collectionNotes.length ? collectionNotes : ['PSI API・Lighthouse・HTML簡易取得のいずれも失敗したため、診断結果を生成できませんでした。']);
  }

  const auditResult = analyzeCollected(collected);
  auditResult.data_status = 'ok';
  for (const note of collectionNotes) {
    if (!auditResult.limitations.includes(note)) auditResult.limitations.push(note);
  }
  return auditResult;
}

async function safeFetchPsi(url, options, notes) {
  try {
    const result = await fetchPsi(url, options);
    if (!result.ok) notes.push(`PSI APIの取得に失敗しました（${result.error}）。APIキー未設定時は低クォータのキーレス動作です。`);
    return result;
  } catch (e) {
    notes.push(`PSI API呼び出し中に例外が発生しました: ${safeMessage(e)}`);
    return { ok: false, error: 'unexpected_error', detail: safeMessage(e) };
  }
}

async function safeFetchHtml(url, options, notes) {
  try {
    const result = await fetchHtml(url, options);
    if (!result.ok) notes.push(`HTML簡易取得に失敗しました（${result.error}）。`);
    return result;
  } catch (e) {
    notes.push(`HTML取得中に例外が発生しました: ${safeMessage(e)}`);
    return { ok: false, error: 'unexpected_error', detail: safeMessage(e), redirect_chain: [] };
  }
}

async function safeFetchRobots(finalUrl, fetchImpl) {
  try {
    const origin = new URL(finalUrl).origin;
    return await fetchHtml(`${origin}/robots.txt`, { timeoutMs: ROBOTS_TIMEOUT_MS, maxBytes: ROBOTS_MAX_BYTES, fetchImpl });
  } catch (e) {
    return { ok: false, error: 'unexpected_error', detail: safeMessage(e) };
  }
}

function safeMessage(e) {
  return String(e && e.message ? e.message : e);
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
      executive_summary_ja: '診断データを取得できなかったため、結果を生成できませんでした。ネットワーク到達性・URLの妥当性をご確認ください。',
    },
    limitations,
  };
}
