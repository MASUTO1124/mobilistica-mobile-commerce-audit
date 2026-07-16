# Screenshot / recording capture procedure

> Use this checklist when the web app, CLI, and Claude Code skill are
> functional enough to demo. Do not stage or fabricate result data — every
> screenshot must come from a real run against a real URL. This file does
> not itself contain any screenshots; it's the procedure for producing them.

## Prerequisites

- [ ] `web-app/` is deployed (or runnable locally) and reachable.
- [ ] `cli/mobilistica-audit.mjs` runs end-to-end against a live URL (not
      just the mock via `MOBILISTICA_AUDIT_MOCK`).
- [ ] `claude-skill/mobilistica-mobile-commerce-audit/` is installed in a
      test `~/.claude/skills/` for the recording session.
- [ ] Pick 1–2 target URLs to audit for the demo:
  - Mobilistica's own site(s), per `docs/PROJECT_BRIEF.md`'s "外部サイトへの
    実診断はMobilistica自身のURL2件＋少数の公開URLのみ" rule.
  - Do not run repeated/high-frequency audits against third-party sites.

## Web UI screenshots

1. `assets/screenshots/web-ui-input.png` — the empty URL input form
   (first view, before submitting).
2. `assets/screenshots/web-ui-overview.png` — results overview: mobile
   commerce score, grade, Core Web Vitals summary.
3. `assets/screenshots/web-ui-top-issues.png` — top 5 issues list with
   priority color-coding.
4. `assets/screenshots/web-ui-finding-detail.png` — one expanded finding
   showing evidence / business impact / recommended fix.

Capture at a standard viewport (e.g. 1440×900 for the browser chrome shot,
390×844 to also show how the tool's own output looks on mobile, if useful).
Use a browser with no extensions/bookmarks bar visible. Redact nothing —
only audit URLs that are fine to show publicly.

## CLI recording

1. Clear terminal, set a readable font size (16–18pt) and a light or dark
   theme consistent with the rest of the marketing material.
2. Record (asciinema, or plain screen capture) the following sequence:
   ```bash
   mobilistica-audit --help
   mobilistica-audit https://<target> --format md
   mobilistica-audit https://<target> --json | head -n 20
   ```
3. Save the raw terminal output text alongside the recording as
   `assets/screenshots/cli-output-sample.txt` so it can be copy-pasted into
   docs/marketing without re-running the tool.
4. Export a still frame as `assets/screenshots/cli-run.png` for use in the
   README/launch post if a static image is preferred over embedding a GIF.

## Claude Code skill recording

1. Start a fresh Claude Code session with the skill installed.
2. Record a short exchange: user asks for an audit of the same target URL
   used above, skill runs, and returns prioritized findings.
3. Save as `assets/screenshots/claude-code-skill-run.png` (or a short
   screen recording if the marketing plan calls for video).

## After capture

- [ ] Verify no API keys, tokens, or `.env` contents are visible in any
      frame (check terminal history, browser dev tools panels, env var
      echoes).
- [ ] Verify the audited URL(s) are ones covered by the "Mobilistica's own
      URLs + a small number of public URLs" rule.
- [ ] Update the placeholder comments in `README.md` / `README.ja.md`
      (`<!-- assets/screenshots/... -->`) to real `![alt](path)` image
      embeds once files exist at those paths — do not point to files that
      don't exist yet.
- [ ] Re-check all marketing files in this directory for any wording that
      assumed screenshots didn't exist yet ("will be added") and update
      once they do.
