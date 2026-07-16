/**
 * app.mjs — Web診断UIの制御。判定ロジックは持たない（vendor/のコア共通モジュールに委譲）。
 * データフロー: URL入力 → validateUrlSyntax → fetchPsi(ブラウザ直 or WPプロキシ) → analyzeCollected → 描画
 */
import { validateUrlSyntax } from "./vendor/mobilistica_audit/security/urlguard.mjs";
import { fetchPsi } from "./vendor/mobilistica_audit/collectors/psi.mjs";
import { analyzeCollected } from "./vendor/mobilistica_audit/core/pipeline.mjs";
import * as htmlReport from "./vendor/mobilistica_audit/reports/html.mjs";

const $ = (id) => document.getElementById(id);
const CFG = window.MOBILISTICA_AUDIT_CONFIG || {};
let abortCtl = null;

// ---- GA4（個人情報・URL全体は送らない。ドメインのSHA-256先頭12桁のみ） ----
async function siteHash(url) {
  try {
    const host = new URL(url).hostname;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(host));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
  } catch { return "unknown"; }
}
async function track(event, url) {
  if (!Array.isArray(window.dataLayer)) return; // GA4未導入でも動作
  window.dataLayer.push({ event, site_hash: url ? await siteHash(url) : undefined });
}

// ---- 収集（プロキシ設定があればサーバー経由、なければPSI APIへブラウザ直） ----
async function collect(url, signal) {
  if (CFG.proxyUrl) {
    const res = await fetch(CFG.proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-WP-Nonce": CFG.nonce || "" },
      body: JSON.stringify({ url, strategy: "mobile" }),
      signal,
    });
    if (!res.ok) throw new Error(res.status === 429 ? "アクセスが集中しています。しばらく待ってから再実行してください。" : `診断サーバーエラー (HTTP ${res.status})`);
    return await res.json(); // プロキシはPSI生レスポンスを返す
  }
  return await fetchPsi(url, { strategy: "mobile", signal });
}

function reportHtmlOf(result) {
  const fn = htmlReport.renderHtmlReport || htmlReport.render || htmlReport.renderHtml || htmlReport.default;
  return fn(result);
}

// ---- 描画 ----
function priorityBadge(p) {
  return `<span class="badge badge-${p.toLowerCase()}">${p}</span>`;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function renderResult(result) {
  const cwv = result.core_web_vitals || {};
  // core_web_vitals の各指標は {value, rating} 形（sample-audit.json実形状）。数値直入れの後方互換も持つ。
  const num = (m) => (m && typeof m === "object" ? m.value : m);
  const fmt = (m, unit) => {
    const v = num(m);
    if (v == null || Number.isNaN(v)) return "—";
    return unit === "s" ? (v / 1000).toFixed(1) + "s" : unit === "ms" ? Math.round(v) + "ms" : v;
  };
  const top = (result.recommendations || []).slice(0, 5);
  const el = $("result");
  el.innerHTML = `
    <h2>診断結果</h2>
    <p class="target-url">対象: <code>${esc(result.final_url || result.target_url)}</code>（${esc(result.audited_at)}）</p>
    <div class="score-row">
      <div class="score-card"><span class="score-num">${result.summary?.overall_score ?? "—"}</span><span class="score-label">モバイルECスコア（${esc(result.summary?.grade ?? "-")}）</span></div>
      <div class="score-card"><span class="score-num">${result.mobile_score ?? "—"}</span><span class="score-label">PageSpeedスコア</span></div>
    </div>
    <table class="cwv-table"><caption>Core Web Vitals</caption>
      <thead><tr><th scope="col">LCP</th><th scope="col">INP</th><th scope="col">CLS</th><th scope="col">TTFB</th></tr></thead>
      <tbody><tr><td>${fmt(cwv.lcp_ms, "s")}</td><td>${fmt(cwv.inp_ms, "ms")}</td><td>${num(cwv.cls) ?? "—"}</td><td>${fmt(cwv.ttfb_ms, "s")}</td></tr></tbody>
    </table>
    <h3>優先して直すべき課題 上位${top.length}件</h3>
    <ol class="issues">${top.map((f) => `
      <li>${priorityBadge(f.priority)} <strong>${esc(f.title)}</strong>
        <p class="impact">${esc(f.business_impact)}</p>
        <p class="fix">対応: ${esc(f.recommended_fix)}（目安: ${esc(f.estimated_effort)} / 担当: ${esc(f.implementation_owner)}）</p>
      </li>`).join("")}
    </ol>
    ${result.limitations?.length ? `<details class="limitations"><summary>この診断の制約（${result.limitations.length}件）</summary><ul>${result.limitations.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></details>` : ""}
    <div class="actions">
      <button type="button" id="dl-html">詳細レポートを保存（HTML）</button>
      <button type="button" id="dl-json" class="secondary">JSONで保存</button>
      <button type="button" id="share-btn" class="secondary">この診断を共有</button>
      <button type="button" id="print-btn" class="secondary">印刷</button>
    </div>
    <p class="next-steps">さらに詳しく: <a href="https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit" rel="noopener">GitHubでCLI版・Claude Codeスキルを見る</a> ／ <a href="https://www.mobilistica.com/?p=635">実際に28→76点へ改善した事例を読む</a></p>`;
  el.hidden = false;

  $("dl-html").addEventListener("click", () => {
    download(`mobilistica-audit-${result.audit_id}.html`, reportHtmlOf(result), "text/html");
    track("report_downloaded", result.target_url);
  });
  $("dl-json").addEventListener("click", () => {
    download(`mobilistica-audit-${result.audit_id}.json`, JSON.stringify(result, null, 2), "application/json");
    track("report_downloaded", result.target_url);
  });
  $("share-btn").addEventListener("click", async () => {
    const shareUrl = location.origin + location.pathname + "#u=" + encodeURIComponent(result.target_url);
    try { await navigator.clipboard.writeText(shareUrl); alert("共有用URLをコピーしました"); } catch { prompt("共有用URL:", shareUrl); }
    track("audit_shared", result.target_url);
  });
  $("print-btn").addEventListener("click", () => window.print());
}

function download(name, content, mime) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: mime + ";charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function showError(msg) {
  $("loading").hidden = true;
  $("error-message").textContent = msg;
  $("error-panel").hidden = false;
}

// ---- 実行 ----
async function runAuditUi(url) {
  $("input-error").hidden = true;
  $("error-panel").hidden = true;
  $("result").hidden = true;

  const verdict = validateUrlSyntax(url);
  if (!verdict.ok) {
    $("input-error").textContent = verdict.reason_ja || "URLの形式が正しくありません。https:// から始まる公開URLを入力してください。";
    $("input-error").hidden = false;
    return;
  }

  $("loading").hidden = false;
  $("submit-btn").disabled = true;
  abortCtl = new AbortController();
  const timeout = setTimeout(() => abortCtl.abort(), 90000);
  track("audit_started", url);

  try {
    const psi = await collect(url, abortCtl.signal);
    const result = analyzeCollected({ psi, target_url: url, final_url: psi?.lighthouseResult?.finalDisplayedUrl || url, strategy: "mobile" });
    renderResult(result);
    track("audit_completed", url);
  } catch (e) {
    track("audit_failed", url);
    showError(e.name === "AbortError"
      ? "診断がタイムアウトしました。対象サイトが混み合っているか、応答が非常に遅い可能性があります。時間をおいて再実行してください。"
      : (e.message || "診断中にエラーが発生しました。"));
  } finally {
    clearTimeout(timeout);
    $("loading").hidden = true;
    $("submit-btn").disabled = false;
  }
}

// ---- 初期化 ----
track("audit_form_view");
$("audit-form").addEventListener("submit", (e) => {
  e.preventDefault();
  runAuditUi($("url-input").value.trim());
});
$("retry-btn").addEventListener("click", () => runAuditUi($("url-input").value.trim()));
$("cancel-btn").addEventListener("click", () => abortCtl?.abort());
["link-github", "link-cli", "link-skill", "link-case"].forEach((id, i) => {
  $(id)?.addEventListener("click", () => track(["github_clicked", "cli_install_clicked", "skill_install_clicked", "case_study_clicked"][i]));
});

// 共有URL(#u=...)からの再現・モックフック(?mock=1)
const hashUrl = new URLSearchParams(location.hash.slice(1)).get("u");
if (hashUrl) { $("url-input").value = hashUrl; runAuditUi(hashUrl); }
if (new URLSearchParams(location.search).get("mock") === "1") {
  fetch("./mock-audit.json").then((r) => r.json()).then(renderResult)
    .catch(() => showError("mock-audit.json が見つかりません。scripts/build_web.mjs を実行してください。"));
}
