// cli/lib/output.mjs
// --output 先へのファイル書き出し。Windows/Mac/Linux対応（node:pathのみ使用）。
// 日本語パス・UTF-8を明示する。CSVはExcel対応でBOM付きにする(reports/csv.mjsがBOMを付与する
// 想定だが、コア未実装フォールバック時はここでBOMを付与する)。

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const EXT_BY_FORMAT = Object.freeze({ html: 'html', md: 'md', csv: 'csv', json: 'json' });

const UTF8_BOM = '﻿';

/**
 * @param {string} outputDir
 * @param {string} auditId
 * @param {Record<string,string>} contentsByFormat - {md: '...', json: '...', ...}
 * @returns {Promise<string[]>} 書き出したファイルの絶対パス一覧
 */
export async function writeOutputFiles(outputDir, auditId, contentsByFormat) {
  const absDir = resolve(process.cwd(), outputDir);
  await mkdir(absDir, { recursive: true });

  const written = [];
  for (const [format, content] of Object.entries(contentsByFormat)) {
    const ext = EXT_BY_FORMAT[format] ?? format;
    const safeAuditId = sanitizeFileNameComponent(auditId ?? 'mobilistica-audit');
    const fileName = `${safeAuditId}.${ext}`;
    const filePath = join(absDir, fileName);
    const body = format === 'csv' && !content.startsWith(UTF8_BOM) ? UTF8_BOM + content : content;
    await writeFile(filePath, body, { encoding: 'utf8' });
    written.push(filePath);
  }
  return written;
}

/** audit_idや任意文字列からファイル名として安全な部分文字列を作る */
function sanitizeFileNameComponent(value) {
  return String(value).replace(/[\\/:*?"<>|\s]+/g, '_');
}
