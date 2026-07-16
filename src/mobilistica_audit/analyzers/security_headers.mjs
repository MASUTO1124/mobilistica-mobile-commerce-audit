// analyzers/security_headers.mjs — pure function, browser-compatible.
// HTTPS / HSTS / mixed content (HTML scan for http:// sub-resources on an
// https page) / X-Content-Type-Options / CSP presence (informational only,
// capped at P4 per spec).

import { finding, hasHtml, htmlBody } from './_shared.mjs';

export function analyze(collected) {
  const findings = [];
  const html = collected && collected.html;
  const headers = (html && html.headers) || (collected && collected.headers) || null;
  const finalUrl = (html && html.finalUrl) || collected?.final_url || collected?.target_url || '';

  const metrics = {
    https: null,
    hsts_present: null,
    mixed_content_detected: null,
    mixed_content_count: null,
    x_content_type_options_present: null,
    csp_present: null,
  };

  let isHttps = null;
  try {
    isHttps = new URL(finalUrl).protocol === 'https:';
  } catch {
    isHttps = null;
  }
  metrics.https = isHttps;

  if (isHttps === false) {
    findings.push(
      finding({
        id: 'sec-no-https',
        title: 'サイトがHTTPS化されていない',
        evidence: [`最終URL: ${finalUrl}`],
        business_impact: 'ブラウザに「保護されていない通信」と警告され、購入者が個人情報・決済情報の入力を躊躇します。購入完了率に直接影響する重大な問題です。',
        recommended_fix: 'SSL証明書を導入し、サイト全体をHTTPS化してください（常時SSL化）。',
        implementation_owner: 'server',
        confidence: 95,
        axisScores: { sales_impact: 5, cwv_impact: 0, mobile_ux_impact: 2, seo_impact: 4, difficulty: 2, cost: 2, certainty: 5 },
        p0: true,
      }),
    );
  }

  if (headers) {
    metrics.hsts_present = Boolean(headers['strict-transport-security']);
    metrics.x_content_type_options_present = Boolean(headers['x-content-type-options']);
    metrics.csp_present = Boolean(headers['content-security-policy']);

    if (isHttps && !metrics.hsts_present) {
      findings.push(
        finding({
          id: 'sec-no-hsts',
          title: 'HSTS（Strict-Transport-Security）ヘッダーが未設定',
          evidence: ['レスポンスヘッダーにStrict-Transport-Securityが存在しない'],
          business_impact: 'HTTP経由のアクセスがHTTPSへ自動的に強制されず、中間者攻撃・意図しない平文通信のリスクが残ります。',
          recommended_fix: 'Strict-Transport-Securityヘッダー（例: max-age=31536000; includeSubDomains）を設定してください。',
          implementation_owner: 'server',
          confidence: 60,
          axisScores: { sales_impact: 1, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 0, difficulty: 1, cost: 1, certainty: 4 },
        }),
      );
    }

    if (!metrics.x_content_type_options_present) {
      findings.push(
        finding({
          id: 'sec-no-xcto',
          title: 'X-Content-Type-Optionsヘッダーが未設定',
          evidence: ['レスポンスヘッダーにX-Content-Type-Optionsが存在しない'],
          business_impact: 'MIME種別のスニッフィングによる一部の攻撃手法に対する防御が不足しています（直接的な売上影響は小）。',
          recommended_fix: 'X-Content-Type-Options: nosniff を設定してください。',
          implementation_owner: 'server',
          confidence: 50,
          axisScores: { sales_impact: 0, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 0, difficulty: 1, cost: 1, certainty: 4 },
        }),
      );
    }

    if (!metrics.csp_present) {
      findings.push(
        finding({
          id: 'sec-no-csp',
          title: 'Content-Security-Policyが未設定（情報提供）',
          evidence: ['レスポンスヘッダーにContent-Security-Policyが存在しない'],
          business_impact: 'CSP未設定自体は直ちに売上へ影響しませんが、XSS等への多層防御が手薄です。',
          recommended_fix: '段階的にCSPを導入してください（Report-Onlyモードからの試験導入を推奨）。',
          implementation_owner: 'server',
          confidence: 40,
          axisScores: { sales_impact: 0, cwv_impact: 0, mobile_ux_impact: 0, seo_impact: 0, difficulty: 3, cost: 2, certainty: 3 },
        }),
      );
    }
  }

  if (isHttps && hasHtml(collected)) {
    const body = htmlBody(collected);
    const mixedMatches = body.match(/\b(src|href)\s*=\s*["']http:\/\/[^"']+["']/gi) || [];
    metrics.mixed_content_count = mixedMatches.length;
    metrics.mixed_content_detected = mixedMatches.length > 0;

    const activeMixed = mixedMatches.filter((m) => /^\s*src/i.test(m) && /\.(js)["']?$/i.test(m));
    if (activeMixed.length > 0) {
      findings.push(
        finding({
          id: 'sec-mixed-content-active',
          title: 'HTTPSページ内にHTTP経由のスクリプト（active mixed content）を検出',
          evidence: [`http://で読み込まれるscript src: ${activeMixed.length}件`],
          business_impact: 'ブラウザがスクリプトの読み込みをブロックし機能不全になる、または警告表示で信頼性が損なわれます。',
          recommended_fix: '該当リソースをhttps://へ変更してください。',
          implementation_owner: 'frontend',
          confidence: 70,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 4, cwv_impact: 0, mobile_ux_impact: 3, seo_impact: 2, difficulty: 1, cost: 1, certainty: 4 },
          p0: true,
        }),
      );
    } else if (metrics.mixed_content_detected) {
      findings.push(
        finding({
          id: 'sec-mixed-content-passive',
          title: 'HTTPSページ内にHTTP経由のリソース（画像等）を検出',
          evidence: [`http://で読み込まれるリソース: ${mixedMatches.length}件`],
          business_impact: 'ブラウザの「保護されていない通信」警告や画像のブロックにより、購入者の信頼を損なう可能性があります。',
          recommended_fix: '該当リソースをhttps://へ変更してください。',
          implementation_owner: 'frontend',
          confidence: 60,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 2, cwv_impact: 0, mobile_ux_impact: 1, seo_impact: 1, difficulty: 1, cost: 1, certainty: 4 },
        }),
      );
    }
  }

  return { metrics, findings };
}
