// tests/html_collector.test.mjs
// collectors/html.mjs: SSRFガード連携・リダイレクトループ・巨大レスポンス打ち切り・
// malformed URL・各ホップでの再検証。ネットワーク不使用（fetchImplは全てモック）。

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fetchHtml } from '../src/mobilistica_audit/collectors/html.mjs';

// RFC 5737 TEST-NET-3 (203.0.113.0/24) — 未割当のドキュメント用範囲。
// urlguardのプライベート判定には該当しないためvalidateUrlSyntax/assertPublicTargetの
// IPリテラル即時判定を素通りし、実ネットワークには一切接続しない（fetchImplがモックのため）。
const PUBLIC_BASE = 'https://203.0.113.10';

function htmlResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  });
}

function redirectResponse(location, status = 302) {
  return new Response(null, { status, headers: { location } });
}

describe('fetchHtml — malformed URL', () => {
  test('不正なURL文字列はfetchImplを呼ばずにerrorを返す', async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      throw new Error('should not be called');
    };
    const result = await fetchHtml('not a valid url', { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'malformed_url');
    assert.equal(called, false);
  });

  test('SSRF拒否対象URL（localhost）はfetchImplを呼ばない', async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      throw new Error('should not be called');
    };
    const result = await fetchHtml('http://localhost/admin', { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'blocked_hostname');
    assert.equal(called, false);
  });
});

describe('fetchHtml — 正常系', () => {
  test('通常のHTMLレスポンスを取得できる', async () => {
    const fetchImpl = async () => htmlResponse('<html><body>hi</body></html>');
    const result = await fetchHtml(`${PUBLIC_BASE}/`, { fetchImpl });
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.match(result.body, /hi/);
    assert.equal(result.truncated, false);
  });

  test('非HTMLコンテンツはheaderOnlyで返す', async () => {
    const fetchImpl = async () => new Response('{"a":1}', { status: 200, headers: { 'content-type': 'application/json' } });
    const result = await fetchHtml(`${PUBLIC_BASE}/api`, { fetchImpl });
    assert.equal(result.ok, true);
    assert.equal(result.headerOnly, true);
    assert.equal(result.body, null);
  });
});

describe('fetchHtml — リダイレクトループ打ち切り', () => {
  test('5ホップを超えるリダイレクトはredirect_loopで打ち切る', async () => {
    let calls = 0;
    const fetchImpl = async (url) => {
      calls += 1;
      return redirectResponse(`${PUBLIC_BASE}/hop-${calls}`);
    };
    const result = await fetchHtml(`${PUBLIC_BASE}/start`, { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'redirect_loop');
    assert.ok(calls <= 7, `too many fetch calls: ${calls}`); // MAX_REDIRECTS(5) + 初回 + 余裕
    assert.ok(result.redirect_chain.length >= 5);
  });

  test('各ホップでSSRFガードが再実行される（途中でプライベートIPへ誘導）', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) return redirectResponse('https://10.0.0.5/internal');
      throw new Error('should not reach second hop fetch');
    };
    const result = await fetchHtml(`${PUBLIC_BASE}/start`, { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'blocked_ip_range');
    assert.equal(calls, 1, 'fetchImpl should not be called again after SSRF rejection');
  });

  test('3回程度の正常なリダイレクトは最終ページまで到達する', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls <= 3) return redirectResponse(`${PUBLIC_BASE}/next-${calls}`);
      return htmlResponse('<html><body>final</body></html>');
    };
    const result = await fetchHtml(`${PUBLIC_BASE}/start`, { fetchImpl });
    assert.equal(result.ok, true);
    assert.match(result.body, /final/);
    assert.equal(result.redirect_chain.length, 3);
  });
});

describe('fetchHtml — 巨大レスポンス打ち切り', () => {
  test('maxBytesを超えるレスポンスはtruncated:trueで打ち切る', async () => {
    const bigBody = 'a'.repeat(5000);
    const fetchImpl = async () => htmlResponse(bigBody);
    const result = await fetchHtml(`${PUBLIC_BASE}/big`, { fetchImpl, maxBytes: 100 });
    assert.equal(result.ok, true);
    assert.equal(result.truncated, true);
    assert.ok(result.body.length <= 100 + 8, `body too long: ${result.body.length}`); // decoder boundary allowance
  });

  test('maxBytes以下のレスポンスはtruncatedにならない', async () => {
    const smallBody = '<html><body>' + 'x'.repeat(50) + '</body></html>';
    const fetchImpl = async () => htmlResponse(smallBody);
    const result = await fetchHtml(`${PUBLIC_BASE}/small`, { fetchImpl, maxBytes: 5000 });
    assert.equal(result.truncated, false);
  });
});

describe('fetchHtml — ネットワーク例外', () => {
  test('fetchImplが例外を投げてもthrowせずerror結果を返す', async () => {
    const fetchImpl = async () => {
      throw new Error('ECONNRESET');
    };
    const result = await fetchHtml(`${PUBLIC_BASE}/`, { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'network_error');
  });

  test('AbortErrorはtimeoutとして分類される', async () => {
    const fetchImpl = async () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    };
    const result = await fetchHtml(`${PUBLIC_BASE}/`, { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'timeout');
  });
});
