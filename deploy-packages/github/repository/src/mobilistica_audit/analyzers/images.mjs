// analyzers/images.mjs — pure function, browser-compatible.
// Prefers PSI image audits (uses-optimized-images, modern-image-formats,
// uses-responsive-images, offscreen-images, lcp-lazy-loaded,
// prioritize-lcp-image, unsized-images). Falls back to <img> tag scanning
// of the fetched HTML (count/alt/loading/dimensions/oversized-src guess).

import { finding, numericAudit, auditItems, hasHtml, htmlBody, findImgTags } from './_shared.mjs';

export function analyze(collected) {
  const psi = collected && collected.psi;
  const audits = psi && psi.ok ? psi.audits : null;
  const findings = [];

  const metrics = {
    source: audits ? 'psi' : hasHtml(collected) ? 'html_fallback' : 'unavailable',
    total_images: null,
    missing_alt_count: null,
    missing_dimensions_count: null,
    lazy_loaded_count: null,
    modern_format_savings_bytes: null,
    responsive_format_savings_bytes: null,
    offscreen_savings_bytes: null,
    lcp_image_lazy_loaded: null,
    lcp_image_has_fetchpriority: null,
  };

  if (audits) {
    const modernFormat = auditItems(audits, 'modern-image-formats');
    metrics.modern_format_savings_bytes = sumWasted(modernFormat) ?? numericAudit(audits, 'modern-image-formats')?.numericValue ?? null;
    if (metrics.modern_format_savings_bytes && metrics.modern_format_savings_bytes > 100 * 1024) {
      findings.push(
        finding({
          id: 'img-modern-format',
          title: '画像がWebP/AVIF等の次世代フォーマットに未対応',
          evidence: [`次世代フォーマット化による削減見込み: 約${Math.round(metrics.modern_format_savings_bytes / 1024)}KB`],
          business_impact: '画像サイズが大きいほどモバイル回線での表示が遅れ、特に商品一覧・商品詳細ページでの離脱要因になります。',
          recommended_fix: 'WebP/AVIF形式への変換、画像最適化プラグイン（EWWW Image Optimizer等）の導入を検討してください。',
          implementation_owner: 'operator',
          confidence: 70,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 2, cwv_impact: 3, mobile_ux_impact: 2, seo_impact: 1, difficulty: 1, cost: 1, certainty: 3 },
        }),
      );
    }

    const responsive = auditItems(audits, 'uses-responsive-images');
    metrics.responsive_format_savings_bytes = sumWasted(responsive) ?? numericAudit(audits, 'uses-responsive-images')?.numericValue ?? null;

    const offscreen = auditItems(audits, 'offscreen-images');
    metrics.offscreen_savings_bytes = sumWasted(offscreen) ?? numericAudit(audits, 'offscreen-images')?.numericValue ?? null;
    if (metrics.offscreen_savings_bytes && metrics.offscreen_savings_bytes > 150 * 1024) {
      findings.push(
        finding({
          id: 'img-offscreen-not-lazy',
          title: '画面外の画像が遅延読み込みされていない',
          evidence: [`画面外画像の遅延読み込みによる削減見込み: 約${Math.round(metrics.offscreen_savings_bytes / 1024)}KB`],
          business_impact: '初回表示に不要な画像まで一度に読み込むため、最初の表示速度が遅くなります。',
          recommended_fix: 'ファーストビュー外の画像に loading="lazy" を付与してください（LCP画像には付与しないこと）。',
          implementation_owner: 'frontend',
          confidence: 65,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 1, seo_impact: 0, difficulty: 1, cost: 1, certainty: 3 },
        }),
      );
    }

    const lcpLazy = numericAudit(audits, 'lcp-lazy-loaded');
    if (lcpLazy && lcpLazy.score === 0) {
      metrics.lcp_image_lazy_loaded = true;
      findings.push(
        finding({
          id: 'img-lcp-lazy-loaded',
          title: 'LCP画像にloading="lazy"が付与され表示が遅延',
          evidence: ['PSI lcp-lazy-loaded監査: 失敗（LCP要素がlazy読み込み対象）'],
          business_impact: 'ページの主役画像（ヒーロー・商品メイン画像）の表示が意図的に遅延しており、体感速度・LCPを直接悪化させています。',
          recommended_fix: 'ファーストビューのLCP画像からloading="lazy"を外してください。',
          implementation_owner: 'frontend',
          confidence: 85,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 3, cwv_impact: 5, mobile_ux_impact: 3, seo_impact: 1, difficulty: 1, cost: 1, certainty: 4 },
        }),
      );
    } else if (lcpLazy && lcpLazy.score === 1) {
      metrics.lcp_image_lazy_loaded = false;
    }

    const prioritizeLcp = numericAudit(audits, 'prioritize-lcp-image');
    if (prioritizeLcp && prioritizeLcp.score === 0) {
      metrics.lcp_image_has_fetchpriority = false;
      findings.push(
        finding({
          id: 'img-lcp-no-priority',
          title: 'LCP画像にfetchpriority="high"が未設定',
          evidence: ['PSI prioritize-lcp-image監査: 失敗'],
          business_impact: 'LCP画像の読み込み優先度が上がらず、表示完了までの時間短縮の余地が残っています。',
          recommended_fix: 'LCP画像の<img>タグにfetchpriority="high"を付与してください。',
          implementation_owner: 'frontend',
          confidence: 60,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 1, cwv_impact: 3, mobile_ux_impact: 1, seo_impact: 0, difficulty: 1, cost: 1, certainty: 3 },
        }),
      );
    } else if (prioritizeLcp && prioritizeLcp.score === 1) {
      metrics.lcp_image_has_fetchpriority = true;
    }

    const unsized = auditItems(audits, 'unsized-images');
    metrics.missing_dimensions_count = unsized.length || (numericAudit(audits, 'unsized-images')?.score === 0 ? 1 : 0);
  } else if (hasHtml(collected)) {
    const body = htmlBody(collected);
    const imgs = findImgTags(body);
    metrics.total_images = imgs.length;
    metrics.missing_alt_count = imgs.filter((i) => i.alt === null || i.alt.trim() === '').length;
    metrics.missing_dimensions_count = imgs.filter((i) => !i.width || !i.height).length;
    metrics.lazy_loaded_count = imgs.filter((i) => i.loading === 'lazy').length;

    if (imgs.length > 0 && metrics.missing_dimensions_count / imgs.length >= 0.5) {
      findings.push(
        finding({
          id: 'img-missing-dimensions-html',
          title: '画像にwidth/height属性が指定されておらずレイアウトずれ(CLS)のリスク',
          evidence: [`寸法未指定の画像: ${metrics.missing_dimensions_count}/${imgs.length}件（HTML簡易走査・(推定)）`],
          business_impact: '画像読み込み中にレイアウトがずれると誤タップを誘発し、カート追加ボタンの誤操作・離脱につながります。',
          recommended_fix: '<img>タグにwidth/height属性（またはaspect-ratio指定）を追加してください。',
          implementation_owner: 'frontend',
          confidence: 45,
          automatic_fix_possible: false,
          axisScores: { sales_impact: 1, cwv_impact: 2, mobile_ux_impact: 2, seo_impact: 0, difficulty: 2, cost: 1, certainty: 2 },
        }),
      );
    }

    if (imgs.length > 0 && metrics.missing_alt_count > 0) {
      findings.push(
        finding({
          id: 'img-missing-alt-html',
          title: 'alt属性が未設定の画像がある',
          evidence: [`alt未設定の画像: ${metrics.missing_alt_count}/${imgs.length}件（HTML簡易走査）`],
          business_impact: '商品画像のalt欠如は画像検索経由の流入機会を損ない、アクセシビリティ上も不利です。',
          recommended_fix: '商品名・特徴を含むalt属性を全画像に設定してください。',
          implementation_owner: 'operator',
          confidence: 55,
          automatic_fix_possible: false,
          axisScores: { sales_impact: 1, cwv_impact: 0, mobile_ux_impact: 1, seo_impact: 3, difficulty: 1, cost: 2, certainty: 3 },
        }),
      );
    }
  }

  return { metrics, findings };
}

function sumWasted(items) {
  if (!items || items.length === 0) return null;
  const total = items.reduce((sum, it) => sum + (it.wastedBytes || 0), 0);
  return total || null;
}
