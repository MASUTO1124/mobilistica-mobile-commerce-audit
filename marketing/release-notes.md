# Release notes — v0.1.0

> Draft. Publish alongside the GitHub release created (as a **draft**) by
> `.github/workflows/release.yml` when tag `v0.1.0` is pushed — after
> `APPROVE_GITHUB_PUBLISH_MOBILISTICA_AUDIT` is granted and the draft is
> reviewed by a maintainer.

## Mobilistica Mobile Commerce Audit v0.1.0 — initial release

The first public release of Mobilistica Mobile Commerce Audit: a free,
open-source diagnostic tool that audits e-commerce sites for mobile
performance, UX, and technical SEO issues, and translates the findings into
prioritized, sales-impact language.

### Highlights

- **One diagnostic core, three surfaces.** The web tool, CLI, and Claude
  Code skill all call the same engine (`src/mobilistica_audit/core/`), so
  results are consistent regardless of how you run an audit.
- **Priority, not just a list.** Every finding is scored on 7 axes (sales
  impact, mobile UX impact, SEO impact, CWV impact, difficulty, cost,
  certainty) and rolled up into a P0–P4 priority.
- **Commerce-aware.** Detects page type (product listing/detail, cart,
  checkout, article) and platform (WordPress/WooCommerce, Shopify, other)
  so the same technical issue is weighted differently depending on where it
  occurs.
- **Works without an API key.** PageSpeed Insights is used when available
  (keyless at a lower quota, or with `PAGESPEED_API_KEY`/`PSI_API_KEY`);
  otherwise the tool falls back to a static HTML/HTTP-header analysis
  rather than stopping.
- **Zero runtime dependencies.** The diagnostic core uses only Node.js
  built-ins (`fetch`, `dns`, `net`, `node:test`). Requires Node.js >= 20.
- **SSRF-safe by design.** Target URLs are validated and DNS-checked
  against private/loopback/link-local/metadata-endpoint ranges before any
  request is made.

### What's included

- CLI (`mobilistica-audit`) with Markdown/JSON/HTML/CSV output, before/after
  comparison (`--compare`), and cross-platform installer scripts.
- Claude Code skill packaging.
- Free web diagnostic tool and WordPress landing page integration.
- Community/contribution files, CI (test + lint workflows), and issue/PR
  templates.

### Known limitations (see README for the full list)

- Core Web Vitals are currently lab data only; CrUX field-data integration
  is on the [roadmap](../ROADMAP.md), not yet implemented.
- Report text (`business_impact`, `recommended_fix`) is Japanese-first;
  English report output is planned but not yet available.
- Audits one URL at a time — no site-wide crawling.

### Upgrade notes

N/A — this is the first release.

### Links

- Full changelog: [CHANGELOG.md](../CHANGELOG.md)
- README: [README.md](../README.md) / [README.ja.md](../README.ja.md)
- Web tool: https://www.mobilistica.com/tools/mobile-commerce-audit/

---

## Banned-phrase self-check

Confirmed this draft does **not** contain: "guaranteed to rank higher,"
"GitHub link alone gets you top rankings," "sales will definitely
increase," "guaranteed SEO results," "fully automatic success," "works
with every e-commerce site," "no human review needed" (or their Japanese
equivalents). Self-checked.
