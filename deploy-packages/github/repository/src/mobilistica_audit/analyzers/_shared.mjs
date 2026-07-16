// analyzers/_shared.mjs — pure, browser-compatible helpers shared by the
// analyzer modules. Not itself one of the 10 spec'd analyzer entry points;
// exists to avoid duplicating regex-based HTML parsing and Finding
// scaffolding across files. No `node:` imports.

/** Clamp a 0-5 axis score to an integer in range. */
export function clampScore(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

export function scores({ sales_impact = 0, mobile_ux_impact = 0, seo_impact = 0, cwv_impact = 0, difficulty = 0, cost = 0, certainty = 3 } = {}) {
  return {
    sales_impact: clampScore(sales_impact),
    mobile_ux_impact: clampScore(mobile_ux_impact),
    seo_impact: clampScore(seo_impact),
    cwv_impact: clampScore(cwv_impact),
    difficulty: clampScore(difficulty),
    cost: clampScore(cost),
    certainty: clampScore(certainty),
  };
}

let counter = 0;
/** Deterministic-ish per-process issue id: <categoryPrefix>-<seq>-<slug>. */
export function issueId(prefix, slug) {
  counter += 1;
  return `${prefix}-${String(counter).padStart(3, '0')}-${slug}`;
}

/**
 * Builds a draft Finding. `p0` and `estimated_effort` are intentionally
 * absent here: p0 is consumed internally by scoring/priority.mjs (stripped
 * from the final output), estimated_effort is derived from
 * scores.difficulty + scores.cost by the pipeline, not set by analyzers.
 */
export function finding({
  id,
  title,
  evidence = [],
  business_impact,
  recommended_fix,
  implementation_owner = 'frontend',
  confidence = 60,
  automatic_fix_possible = false,
  axisScores,
  p0 = false,
}) {
  return {
    issue_id: id,
    title,
    evidence,
    business_impact,
    recommended_fix,
    implementation_owner,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
    automatic_fix_possible: Boolean(automatic_fix_possible),
    scores: scores(axisScores),
    p0: Boolean(p0),
  };
}

export function numericAudit(audits, id) {
  const a = audits && audits[id];
  if (!a) return null;
  return {
    score: typeof a.score === 'number' ? a.score : null,
    numericValue: typeof a.numericValue === 'number' ? a.numericValue : null,
    displayValue: a.displayValue || null,
    details: a.details || null,
  };
}

export function auditItems(audits, id) {
  const a = audits && audits[id];
  if (!a || !a.details || !Array.isArray(a.details.items)) return [];
  return a.details.items;
}

// ---- HTML heuristics (regex-based; no DOM parser dependency) ----

export function hasHtml(collected) {
  return Boolean(collected && collected.html && collected.html.ok && typeof collected.html.body === 'string' && collected.html.body.length > 0);
}

export function htmlBody(collected) {
  return hasHtml(collected) ? collected.html.body : '';
}

export function stripScriptsAndComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '');
}

export function matchAllTags(html, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return html.match(re) || [];
}

export function getAttr(tag, attrName) {
  const re = new RegExp(`${attrName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = tag.match(re);
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
}

export function hasAttr(tag, attrName) {
  return new RegExp(`(^|\\s)${attrName}(\\s|=|>|$)`, 'i').test(tag);
}

export function getMetaContent(html, name) {
  const re = new RegExp(`<meta[^>]+name=["']${escapeRegex(name)}["'][^>]*>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  return getAttr(m[0], 'content');
}

export function getMetaProperty(html, property) {
  const re = new RegExp(`<meta[^>]+property=["']${escapeRegex(property)}["'][^>]*>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  return getAttr(m[0], 'content');
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function countOccurrences(html, pattern) {
  const re = pattern instanceof RegExp ? new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`) : new RegExp(escapeRegex(pattern), 'gi');
  const m = html.match(re);
  return m ? m.length : 0;
}

export function findScriptSrcs(html) {
  const tags = matchAllTags(html, 'script');
  return tags.map((t) => ({ src: getAttr(t, 'src'), async: hasAttr(t, 'async'), defer: hasAttr(t, 'defer'), type: getAttr(t, 'type') })).filter((s) => s.src);
}

export function findInlineScripts(html) {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

export function findLinkTags(html) {
  return matchAllTags(html, 'link').map((t) => ({
    rel: (getAttr(t, 'rel') || '').toLowerCase(),
    href: getAttr(t, 'href'),
    as: getAttr(t, 'as'),
    tag: t,
  }));
}

export function findImgTags(html) {
  return matchAllTags(html, 'img').map((t) => ({
    src: getAttr(t, 'src') || getAttr(t, 'data-src'),
    alt: getAttr(t, 'alt'),
    loading: getAttr(t, 'loading'),
    width: getAttr(t, 'width'),
    height: getAttr(t, 'height'),
    fetchpriority: getAttr(t, 'fetchpriority'),
    tag: t,
  }));
}

export function firstMatch(html, regex) {
  const m = html.match(regex);
  return m ? m[1] ?? m[0] : null;
}
