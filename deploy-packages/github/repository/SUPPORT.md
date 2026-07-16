# Support

## Where to get help

- **Bug reports & feature requests**: [GitHub Issues](https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit/issues) — please use the provided templates (`.github/ISSUE_TEMPLATE/`).
- **Usage questions** ("how do I...", "why does my report show..."): open a GitHub Issue with the `question`-style content from the feature request template, or start a Discussion if Discussions are enabled on the repository.
- **Security vulnerabilities**: do **not** use a public issue — follow [SECURITY.md](SECURITY.md) instead.
- **Contributing code**: see [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup and PR guidelines.

## Before opening an issue

Please include:

1. The command you ran (CLI) or the URL you audited (web version), with any
   flags — but **do not paste your API key**.
2. Node.js version (`node -v`) and OS, for CLI issues.
3. What you expected vs. what you got. For a scoring/priority disagreement,
   include the relevant `Finding` object from the JSON output
   (`--format json`) so the evidence is visible.
4. Whether the issue is reproducible against a public URL you can share
   (helps a lot — many issues are page-specific).

## Response expectations

This is a small open-source project, not a commercial support channel.
There is no guaranteed response time or SLA. Security reports are
prioritized — see [SECURITY.md](SECURITY.md) for those targets.

## Related resources

- Documentation: [README.md](README.md) / [README.ja.md](README.ja.md)
- Diagnostic schema reference: [`docs/specs/core-engine-spec.md`](docs/specs/core-engine-spec.md)
- Sample output: [`examples/sample-audit.json`](examples/sample-audit.json)
- Hosted web version: https://www.mobilistica.com/tools/mobile-commerce-audit/
- Mobilistica (official site): https://www.mobilistica.com/
