// cli/lib/logger.mjs
// ログは常にstderrへ。stdoutは --json / --format 出力専用（CI/パイプ利用のため汚さない）。
// silent: error のみ表示 / info(既定): error+warn+info / debug: 全て+スタックトレース

export const LOG_LEVELS = Object.freeze(['silent', 'info', 'debug']);
const LEVEL_ORDER = { silent: 0, info: 1, debug: 2 };
// 各メソッドが要求する最低表示ランク（この値 <= 現在levelのランク で表示される）
const METHOD_RANK = { error: 0, warn: 1, info: 1, debug: 2 };

/**
 * @param {'silent'|'info'|'debug'} level
 */
export function createLogger(level = 'info') {
  const order = LEVEL_ORDER[level] ?? LEVEL_ORDER.info;

  function write(methodName, prefix, args) {
    if (order < METHOD_RANK[methodName]) return;
    const line = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ');
    process.stderr.write(`${prefix}${line}\n`);
  }

  return {
    level,
    info(...args) {
      write('info', '', args);
    },
    warn(...args) {
      write('warn', '[warn] ', args);
    },
    error(...args) {
      write('error', '[error] ', args);
    },
    debug(...args) {
      write('debug', '[debug] ', args);
    },
    /** debugレベル時のみスタックトレースを出す（認証情報混入防止のため既定非表示） */
    debugStack(err) {
      if (order < LEVEL_ORDER.debug) return;
      process.stderr.write(`${err && err.stack ? err.stack : String(err)}\n`);
    },
  };
}
