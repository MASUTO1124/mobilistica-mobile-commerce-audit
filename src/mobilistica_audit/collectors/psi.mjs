// collectors/psi.mjs — browser-compatible (uses only global fetch, no
// `node:` imports). Calls the PageSpeed Insights v5 API and normalizes the
// response into the shape analyzers expect. Works keyless at low quota per
// PROJECT_BRIEF ("キーが無くても停止しない").

export const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
export const DEFAULT_TIMEOUT_MS = 30000;

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

/**
 * @param {string} url
 * @param {{strategy?:'mobile'|'desktop', apiKey?:string, fetchImpl?:Function, timeoutMs?:number}} [options]
 */
export async function fetchPsi(url, options = {}) {
  const {
    strategy = 'mobile',
    apiKey,
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: 'no_fetch_available' };
  }

  const params = new URLSearchParams({ url, strategy });
  for (const c of CATEGORIES) params.append('category', c);
  if (apiKey) params.set('key', apiKey);

  const hasAbort = typeof AbortController !== 'undefined';
  const controller = hasAbort ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetchImpl(
      `${PSI_ENDPOINT}?${params.toString()}`,
      controller ? { signal: controller.signal } : {},
    );

    if (!res.ok) {
      let detail;
      try {
        const errJson = await res.json();
        detail = errJson && errJson.error ? errJson.error.message : undefined;
      } catch {
        detail = undefined;
      }
      return { ok: false, error: `psi_http_${res.status}`, status: res.status, detail };
    }

    const json = await res.json();
    return { ok: true, strategy, raw: json, ...normalizePsi(json) };
  } catch (e) {
    return {
      ok: false,
      error: e && e.name === 'AbortError' ? 'timeout' : 'network_error',
      detail: String(e && e.message ? e.message : e),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Pulls out the subset of the PSI/Lighthouse v5 response shape that
 * analyzers rely on, so analyzers don't each re-parse the raw payload.
 */
export function normalizePsi(json) {
  const lhr = json && json.lighthouseResult ? json.lighthouseResult : {};
  const audits = lhr.audits || {};
  const categoriesRaw = lhr.categories || {};
  const finalUrl = lhr.finalUrl || (json && json.id) || null;

  const categories = {};
  for (const [key, cat] of Object.entries(categoriesRaw)) {
    const normKey = key.replace(/-/g, '_');
    categories[normKey] = typeof cat.score === 'number' ? Math.round(cat.score * 100) : null;
  }

  const metrics = {
    lcp_ms: numericValue(audits['largest-contentful-paint']),
    cls: numericValue(audits['cumulative-layout-shift']),
    tbt_ms: numericValue(audits['total-blocking-time']),
    fcp_ms: numericValue(audits['first-contentful-paint']),
    si_ms: numericValue(audits['speed-index']),
    ttfb_ms: numericValue(audits['server-response-time']),
    inp_ms: null,
  };

  const loadingExperience = json && json.loadingExperience ? json.loadingExperience : null;
  const originLoadingExperience = json && json.originLoadingExperience ? json.originLoadingExperience : null;
  const fieldMetrics = (loadingExperience && loadingExperience.metrics) || (originLoadingExperience && originLoadingExperience.metrics) || null;
  if (fieldMetrics) {
    const inp = fieldMetrics.INTERACTION_TO_NEXT_PAINT_MS || fieldMetrics.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT;
    if (inp && typeof inp.percentile === 'number') metrics.inp_ms = inp.percentile;
    if (metrics.lcp_ms === null && fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS) {
      metrics.lcp_ms = fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS.percentile ?? null;
    }
    if (metrics.cls === null && fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE) {
      const raw = fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile;
      metrics.cls = typeof raw === 'number' ? raw / 100 : null;
    }
  }

  return { finalUrl, categories, audits, metrics, fieldData: Boolean(fieldMetrics) };
}

function numericValue(audit) {
  if (!audit || typeof audit.numericValue !== 'number') return null;
  return audit.numericValue;
}
