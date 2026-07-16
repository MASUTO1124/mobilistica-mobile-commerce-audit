// tests/urlguard.test.mjs
// SSRFガード（security/urlguard.mjs）の境界値テスト。ネットワーク不使用。

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateUrlSyntax, isPrivateIPv4, isPrivateIPv6, assertPublicTarget, SsrfError } from '../src/mobilistica_audit/security/urlguard.mjs';

describe('validateUrlSyntax — 拒否されるべきURL', () => {
  const rejected = [
    ['localhost', 'http://localhost/'],
    ['127.0.0.1', 'http://127.0.0.1/'],
    ['10.x.x.x', 'http://10.1.2.3/'],
    ['172.16-31.x (下限)', 'http://172.16.0.1/'],
    ['172.16-31.x (上限)', 'http://172.31.255.255/'],
    ['192.168.x.x', 'http://192.168.1.1/'],
    ['169.254.169.254 (metadata)', 'http://169.254.169.254/'],
    ['::1', 'http://[::1]/'],
    ['fc00:: ULA', 'http://[fc00::1]/'],
    ['ftp:', 'ftp://example.com/'],
    ['userinfo', 'http://user:pass@example.com/'],
    ['port 9999', 'http://example.com:9999/'],
    ['.local hostname', 'http://myserver.local/'],
    ['.internal hostname', 'http://api.internal/'],
    ['0.0.0.0', 'http://0.0.0.0/'],
    ['100.64.0.0/10 CGNAT', 'http://100.64.1.1/'],
    ['fe80:: link-local', 'http://[fe80::1]/'],
  ];

  for (const [label, url] of rejected) {
    test(`拒否: ${label} (${url})`, () => {
      const result = validateUrlSyntax(url);
      assert.equal(result.valid, false, `expected ${url} to be rejected, got ${JSON.stringify(result)}`);
    });
  }
});

describe('validateUrlSyntax — 許可されるべきURL', () => {
  const allowed = [
    'https://example.com/',
    'http://example.com/',
    'https://example.com:443/',
    'http://example.com:80/',
    'https://example.com:8443/path?x=1',
    'http://example.com:8080/',
    'https://8.8.8.8/', // public IP literal
    'https://sub.example.co.jp/path/to/page',
  ];

  for (const url of allowed) {
    test(`許可: ${url}`, () => {
      const result = validateUrlSyntax(url);
      assert.equal(result.valid, true, `expected ${url} to be allowed, got ${JSON.stringify(result)}`);
    });
  }
});

describe('validateUrlSyntax — 不正なURL構文', () => {
  test('malformed URL文字列', () => {
    const result = validateUrlSyntax('not a url at all');
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'malformed_url');
  });

  test('空文字', () => {
    const result = validateUrlSyntax('');
    assert.equal(result.valid, false);
  });

  test('非文字列', () => {
    const result = validateUrlSyntax(undefined);
    assert.equal(result.valid, false);
  });
});

describe('isPrivateIPv4 / isPrivateIPv6 単体境界値', () => {
  test('172.15.255.255 は範囲外（172.16.0.0/12の外）', () => {
    assert.equal(isPrivateIPv4('172.15.255.255'), false);
  });
  test('172.32.0.0 は範囲外', () => {
    assert.equal(isPrivateIPv4('172.32.0.0'), false);
  });
  test('8.8.8.8 はパブリック', () => {
    assert.equal(isPrivateIPv4('8.8.8.8'), false);
  });
  test('fd12:3456:789a:: はfc00::/7内', () => {
    assert.equal(isPrivateIPv6('fd12:3456:789a::1'), true);
  });
  test('2001:4860:4860::8888 (Google DNS) はパブリック', () => {
    assert.equal(isPrivateIPv6('2001:4860:4860::8888'), false);
  });
  test('::ffff:127.0.0.1 はIPv4-mapped経由でprivate', () => {
    assert.equal(isPrivateIPv6('::ffff:127.0.0.1'), true);
  });
});

describe('assertPublicTarget — IPリテラルの即時判定', () => {
  test('プライベートIPリテラルはSsrfErrorを投げる', async () => {
    await assert.rejects(() => assertPublicTarget('192.168.1.1'), SsrfError);
  });
  test('パブリックIPリテラルは解決を試みず許可する', async () => {
    const result = await assertPublicTarget('8.8.8.8');
    assert.equal(result.addresses[0].address, '8.8.8.8');
  });
});
