// analyzers/technical_seo.mjs — pure function, browser-compatible.
// status / canonical / robots meta+robots.txt (collected.robots, fetched
// upstream by core/engine.mjs on the HTML-fallback tier — this file only
// reads whatever was already collected, it never fetches) / sitemap
// reference / title+description+H1+heading hierarchy / lang+hreflang /
// OG+Twitter Card / Schema type enumeration+duplicate detection / img alt
// ratio / indexability.

import {
  finding,
  hasHtml,
  htmlBody,
  getMetaContent,
  getMetaProperty,
  findImgTags,
  firstMatch,
} from './_shared.mjs';

export function analyze(collected) {
  const findings = [];
  const html = collected && collected.html;

  const metrics = {
    source: hasHtml(collected) ? 'html_fallback' : 'unavailable',
    status: html ? html.status ?? null : null,
    canonical: null,
    robots_meta: null,
    robots_txt_checked: false,
    robots_txt_disallows_root: null,
    sitemap_referenced: null,
    title: null,
    title_length: null,
    meta_description: null,
    meta_description_length: null,
    h1_count: null,
    heading_order_ok: null,
    lang: null,
    hreflang_count: null,
    og_present: null,
    twitter_card_present: null,
    schema_types: null,
    schema_duplicate_types: null,
    img_alt_ratio: null,
    indexable: null,
    score: null,
  };

  if (html && !html.ok) {
    findings.push(
      finding({
        id: 'seo-page-unreachable',
        title: 'ページが取得できず技術SEO診断が実施できない',
        evidence: [`取得エラー: ${html.error || 'unknown'}`],
        business_impact: '対象ページが取得不能な場合、検索エンジンからも同様にクロール・インデックスできていない可能性があります。',
        recommended_fix: 'サーバー到達性・DNS・SSL証明書・WAF設定を確認してください。',
        implementation_owner: 'server',
        confidence: 50,
        axisScores: { sales_impact: 4, cwv_impact: 0, mobile_ux_impact: 3, seo_impact: 4, difficulty: 3, cost: 2, certainty: 3 },
      }),
    );
    return { metrics, findings };
  }

  if (html && html.status && html.status >= 500) {
    metrics.score = 0;
    findings.push(
      finding({
        id: 'seo-server-error',
        title: `サーバーエラー（HTTP ${html.status}）が発生している`,
        evidence: [`HTTPステータス: ${html.status}`],
        business_impact: 'サーバーエラー中は購入自体が不可能です。売上に直接影響する最優先課題です。',
        recommended_fix: 'サーバーログを確認し、エラーの原因（リソース不足・プラグイン競合・デプロイ不備等）を特定し復旧してください。',
        implementation_owner: 'server',
        confidence: 90,
        axisScores: { sales_impact: 5, cwv_impact: 0, mobile_ux_impact: 5, seo_impact: 3, difficulty: 3, cost: 2, certainty: 5 },
        p0: true,
      }),
    );
  }

  if (!hasHtml(collected)) {
    return { metrics, findings };
  }

  const body = htmlBody(collected);

  metrics.canonical = firstMatch(body, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  metrics.robots_meta = getMetaContent(body, 'robots');
  metrics.indexable = !(metrics.robots_meta && /noindex/i.test(metrics.robots_meta));

  if (collected.robots && collected.robots.ok) {
    metrics.robots_txt_checked = true;
    const robotsBody = collected.robots.body || '';
    metrics.robots_txt_disallows_root = /disallow:\s*\/\s*$/im.test(robotsBody);
    metrics.sitemap_referenced = /sitemap:/i.test(robotsBody);
    if (metrics.robots_txt_disallows_root) {
      findings.push(
        finding({
          id: 'seo-robots-disallow-all',
          title: 'robots.txtがサイト全体のクロールを禁止している',
          evidence: ['robots.txtに"Disallow: /"を検出'],
          business_impact: 'サイト全体が検索エンジンにクロールされず、自然検索経由の集客・売上機会をすべて失います。',
          recommended_fix: '意図的な設定でなければ robots.txt の Disallow: / を削除してください。',
          implementation_owner: 'seo',
          confidence: 85,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 5, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 5, difficulty: 1, cost: 1, certainty: 4 },
        }),
      );
    }
  }

  if (!metrics.indexable) {
    findings.push(
      finding({
        id: 'seo-noindex',
        title: 'ページにnoindexが指定されている',
        evidence: [`robots metaタグ: "${metrics.robots_meta}"`],
        business_impact: 'このページは検索結果に表示されません。意図的でない場合、集客・売上機会の損失です。',
        recommended_fix: '意図的な設定でなければnoindexを削除してください。',
        implementation_owner: 'seo',
        confidence: 90,
        automatic_fix_possible: true,
        axisScores: { sales_impact: 4, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 5, difficulty: 1, cost: 1, certainty: 5 },
      }),
    );
  }

  const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  metrics.title = titleMatch ? decodeEntities(titleMatch[1].trim()) : null;
  metrics.title_length = metrics.title ? metrics.title.length : 0;
  if (!metrics.title) {
    findings.push(
      finding({
        id: 'seo-no-title',
        title: 'titleタグが存在しない',
        evidence: ['<title>タグを検出できず'],
        business_impact: '検索結果のタイトルが自動生成となり、クリック率・訴求力が低下します。',
        recommended_fix: '商品・ページ内容に即したtitleタグ（30〜60文字目安）を設定してください。',
        implementation_owner: 'seo',
        confidence: 80,
        axisScores: { sales_impact: 2, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 4, difficulty: 1, cost: 1, certainty: 4 },
      }),
    );
  }

  metrics.meta_description = getMetaContent(body, 'description');
  metrics.meta_description_length = metrics.meta_description ? metrics.meta_description.length : 0;
  if (!metrics.meta_description) {
    findings.push(
      finding({
        id: 'seo-no-meta-description',
        title: 'meta descriptionが設定されていない',
        evidence: ['<meta name="description">を検出できず'],
        business_impact: '検索結果のスニペットが自動生成となり、クリック率が下がりやすくなります。',
        recommended_fix: 'ページ内容・訴求を要約したmeta description（80〜120文字目安）を設定してください。',
        implementation_owner: 'seo',
        confidence: 75,
        axisScores: { sales_impact: 1, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 3, difficulty: 1, cost: 1, certainty: 4 },
      }),
    );
  }

  const h1s = matchAllH1(body);
  metrics.h1_count = h1s.length;
  if (metrics.h1_count === 0) {
    findings.push(
      finding({
        id: 'seo-no-h1',
        title: 'H1見出しが存在しない',
        evidence: ['<h1>タグを検出できず'],
        business_impact: 'ページの主題が検索エンジン・ユーザー双方に伝わりにくくなります。',
        recommended_fix: 'ページの主題を表すH1見出しを1つ設置してください。',
        implementation_owner: 'seo',
        confidence: 70,
        axisScores: { sales_impact: 1, cwv_impact: 0, mobile_ux_impact: 1, seo_impact: 3, difficulty: 1, cost: 1, certainty: 4 },
      }),
    );
  } else if (metrics.h1_count > 1) {
    findings.push(
      finding({
        id: 'seo-multiple-h1',
        title: `H1見出しが${metrics.h1_count}個存在する`,
        evidence: [`H1タグ検出数: ${metrics.h1_count}`],
        business_impact: 'ページの主題が分散して伝わり、SEO評価が薄まる可能性があります。',
        recommended_fix: 'H1は1ページに1つに統一し、他は適切な見出しレベル（H2以下）に変更してください。',
        implementation_owner: 'seo',
        confidence: 55,
        axisScores: { sales_impact: 0, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 2, difficulty: 1, cost: 1, certainty: 3 },
      }),
    );
  }
  metrics.heading_order_ok = checkHeadingOrder(body);

  const langMatch = body.match(/<html[^>]+lang=["']([^"']+)["']/i);
  metrics.lang = langMatch ? langMatch[1] : null;
  metrics.hreflang_count = (body.match(/rel=["']alternate["'][^>]+hreflang=/gi) || []).length;
  if (!metrics.lang) {
    findings.push(
      finding({
        id: 'seo-no-lang-attr',
        title: 'html要素にlang属性が指定されていない',
        evidence: ['<html lang="...">を検出できず'],
        business_impact: '言語判定が曖昧になり、検索結果表示や読み上げ支援ツールでの扱いに影響する可能性があります。',
        recommended_fix: '<html lang="ja">のように対象言語を明記してください。',
        implementation_owner: 'frontend',
        confidence: 70,
        automatic_fix_possible: true,
        axisScores: { sales_impact: 0, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 2, difficulty: 1, cost: 1, certainty: 4 },
      }),
    );
  }

  metrics.og_present = Boolean(getMetaProperty(body, 'og:title') || getMetaProperty(body, 'og:image'));
  metrics.twitter_card_present = Boolean(getMetaContent(body, 'twitter:card'));
  if (!metrics.og_present) {
    findings.push(
      finding({
        id: 'seo-no-ogp',
        title: 'OGP（og:title/og:image等）が設定されていない',
        evidence: ['og:title / og:imageのいずれも検出できず'],
        business_impact: 'SNSシェア時にタイトル・画像が正しく表示されず、拡散経由の流入機会を損ないます。',
        recommended_fix: 'og:title, og:description, og:image, og:type等の基本OGPタグを設定してください。',
        implementation_owner: 'seo',
        confidence: 60,
        automatic_fix_possible: true,
        axisScores: { sales_impact: 1, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 2, difficulty: 1, cost: 1, certainty: 3 },
      }),
    );
  }

  const schemaTypes = extractSchemaTypes(body);
  metrics.schema_types = schemaTypes.unique;
  metrics.schema_duplicate_types = schemaTypes.duplicates;
  if (schemaTypes.duplicates.length > 0) {
    findings.push(
      finding({
        id: 'seo-duplicate-schema',
        title: `構造化データに同一@type（${schemaTypes.duplicates.join(', ')}）の重複がある`,
        evidence: [`重複した@type: ${schemaTypes.duplicates.join(', ')}`],
        business_impact: '重複した構造化データはリッチリザルト表示の不整合・評価対象外のリスクがあります。',
        recommended_fix: '同一@typeのJSON-LDブロックを1つに統合してください。',
        implementation_owner: 'seo',
        confidence: 50,
        axisScores: { sales_impact: 0, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 2, difficulty: 2, cost: 1, certainty: 3 },
      }),
    );
  }

  const imgs = findImgTags(body);
  if (imgs.length > 0) {
    const withAlt = imgs.filter((i) => i.alt !== null && i.alt.trim() !== '').length;
    metrics.img_alt_ratio = Math.round((withAlt / imgs.length) * 100) / 100;
  }

  if (metrics.score === null) {
    let score = 100;
    if (!metrics.indexable) score -= 40;
    if (metrics.robots_txt_disallows_root) score -= 50;
    if (!metrics.title) score -= 15;
    if (!metrics.meta_description) score -= 10;
    if (metrics.h1_count === 0) score -= 10;
    else if (metrics.h1_count > 1) score -= 5;
    if (metrics.heading_order_ok === false) score -= 5;
    if (!metrics.lang) score -= 5;
    if (!metrics.og_present) score -= 5;
    if (metrics.schema_duplicate_types && metrics.schema_duplicate_types.length > 0) score -= 5;
    if (typeof metrics.img_alt_ratio === 'number' && metrics.img_alt_ratio < 0.5) score -= 10;
    metrics.score = Math.max(0, Math.min(100, score));
  }

  return { metrics, findings };
}

function matchAllH1(html) {
  return matchAllTagsWithContent(html, 'h1');
}

function matchAllTagsWithContent(html, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function checkHeadingOrder(html) {
  const re = /<h([1-6])\b/gi;
  const levels = [];
  let m;
  while ((m = re.exec(html))) levels.push(Number(m[1]));
  if (levels.length === 0) return null;
  let ok = true;
  let prev = levels[0];
  for (const lvl of levels.slice(1)) {
    if (lvl > prev + 1) ok = false;
    prev = lvl;
  }
  return ok;
}

function extractSchemaTypes(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const types = [];
  let m;
  while ((m = re.exec(html))) {
    const typeMatches = m[1].match(/"@type"\s*:\s*"([^"]+)"/g) || [];
    for (const t of typeMatches) {
      const val = t.match(/"@type"\s*:\s*"([^"]+)"/)[1];
      types.push(val);
    }
  }
  const counts = {};
  for (const t of types) counts[t] = (counts[t] || 0) + 1;
  const unique = Object.keys(counts);
  const duplicates = unique.filter((t) => counts[t] > 1);
  return { unique, duplicates };
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
