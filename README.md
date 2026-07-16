# Mobilistica Mobile Commerce Audit

[![Tests](https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit/actions/workflows/test.yml/badge.svg)](https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)

**A free, open-source mobile commerce diagnostic tool that translates technical PageSpeed/CWV findings into prioritized, sales-impact language for e-commerce sites.**

日本語版 README は [README.ja.md](README.ja.md) をご覧ください。

Enter a URL, get back a prioritized list of what's actually costing you mobile sales — not just a technical score. Available as a **web tool**, a **CLI**, and a **Claude Code skill**, all powered by the same diagnostic engine (`src/mobilistica_audit/`) so results never drift between the three.

---

## What it does

Generic PageSpeed tools tell you your LCP is 4.2 seconds. They don't tell you that's on your product page, right above the Add to Cart button, and that it's likely costing you mobile conversions. Mobilistica Mobile Commerce Audit:

- Runs a mobile-first technical audit (performance, images, JS/CSS, fonts, delivery, mobile UX, commerce UX, technical SEO, security headers, third-party scripts).
- Detects the page type (product listing, product detail, cart, checkout, article, etc.) and platform (WordPress/WooCommerce, Shopify, other).
- Scores every finding on 7 axes (sales impact, mobile UX impact, SEO impact, CWV impact, difficulty, cost, certainty) and derives a **P0–P4 priority**, so you know what to fix first.
- Translates each finding into a **business-impact sentence** (in Japanese by default) plus a concrete recommended fix — not just a raw audit rule name.
- Works even without an API key (falls back gracefully); works even without internet access to third-party services beyond the target site and, optionally, Google PageSpeed Insights.

It is **not** a guarantee of higher rankings or more sales — see [Limitations](#limitations) below.

## Who it's for

- EC site operators (Shopify / WooCommerce / WordPress) who want to know what to fix first, not just a score.
- Web/agency developers who need a defensible, evidence-based punch list for a client.
- SEO/marketing consultants who need to translate technical debt into language a business owner acts on.
- Anyone who wants a mobile commerce PageSpeed check that understands the difference between a blog post and a checkout page.

## Screenshots

| Web UI (mobile) | HTML report |
|---|---|
| ![Web audit UI on a 390px viewport, showing the mobile commerce score, Core Web Vitals and top issues](assets/screenshots/web-app-mobile-390.png) | ![Self-contained HTML report at desktop width](assets/screenshots/html-report-1280.png) |

![Web audit UI at desktop width](assets/screenshots/web-app-desktop-1280.png)

## 30-second example

```bash
# Install (see "Install" below for all options)
npm install -g mobilistica-mobile-commerce-audit

# Run a mobile audit and print a Markdown report to stdout
mobilistica-audit https://example-shop.com

# Or get raw JSON for scripting/CI
mobilistica-audit https://example-shop.com --json
```

Example output (abridged — actual wording and values depend on the live diagnostic; see [Sample report](#sample-report) for a full machine-readable example):

```markdown
# Mobile Commerce Audit — example-shop.com

**Mobile Commerce Score: 58 / 100 (Grade C)**

## Top issues

### [P1] Largest Contentful Paint is 4.2s on the product detail page
- Evidence: LCP 4,200ms (lab data); hero image `product-hero.jpg` is 1.8MB, no modern format
- Business impact: Shoppers on mobile networks are likely leaving before the product image and
  "Add to Cart" button finish rendering — this page type sees the highest cart-abandonment risk
  from slow LCP.
- Recommended fix: Serve `product-hero.jpg` as WebP/AVIF, add `fetchpriority="high"`, and remove
  render-blocking CSS above the fold.
- Owner: frontend | Effort: small | Confidence: 80%

### [P2] Add-to-cart button requires scrolling on most mobile viewports
- Business impact: (estimated) Increases the steps between "interested" and "purchase" on the
  highest-intent page type.
- Recommended fix: Move the CTA above the fold or add a sticky mobile add-to-cart bar.
```

## Install

### From source (until the first npm release)

```bash
git clone https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit.git
cd mobilistica-mobile-commerce-audit
npm install
npm link            # exposes the `mobilistica-audit` command globally
```

### Installer scripts (CLI + Claude Code skill in one step)

```bash
./cli/install/install.sh --yes          # macOS / Linux
./cli/install/install.ps1 -Yes          # Windows PowerShell
python cli/install/install.py --yes     # cross-platform Python alternative
```

The installer prints the install destination before writing anything, backs up any existing files as `<name>.bak-YYYYMMDD-HHMMSS`, and copies the Claude Code skill into `~/.claude/skills/`. Run the matching `uninstall.sh` / `uninstall.ps1` to remove it (backups are kept).

### From npm (after the first published release)

```bash
npm install -g mobilistica-mobile-commerce-audit
```

No dependencies are installed at runtime — the diagnostic core uses only Node.js standard modules (`fetch`, `dns`, `net`, `node:test`). Node.js >= 20 is required.

## Use with Claude Code

After running the installer (or copying `claude-skill/mobilistica-mobile-commerce-audit/` into `~/.claude/skills/` yourself), the skill is available in any Claude Code session. Ask Claude to audit a URL and it runs the same diagnostic engine locally — no separate account or dashboard required, and an API key is optional (PSI works keyless at a lower quota).

```
/mobilistica-mobile-commerce-audit https://example-shop.com
```

The skill returns the same prioritized, business-impact-framed findings as the CLI and web tool, formatted for direct use inside a coding/writing session (e.g. handing P0/P1 fixes straight to a developer agent).

## CLI usage

```
mobilistica-audit <url> [options]

  --format <html|json|md|csv|all>  Output format (default: md to stdout; use with --output for a file set)
  --strategy <mobile|desktop>      Audit strategy (default: mobile)
  --mobile-only                    Alias for --strategy mobile
  --compare <previous.json>        Diff against a previous AuditResult JSON (before/after)
  --output <dir>                   Write report file(s) to this directory (audit_id-based filenames)
  --api-key <key>                  PSI API key (priority: this flag > PAGESPEED_API_KEY > PSI_API_KEY > keyless)
  --collectors <auto|psi|html>     Data collection strategy (default: auto)
  --timeout <ms>                   Request timeout in milliseconds
  --log-level <silent|info|debug>  Log verbosity (logs always go to stderr)
  --json                           Shorthand for --format json with no --output (JSON only on stdout)
  --version                        Print the installed version
  --help                           Print usage
```

Exit codes: `0` success · `1` audit ran but found a P0 issue or all collectors failed · `2` invalid arguments · `3` target unreachable (including SSRF rejection) · `4` internal error.

```bash
mobilistica-audit https://example.com --format all --output ./reports
mobilistica-audit https://example.com --compare ./reports/prev.json --format md
```

## Web version

A free, no-signup web version is available at **[mobilistica.com/tools/mobile-commerce-audit/](https://www.mobilistica.com/tools/mobile-commerce-audit/)**, built on the exact same diagnostic core as this repository (`web-app/`, browser-compatible entry point `core/engine.browser.mjs`).

## What it checks

| Category | Examples | Why it matters for mobile commerce |
|---|---|---|
| Performance | Core Web Vitals (LCP/INP/CLS/TBT), render-blocking resources, JS bootup time, DOM size | Slow pages lose mobile shoppers before they ever see the product |
| Images | Modern formats (WebP/AVIF), responsive images, lazy-loading, LCP image priority, missing dimensions | Unoptimized hero/product images are usually the single biggest speed cost |
| JavaScript & CSS | Bundle size, missing defer/async, unused CSS, critical CSS, plugin bloat detection | Heavy scripts delay interactivity on mid-range phones |
| Fonts | font-display, preload, external font hosts, FOIT/FOUT risk | Invisible or flashing text hurts trust on first view |
| Delivery | Caching headers, CDN detection, compression, HTTP/2-3, redirect chains | Wasted round-trips add up fast on mobile networks |
| Mobile UX | Viewport, tap-target size, font size, layout-shift risk factors | Tiny buttons and jumping layouts cause mis-taps and abandoned carts |
| Commerce UX | Page-type detection, add-to-cart visibility, trust signals, Product/Offer schema | Generic PageSpeed tools can't tell a checkout page from a blog post — this one tries to |
| Technical SEO | Canonical tags, robots/sitemap, heading structure, structured data, indexability | Indexability issues quietly cap organic traffic before commerce even factors in |
| Security Headers | HTTPS, HSTS, mixed content, X-Content-Type-Options, CSP presence | Mixed-content warnings erode buyer trust at the worst possible moment: checkout |
| Third-Party Scripts | Analytics/ads/chat classification and total weight | Every added script is a tax on load time paid by every visitor |

Findings that rely on heuristics rather than direct measurement (e.g. some mobile UX checks in HTML-fallback mode) are explicitly marked `(estimated)` and listed in the report's limitations section — see [core-engine spec](docs/specs/core-engine-spec.md) if you want the exact rules.

## Sample report

A full, real `AuditResult` JSON example (generated from the project's own test fixtures) is kept at [`examples/sample-audit.json`](examples/sample-audit.json), together with a walkthrough in `examples/`. Use it to see the exact schema before writing an integration.

## Limitations

- This is a **diagnostic and prioritization aid**, not a guarantee of ranking, traffic, or sales outcomes. No output claims otherwise.
- Without an API key, PSI (PageSpeed Insights) calls run at Google's keyless quota, which is lower and can be rate-limited under heavy use.
- When PSI/Lighthouse data isn't available, the tool falls back to a static HTML/HTTP-header analysis — several checks (e.g. real layout shift, actual scroll distance to CTA) become heuristic estimates and are labeled `(estimated)`.
- Field data (real-user CrUX metrics) is not yet integrated — see [ROADMAP.md](ROADMAP.md); current Core Web Vitals are lab data.
- The tool audits one URL at a time; it does not crawl an entire site.
- It does not perform login, checkout, or purchase automation of any kind — by design.
- For safety, the target must resolve to a public address (private/internal/loopback/link-local ranges are rejected) — see [SECURITY.md](SECURITY.md).
- Reports are Japanese-first by default (`business_impact` / `recommended_fix` fields); the README/docs are English-first. Full report localization is on the [roadmap](ROADMAP.md).

## Security

- The HTML collector enforces SSRF protections (URL syntax validation + DNS resolution checks against private/loopback/link-local/metadata-endpoint ranges) before fetching any target — see `src/mobilistica_audit/security/urlguard.mjs`.
- No API keys are logged, written to reports, or transmitted anywhere except to Google's PageSpeed Insights API (only if you provide/enable it).
- Nothing about the audited site or the results is sent to Mobilistica's servers when you run the CLI or Claude Code skill locally — only the web tool at mobilistica.com processes requests server-side, for the URL you submit there.
- To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full list. Highlights under consideration: CrUX field-data integration, multi-language report output, and a before/after comparison dashboard.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup (`npm install`, `npm test`) and PR guidelines. Please also read the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © 2026 Mobilistica / MASUTO Inc.

## Links

- Mobilistica (official site): https://www.mobilistica.com/
- Web tool: https://www.mobilistica.com/tools/mobile-commerce-audit/
- Related case study (background reading — a manual/mu-plugin optimization project, not produced by this tool): https://www.mobilistica.com/ecサイトのモバイルpagespeedスコアを28点から76点に改善し/
- Issues / feature requests: [GitHub Issues](https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit/issues)
