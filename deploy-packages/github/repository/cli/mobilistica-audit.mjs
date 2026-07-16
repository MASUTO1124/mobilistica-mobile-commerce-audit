#!/usr/bin/env node
// cli/mobilistica-audit.mjs
// Mobilistica Mobile Commerce Audit — CLIエントリポイント。
// 判定ロジックは持たない。すべて cli/lib/run.mjs 経由でコア(src/mobilistica_audit)を呼ぶだけ。
// 詳細: docs/specs/cli-spec.md

import { main } from './lib/run.mjs';
import { EXIT_CODES } from './lib/errors.mjs';

main(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((err) => {
    // main()自体が想定外に例外を投げた場合の最後の砦（本来はここに来ない設計）。
    process.stderr.write(`[fatal] 未捕捉の内部エラー: ${err && err.stack ? err.stack : String(err)}\n`);
    process.exitCode = EXIT_CODES.INTERNAL_ERROR;
  });
