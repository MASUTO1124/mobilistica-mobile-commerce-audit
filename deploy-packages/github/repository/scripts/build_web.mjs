#!/usr/bin/env node
/**
 * build_web.mjs — ブラウザ互換モジュールを web-app/vendor/ と wordpress-plugin/assets/vendor/ へコピーする。
 * ビルドツール(バンドラ)は使わない。ESMをそのまま配布する方針(PROJECT_BRIEF準拠)。
 *   node scripts/build_web.mjs               # vendorコピー + mock-audit.json配置
 *   node scripts/build_web.mjs --plugin-zip  # 上記に加えWordPressプラグインZIPを deploy-packages/wordpress/plugin-zip/ へ生成
 */
import { cpSync, mkdirSync, existsSync, copyFileSync, rmSync, createWriteStream, readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src", "mobilistica_audit");

// ブラウザ互換モジュールのみ(core-engine-spec準拠)。Node専用collector(html/lighthouse)は含めない。
const BROWSER_SAFE = [
  "core/pipeline.mjs",
  "core/engine.browser.mjs",
  "collectors/psi.mjs",
  "analyzers",
  "scoring",
  "recommendations",
  "reports",
  "schemas",
  "security/urlguard.mjs",
];

function copyVendor(destRoot) {
  for (const entry of BROWSER_SAFE) {
    const from = join(SRC, entry);
    if (!existsSync(from)) {
      console.warn(`[skip] 未作成: ${relative(ROOT, from)}（コア実装完了後に再実行してください）`);
      continue;
    }
    const to = join(destRoot, "vendor", "mobilistica_audit", entry);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
    console.log(`[copy] ${entry} -> ${relative(ROOT, to)}`);
  }
}

function copyMock(destRoot) {
  const sample = join(ROOT, "examples", "sample-audit.json");
  if (existsSync(sample)) {
    copyFileSync(sample, join(destRoot, "mock-audit.json"));
    console.log(`[copy] examples/sample-audit.json -> ${relative(ROOT, join(destRoot, "mock-audit.json"))}`);
  } else {
    console.warn("[skip] examples/sample-audit.json 未作成");
  }
}

function buildPluginZip() {
  const pluginDir = join(ROOT, "wordpress-plugin", "mobilistica-mobile-audit");
  const outDir = join(ROOT, "deploy-packages", "wordpress", "plugin-zip");
  mkdirSync(outDir, { recursive: true });
  const zipPath = join(outDir, "mobilistica-mobile-audit.zip");
  if (existsSync(zipPath)) rmSync(zipPath);
  // Windows標準のPowerShell Compress-Archiveを使用(追加依存なし)
  execFileSync("powershell", ["-NoProfile", "-Command",
    `Compress-Archive -Path '${pluginDir}' -DestinationPath '${zipPath}' -Force`]);
  const sha = execFileSync("powershell", ["-NoProfile", "-Command",
    `(Get-FileHash '${zipPath}' -Algorithm SHA256).Hash.ToLower()`]).toString().trim();
  const fs = statSync(zipPath);
  console.log(`[zip] ${relative(ROOT, zipPath)} (${fs.size} bytes)\nsha256: ${sha}`);
  return { zipPath, sha };
}

const webApp = join(ROOT, "web-app");
const wpAssets = join(ROOT, "wordpress-plugin", "mobilistica-mobile-audit", "assets");
mkdirSync(webApp, { recursive: true });
mkdirSync(wpAssets, { recursive: true });

copyVendor(webApp);
copyMock(webApp);
copyVendor(wpAssets);
// web-app本体のUIファイルもプラグインassetsへ同期(単一実装の複製配布。編集はweb-app側が正)
for (const f of ["app.mjs", "styles.css"]) {
  const from = join(webApp, f);
  if (existsSync(from)) {
    copyFileSync(from, join(wpAssets, f));
    console.log(`[copy] web-app/${f} -> wordpress-plugin assets`);
  }
}

if (process.argv.includes("--plugin-zip")) buildPluginZip();
console.log("done");
