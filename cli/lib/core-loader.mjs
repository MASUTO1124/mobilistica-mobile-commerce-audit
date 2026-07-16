// cli/lib/core-loader.mjs
// src/mobilistica_audit/ 配下のコアモジュールへの動的import窓口。
// 「コアが未完成でもCLIは自己テスト可能」にするため、import失敗を例外にせず
// { available:false, reason } を返す関数群として提供する。
// 判定ロジック(SSRF判定・スコアリング・レポート整形)はここに書かない。コアの関数を呼ぶだけ。

const CORE_ENGINE_URL = new URL('../../src/mobilistica_audit/core/engine.mjs', import.meta.url);
const CORE_URLGUARD_URL = new URL('../../src/mobilistica_audit/security/urlguard.mjs', import.meta.url);
const REPORT_URLS = {
  html: new URL('../../src/mobilistica_audit/reports/html.mjs', import.meta.url),
  md: new URL('../../src/mobilistica_audit/reports/md.mjs', import.meta.url),
  csv: new URL('../../src/mobilistica_audit/reports/csv.mjs', import.meta.url),
};

// コア側のエクスポート関数名はspecで確定していないため（reports/*は関数シグネチャ未記載）、
// 実装時の揺れを吸収する候補リスト。将来コア側の正式名が判明したら先頭に追加するだけでよい。
const REPORT_EXPORT_CANDIDATES = {
  html: ['renderHtmlReport', 'renderHtml', 'toHtml', 'generateHtml', 'html', 'render', 'default'],
  md: ['renderMarkdownReport', 'renderMarkdown', 'renderMd', 'toMarkdown', 'toMd', 'generateMarkdown', 'markdown', 'md', 'render', 'default'],
  csv: ['renderCsvReport', 'renderCsv', 'toCsv', 'generateCsv', 'csv', 'render', 'default'],
};

async function tryImport(url) {
  try {
    const mod = await import(url);
    return { available: true, mod };
  } catch (err) {
    // モジュール未実装(コア未完成)・構文エラーいずれもここに来る。
    // 未完成時は "not yet implemented" 相当として扱い、CLI側はフォールバック表示にする。
    return { available: false, reason: err.message, error: err };
  }
}

/** @returns {Promise<{available:boolean, runAudit?: Function, reason?: string}>} */
export async function loadCoreEngine() {
  const result = await tryImport(CORE_ENGINE_URL);
  if (!result.available) return { available: false, reason: result.reason };
  if (typeof result.mod.runAudit !== 'function') {
    return { available: false, reason: 'core/engine.mjs に runAudit のexportが見つかりません' };
  }
  return { available: true, runAudit: result.mod.runAudit };
}

/** @returns {Promise<{available:boolean, validateUrlSyntax?: Function, reason?: string}>} */
export async function loadUrlGuard() {
  const result = await tryImport(CORE_URLGUARD_URL);
  if (!result.available) return { available: false, reason: result.reason };
  if (typeof result.mod.validateUrlSyntax !== 'function') {
    return { available: false, reason: 'security/urlguard.mjs に validateUrlSyntax のexportが見つかりません' };
  }
  return { available: true, validateUrlSyntax: result.mod.validateUrlSyntax };
}

/**
 * @param {'html'|'md'|'csv'} format
 * @returns {Promise<{available:boolean, render?: Function, reason?: string}>}
 */
export async function loadReportRenderer(format) {
  const url = REPORT_URLS[format];
  if (!url) return { available: false, reason: `未対応のformat: ${format}` };

  const result = await tryImport(url);
  if (!result.available) return { available: false, reason: result.reason };

  const candidates = REPORT_EXPORT_CANDIDATES[format];
  for (const name of candidates) {
    const fn = result.mod[name];
    if (typeof fn === 'function') {
      return { available: true, render: fn };
    }
  }
  return {
    available: false,
    reason: `reports/${format}.mjs から呼び出し可能なexport関数が見つかりません（試行: ${candidates.join(', ')}）`,
  };
}
