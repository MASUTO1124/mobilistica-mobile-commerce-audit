// cli/lib/args.mjs
// 引数パース（純粋関数寄り・I/Oなし）。node:util の parseArgs のみ使用（依存ゼロ方針）。
// docs/specs/cli-spec.md「コマンド」節のオプション一覧と1:1対応させる。

import { parseArgs } from 'node:util';
import { CliArgumentError } from './errors.mjs';

export const VALID_FORMATS = Object.freeze(['html', 'json', 'md', 'csv', 'all']);
export const VALID_STRATEGIES = Object.freeze(['mobile', 'desktop']);
export const VALID_COLLECTORS = Object.freeze(['auto', 'psi', 'html']);
export const VALID_LOG_LEVELS = Object.freeze(['silent', 'info', 'debug']);

const OPTION_SPEC = {
  format: { type: 'string' },
  strategy: { type: 'string' },
  'mobile-only': { type: 'boolean' },
  compare: { type: 'string' },
  output: { type: 'string' },
  'api-key': { type: 'string' },
  collectors: { type: 'string' },
  timeout: { type: 'string' },
  'log-level': { type: 'string' },
  json: { type: 'boolean' },
  version: { type: 'boolean' },
  help: { type: 'boolean' },
};

/**
 * @typedef {Object} ParsedCliArgs
 * @property {boolean} help
 * @property {boolean} version
 * @property {string|undefined} url
 * @property {{
 *   format: string,
 *   strategy: 'mobile'|'desktop',
 *   compare: string|undefined,
 *   output: string|undefined,
 *   apiKeyFlag: string|undefined,
 *   collectors: 'auto'|'psi'|'html',
 *   timeoutMs: number|undefined,
 *   logLevel: 'silent'|'info'|'debug',
 *   jsonShortcut: boolean,
 * }} options
 */

/**
 * @param {string[]} argv - process.argv.slice(2) 相当
 * @returns {ParsedCliArgs}
 * @throws {CliArgumentError}
 */
export function parseCliArgs(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: OPTION_SPEC,
      allowPositionals: true,
      strict: true,
    });
  } catch (err) {
    throw new CliArgumentError(`引数の解析に失敗しました: ${err.message}`);
  }

  const { values, positionals } = parsed;

  const help = Boolean(values.help);
  const version = Boolean(values.version);

  // --help / --version はurl必須チェックより先に短絡させるため、
  // ここでは検証を打ち切って呼び出し元に判断を委ねる。
  if (help || version) {
    return {
      help,
      version,
      url: positionals[0],
      options: buildOptions(values),
    };
  }

  if (positionals.length === 0) {
    throw new CliArgumentError('URLを指定してください。使用法: mobilistica-audit <url> [options]');
  }
  if (positionals.length > 1) {
    throw new CliArgumentError(`URLは1つだけ指定してください（余分な引数: ${positionals.slice(1).join(', ')}）`);
  }

  const options = buildOptions(values);
  const url = positionals[0];

  return { help, version, url, options };
}

function buildOptions(values) {
  const format = normalizeFormat(values);
  const strategy = normalizeStrategy(values);
  const collectors = normalizeChoice('collectors', values.collectors, VALID_COLLECTORS, 'auto');
  const logLevel = normalizeChoice('log-level', values['log-level'], VALID_LOG_LEVELS, 'info');
  const timeoutMs = normalizeTimeout(values.timeout);

  return {
    format,
    strategy,
    compare: values.compare,
    output: values.output,
    apiKeyFlag: values['api-key'],
    collectors,
    timeoutMs,
    logLevel,
    jsonShortcut: Boolean(values.json),
  };
}

function normalizeFormat(values) {
  const hasJsonShortcut = Boolean(values.json);
  const explicitFormat = values.format;

  if (explicitFormat !== undefined && !VALID_FORMATS.includes(explicitFormat)) {
    throw new CliArgumentError(
      `--format の値が不正です: "${explicitFormat}"（有効値: ${VALID_FORMATS.join('|')}）`,
    );
  }

  if (hasJsonShortcut) {
    if (explicitFormat !== undefined && explicitFormat !== 'json') {
      throw new CliArgumentError('--json と --format は同時に矛盾する値を指定できません（--format json と等価です）');
    }
    return 'json';
  }

  return explicitFormat ?? 'md';
}

function normalizeStrategy(values) {
  const mobileOnly = Boolean(values['mobile-only']);
  const explicit = values.strategy;

  if (explicit !== undefined && !VALID_STRATEGIES.includes(explicit)) {
    throw new CliArgumentError(
      `--strategy の値が不正です: "${explicit}"（有効値: ${VALID_STRATEGIES.join('|')}）`,
    );
  }

  if (mobileOnly) {
    if (explicit !== undefined && explicit !== 'mobile') {
      throw new CliArgumentError('--mobile-only は --strategy mobile の別名です。--strategy desktop と同時指定できません');
    }
    return 'mobile';
  }

  return explicit ?? 'mobile';
}

function normalizeChoice(flagName, value, validValues, defaultValue) {
  if (value === undefined) return defaultValue;
  if (!validValues.includes(value)) {
    throw new CliArgumentError(`--${flagName} の値が不正です: "${value}"（有効値: ${validValues.join('|')}）`);
  }
  return value;
}

function normalizeTimeout(value) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new CliArgumentError(`--timeout の値が不正です: "${value}"（正の整数[ミリ秒]を指定してください）`);
  }
  return n;
}

/** 最低限の構文チェック（新規性の低い判定のみ。SSRF等の実質判定はcoreに委譲する） */
export function basicUrlSyntaxCheck(url) {
  if (typeof url !== 'string' || url.trim() === '') {
    throw new CliArgumentError('URLが空です');
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new CliArgumentError(`URLの形式が不正です: "${url}"`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new CliArgumentError(`URLはhttp/httpsのみ対応です: "${url}"`);
  }
  return parsed;
}
