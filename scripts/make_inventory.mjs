#!/usr/bin/env node
/** deploy-packages/github/ の public-file-inventory.md と sha256.txt、および reports/ARTIFACTS_SHA256.md を生成 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:");

function walk(dir, skip = []) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (skip.some((s) => p.includes(s))) continue;
    if (e.isDirectory()) out.push(...walk(p, skip));
    else out.push(p);
  }
  return out;
}

// 1) 公開リポジトリのファイル一覧（git archiveエクスポート＝公開時と同一内容）
const repoDir = join(ROOT, "deploy-packages", "github", "repository");
const repoFiles = walk(repoDir).sort();
let inv = "# 公開ファイル一覧（git archive main = 公開時と同一内容・.gitignore適用済み）\n\n";
inv += `総ファイル数: ${repoFiles.length}\n\n| path | bytes | sha256 |\n|---|---|---|\n`;
let shaTxt = "";
for (const f of repoFiles) {
  const rel = relative(repoDir, f).split("\\").join("/");
  const buf = readFileSync(f);
  const sha = createHash("sha256").update(buf).digest("hex");
  inv += `| ${rel} | ${buf.length} | ${sha.slice(0, 16)}… |\n`;
  shaTxt += `${sha}  ${rel}\n`;
}
writeFileSync(join(ROOT, "deploy-packages", "github", "public-file-inventory.md"), inv);
writeFileSync(join(ROOT, "deploy-packages", "github", "sha256.txt"), shaTxt);

// 2) プロジェクト全成果物のSHA256（最終報告用・生成物含む/git管理外含む）
const allFiles = walk(ROOT, [".git", "node_modules", "deploy-packages\\github\\repository"]).sort();
let art = "# 全成果物 SHA256一覧（最終報告 Phase「実在成果物」用）\n\n";
art += `生成日時: ${new Date().toISOString()} / 総ファイル数: ${allFiles.length}\n\n| path | bytes | sha256 |\n|---|---|---|\n`;
let total = 0;
for (const f of allFiles) {
  const rel = relative(ROOT, f).split("\\").join("/");
  const buf = readFileSync(f);
  total += buf.length;
  art += `| ${rel} | ${buf.length} | ${createHash("sha256").update(buf).digest("hex")} |\n`;
}
art += `\n合計サイズ: ${(total / 1024).toFixed(1)} KB\n`;
writeFileSync(join(ROOT, "reports", "ARTIFACTS_SHA256.md"), art);
console.log(`repository files: ${repoFiles.length} / all artifacts: ${allFiles.length} / total ${(total / 1024).toFixed(0)}KB`);
