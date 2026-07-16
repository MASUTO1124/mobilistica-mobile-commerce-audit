// cli/lib/audit-runner.mjs
// runAudit呼び出しの一元窓口。モック注入と実コア呼び出しを切り替える。
// 判定ロジックは一切持たない（呼ぶだけ）。

import { loadMockAuditResult, getMockPath } from './mock.mjs';
import { loadCoreEngine } from './core-loader.mjs';

export class CoreUnavailableError extends Error {
  constructor(reason) {
    super(
      'コア(src/mobilistica_audit/core/engine.mjs)が見つからないため診断を実行できません。' +
        `(${reason}) 自己テストには環境変数 MOBILISTICA_AUDIT_MOCK=<AuditResult.json> を使用してください。`,
    );
    this.name = 'CoreUnavailableError';
  }
}

/**
 * @param {string} url
 * @param {{strategy:string, apiKey?:string, collectors:string, timeoutMs?:number}} runAuditOptions
 * @param {{env?: NodeJS.ProcessEnv, logger?: import('./logger.mjs').Logger}} [ctx]
 * @returns {Promise<object>} AuditResult
 */
export async function executeAudit(url, runAuditOptions, ctx = {}) {
  const env = ctx.env ?? process.env;
  const logger = ctx.logger;

  const mockPath = getMockPath(env);
  if (mockPath) {
    logger?.debug(`MOBILISTICA_AUDIT_MOCK検出: ${mockPath}（ネットワークアクセスなしでモック結果を返します）`);
    return loadMockAuditResult(mockPath);
  }

  const engine = await loadCoreEngine();
  if (!engine.available) {
    throw new CoreUnavailableError(engine.reason);
  }
  logger?.debug(`runAudit呼び出し: ${url} strategy=${runAuditOptions.strategy}`);
  return engine.runAudit(url, runAuditOptions);
}
