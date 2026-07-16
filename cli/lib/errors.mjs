// cli/lib/errors.mjs
// 終了コードの単一定義。CLI全体でここだけを参照する（ハードコード禁止）。
// docs/specs/cli-spec.md の「要件」節と1:1対応。

export const EXIT_CODES = Object.freeze({
  OK: 0,
  // 診断は完走したが P0 (購入不能級) を検出、またはデータソースが全滅した
  AUDIT_ISSUES_OR_NO_DATA: 1,
  // CLI引数が不正（不正URL構文・未知フラグ・不正な --format 値等）
  INVALID_ARGS: 2,
  // 診断対象に到達できない（DNS失敗・接続不可・SSRF拒否を含む）
  TARGET_UNREACHABLE: 3,
  // 上記以外の内部エラー（想定外の例外）
  INTERNAL_ERROR: 4,
});

/**
 * CLI引数エラー。呼び出し側は exit code 2 として扱う。
 */
export class CliArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CliArgumentError';
  }
}

/**
 * 診断対象に到達できないことを表す。exit code 3 として扱う。
 * コア側のSSRF拒否・DNS失敗・接続失敗のいずれもここに正規化する。
 */
export class TargetUnreachableError extends Error {
  constructor(message, { cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'TargetUnreachableError';
  }
}

// ネットワーク層の代表的なNode.jsエラーコード。
// runAudit()は仕様上これらをthrowしない設計だが（limitationsに記録する契約）、
// コア未完成期・想定外経路からの例外を安全側に倒すためのフォールバック分類。
const UNREACHABLE_ERROR_CODES = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ECONNRESET',
]);

// SSRFガード（security/urlguard.mjs）由来と推測できるメッセージ/コードの手がかり。
// コア側の正式なエラー型が確定するまでの防御的分類（本ファイル内に閉じる）。
const SSRF_HINT_PATTERN = /ssrf|private[_ -]?range|blocked[_ -]?target|disallowed[_ -]?host/i;

/**
 * runAudit呼び出し等で捕捉した例外を、CLIの終了コードにマッピングする。
 * 戻り値: { exitCode, userMessage }
 * 実装ロジック（何がSSRFか等）はコア(security/urlguard.mjs)が正とする。
 * ここでは「コアが投げてしまった例外」をベストエフォートで分類するだけで、
 * 独自のSSRF判定基準は持たない。
 */
export function classifyRuntimeError(err) {
  if (err instanceof TargetUnreachableError) {
    return { exitCode: EXIT_CODES.TARGET_UNREACHABLE, userMessage: err.message };
  }
  if (err instanceof CliArgumentError) {
    return { exitCode: EXIT_CODES.INVALID_ARGS, userMessage: err.message };
  }

  const code = err && typeof err === 'object' ? err.code : undefined;
  if (code && UNREACHABLE_ERROR_CODES.has(code)) {
    return {
      exitCode: EXIT_CODES.TARGET_UNREACHABLE,
      userMessage: `診断対象に到達できませんでした（${code}）: ${err.message}`,
    };
  }

  const message = err && typeof err === 'object' ? String(err.message ?? '') : String(err ?? '');
  if (SSRF_HINT_PATTERN.test(message)) {
    return {
      exitCode: EXIT_CODES.TARGET_UNREACHABLE,
      userMessage: `診断対象が拒否されました（SSRF保護の可能性）: ${message}`,
    };
  }

  return {
    exitCode: EXIT_CODES.INTERNAL_ERROR,
    userMessage: `内部エラーが発生しました: ${message || String(err)}`,
  };
}
