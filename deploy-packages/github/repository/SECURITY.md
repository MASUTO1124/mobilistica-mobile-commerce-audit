# Security Policy

## Supported versions

This project is currently pre-1.0. Security fixes are applied to the latest
release on the `main` branch. Once tagged releases exist, only the most
recent minor version will receive backported fixes.

| Version | Supported |
|---|---|
| latest on `main` | ✅ |
| older tagged releases | ❌ (please upgrade) |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report it privately using **GitHub Security Advisories**:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** to open a private advisory.
3. Include: a description of the issue, steps to reproduce, affected
   version/commit, and (if applicable) a proof of concept.

If you cannot use GitHub Security Advisories, you may instead contact the
maintainer directly via their GitHub profile: [@MASUTO1124](https://github.com/MASUTO1124).

### Response targets

These are targets, not guarantees:

- **Acknowledgement:** within 5 business days.
- **Initial assessment (severity, affected scope):** within 10 business days.
- **Fix or mitigation timeline communicated:** within 30 days of acknowledgement,
  faster for critical issues (e.g. SSRF bypass, remote code execution, API key
  leakage).

## Scope notes specific to this project

- The diagnostic core fetches attacker-influenceable URLs (the audit target)
  over HTTP(S). SSRF protections live in
  `src/mobilistica_audit/security/urlguard.mjs` (`validateUrlSyntax` +
  `assertPublicTarget`). Reports of SSRF bypass (private/loopback/link-local/
  metadata-endpoint ranges, DNS rebinding, redirect-chain escapes) are
  in scope and high priority.
- API keys (`PAGESPEED_API_KEY` / `PSI_API_KEY` / `--api-key`) must never be
  logged, echoed, or written into report output. Any code path that leaks a
  key is a valid report.
- This project does not perform login, checkout, or purchase automation. If
  you find a code path that does, that itself is a security-relevant bug.
- Denial-of-service reports against Mobilistica's own hosted web tool
  (mobilistica.com) should go through the same private reporting channel
  above, not a public issue.
