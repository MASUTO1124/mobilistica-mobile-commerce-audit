# Roadmap

This roadmap describes direction and intent, not committed dates. Items may
be reprioritized, split, or dropped based on real-world usage and
maintainer bandwidth. This is a small, mostly single-maintainer project —
please treat timelines as aspirational.

## Now (0.1.x — initial public release)

- Stabilize the `AuditResult` / `Finding` schema (`docs/specs/core-engine-spec.md`)
  as the public contract consumed by the web app, CLI, and Claude Code skill.
- Ship the three consumption forms (web, CLI, Claude Code skill) against the
  same diagnostic core, with test coverage for the priority-scoring rules
  and SSRF guard.
- Publish to npm and open the GitHub repository once the required internal
  approvals are granted.

## Next (0.2.x)

- **CrUX field-data integration**: blend real-user Core Web Vitals (Chrome
  UX Report) alongside lab data where available, and clearly label which
  metrics are field vs. lab in every report.
- **Report localization**: allow `business_impact` / `recommended_fix` text
  to be generated in English (and potentially other languages) instead of
  Japanese-only, without duplicating the judgment logic.
- Expand platform detection beyond WordPress/WooCommerce/Shopify as real
  audit data comes in from other platforms.

## Later (exploratory, not committed)

- **Before/after comparison dashboard**: a visual diff view built on top of
  the existing `--compare` CLI flag and `options.previous` report support,
  rather than a new data model.
- Additional report export formats if there's demonstrated demand.
- Deeper WooCommerce/Shopify-specific commerce UX checks (e.g. more granular
  checkout-flow-step detection) as we collect more real audits to validate
  heuristics against.

## Explicitly out of scope

- Automated login, checkout, or purchase flows of any kind.
- Ranking, traffic, or sales guarantees or predictions presented as fact.
- A hosted "fix it for you" service that modifies a site automatically
  without a human reviewing the change first.

## How to influence this roadmap

Open an issue describing the use case (not just the feature) — see
[CONTRIBUTING.md](CONTRIBUTING.md). Real audit data and reproducible
false-positive/false-negative reports are especially useful, since the
scoring rules are meant to be evidence-driven, not aesthetic.
