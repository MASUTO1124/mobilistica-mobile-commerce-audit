// analyzers/fonts.mjs — pure function, browser-compatible.
// HTML/CSS-link heuristics for font-display, preload, external font host
// count and estimated weight count (FOIT/FOUT risk).

import { finding, hasHtml, htmlBody, findLinkTags } from './_shared.mjs';

const KNOWN_FONT_HOSTS = [/fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i, /use\.typekit\.net/i, /fonts\.adobe\.com/i, /use\.fontawesome\.com/i];

export function analyze(collected) {
  const findings = [];
  const metrics = {
    source: hasHtml(collected) ? 'html_fallback' : 'unavailable',
    external_font_hosts: null,
    font_preload_count: null,
    estimated_weight_count: null,
    font_display_declared: null,
  };

  if (!hasHtml(collected)) {
    return { metrics, findings };
  }

  const body = htmlBody(collected);
  const links = findLinkTags(body);

  const fontLinks = links.filter((l) => KNOWN_FONT_HOSTS.some((re) => re.test(l.href || '')));
  const hosts = new Set(
    fontLinks
      .map((l) => {
        try {
          return new URL(l.href, 'https://example.invalid/').hostname;
        } catch {
          return null;
        }
      })
      .filter(Boolean),
  );
  metrics.external_font_hosts = hosts.size;

  const preloadFonts = links.filter((l) => l.rel === 'preload' && (l.as === 'font' || /\.(woff2?|ttf|otf)(\?|$)/i.test(l.href || '')));
  metrics.font_preload_count = preloadFonts.length;

  // Estimate distinct weights requested via Google-Fonts-style `family=Name:wght@...` or `:400,700` query params.
  let weightCount = 0;
  for (const l of fontLinks) {
    const href = l.href || '';
    const wghtAt = href.match(/[:@]([0-9,;]+)/);
    if (wghtAt) {
      weightCount += wghtAt[1].split(/[,;]/).filter(Boolean).length;
    } else if (/googleapis\.com\/css/i.test(href)) {
      weightCount += 1;
    }
  }
  metrics.estimated_weight_count = weightCount || (fontLinks.length > 0 ? fontLinks.length : 0);

  metrics.font_display_declared = /font-display\s*:\s*(swap|optional|fallback)/i.test(body);

  if (metrics.external_font_hosts >= 2) {
    findings.push(
      finding({
        id: 'fonts-multiple-hosts',
        title: '外部フォントホストが複数存在し接続コストが増加',
        evidence: [`外部フォントホスト数: ${metrics.external_font_hosts}件`],
        business_impact: '異なるドメインへの追加DNS/TLS接続が発生し、特にモバイル回線で表示開始が遅れます。',
        recommended_fix: 'フォントホストを1つに統合するか、preconnect指定を追加してください。',
        implementation_owner: 'frontend',
        confidence: 45,
        axisScores: { sales_impact: 0, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 0, difficulty: 2, cost: 1, certainty: 3 },
      }),
    );
  }

  if (fontLinks.length > 0 && metrics.font_preload_count === 0) {
    findings.push(
      finding({
        id: 'fonts-no-preload',
        title: 'Webフォントがpreloadされておらずテキスト表示が遅延する可能性',
        evidence: [`フォント関連linkタグ: ${fontLinks.length}件・preload指定: 0件`],
        business_impact: 'フォント読み込み完了までテキストが表示されない（FOIT）場合、体感速度が悪化します。',
        recommended_fix: '主要なWebフォントファイルに<link rel="preload" as="font" crossorigin>を追加してください。',
        implementation_owner: 'frontend',
        confidence: 40,
        automatic_fix_possible: true,
        axisScores: { sales_impact: 0, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 0, difficulty: 1, cost: 1, certainty: 2 },
      }),
    );
  }

  if (metrics.estimated_weight_count >= 6) {
    findings.push(
      finding({
        id: 'fonts-too-many-weights',
        title: 'フォントウェイト（太さ）の指定数が多い',
        evidence: [`推定ウェイト数: ${metrics.estimated_weight_count}種類（(推定)・link href解析ベース）`],
        business_impact: 'ウェイト数が多いほどダウンロードするフォントファイル数が増え、初回表示が遅れます。',
        recommended_fix: '実際に使用しているウェイトのみに絞り込んでください（多くの場合400/700の2種で足ります）。',
        implementation_owner: 'designer',
        confidence: 35,
        axisScores: { sales_impact: 0, cwv_impact: 1, mobile_ux_impact: 0, seo_impact: 0, difficulty: 1, cost: 1, certainty: 2 },
      }),
    );
  }

  if (fontLinks.length > 0 && !metrics.font_display_declared) {
    findings.push(
      finding({
        id: 'fonts-no-font-display',
        title: 'font-displayが未指定でFOIT（描画待ちの空白）が発生する可能性',
        evidence: ['CSS内でfont-display: swap等の宣言を検出できず（(推定)・HTML簡易走査）'],
        business_impact: 'フォント読み込み中にテキストが非表示になると、ユーザーがページ未読込と誤認し離脱するリスクがあります。',
        recommended_fix: '@font-faceにfont-display: swapを追加してください。',
        implementation_owner: 'frontend',
        confidence: 35,
        axisScores: { sales_impact: 0, cwv_impact: 1, mobile_ux_impact: 1, seo_impact: 0, difficulty: 1, cost: 1, certainty: 1 },
      }),
    );
  }

  return { metrics, findings };
}

export function isKnownFontHost(href) {
  return KNOWN_FONT_HOSTS.some((re) => re.test(href || ''));
}
