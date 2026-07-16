// collectors/html.mjs — Node-only. Fetches raw HTML + headers with an SSRF
// guard on every redirect hop. Never throws for network-shaped failures;
// callers get {ok:false, error, ...} instead so the pipeline can degrade
// gracefully (see PROJECT_BRIEF: "APIキーが無くても停止しない").

import { validateUrlSyntax, assertPublicTarget, SsrfError } from '../security/urlguard.mjs';

export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_REDIRECTS = 5;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * @param {string} url
 * @param {{timeoutMs?:number, maxBytes?:number, fetchImpl?:Function}} [options]
 */
export async function fetchHtml(url, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    fetchImpl = globalThis.fetch,
  } = options;

  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: 'no_fetch_available', target_url: url, redirect_chain: [] };
  }

  const redirectChain = [];
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const validation = validateUrlSyntax(currentUrl);
    if (!validation.valid) {
      return { ok: false, error: validation.reason, target_url: url, redirect_chain: redirectChain };
    }

    try {
      await assertPublicTarget(validation.url.hostname);
    } catch (e) {
      const code = e instanceof SsrfError ? e.code : 'ssrf_blocked';
      return { ok: false, error: code, target_url: url, redirect_chain: redirectChain };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(validation.url.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'MobilisticaAuditBot/0.1 (+https://www.mobilistica.com)' },
      });
    } catch (e) {
      return {
        ok: false,
        error: e && e.name === 'AbortError' ? 'timeout' : 'network_error',
        detail: String(e && e.message ? e.message : e),
        target_url: url,
        redirect_chain: redirectChain,
      };
    } finally {
      clearTimeout(timer);
    }

    const status = response.status;
    if (REDIRECT_STATUSES.has(status)) {
      const location = response.headers.get ? response.headers.get('location') : response.headers?.location;
      redirectChain.push({ url: validation.url.toString(), status });
      if (!location) {
        return { ok: false, error: 'redirect_without_location', target_url: url, redirect_chain: redirectChain };
      }
      if (hop === MAX_REDIRECTS) {
        return { ok: false, error: 'redirect_loop', target_url: url, redirect_chain: redirectChain };
      }
      currentUrl = new URL(location, validation.url).toString();
      continue;
    }

    const headers = normalizeHeaders(response.headers);
    const contentType = headers['content-type'] || '';
    const finalUrl = validation.url.toString();

    if (!contentType.toLowerCase().includes('text/html')) {
      // Non-HTML response: report headers only, do not consume the body.
      if (response.body && typeof response.body.cancel === 'function') {
        try { await response.body.cancel(); } catch { /* best-effort */ }
      }
      return {
        ok: true,
        status,
        headers,
        contentType,
        finalUrl,
        target_url: url,
        body: null,
        truncated: false,
        headerOnly: true,
        redirect_chain: redirectChain,
      };
    }

    const { body, truncated } = await readBodyLimited(response, maxBytes);

    return {
      ok: true,
      status,
      headers,
      contentType,
      finalUrl,
      target_url: url,
      body,
      truncated,
      headerOnly: false,
      redirect_chain: redirectChain,
    };
  }

  // Unreachable in practice (loop returns/continues cover all paths), kept
  // as a safe fallback.
  return { ok: false, error: 'redirect_loop', target_url: url, redirect_chain: redirectChain };
}

function normalizeHeaders(headers) {
  const out = {};
  if (!headers) return out;
  if (typeof headers.entries === 'function') {
    for (const [k, v] of headers.entries()) out[k.toLowerCase()] = v;
  } else {
    for (const k of Object.keys(headers)) out[k.toLowerCase()] = headers[k];
  }
  return out;
}

async function readBodyLimited(response, maxBytes) {
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let received = 0;
    let body = '';
    let truncated = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > maxBytes) {
        const overflow = received - maxBytes;
        const keep = Math.max(value.byteLength - overflow, 0);
        body += decoder.decode(value.subarray(0, keep), { stream: true });
        truncated = true;
        try { await reader.cancel(); } catch { /* best-effort */ }
        break;
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return { body, truncated };
  }

  // Fallback for fetch implementations without a streaming body (e.g. some
  // test mocks): read fully then truncate.
  const text = await response.text();
  if (text.length > maxBytes) {
    return { body: text.slice(0, maxBytes), truncated: true };
  }
  return { body: text, truncated: false };
}
