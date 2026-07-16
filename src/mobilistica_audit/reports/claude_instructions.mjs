// reports/claude_instructions.mjs — pure function, browser-compatible.
// Output aimed at a coding agent (Claude Code etc.) implementing the fixes.
// Strictly separates "確認すべき場所" (generic, site-agnostic investigation
// steps — never asserts an unverified concrete file path) from "実装候補"
// (the candidate fix, to be applied only after the agent has confirmed the
// actual location/markup on the real codebase).

const WHERE_TO_CHECK = {
  performance: [
    'PSIレポート（またはChrome DevTools Lighthouseタブ）のAudits欄で該当監査項目の詳細を確認する',
    'ビルド/バンドル設定（webpack.config等）またはテーマのアセット読み込み処理（wp_enqueue_script等）で該当リソースの読み込み元を検索する',
    'ブラウザDevToolsのNetwork/Performanceタブで実際の読み込み順序・所要時間を計測する',
  ],
  images: [
    'メディア管理画面（WordPressメディアライブラリ等）またはテーマの画像出力テンプレートを確認する',
    '該当画像のURLを直接開き、フォーマット・ファイルサイズ・寸法を確認する',
    'ブラウザDevToolsのElementsタブで該当<img>タグの実際の属性（loading, width, height, fetchpriority）を確認する',
  ],
  javascript_css: [
    'テーマ/プラグインが読み込んでいるscript・linkタグをブラウザDevToolsのNetworkタブまたはページソースで洗い出す',
    '各scriptの読み込み元（自社実装/プラグイン/外部サービス）を特定し、実際に使用中か確認する',
    'CSSファイルの適用範囲をDevToolsのCoverageタブ等で確認する',
  ],
  fonts: [
    'ページソース内の<link rel="preload"|"stylesheet">およびCSSの@font-face宣言を確認する',
    'フォント配信元ドメイン（Google Fonts等）とウェイト指定を実際のリクエストURLで確認する',
  ],
  delivery: [
    'ブラウザDevToolsのNetworkタブでレスポンスヘッダー（Cache-Control, Content-Encoding等）を確認する',
    'サーバー/CDN管理画面（ホスティングパネル・Cloudflare等）の設定を確認する',
  ],
  mobile_ux: [
    '実機（またはDevToolsのデバイスエミュレーション）でページを開き、レイアウト・タップ操作を確認する',
    'テーマのCSS（固定要素のposition: fixed指定箇所等）を検索する',
  ],
  commerce_ux: [
    '実際の商品詳細ページを開き、価格表示・カートボタン・パンくずの有無を目視確認する',
    'ページソース内のJSON-LD（<script type="application/ld+json">）で構造化データの内容を確認する',
    'ECプラットフォーム（WooCommerce/Shopify等）の商品テンプレートファイルを特定してから該当箇所を確認する',
  ],
  technical_seo: [
    'ページソースの<head>内（title, meta description, canonical, robots）を確認する',
    'robots.txt（/robots.txt）およびXMLサイトマップの内容を直接開いて確認する',
    'SEOプラグイン（Rank Math/Yoast等）の設定画面を確認する',
  ],
  security_headers: [
    'ブラウザDevToolsのNetworkタブでレスポンスヘッダーを確認する',
    'サーバー設定（.htaccess・nginx設定・ホスティングパネルのセキュリティ設定）を確認する',
  ],
  third_party: [
    'ページソースまたはGoogle Tag Manager管理画面で読み込み中のタグ一覧を確認する',
    '各外部スクリプトの提供元・用途（解析/広告/チャット等）を特定する',
  ],
};

/**
 * @param {object} auditResult
 * @param {{previous?:object}} [options]
 * @returns {string}
 */
export function renderClaudeInstructions(auditResult, options = {}) {
  const r = auditResult || {};
  const lines = [];

  lines.push('# Mobilisticaモバイル診断結果 → 実装エージェント向け指示書');
  lines.push('');
  lines.push(`対象URL: ${r.target_url || ''}`);
  lines.push(`診断日時: ${r.audited_at || ''}`);
  lines.push('');
  lines.push('## 重要な前提');
  lines.push('');
  lines.push('- 本指示書は自動診断（PSI API / HTML簡易解析）に基づく一般的な手順です。実際のファイルパス・プラグイン名・テーマ構成は本指示書だけでは断定できません。');
  lines.push('- 各課題の「確認すべき場所」を先に実地確認し、実在を確認できたファイル・箇所に対してのみ「実装候補」を適用してください。');
  lines.push('- 本番環境への変更は、変更前に必ずバックアップを取得し、承認フローに従ってください。');
  lines.push('');

  const findings = r.recommendations || [];
  if (findings.length === 0) {
    lines.push('検出された課題はありません。');
    return lines.join('\n');
  }

  for (const f of findings) {
    lines.push(`## [${f.priority}] ${f.title}`);
    lines.push('');
    lines.push(`- カテゴリ: ${f.category} / 対応目安: ${f.term} / 実装難易度: ${f.estimated_effort} / 確度: ${f.confidence}%`);
    lines.push(`- evidence: ${(f.evidence || []).join(' / ')}`);
    lines.push(`- 売上・導線への影響: ${f.business_impact}`);
    lines.push('');
    lines.push('### 確認すべき場所（一般的な探索手順・実在未確認）');
    for (const step of WHERE_TO_CHECK[f.category] || ['対象ページの該当箇所を実際に開いて確認する']) {
      lines.push(`- ${step}`);
    }
    lines.push('');
    lines.push('### 実装候補（確認後に適用）');
    lines.push(`- ${f.recommended_fix}`);
    if (f.platform_advice) {
      for (const [platform, advice] of Object.entries(f.platform_advice)) {
        if (!advice || platform === 'generic') continue;
        lines.push(`- （${platform}の場合）${advice}`);
      }
    }
    lines.push(`- automatic_fix_possible: ${f.automatic_fix_possible ? 'true（定型修正で対応できる可能性が高い）' : 'false（個別確認が必要）'}`);
    lines.push('');
  }

  if (options.previous) {
    lines.push('## 前回診断との比較');
    lines.push('');
    lines.push(`- 前回スコア: ${options.previous.mobile_score ?? 'N/A'} → 今回スコア: ${r.mobile_score ?? 'N/A'}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('本指示書は自動診断ツール「モバイルECサイト無料診断（Mobilistica）」による参考情報です。効果・売上を保証するものではありません。');

  return lines.join('\n');
}
