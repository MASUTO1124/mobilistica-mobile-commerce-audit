// analyzers/mobile_ux.mjs — pure function, browser-compatible.
// viewport meta / tap-targets / font-size / fixed-element & interstitial
// heuristics (HTML-only, always marked "(推定)") / CLS contributing factors.

import { finding, numericAudit, hasHtml, htmlBody, getMetaContent, countOccurrences, findImgTags } from './_shared.mjs';

export function analyze(collected) {
  const findings = [];
  const psi = collected && collected.psi;
  const audits = psi && psi.ok ? psi.audits : null;

  const metrics = {
    source: hasHtml(collected) ? 'html_fallback' : audits ? 'psi' : 'unavailable',
    viewport_present: null,
    viewport_content: null,
    tap_targets_ok: null,
    font_size_ok: null,
    fixed_element_detected: null,
    interstitial_detected: null,
    cls_risk_unsized_images: null,
    score: null,
  };

  if (hasHtml(collected)) {
    const body = htmlBody(collected);
    const viewport = getMetaContent(body, 'viewport');
    metrics.viewport_present = Boolean(viewport);
    metrics.viewport_content = viewport;

    if (!viewport) {
      findings.push(
        finding({
          id: 'mux-no-viewport',
          title: 'viewportメタタグが無く、モバイルで正しく縮小表示されない',
          evidence: ['<meta name="viewport">が検出できない'],
          business_impact: 'PC向けレイアウトのままモバイル表示され、横スクロールや極小文字により購入操作自体が困難になります。',
          recommended_fix: '<meta name="viewport" content="width=device-width, initial-scale=1">をheadに追加してください。',
          implementation_owner: 'frontend',
          confidence: 80,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 5, cwv_impact: 1, mobile_ux_impact: 5, seo_impact: 3, difficulty: 1, cost: 1, certainty: 4 },
          p0: true,
        }),
      );
    } else if (!/width\s*=\s*device-width/i.test(viewport)) {
      findings.push(
        finding({
          id: 'mux-viewport-not-device-width',
          title: 'viewportがdevice-widthを指定しておらず表示崩れの可能性',
          evidence: [`viewport content: "${viewport}"`],
          business_impact: '固定幅指定のviewportは端末サイズに応じた最適表示ができず、操作性を損ないます。',
          recommended_fix: 'content="width=device-width, initial-scale=1"に変更してください。',
          implementation_owner: 'frontend',
          confidence: 55,
          automatic_fix_possible: true,
          axisScores: { sales_impact: 3, cwv_impact: 0, mobile_ux_impact: 4, seo_impact: 1, difficulty: 1, cost: 1, certainty: 3 },
        }),
      );
    }

    // Fixed/sticky element heuristic — inline style or common class names for
    // fixed headers/footers/chat widgets that can obscure CTAs on mobile.
    const fixedHits = countOccurrences(body, /position\s*:\s*fixed/i) + countOccurrences(body, /class=["'][^"']*\b(sticky|fixed-(top|bottom)|fixed-header|fixed-footer)\b/i);
    metrics.fixed_element_detected = fixedHits > 0;
    if (fixedHits >= 2) {
      findings.push(
        finding({
          id: 'mux-fixed-elements',
          title: '固定表示要素（sticky/fixed）を複数検出（推定）',
          evidence: [`position:fixed相当の指定を${fixedHits}箇所検出（HTML簡易走査・実表示上のCTA被りは未確認のため(推定)）`],
          business_impact: '固定ヘッダー/チャットウィジェット等がCTAボタンに重なると、購入ボタンが押せない・押しにくい状態になり得ます。',
          recommended_fix: '実機（特に小型スマホ）でCTAボタンとの重なりを目視確認し、必要に応じてz-index・余白を調整してください。',
          implementation_owner: 'designer',
          confidence: 30,
          axisScores: { sales_impact: 2, cwv_impact: 0, mobile_ux_impact: 2, seo_impact: 0, difficulty: 1, cost: 1, certainty: 1 },
        }),
      );
    }

    // Interstitial heuristic — full-screen modal / popup patterns appearing
    // near page load (common newsletter/age-gate/app-install interstitials).
    const interstitialHits = countOccurrences(body, /class=["'][^"']*\b(modal|popup|interstitial|overlay)\b[^"']*["']/i);
    metrics.interstitial_detected = interstitialHits > 0;
    if (interstitialHits > 0) {
      findings.push(
        finding({
          id: 'mux-interstitial-heuristic',
          title: 'ポップアップ/モーダル要素を検出（推定）',
          evidence: [`modal/popup系クラス名を${interstitialHits}箇所検出（表示タイミング・全画面化の有無は未確認のため(推定)）`],
          business_impact: 'ページ読み込み直後に全画面ポップアップが出ると、Googleの「侵入型インタースティシャル」評価やユーザー離脱の原因になり得ます。',
          recommended_fix: '実機でポップアップの表示タイミング・閉じやすさを確認し、初回訪問直後の全画面表示は避けてください。',
          implementation_owner: 'designer',
          confidence: 25,
          axisScores: { sales_impact: 1, cwv_impact: 0, mobile_ux_impact: 2, seo_impact: 1, difficulty: 1, cost: 1, certainty: 1 },
        }),
      );
    }

    const imgs = findImgTags(body);
    const unsized = imgs.filter((i) => !i.width || !i.height).length;
    metrics.cls_risk_unsized_images = unsized;
  }

  if (audits) {
    const tapTargets = numericAudit(audits, 'tap-targets');
    if (tapTargets) {
      metrics.tap_targets_ok = tapTargets.score === 1;
      if (tapTargets.score !== null && tapTargets.score < 1) {
        findings.push(
          finding({
            id: 'mux-tap-targets-small',
            title: 'タップ領域が小さい/近すぎるボタンがある',
            evidence: [`PSI tap-targets監査スコア: ${tapTargets.score}`],
            business_impact: 'ボタン同士が近すぎると誤タップが発生し、カート追加や決済ボタンの押し間違いにつながります。',
            recommended_fix: 'タップ領域を48x48px以上確保し、隣接ボタンとの間隔を空けてください。',
            implementation_owner: 'designer',
            confidence: 65,
            axisScores: { sales_impact: 3, cwv_impact: 0, mobile_ux_impact: 4, seo_impact: 0, difficulty: 2, cost: 1, certainty: 3 },
          }),
        );
      }
    }

    const fontSize = numericAudit(audits, 'font-size');
    if (fontSize) {
      metrics.font_size_ok = fontSize.score === 1;
      if (fontSize.score !== null && fontSize.score < 1) {
        findings.push(
          finding({
            id: 'mux-font-size-small',
            title: '読みにくい小さいフォントサイズの箇所がある',
            evidence: [`PSI font-size監査スコア: ${fontSize.score}`],
            business_impact: '本文が小さすぎると拡大操作が必要になり、モバイルでの離脱率が上がります。',
            recommended_fix: '本文フォントサイズを16px以上に統一してください。',
            implementation_owner: 'designer',
            confidence: 60,
            axisScores: { sales_impact: 1, cwv_impact: 0, mobile_ux_impact: 3, seo_impact: 1, difficulty: 1, cost: 1, certainty: 3 },
          }),
        );
      }
    }
  }

  if (metrics.source !== 'unavailable') {
    let score = 100;
    if (metrics.viewport_present === false) score -= 50;
    else if (metrics.viewport_content && !/width\s*=\s*device-width/i.test(metrics.viewport_content)) score -= 15;
    if (metrics.fixed_element_detected) score -= 10;
    if (metrics.interstitial_detected) score -= 10;
    if (metrics.tap_targets_ok === false) score -= 15;
    if (metrics.font_size_ok === false) score -= 10;
    metrics.score = Math.max(0, Math.min(100, score));
  }

  return { metrics, findings };
}
