// cli/lib/run.mjs
// CLI全体のオーケストレーション。process.exit()はここでは呼ばない（呼び出し元がexit codeを使う）。
// 判定ロジック(SSRF/スコアリング/優先度)は一切持たず、コア(src/mobilistica_audit)の関数を呼ぶだけ。

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseCliArgs, basicUrlSyntaxCheck } from './args.mjs';
import { createLogger } from './logger.mjs';
import { EXIT_CODES, CliArgumentError, classifyRuntimeError } from './errors.mjs';
import { USAGE, resolveVersion } from './help.mjs';
import { executeAudit, CoreUnavailableError } from './audit-runner.mjs';
import { decideExitCode } from './decide.mjs';
import { renderFormat } from './format.mjs';
import { writeOutputFiles } from './output.mjs';
import { loadUrlGuard } from './core-loader.mjs';

/**
 * @param {string[]} argv - process.argv.slice(2)相当
 * @param {{env?: NodeJS.ProcessEnv}} [ctx]
 * @returns {Promise<number>} 終了コード
 */
export async function main(argv, ctx = {}) {
  const env = ctx.env ?? process.env;
  let logger = createLogger('info');

  let parsed;
  try {
    parsed = parseCliArgs(argv);
  } catch (err) {
    if (err instanceof CliArgumentError) {
      logger.error(err.message);
      process.stderr.write(`\n${USAGE}`);
      return EXIT_CODES.INVALID_ARGS;
    }
    logger.error(`予期しない引数エラー: ${err.message}`);
    return EXIT_CODES.INTERNAL_ERROR;
  }

  const { help, version, url, options } = parsed;
  logger = createLogger(options?.logLevel ?? 'info');

  if (help) {
    process.stdout.write(USAGE);
    return EXIT_CODES.OK;
  }
  if (version) {
    process.stdout.write(`${await resolveVersion()}\n`);
    return EXIT_CODES.OK;
  }

  if (options.format === 'all' && !options.output) {
    logger.error('--format all は --output <dir> と併用してください');
    return EXIT_CODES.INVALID_ARGS;
  }

  try {
    basicUrlSyntaxCheck(url);
  } catch (err) {
    logger.error(err.message);
    return EXIT_CODES.INVALID_ARGS;
  }

  // コアのurlguardが使えるならSSRF等のポリシー判定を事前照会する。未完成なら黙ってスキップ
  // （runAudit側／collectors/html.mjs側で最終的に判定される）。
  const guard = await loadUrlGuard();
  if (guard.available) {
    try {
      const verdict = guard.validateUrlSyntax(url);
      const rejected = verdict === false || (verdict && typeof verdict === 'object' && verdict.valid === false);
      if (rejected) {
        const reason = (verdict && verdict.reason) || 'urlguardによりURLが拒否されました';
        logger.error(`診断対象を利用できません（${reason}）`);
        return EXIT_CODES.TARGET_UNREACHABLE;
      }
    } catch (err) {
      logger.error(`診断対象を利用できません（${err.message}）`);
      return EXIT_CODES.TARGET_UNREACHABLE;
    }
  } else {
    logger.debug(`urlguard未利用: ${guard.reason}`);
  }

  let previous;
  if (options.compare) {
    try {
      const raw = await readFile(resolve(process.cwd(), options.compare), { encoding: 'utf8' });
      previous = JSON.parse(raw);
    } catch (err) {
      logger.error(`--compare のファイルを読み込めません: ${options.compare} (${err.message})`);
      return EXIT_CODES.INVALID_ARGS;
    }
  }

  const apiKey = options.apiKeyFlag ?? env.PAGESPEED_API_KEY ?? env.PSI_API_KEY ?? undefined;

  let auditResult;
  try {
    auditResult = await executeAudit(
      url,
      {
        strategy: options.strategy,
        apiKey,
        collectors: options.collectors,
        timeoutMs: options.timeoutMs,
      },
      { env, logger },
    );
  } catch (err) {
    if (err instanceof CoreUnavailableError) {
      logger.error(err.message);
      logger.debugStack(err);
      return EXIT_CODES.INTERNAL_ERROR;
    }
    const { exitCode, userMessage } = classifyRuntimeError(err);
    logger.error(userMessage);
    logger.debugStack(err);
    return exitCode;
  }

  if (Array.isArray(auditResult?.limitations) && auditResult.limitations.length > 0) {
    logger.info('制限事項:');
    for (const l of auditResult.limitations) {
      logger.info(`  - ${typeof l === 'string' ? l : JSON.stringify(l)}`);
    }
  }

  try {
    const formatsToRender = options.format === 'all' ? ['html', 'json', 'md', 'csv'] : [options.format];
    const contents = {};
    for (const fmt of formatsToRender) {
      contents[fmt] = await renderFormat(fmt, auditResult, { previous, logger });
    }

    if (options.output) {
      const written = await writeOutputFiles(options.output, auditResult?.audit_id, contents);
      for (const f of written) logger.info(`書き出しました: ${f}`);
    } else {
      const only = contents[formatsToRender[0]];
      process.stdout.write(only.endsWith('\n') ? only : `${only}\n`);
    }
  } catch (err) {
    logger.error(`出力生成中にエラーが発生しました: ${err.message}`);
    logger.debugStack(err);
    return EXIT_CODES.INTERNAL_ERROR;
  }

  return decideExitCode(auditResult).exitCode;
}
