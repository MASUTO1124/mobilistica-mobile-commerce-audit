// tests/reports.test.mjs
// reports/html.mjs md.mjs csv.mjs claude_instructions.mjs が例外なく文字列を生成すること。
// options.previousを渡した比較レポート生成も検証。ネットワーク不使用。

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeCollected } from '../src/mobilistica_audit/core/pipeline.mjs';
import { renderHtmlReport } from '../src/mobilistica_audit/reports/html.mjs';
import { renderMarkdownReport } from '../src/mobilistica_audit/reports/md.mjs';
import { renderCsvReport } from '../src/mobilistica_audit/reports/csv.mjs';
import { renderClaudeInstructions } from '../src/mobilistica_audit/reports/claude_instructions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function loadFixtureText(name) {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}

function buildResult(fixtureName, url) {
  return analyzeCollected({
    target_url: url,
    final_url: url,
    strategy: 'mobile',
    html: {
      ok: true,
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      finalUrl: url,
      body: loadFixtureText(fixtureName),
      truncated: false,
      headerOnly: false,
      redirect_chain: [],
    },
  });
}

const heavy = buildResult('slow-heavy-images.html', 'https://example.mobilistica-test.com/heavy');
const normal = buildResult('normal.html', 'https://example.mobilistica-test.com/normal');
const unavailable = analyzeCollected({ target_url: 'https://example.mobilistica-test.com/', final_url: 'https://example.mobilistica-test.com/', strategy: 'mobile' });

describe('reports/html.mjs', () => {
  test('例外なく自己完結HTMLを生成する', () => {
    const html = renderHtmlReport(heavy);
    assert.equal(typeof html, 'string');
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<html/i);
  });

  test('外部リクエストを発生させるタグ（<script src=・<link rel=stylesheet href=http）を含まない', () => {
    const html = renderHtmlReport(heavy);
    assert.doesNotMatch(html, /<script[^>]+src=/i);
    assert.doesNotMatch(html, /<link[^>]+rel=["']?stylesheet["']?[^>]+href=["']?https?:/i);
  });

  test('previousを渡すとBefore/After比較セクションが出力される', () => {
    const html = renderHtmlReport(heavy, { previous: normal });
    assert.match(html, /Before/);
  });

  test('データ全滅結果でも例外を投げない', () => {
    assert.doesNotThrow(() => renderHtmlReport(unavailable));
  });
});

describe('reports/md.mjs', () => {
  test('例外なくMarkdownを生成し、経営者向け＋制作者向けの2部構成になっている', () => {
    const md = renderMarkdownReport(heavy);
    assert.equal(typeof md, 'string');
    assert.match(md, /経営者向け/);
    assert.match(md, /制作者向け/);
  });

  test('previousを渡すとBefore/After比較テーブルが出力される', () => {
    const md = renderMarkdownReport(heavy, { previous: normal });
    assert.match(md, /Before \/ After/);
  });

  test('データ全滅結果でも例外を投げない', () => {
    assert.doesNotThrow(() => renderMarkdownReport(unavailable));
  });
});

describe('reports/csv.mjs', () => {
  test('UTF-8 BOM付きでCSVを生成する', () => {
    const csv = renderCsvReport(heavy);
    assert.equal(csv.charCodeAt(0), 0xfeff);
  });

  test('ヘッダー行にissue_id/category/priorityを含む', () => {
    const csv = renderCsvReport(heavy);
    assert.match(csv, /issue_id,category,priority/);
  });

  test('findings件数分の行（+ヘッダー1行）が出力される', () => {
    const csv = renderCsvReport(heavy);
    const lines = csv.replace(/^﻿/, '').split('\r\n').filter(Boolean);
    assert.equal(lines.length, heavy.recommendations.length + 1);
  });

  test('previousを渡すと比較ブロックが追記される', () => {
    const csv = renderCsvReport(heavy, { previous: normal });
    assert.match(csv, /Before\/After比較/);
  });

  test('データ全滅結果でも例外を投げない（ヘッダーのみ）', () => {
    assert.doesNotThrow(() => renderCsvReport(unavailable));
  });
});

describe('reports/claude_instructions.mjs', () => {
  test('確認すべき場所と実装候補が分離されて出力される', () => {
    const text = renderClaudeInstructions(heavy);
    assert.match(text, /確認すべき場所/);
    assert.match(text, /実装候補/);
  });

  test('実在未確認の断定文言（ファイルパスの断定）を含まない旨の前提が明記される', () => {
    const text = renderClaudeInstructions(heavy);
    assert.match(text, /実在未確認/);
  });

  test('データ全滅結果でも例外を投げない', () => {
    assert.doesNotThrow(() => renderClaudeInstructions(unavailable));
  });
});
