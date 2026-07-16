// cli/lib/format.mjs
// AuditResult(JSON) → 出力文字列。実際の整形ロジックはコア(src/mobilistica_audit/reports/*.mjs)が正。
// このファイルはコアの呼び出しと、コア未完成時の「正直なフォールバック表示」のみを担う。
// 判定・整形ロジックをここに複製しないこと。

import { loadReportRenderer } from './core-loader.mjs';

/**
 * @param {'html'|'md'|'csv'|'json'} format
 * @param {object} auditResult
 * @param {{ previous?: object, logger?: import('./logger.mjs').Logger }} [opts]
 * @returns {Promise<string>}
 */
export async function renderFormat(format, auditResult, opts = {}) {
  const { previous, logger } = opts;

  if (format === 'json') {
    const payload = previous ? { current: auditResult, previous } : auditResult;
    return JSON.stringify(payload, null, 2);
  }

  if (format !== 'html' && format !== 'md' && format !== 'csv') {
    throw new Error(`renderFormatに未対応のformatが渡されました: ${format}`);
  }

  const renderer = await loadReportRenderer(format);
  if (renderer.available) {
    const content = await renderer.render(auditResult, previous ? { previous } : {});
    if (typeof content !== 'string') {
      logger?.warn(`reports/${format}.mjs の戻り値が文字列ではありません。フォールバック表示に切り替えます。`);
      return buildFallbackReport(format, auditResult, 'コアレポート関数が文字列以外を返しました');
    }
    return content;
  }

  logger?.warn(
    `reports/${format}.mjs が未実装のためフォールバック表示を使用します（${renderer.reason ?? '理由不明'}）。` +
      'コア実装完了後は自動的に正式レポートへ切り替わります。',
  );
  return buildFallbackReport(format, auditResult, renderer.reason);
}

/**
 * コアのレポート整形関数が未完成/利用不可のときの「正直な」代替表示。
 * 診断内容を捏造・要約せず、生データと欠落理由を明示するだけに留める。
 */
function buildFallbackReport(format, auditResult, reason) {
  const notice =
    `[フォールバック表示: ${format}形式の正式レポート(core/reports)が利用できません]\n` +
    `理由: ${reason ?? '不明'}\n` +
    'コア実装完了後は正式なレポート(スコア表・優先度別課題一覧・改善提案)が生成されます。\n' +
    '以下は診断結果の生データ(JSON)です。\n\n';

  const jsonBody = JSON.stringify(auditResult, null, 2);

  if (format === 'html') {
    return (
      '<!doctype html><html lang="ja"><head><meta charset="utf-8">' +
      '<title>Mobilistica Audit (fallback)</title></head><body>' +
      `<pre>${escapeHtml(notice)}${escapeHtml(jsonBody)}</pre></body></html>`
    );
  }
  if (format === 'csv') {
    // CSVとして開いても壊れないよう、コメント行として先頭に注記を置く。
    return `# ${notice.replace(/\n/g, ' ')}\n"raw_json"\n"${jsonBody.replace(/"/g, '""')}"\n`;
  }
  // md
  return `${notice}\n\`\`\`json\n${jsonBody}\n\`\`\`\n`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
