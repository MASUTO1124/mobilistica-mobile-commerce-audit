// cli/lib/mock.mjs
// MOBILISTICA_AUDIT_MOCK フック。
// docs/specs/cli-spec.md: 「runAuditはモック注入(MOBILISTICA_AUDIT_MOCK=examples/sample-audit.json
// 環境変数があればネットワークに出ずそれを返すフックをCLI内に実装)で実行」
//
// 環境変数が設定されている場合、core/engine.mjsのimportすら行わずJSONファイルを読んで返す。
// これによりコア未完成の段階でもCLI全体を自己テストできる。

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliArgumentError } from './errors.mjs';

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {string|undefined} 設定されていればモックJSONへのパス
 */
export function getMockPath(env = process.env) {
  const v = env.MOBILISTICA_AUDIT_MOCK;
  return v && v.trim() !== '' ? v : undefined;
}

/**
 * モックJSONを読み込みAuditResultとして返す。
 * ネットワークアクセスは一切行わない。
 * @param {string} mockPath - cwd相対 or 絶対パス
 * @returns {Promise<object>} AuditResult(想定)
 */
export async function loadMockAuditResult(mockPath) {
  const absolutePath = resolve(process.cwd(), mockPath);
  let raw;
  try {
    raw = await readFile(absolutePath, { encoding: 'utf8' });
  } catch (err) {
    throw new CliArgumentError(
      `MOBILISTICA_AUDIT_MOCK で指定されたファイルを読み込めません: ${absolutePath} (${err.message})`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new CliArgumentError(`MOBILISTICA_AUDIT_MOCK のJSONが不正です: ${absolutePath} (${err.message})`);
  }
}
