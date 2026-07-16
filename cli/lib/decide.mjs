// cli/lib/decide.mjs
// AuditResultから終了コードを決定する。
// docs/specs/cli-spec.md: 「1=診断は走ったがP0検出 or データ全滅」
// 判定基準そのもの(何がP0か等)はコア(scoring/priority.mjs)が正。ここでは結果を読むだけ。

import { EXIT_CODES } from './errors.mjs';

/**
 * @param {object} auditResult - AuditResult(またはモック)
 * @returns {{exitCode:number, hasP0:boolean, dataUnavailable:boolean}}
 */
export function decideExitCode(auditResult) {
  const hasP0 = Array.isArray(auditResult?.recommendations)
    ? auditResult.recommendations.some((f) => f?.priority === 'P0')
    : false;

  const dataSourcesCount = Array.isArray(auditResult?.data_sources) ? auditResult.data_sources.length : 0;
  const mobileScoreIsNull = auditResult?.mobile_score === null || auditResult?.mobile_score === undefined;
  // AuditResultの仕様に明記された data_status フィールドがあれば最優先で使う。
  const explicitUnavailable = auditResult?.data_status === 'unavailable';
  const dataUnavailable = explicitUnavailable || (dataSourcesCount === 0 && mobileScoreIsNull);

  const exitCode = hasP0 || dataUnavailable ? EXIT_CODES.AUDIT_ISSUES_OR_NO_DATA : EXIT_CODES.OK;
  return { exitCode, hasP0, dataUnavailable };
}
