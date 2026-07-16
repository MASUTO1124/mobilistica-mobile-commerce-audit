// analyzers/delivery.mjs — pure function, browser-compatible.
// Cache-Control / CDN detection (via response headers) / content-encoding
// (br, gzip) / HTTP2+ (via PSI uses-http2 audit) / redirect chain length.
// Feeds the top-level `resources{}` field (folded in by pipeline.mjs).

import { finding, numericAudit } from './_shared.mjs';

const CDN_HEADER_HINTS = [
  { re: /cloudflare/i, name: 'Cloudflare' },
  { re: /fastly/i, name: 'Fastly' },
  { re: /akamai/i, name: 'Akamai' },
  { re: /cloudfront/i, name: 'CloudFront' },
  { re: /vercel/i, name: 'Vercel' },
  { re: /netlify/i, name: 'Netlify' },
];
const CDN_HOST_HINTS = [/\bcdn\./i, /\bstatic\./i, /cloudfront\.net$/i, /fastly\.net$/i];

export function analyze(collected) {
  const findings = [];
  const html = collected && collected.html;
  const headers = (html && html.headers) || (collected && collected.headers) || null;
  const psi = collected && collected.psi;
  const audits = psi && psi.ok ? psi.audits : null;

  const metrics = {
    source: headers ? 'http_headers' : 'unavailable',
    cache_control: null,
    cache_control_present: null,
    cdn_detected: null,
    cdn_provider: null,
    content_encoding: null,
    http_protocol_modern: null,
    redirect_hop_count: html ? (html.redirect_chain || []).length : 0,
    redirect_chain: html ? (html.redirect_chain || []).map((h) => ({ url: h.url, status: h.status })) : [],
  };

  if (headers) {
    metrics.cache_control = headers['cache-control'] || null;
    metrics.cache_control_present = Boolean(headers['cache-control']);
    metrics.content_encoding = headers['content-encoding'] || null;

    let provider = null;
    const headerBlob = Object.entries(headers)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ');
    for (const hint of CDN_HEADER_HINTS) {
      if (hint.re.test(headerBlob)) {
        provider = hint.name;
        break;
      }
    }
    if (!provider && (html?.finalUrl || collected?.final_url)) {
      const hostname = safeHostname(html?.finalUrl || collected?.final_url);
      if (hostname && CDN_HOST_HINTS.some((re) => re.test(hostname))) {
        provider = 'detected_by_hostname_pattern';
      }
    }
    metrics.cdn_detected = Boolean(provider);
    metrics.cdn_provider = provider;

    if (!metrics.cache_control_present) {
      findings.push(
        finding({
          id: 'delivery-no-cache-control',
          title: 'Cache-Controlヘッダーが設定されていない',
          evidence: ['レスポンスヘッダーにCache-Controlが存在しない'],
          business_impact: '再訪問時にも静的ファイルを毎回再取得することになり、リピーターの表示速度が改善されません。',
          recommended_fix: '静的アセット（画像・CSS・JS）に適切なCache-Controlヘッダー（例: max-age=31536000）を設定してください。',
          implementation_owner: 'server',
          confidence: 55,
          axisScores: { sales_impact: 1, cwv_impact: 1, mobile_ux_impact: 1, seo_impact: 0, difficulty: 2, cost: 1, certainty: 3 },
        }),
      );
    }

    if (metrics.content_encoding && !/br|gzip/i.test(metrics.content_encoding)) {
      // encoding present but not a compressed one worth flagging separately
    } else if (!metrics.content_encoding) {
      findings.push(
        finding({
          id: 'delivery-no-compression',
          title: 'レスポンス圧縮（gzip/br）が有効になっていない可能性',
          evidence: ['レスポンスヘッダーにContent-Encoding(gzip/br)が存在しない'],
          business_impact: 'HTML/CSS/JSが無圧縮で転送されると通信量が増え、モバイル回線での表示が遅れます。',
          recommended_fix: 'サーバー側でgzipまたはBrotli圧縮を有効化してください。',
          implementation_owner: 'server',
          confidence: 50,
          axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 0, difficulty: 2, cost: 1, certainty: 2 },
        }),
      );
    }
  }

  if (audits) {
    const http2 = numericAudit(audits, 'uses-http2');
    if (http2) {
      metrics.http_protocol_modern = http2.score === 1;
      if (http2.score === 0) {
        findings.push(
          finding({
            id: 'delivery-no-http2',
            title: 'HTTP/2以降が使用されていない',
            evidence: ['PSI uses-http2監査: 失敗'],
            business_impact: '多数のリソースを並行取得できず、ページ全体の読み込みが遅くなります。',
            recommended_fix: 'サーバー/CDN側でHTTP/2（できればHTTP/3）を有効化してください。',
            implementation_owner: 'server',
            confidence: 60,
            axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 0, difficulty: 3, cost: 2, certainty: 3 },
          }),
        );
      }
    }
  }

  if (metrics.redirect_hop_count >= 2) {
    findings.push(
      finding({
        id: 'delivery-redirect-chain',
        title: 'リダイレクトが複数回発生しており初回接続が遅れる',
        evidence: [`リダイレクト回数: ${metrics.redirect_hop_count}回`],
        business_impact: '各リダイレクトはネットワーク往復を発生させ、特にモバイル回線で表示開始までの時間を伸ばします。',
        recommended_fix: '最終URLへの直接リンク化、不要な中間リダイレクトの削除を行ってください。',
        implementation_owner: 'server',
        confidence: 65,
        axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 1, difficulty: 2, cost: 1, certainty: 4 },
      }),
    );
  }

  return { metrics, findings };
}

function safeHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
