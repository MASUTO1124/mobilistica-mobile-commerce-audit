# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet.

### Changed
- Nothing yet.

### Fixed
- Nothing yet.

## [0.1.0] - Unreleased

Initial public release (pending `APPROVE_GITHUB_PUBLISH_MOBILISTICA_AUDIT`).

### Added
- Diagnostic core (`src/mobilistica_audit/`): PSI collector, HTML fallback
  collector, optional local Lighthouse collector, 10 analyzers (performance,
  images, javascript_css, fonts, delivery, mobile_ux, commerce_ux,
  technical_seo, security_headers, third_party), priority scoring
  (P0–P4), mobile commerce score (0–100, grade A–E), platform detection
  (WordPress/WooCommerce/Shopify/other), and report generators (HTML/Markdown/
  CSV/Claude-instructions).
- SSRF-safe URL handling (`security/urlguard.mjs`) with syntax validation and
  DNS-based public-target verification.
- CLI (`cli/mobilistica-audit.mjs`) with `--format`, `--strategy`,
  `--compare`, `--output`, `--api-key`, `--collectors`, `--timeout`,
  `--log-level`, `--json`, `--version`, `--help`, and cross-platform
  installer/uninstaller scripts (`cli/install/`).
- Claude Code skill packaging (`claude-skill/`).
- Web diagnostic UI and WordPress plugin/landing page integration
  (`web-app/`, `wordpress-plugin/`, `landing-page/`).
- Community and contribution files, GitHub Actions workflows (test, lint,
  release), and issue/PR templates.

[Unreleased]: https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit/releases/tag/v0.1.0
