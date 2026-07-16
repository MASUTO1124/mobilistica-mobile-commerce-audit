// reports/md.mjs — pure function, browser-compatible.
// Two-part Markdown: executive summary (経営者向け) first, then technical
// detail (制作者向け). Accepts options.previous for a Before/After section.

const PRIORITY_LABEL_JA = {
  P0: 'P0（購入不能級）',
  P1: 'P1（緊急）',
  P2: 'P2（重要）',
  P3: 'P3（推奨）',
  P4: 'P4（任意）',
};

/**
 * @param {object} auditResult
 * @param {{previous?:object}} [options]
 * @returns {string}
 */
export function renderMarkdownReport(auditResult, options = {}) {
  const r = auditResult || {};
  const lines = [];

  // --- Part 1: 経営者向け要約 ---
  lines.push(`# モバイルECサイト無料診断レポート`);
  lines.push('');
  lines.push(`対象URL: ${r.target_url || ''}`);
  lines.push(`診断日時: ${r.audited_at || ''}（戦略: ${r.strategy || 'mobile'}）`);
  lines.push('');
  lines.push('## 経営者向けサマリー');
  lines.push('');
  lines.push(`- 総合スコア: **${r.mobile_score != null ? r.mobile_score : 'N/A'}点**${r.summary?.grade ? `（評価: ${r.summary.grade}）` : ''}`);
  lines.push(`- ${r.summary?.executive_summary_ja || ''}`);
  lines.push('');

  if ((r.summary?.top_issues || []).length > 0) {
    lines.push('### 優先度上位の課題');
    lines.push('');
    for (const issue of r.summary.top_issues) {
      lines.push(`1. **[${PRIORITY_LABEL_JA[issue.priority] || issue.priority}]** ${issue.title}`);
    }
    lines.push('');
  }

  if (options.previous) {
    lines.push('### Before / After 比較');
    lines.push('');
    lines.push('| 指標 | Before | After |');
    lines.push('|---|---|---|');
    lines.push(`| 総合スコア | ${options.previous.mobile_score ?? 'N/A'} | ${r.mobile_score ?? 'N/A'} |`);
    lines.push(`| P0件数 | ${countPriority(options.previous, 'P0')} | ${countPriority(r, 'P0')} |`);
    lines.push(`| P1件数 | ${countPriority(options.previous, 'P1')} | ${countPriority(r, 'P1')} |`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // --- Part 2: 制作者向け技術詳細 ---
  lines.push('## 制作者向け技術詳細');
  lines.push('');
  lines.push('### Core Web Vitals');
  lines.push('');
  lines.push('| 指標 | 実測値 | 評価 |');
  lines.push('|---|---|---|');
  const cwv = r.core_web_vitals || {};
  lines.push(cwvRow('LCP', cwv.lcp_ms, 'ms'));
  lines.push(cwvRow('INP', cwv.inp_ms, 'ms'));
  lines.push(cwvRow('CLS', cwv.cls, ''));
  lines.push(cwvRow('TBT', cwv.tbt_ms, 'ms'));
  lines.push(cwvRow('FCP', cwv.fcp_ms, 'ms'));
  lines.push(cwvRow('SI', cwv.si_ms, 'ms'));
  lines.push(cwvRow('TTFB', cwv.ttfb_ms, 'ms'));
  lines.push('');

  lines.push('### 課題一覧（全件・優先度順）');
  lines.push('');
  const findings = r.recommendations || [];
  if (findings.length === 0) {
    lines.push('検出された課題はありません。');
  } else {
    for (const f of findings) {
      lines.push(`#### [${f.priority}] ${f.title}`);
      lines.push('');
      lines.push(`- カテゴリ: ${f.category} / 対応目安: ${f.term} / 実装難易度: ${f.estimated_effort} / 実装担当目安: ${f.implementation_owner} / 確度: ${f.confidence}%`);
      lines.push(`- evidence: ${(f.evidence || []).join(' / ')}`);
      lines.push(`- 売上・導線への影響: ${f.business_impact}`);
      lines.push(`- 推奨対応: ${f.recommended_fix}`);
      if (f.platform_advice) {
        const advice = Object.entries(f.platform_advice)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' / ');
        if (advice) lines.push(`- プラットフォーム別補足: ${advice}`);
      }
      lines.push('');
    }
  }

  lines.push('### データ取得元・診断範囲の限界');
  lines.push('');
  for (const s of r.data_sources || []) lines.push(`- 使用データ元: ${s}`);
  for (const l of r.limitations || []) lines.push(`- ${l}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('本レポートは自動診断ツール「モバイルECサイト無料診断（Mobilistica）」による参考情報です。効果・順位・売上を保証するものではありません。');
  lines.push(`audit_id: ${r.audit_id || ''}`);

  return lines.join('\n');
}

function cwvRow(label, metric, unit) {
  if (!metric || metric.value == null) return `| ${label} | — | データなし |`;
  const value = unit === 'ms' ? Math.round(metric.value) : metric.value;
  return `| ${label} | ${value}${unit} | ${metric.rating || 'データなし'} |`;
}

function countPriority(auditResult, p) {
  return ((auditResult && auditResult.recommendations) || []).filter((f) => f.priority === p).length;
}
