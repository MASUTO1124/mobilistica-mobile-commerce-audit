// security/urlguard.mjs
//
// validateUrlSyntax: pure function, browser-compatible (no `node:` imports at
// module top level). Safe to bundle into core/engine.browser.mjs.
//
// assertPublicTarget: Node-only DNS resolution guard against SSRF. It lazily
// (dynamically) imports `node:dns/promises` *inside* the function body so
// this file itself never has a static `node:` import — a browser bundler
// that only reaches for validateUrlSyntax never needs to resolve `node:dns`.
// Residual DNS-rebinding risk (TTL gap between this check and the actual
// fetch) is a known, accepted limitation — see docs/specs/core-engine-spec.md.

const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);

export class SsrfError extends Error {
  constructor(code, detail) {
    super(`ssrf_guard:${code}${detail ? ` (${detail})` : ''}`);
    this.name = 'SsrfError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * @param {string} rawUrl
 * @returns {{valid:true, url:URL} | {valid:false, reason:string}}
 */
export function validateUrlSyntax(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return { valid: false, reason: 'malformed_url' };
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'malformed_url' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valid: false, reason: 'invalid_protocol' };
  }

  if (url.username || url.password) {
    return { valid: false, reason: 'userinfo_not_allowed' };
  }

  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  if (!ALLOWED_PORTS.has(port)) {
    return { valid: false, reason: 'port_not_allowed' };
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === '' ) {
    return { valid: false, reason: 'malformed_url' };
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, reason: 'blocked_hostname' };
  }

  if (isIpLiteral(hostname) && !isPublicIpLiteral(hostname)) {
    return { valid: false, reason: 'blocked_ip_range' };
  }

  return { valid: true, url };
}

// URL.hostname keeps the brackets for IPv6 literals (e.g. new URL('http://[::1]/').hostname === '[::1]').
// All IPv6 checks below operate on the unbracketed form.
export function stripIpv6Brackets(hostname) {
  if (typeof hostname === 'string' && hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

export function isIpLiteral(hostname) {
  const h = stripIpv6Brackets(hostname);
  return isIPv4(h) || h.includes(':');
}

export function isIPv4(hostname) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return false;
  return hostname.split('.').every((o) => Number(o) >= 0 && Number(o) <= 255);
}

export function isPrivateIPv4(hostname) {
  if (!isIPv4(hostname)) return false;
  const [a, b] = hostname.split('.').map(Number);
  if (a === 127) return true; // loopback 127.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (incl. metadata 169.254.169.254)
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  return false;
}

export function isPrivateIPv6(hostname) {
  const h = stripIpv6Brackets(hostname).toLowerCase();
  if (h === '::1' || h === '0:0:0:0:0:0:0:1') return true; // loopback
  if (h === '::' || h === '0:0:0:0:0:0:0:0') return true; // unspecified
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // fc00::/7 unique local
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true; // fe80::/10 link-local
  // IPv4-mapped (::ffff:a.b.c.d) — evaluate embedded v4 range
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped && isPrivateIPv4(mapped[1])) return true;
  return false;
}

export function isPublicIpLiteral(hostname) {
  const h = stripIpv6Brackets(hostname);
  if (isIPv4(h)) return !isPrivateIPv4(h);
  if (h.includes(':')) return !isPrivateIPv6(h);
  return true;
}

/**
 * Node-only. Resolves `hostname` and throws SsrfError if any resolved
 * address (or the literal itself) falls in a blocked private/reserved range.
 * @param {string} hostname
 * @returns {Promise<{addresses: Array<{address:string, family:number}>}>}
 */
export async function assertPublicTarget(hostname) {
  if (isIpLiteral(hostname)) {
    if (!isPublicIpLiteral(hostname)) {
      throw new SsrfError('blocked_ip_range', hostname);
    }
    const bare = stripIpv6Brackets(hostname);
    return { addresses: [{ address: bare, family: bare.includes(':') ? 6 : 4 }] };
  }

  const { lookup } = await import('node:dns/promises');
  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch (e) {
    throw new SsrfError('dns_resolution_failed', String(e && e.message ? e.message : e));
  }

  if (!addresses || addresses.length === 0) {
    throw new SsrfError('dns_resolution_failed', 'no_addresses');
  }

  for (const { address, family } of addresses) {
    if (family === 4 && isPrivateIPv4(address)) {
      throw new SsrfError('blocked_ip_range', address);
    }
    if (family === 6 && isPrivateIPv6(address)) {
      throw new SsrfError('blocked_ip_range', address);
    }
  }

  return { addresses };
}
