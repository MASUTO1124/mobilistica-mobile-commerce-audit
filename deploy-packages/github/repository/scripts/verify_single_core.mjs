#!/usr/bin/env node
/** 3形態同一性の機械的証明: vendor配布物がsrc/とバイト一致するか（Phase21「判定ロジックが別々になってはいけない」の検証） */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

function hashDir(dir) {
  const out = {};
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[relative(dir, p).split("\\").join("/")] = createHash("sha256").update(readFileSync(p)).digest("hex");
    }
  })(dir);
  return out;
}

const src = hashDir("src/mobilistica_audit");
const webVendor = hashDir("web-app/vendor/mobilistica_audit");
const wpVendor = hashDir("wordpress-plugin/mobilistica-mobile-audit/assets/vendor/mobilistica_audit");

let mismatch = 0, checked = 0;
for (const [rel, h] of Object.entries(webVendor)) {
  checked++;
  if (src[rel] !== h) { mismatch++; console.log("MISMATCH web:", rel); }
  if (wpVendor[rel] !== h) { mismatch++; console.log("MISMATCH wp:", rel); }
}
console.log("検証ファイル数:", checked, "/ 不一致:", mismatch);
console.log(mismatch === 0
  ? "OK: Web版・WPプラグイン版のコアはsrc/と完全バイト一致（CLI/スキルはsrc/を直接import＝判定ロジック単一）"
  : "NG: scripts/build_web.mjs を再実行してください");
process.exit(mismatch === 0 ? 0 : 1);
