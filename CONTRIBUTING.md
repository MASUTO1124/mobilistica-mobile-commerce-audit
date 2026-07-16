# Contributing to Mobilistica Mobile Commerce Audit

Thanks for considering a contribution. This project is intentionally small in
scope and dependency-free at its core — please keep that in mind when
proposing changes.

## Ground rules

- **Node.js >= 20**, ESM only (`.mjs`). No runtime dependencies in the
  diagnostic core — only Node.js built-ins (`fetch`, `dns`, `net`,
  `node:test`). `devDependencies` (linting, etc.) are fine.
- `analyzers/`, `scoring/`, `recommendations/`, `reports/`, and the pure parts
  of `collectors/psi.mjs` and `security/urlguard.mjs` must stay
  **browser-compatible** — no `node:` imports in those files. Node-only code
  belongs in `collectors/html.mjs`, `collectors/lighthouse_local.mjs`, and
  `cli/`.
- There is exactly **one** place that decides what a finding means:
  `src/mobilistica_audit/core/pipeline.mjs` (`analyzeCollected`). The web app,
  CLI, and Claude Code skill must not reimplement judgment logic — they only
  call the core and format its output.
- No fabricated or exaggerated claims in report text, docs, or marketing
  copy (e.g. "guaranteed to rank higher", "sales will definitely increase").
  See `docs/PROJECT_BRIEF.md` if you have access to it, or ask a maintainer.

## Dev setup

```bash
git clone https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit.git
cd mobilistica-mobile-commerce-audit
npm install
npm test
```

Tests live in `tests/` and use Node's built-in test runner (`node --test`).
**Tests must not make real network calls** — use the fixtures in
`tests/fixtures/` and mock `fetchImpl` / `MOBILISTICA_AUDIT_MOCK` instead.

To run the CLI locally without installing:

```bash
node cli/mobilistica-audit.mjs https://example.com --json
```

## Project layout (who owns what)

| Path | Contents |
|---|---|
| `src/mobilistica_audit/` | Diagnostic core: collectors, analyzers, scoring, recommendations, report generators |
| `cli/` | Command-line interface, wraps the core only |
| `web-app/`, `wordpress-plugin/`, `landing-page/` | Web UI and WordPress integration |
| `claude-skill/` | Claude Code skill packaging |
| `tests/` | Test fixtures and suites (network-free) |
| `docs/` | Specs and internal planning docs |
| Repo root, `.github/`, `marketing/` | Community/contribution files, CI, launch materials |

If your change crosses one of these boundaries, please say so in the PR
description — it usually means either the core contract needs updating first,
or the change belongs in a different file.

## Making a change

1. Fork the repo and create a branch from `main`.
2. Make your change with tests. New analyzer logic needs a fixture-based test
   in `tests/`; CLI changes need coverage in `tests/cli.test.mjs`.
3. Run `npm test` and make sure it's green.
4. If you touched `src/`, `cli/`, keep style consistent with the surrounding
   file — run the lint workflow config locally if you have it set up
   (`.github/eslint.config.mjs`).
5. Open a PR using the template. Describe *why*, not just *what* — especially
   for changes to `scoring/priority.mjs` or the `AuditResult`/`Finding`
   schema, since those are the public contract consumed by the web app, CLI,
   and skill alike.
6. Keep PRs focused. Large, multi-concern PRs are harder to review and more
   likely to get stuck.

## Reporting bugs / requesting features

Please use the issue templates (`.github/ISSUE_TEMPLATE/`). For security
vulnerabilities, see [SECURITY.md](SECURITY.md) instead of opening a public
issue.

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).
