// cli/lib/help.mjs
// --help / --version の表示テキスト。

import { readFile } from 'node:fs/promises';

export const USAGE = `Mobilistica Mobile Commerce Audit CLI

使い方:
  mobilistica-audit <url> [options]
  node cli/mobilistica-audit.mjs <url> [options]

オプション:
  --format <html|json|md|csv|all>  出力形式（既定: md をstdout。--output指定時はファイル群）
                                    ※ --format all は --output と併用してください
  --strategy <mobile|desktop>      診断ストラテジー（既定: mobile）
  --mobile-only                    --strategy mobile の別名
  --compare <previous.json>        前回のAuditResult(JSON)と比較しBefore/After差分を出す
  --output <dir>                   出力先ディレクトリ（audit_id基準のファイル名で保存）
  --api-key <key>                  PSI APIキー（優先度: 本フラグ > PAGESPEED_API_KEY > PSI_API_KEY > キーレス）
  --collectors <auto|psi|html>     データ収集方式（既定: auto）
  --timeout <ms>                   タイムアウト（ミリ秒）
  --log-level <silent|info|debug>  ログ出力レベル（既定: info。ログは常にstderr）
  --json                           --format json --output無し の短縮（stdoutへJSONのみ）
  --version                        バージョン表示
  --help                           このヘルプを表示

終了コード:
  0 = 成功
  1 = 診断は走ったがP0検出、またはデータ全滅
  2 = 引数不正
  3 = 対象到達不能（SSRF拒否を含む）
  4 = 内部エラー

環境変数:
  PAGESPEED_API_KEY / PSI_API_KEY   PSI APIキー（--api-key未指定時に使用）
  MOBILISTICA_AUDIT_MOCK            <AuditResult.jsonのパス> を設定するとネットワークに出ずモック結果を返す（自己テスト用）

例:
  mobilistica-audit https://example.com --json
  mobilistica-audit https://example.com --format all --output ./reports
  mobilistica-audit https://example.com --compare ./reports/prev.json --format md
`;

/**
 * package.json(リポジトリ直下・core所有)からversionを読む。
 * coreがまだpackage.jsonを作成していない場合でもクラッシュしない。
 */
export async function resolveVersion() {
  const pkgUrl = new URL('../../package.json', import.meta.url);
  try {
    const raw = await readFile(pkgUrl, { encoding: 'utf8' });
    const pkg = JSON.parse(raw);
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0-unknown';
  } catch {
    return '0.0.0-dev (package.json未生成)';
  }
}
