## What does this PR do, and why?

<!-- Describe the change and the motivation. If this touches scoring/priority
     logic or the AuditResult/Finding schema, explain the reasoning — those
     are the public contract shared by the web app, CLI, and Claude Code skill. -->

## Area(s) touched

- [ ] Diagnostic core (`src/mobilistica_audit/`)
- [ ] CLI (`cli/`)
- [ ] Web app / WordPress plugin / landing page
- [ ] Claude Code skill (`claude-skill/`)
- [ ] Tests only (`tests/`)
- [ ] Docs / community files / CI

## Checklist

- [ ] `npm test` passes locally.
- [ ] No new runtime dependencies were added to the diagnostic core
      (`src/mobilistica_audit/`) — Node.js built-ins only.
- [ ] Files under `analyzers/`, `scoring/`, `recommendations/`, `reports/`,
      and the pure parts of `collectors/psi.mjs` / `security/urlguard.mjs`
      still contain no `node:` imports (browser-compatible).
- [ ] If I changed judgment/scoring logic, I only changed it in
      `core/pipeline.mjs` / `scoring/` — not duplicated it elsewhere.
- [ ] I added or updated tests for this change (fixture-based, no real
      network calls).
- [ ] No API keys, credentials, or fabricated/exaggerated claims (e.g.
      "guaranteed to rank higher") were introduced in code, docs, or report
      text.
- [ ] I did not modify files outside the areas checked above without reason
      given below.

## How was this tested?

<!-- Commands you ran, fixtures used, manual steps if applicable. -->

## Related issue(s)

<!-- Closes #123, relates to #456 -->
