# v0.1.0 — Initial Release

**Mobilistica Mobile Commerce Audit** — Free, open-source mobile commerce audit for EC sites.
ECサイトのモバイル表示速度・Core Web Vitals・購入導線を診断し、売上影響順の改善優先度（P0〜P4）を提示します。

## Highlights

- 🔍 **One engine, three interfaces** — Web UI / CLI / Claude Code skill share byte-identical analysis modules
- 🇯🇵 **EC-focused Japanese reports** — findings translated into business impact, with owner/effort per issue
- 🧩 **Platform-aware advice** — WordPress / WooCommerce / Shopify detection with environment-specific fixes
- 🪶 **Zero runtime dependencies** — Node.js >= 20 standard library only
- 🔒 **Privacy-first** — no signup, no email, results generated locally; URL never stored server-side
- 🛡️ **SSRF-guarded collectors** — private ranges / metadata endpoints / redirect chains re-validated

## What's included

- Core audit engine (10 analyzers, P0–P4 prioritization, 0–100 mobile commerce score)
- CLI (`mobilistica-audit <url> --format html|json|md|csv|all`, compare mode, CI-friendly exit codes)
- Claude Code skill (`mobilistica-mobile-commerce-audit`)
- WordPress plugin (shortcode `[mobilistica_mobile_audit]`, optional server-side PSI proxy)
- HTML / Markdown / CSV / JSON reports + Claude Code fix-instruction generator

## Known limitations

- Keyless PSI API access is heavily rate-limited — set `PAGESPEED_API_KEY` for reliable metrics
- Commerce UX checks based on public HTML are heuristic (marked as "estimated" in reports)
- Local Lighthouse integration is optional and requires separate installation

本リリースは診断の目安を提供するものであり、検索順位・売上等の成果を保証するものではありません。
