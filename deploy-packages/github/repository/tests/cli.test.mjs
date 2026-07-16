// tests/cli.test.mjs
// cliエージェント所有（docs/specs/cli-spec.md「テスト」節）。
// tests/ディレクトリ自体はcore所有だが、本ファイルのみcli担当が追加してよい。
//
// 方針:
//   - ネットワークは一切使わない（MOBILISTICA_AUDIT_MOCKで完全にバイパスする）。
//   - コア(src/mobilistica_audit/)が未完成の間もこのファイル全体が意味を持つよう、
//     コアの有無に依存する分岐は existsSync で検出し、該当時のみ検証する。
//   - レポート本文の厳密一致は検証しない（reports/*.mjsの整形内容はcoreの管轄であり、
//     コア実装完了後に内容が変わるため）。ここでは「CLIの契約」＝終了コード・引数検証・
//     JSON整合性・ファイル出力構造のみを検証する。

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { parseCliArgs, basicUrlSyntaxCheck } from '../cli/lib/args.mjs';
import { CliArgumentError, classifyRuntimeError, EXIT_CODES } from '../cli/lib/errors.mjs';
import { decideExitCode } from '../cli/lib/decide.mjs';
import { getMockPath, loadMockAuditResult } from '../cli/lib/mock.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CLI_ENTRY = path.resolve(REPO_ROOT, 'cli', 'mobilistica-audit.mjs');
const FIXTURES_DIR = path.resolve(REPO_ROOT, 'cli', 'test-fixtures');
const MOCK_NORMAL = path.join(FIXTURES_DIR, 'mock-audit-normal.json');
const MOCK_P0 = path.join(FIXTURES_DIR, 'mock-audit-p0.json');
const MOCK_UNAVAILABLE = path.join(FIXTURES_DIR, 'mock-audit-unavailable.json');

const CORE_ENGINE_PATH = path.resolve(REPO_ROOT, 'src', 'mobilistica_audit', 'core', 'engine.mjs');
const CORE_ENGINE_EXISTS = existsSync(CORE_ENGINE_PATH);

const TEST_URL = 'https://mobilistica-cli-self-test.invalid/'; // RFC 2606 予約TLD。実在せず解決されない。

function runCli(args, { env = {}, cwd = REPO_ROOT } = {}) {
  const result = spawnSync(process.execPath, [CLI_ENTRY, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 15000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

describe('cli/mobilistica-audit.mjs — 引数パース', () => {
  test('--help はexit 0でUsageを表示する', () => {
    const { status, stdout } = runCli(['--help']);
    assert.equal(status, 0);
    assert.match(stdout, /Mobilistica Mobile Commerce Audit/);
    assert.match(stdout, /--format/);
  });

  test('--version はexit 0で何らかのバージョン文字列を表示する（package.json未生成でもクラッシュしない）', () => {
    const { status, stdout } = runCli(['--version']);
    assert.equal(status, 0);
    assert.ok(stdout.trim().length > 0);
  });

  test('URL未指定はexit 2', () => {
    const { status, stderr } = runCli([]);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
    assert.match(stderr, /URL/);
  });

  test('不正なURL構文（プロトコルなし）はexit 2', () => {
    const { status } = runCli(['not-a-valid-url']);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
  });

  test('未対応スキーム（ftp://）はexit 2', () => {
    const { status } = runCli(['ftp://example.com/']);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
  });

  test('--format 不正値はexit 2', () => {
    const { status, stderr } = runCli([TEST_URL, '--format', 'yaml']);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
    assert.match(stderr, /--format/);
  });

  test('--strategy 不正値はexit 2', () => {
    const { status } = runCli([TEST_URL, '--strategy', 'tablet']);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
  });

  test('--collectors 不正値はexit 2', () => {
    const { status } = runCli([TEST_URL, '--collectors', 'bogus']);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
  });

  test('--log-level 不正値はexit 2', () => {
    const { status } = runCli([TEST_URL, '--log-level', 'verbose']);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
  });

  test('--timeout に数値以外を渡すとexit 2', () => {
    const { status } = runCli([TEST_URL, '--timeout', 'abc']);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
  });

  test('未知のフラグはexit 2', () => {
    const { status } = runCli([TEST_URL, '--not-a-real-flag']);
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
  });

  test('--format all を --output なしで指定するとexit 2', () => {
    const { status, stderr } = runCli([TEST_URL, '--format', 'all'], {
      env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
    });
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
    assert.match(stderr, /--output/);
  });
});

describe('cli/mobilistica-audit.mjs — MOBILISTICA_AUDIT_MOCK（コア未完成でも自己テスト可能）', () => {
  test('--json はネットワークなしで有効なJSONを返す（正常系フィクスチャ）', () => {
    const { status, stdout } = runCli([TEST_URL, '--json'], {
      env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
    });
    assert.equal(status, EXIT_CODES.OK, `stderr: (see below)\n`);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.audit_id, 'ma_1752600000_a1b2c3d4');
    assert.equal(parsed.mobile_score, 68);
  });

  test('stdoutは--json時に純JSONのみ（ログ混入なし）', () => {
    const { stdout } = runCli([TEST_URL, '--json', '--log-level', 'debug'], {
      env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
    });
    // JSON.parseが例外を投げなければ、ログ行が混入していないことの十分条件になる
    assert.doesNotThrow(() => JSON.parse(stdout));
  });

  test('P0検出フィクスチャはexit 1', () => {
    const { status, stdout } = runCli([TEST_URL, '--json'], {
      env: { MOBILISTICA_AUDIT_MOCK: MOCK_P0 },
    });
    assert.equal(status, EXIT_CODES.AUDIT_ISSUES_OR_NO_DATA);
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.recommendations.some((f) => f.priority === 'P0'));
  });

  test('データ全滅フィクスチャはexit 1', () => {
    const { status } = runCli([TEST_URL, '--json'], {
      env: { MOBILISTICA_AUDIT_MOCK: MOCK_UNAVAILABLE },
    });
    assert.equal(status, EXIT_CODES.AUDIT_ISSUES_OR_NO_DATA);
  });

  test('--format md（既定）はモックでもexit 0でstdoutに何か出力する', () => {
    const { status, stdout } = runCli([TEST_URL], {
      env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
    });
    assert.equal(status, EXIT_CODES.OK);
    assert.ok(stdout.length > 0);
  });

  test(
    'core/engine.mjs が存在しない場合、モックなしのURLはexit 4（CoreUnavailableError）',
    { skip: CORE_ENGINE_EXISTS ? 'core実装済みのため対象外' : false },
    () => {
      const { status, stderr } = runCli([TEST_URL, '--json']);
      assert.equal(status, EXIT_CODES.INTERNAL_ERROR);
      assert.match(stderr, /コア/);
    },
  );
});

describe('cli/mobilistica-audit.mjs — --compare', () => {
  test('存在しない--compareファイルはexit 2', () => {
    const { status, stderr } = runCli([TEST_URL, '--json', '--compare', './does-not-exist.json'], {
      env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
    });
    assert.equal(status, EXIT_CODES.INVALID_ARGS);
    assert.match(stderr, /compare/);
  });

  test('壊れたJSONの--compareファイルはexit 2', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mobilistica-cli-test-'));
    const badFile = path.join(dir, 'broken.json');
    await writeFile(badFile, '{ this is not json', 'utf8');
    try {
      const { status } = runCli([TEST_URL, '--json', '--compare', badFile], {
        env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
      });
      assert.equal(status, EXIT_CODES.INVALID_ARGS);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('正常な--compareファイルは読み込めてexit 0で完走する', () => {
    const { status } = runCli([TEST_URL, '--json', '--compare', MOCK_NORMAL], {
      env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
    });
    assert.equal(status, EXIT_CODES.OK);
  });
});

describe('cli/mobilistica-audit.mjs — --output ファイル書き出し', () => {
  test('--format all --output <dir> は4形式のファイルを生成する', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mobilistica-cli-test-'));
    try {
      const { status } = runCli([TEST_URL, '--format', 'all', '--output', dir], {
        env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
      });
      assert.equal(status, EXIT_CODES.OK);
      const files = await readdir(dir);
      const exts = files.map((f) => path.extname(f).slice(1)).sort();
      assert.deepEqual(exts, ['csv', 'html', 'json', 'md']);
      for (const f of files) {
        assert.ok(f.startsWith('ma_1752600000_a1b2c3d4'), `unexpected filename: ${f}`);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('単一format --output は1ファイルのみ生成する', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mobilistica-cli-test-'));
    try {
      const { status } = runCli([TEST_URL, '--format', 'json', '--output', dir], {
        env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
      });
      assert.equal(status, EXIT_CODES.OK);
      const files = await readdir(dir);
      assert.equal(files.length, 1);
      assert.ok(files[0].endsWith('.json'));
      const content = await readFile(path.join(dir, files[0]), 'utf8');
      assert.doesNotThrow(() => JSON.parse(content));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('日本語を含む出力パスでも書き出せる', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'mobilistica-cli-test-'));
    const jaDir = path.join(dir, '診断結果');
    try {
      const { status } = runCli([TEST_URL, '--format', 'json', '--output', jaDir], {
        env: { MOBILISTICA_AUDIT_MOCK: MOCK_NORMAL },
      });
      assert.equal(status, EXIT_CODES.OK);
      const files = await readdir(jaDir);
      assert.equal(files.length, 1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('cli/lib/args.mjs — 単体テスト', () => {
  test('parseCliArgs: --mobile-only と --strategy desktop の同時指定は例外', () => {
    assert.throws(
      () => parseCliArgs(['https://example.com/', '--mobile-only', '--strategy', 'desktop']),
      CliArgumentError,
    );
  });

  test('parseCliArgs: --json と矛盾する --format html の同時指定は例外', () => {
    assert.throws(() => parseCliArgs(['https://example.com/', '--json', '--format', 'html']), CliArgumentError);
  });

  test('parseCliArgs: --json と --format json の併記は許容される', () => {
    const { options } = parseCliArgs(['https://example.com/', '--json', '--format', 'json']);
    assert.equal(options.format, 'json');
  });

  test('parseCliArgs: 既定値はformat=md, strategy=mobile, collectors=auto, logLevel=info', () => {
    const { options } = parseCliArgs(['https://example.com/']);
    assert.equal(options.format, 'md');
    assert.equal(options.strategy, 'mobile');
    assert.equal(options.collectors, 'auto');
    assert.equal(options.logLevel, 'info');
  });

  test('basicUrlSyntaxCheck: http/https以外は例外', () => {
    assert.throws(() => basicUrlSyntaxCheck('mailto:test@example.com'), CliArgumentError);
  });

  test('basicUrlSyntaxCheck: 正常なhttps URLは通す', () => {
    assert.doesNotThrow(() => basicUrlSyntaxCheck('https://example.com/path?q=1'));
  });
});

describe('cli/lib/decide.mjs — 単体テスト', () => {
  test('P0を含むFindingがあればexit 1', () => {
    const result = decideExitCode({
      mobile_score: 50,
      data_sources: ['psi_api'],
      recommendations: [{ priority: 'P2' }, { priority: 'P0' }],
    });
    assert.equal(result.exitCode, EXIT_CODES.AUDIT_ISSUES_OR_NO_DATA);
    assert.equal(result.hasP0, true);
  });

  test('P0なし・データありならexit 0', () => {
    const result = decideExitCode({
      mobile_score: 80,
      data_sources: ['psi_api'],
      recommendations: [{ priority: 'P3' }],
    });
    assert.equal(result.exitCode, EXIT_CODES.OK);
    assert.equal(result.hasP0, false);
    assert.equal(result.dataUnavailable, false);
  });

  test('data_sourcesが空かつmobile_scoreがnullならデータ全滅としてexit 1', () => {
    const result = decideExitCode({ mobile_score: null, data_sources: [], recommendations: [] });
    assert.equal(result.exitCode, EXIT_CODES.AUDIT_ISSUES_OR_NO_DATA);
    assert.equal(result.dataUnavailable, true);
  });
});

describe('cli/lib/errors.mjs — 単体テスト', () => {
  test('classifyRuntimeError: ENOTFOUND等のネットワークエラーはTARGET_UNREACHABLE', () => {
    const err = Object.assign(new Error('getaddrinfo ENOTFOUND example.invalid'), { code: 'ENOTFOUND' });
    const { exitCode } = classifyRuntimeError(err);
    assert.equal(exitCode, EXIT_CODES.TARGET_UNREACHABLE);
  });

  test('classifyRuntimeError: SSRFを示唆するメッセージはTARGET_UNREACHABLE', () => {
    const err = new Error('Target rejected: private range (SSRF guard)');
    const { exitCode } = classifyRuntimeError(err);
    assert.equal(exitCode, EXIT_CODES.TARGET_UNREACHABLE);
  });

  test('classifyRuntimeError: 未分類の例外はINTERNAL_ERROR', () => {
    const err = new Error('something unexpected blew up');
    const { exitCode } = classifyRuntimeError(err);
    assert.equal(exitCode, EXIT_CODES.INTERNAL_ERROR);
  });
});

describe('cli/lib/mock.mjs — 単体テスト', () => {
  test('getMockPath: 環境変数が空文字ならundefined', () => {
    assert.equal(getMockPath({ MOBILISTICA_AUDIT_MOCK: '' }), undefined);
    assert.equal(getMockPath({}), undefined);
  });

  test('loadMockAuditResult: フィクスチャJSONを読み込める', async () => {
    const result = await loadMockAuditResult(MOCK_NORMAL);
    assert.equal(result.audit_id, 'ma_1752600000_a1b2c3d4');
  });

  test('loadMockAuditResult: 存在しないパスはCliArgumentError', async () => {
    await assert.rejects(() => loadMockAuditResult(path.join(FIXTURES_DIR, 'does-not-exist.json')), CliArgumentError);
  });
});

describe('cli/install/ — インストーラーファイルの存在確認', () => {
  test('必要な5ファイルが揃っている', async () => {
    const installDir = path.resolve(REPO_ROOT, 'cli', 'install');
    const expected = ['install.sh', 'install.ps1', 'install.py', 'uninstall.sh', 'uninstall.ps1'];
    const files = await readdir(installDir);
    for (const name of expected) {
      assert.ok(files.includes(name), `missing installer file: ${name}`);
    }
  });
});
