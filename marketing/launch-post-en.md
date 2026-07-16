# Launch post (EN) — Mobilistica Mobile Commerce Audit

> Draft for blog / long-form announcement. Not yet published.

## Title options

1. "We open-sourced our mobile commerce PageSpeed audit tool — because generic scores don't tell you what to fix first"
2. "Introducing Mobilistica Mobile Commerce Audit: free, open-source, and it speaks 'sales impact,' not just Lighthouse jargon"
3. "Your PageSpeed score is 62. Your checkout page's Add to Cart button is invisible on mobile. Only one of those facts matters."

## Draft body

Most mobile speed tools stop at the score. You run PageSpeed Insights, get a
number between 0 and 100, and a list of audit rule names — "eliminate
render-blocking resources," "serve images in next-gen formats" — with no
sense of which one is actually costing you mobile sales, and which one is a
rounding error.

We built **Mobilistica Mobile Commerce Audit** to close that gap, and we're
open-sourcing it today.

### What it actually does differently

It's not a PageSpeed re-skin. On top of a standard mobile-first technical
audit (Core Web Vitals, images, JS/CSS, fonts, delivery, security headers,
technical SEO), it adds two things generic tools don't do:

- **Page-type and platform awareness.** It tries to tell the difference
  between your homepage, a category listing, a product detail page, and a
  checkout step — and between WordPress/WooCommerce, Shopify, and other
  setups — because a 4-second LCP means something different on a blog post
  than on the page where someone is about to add something to their cart.
- **Priority, not just a list.** Every finding is scored on 7 axes (sales
  impact, mobile UX impact, SEO impact, CWV impact, difficulty, cost,
  certainty) and rolled up into a P0–P4 priority, so "what do I fix first"
  has an actual answer instead of a wall of 40 audit rules in no particular
  order.

Each finding also gets translated into a plain-language business-impact
sentence and a concrete recommended fix, instead of a raw Lighthouse audit
ID.

### Three ways to use it, one engine underneath

- A **free web tool** at [mobilistica.com/tools/mobile-commerce-audit/](https://www.mobilistica.com/tools/mobile-commerce-audit/) — no signup.
- A **CLI** (`mobilistica-audit <url>`) for scripting, CI, and agencies running audits across client sites.
- A **Claude Code skill** for pulling audit results straight into a coding
  session and handing prioritized fixes to a developer (or a developer
  agent).

All three call the exact same diagnostic core
(`src/mobilistica_audit/core/pipeline.mjs`) — there's no separate "web
version logic" that can drift from what the CLI reports. If you find a bug
in the scoring, it's the same bug everywhere, and the fix is the same fix
everywhere.

### What it doesn't do

It doesn't guarantee higher rankings or more sales — nothing it outputs
should be read that way, and we've been deliberate about not writing our
own reports (or this post) as if it does. It doesn't automate logins,
checkouts, or purchases. Field data (real-user Core Web Vitals via CrUX)
isn't wired in yet — current metrics are lab data, clearly labeled. See
[Limitations in the README](https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit#limitations)
for the full list.

### Why we're doing this

We run Mobilistica as a site focused on mobile PageSpeed for e-commerce, and
we kept rebuilding versions of this same triage logic for our own audits.
Open-sourcing the engine means the judgment logic is inspectable — you can
see exactly why a finding got P1 instead of P3, which we think matters more
for a tool that's telling you what to spend engineering time on.

It's MIT-licensed. Contributions, bug reports, and "this priority call is
wrong and here's why" issues are all welcome — see
[CONTRIBUTING.md](https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit/blob/main/CONTRIBUTING.md).

**Try it:** `npm install -g mobilistica-mobile-commerce-audit && mobilistica-audit https://your-shop.com`

**Repo:** https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit
**Web tool:** https://www.mobilistica.com/tools/mobile-commerce-audit/

---

## Banned-phrase self-check

Confirmed this draft does **not** contain any of the following:
「確実に順位が上がる」「GitHubリンクだけで上位表示」「売上が必ず増える」
「SEO効果を保証」「完全自動で成功」「すべてのECサイトに対応」「人間確認不要」
(or their English equivalents: "guaranteed to rank higher," "GitHub link
alone gets you top rankings," "sales will definitely increase," "guaranteed
SEO results," "fully automatic success," "works with every e-commerce
site," "no human review needed").

Claims made are limited to: free / open-source / can run locally /
translates technical findings into e-commerce context / provides
prioritization / same engine across all three surfaces. Self-checked.
