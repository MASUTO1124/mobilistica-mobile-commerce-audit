// reports/csv.mjs — pure function, browser-compatible.
// Findings list as UTF-8 BOM-prefixed CSV (Excel-friendly). Accepts
// options.previous for an appended Before/After comparison block.

const HEADERS = [
  'issue_id',
  'category',
  'priority',
  'title',
  'business_impact',
  'recommended_fix',
  'implementation_owner',
  'estimated_effort',
  'confidence',
  'automatic_fix_possible',
  'term',
  'evidence',
];

/**
 * @param {object} auditResult
 * @param {{previous?:object}} [options]
 * @returns {string}
 */
export function renderCsvReport(auditResult, options = {}) {
  const r = auditResult || {};
  const rows = [HEADERS.join(',')];

  for (const f of r.recommendations || []) {
    const row = HEADERS.map((h) => {
      if (h === 'evidence') return csvEscape((f.evidence || []).join(' | '));
      return csvEscape(f[h]);
    });
    rows.push(row.join(','));
  }

  let csv = rows.join('\r\n');

  if (options.previous) {
    csv += '\r\n\r\n' + buildComparisonBlock(r, options.previous);
  }

  return '﻿' + csv; // UTF-8 BOM so Excel opens the CSV without mangling Japanese text
}

function buildComparisonBlock(current, previous) {
  const lines = ['# Before/After比較', 'metric,before,after'];
  lines.push(`mobile_score,${csvEscape(previous.mobile_score)},${csvEscape(current.mobile_score)}`);
  for (const p of ['P0', 'P1', 'P2', 'P3', 'P4']) {
    lines.push(`${p}件数,${countPriority(previous, p)},${countPriority(current, p)}`);
  }
  return lines.join('\r\n');
}

function countPriority(auditResult, p) {
  return ((auditResult && auditResult.recommendations) || []).filter((f) => f.priority === p).length;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
