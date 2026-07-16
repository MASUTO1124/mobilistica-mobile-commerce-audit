# Product Hunt draft — Mobilistica Mobile Commerce Audit

> Not submitted yet. Draft for tagline, description, and first comment.
> Update the gallery/screenshot links once `assets/screenshots/` has real
> images — do not submit with placeholder or missing images.

## Tagline (max ~60 chars)

Free, open-source mobile commerce audits, in sales-impact language

Character count: 66 (Python `len()`). Consider trimming to fit Product
Hunt's tagline field if it enforces a hard 60-char limit at submission time
— alternate shorter option below.

**Alternate (54 chars):** Mobile PageSpeed audits, translated to sales impact

## Description (for the listing body)

Mobilistica Mobile Commerce Audit is a free, open-source diagnostic tool for
e-commerce sites. Point it at a URL and it runs a mobile-first technical
audit — Core Web Vitals, images, JS/CSS, fonts, mobile UX, commerce UX,
technical SEO, and security headers — then does two things generic
PageSpeed tools don't:

- Detects the page type (product listing, product detail, cart, checkout,
  article) and platform (WordPress/WooCommerce, Shopify, other), because a
  slow checkout page and a slow blog post aren't the same problem.
- Scores every finding on 7 axes and rolls them into a P0–P4 priority, with
  a plain-language sales-impact explanation and a concrete fix — not just a
  raw audit rule name.

Use it as a free web tool (no signup), a CLI for scripting/CI, or a Claude
Code skill — all three call the exact same diagnostic engine, so results
never drift between them. MIT licensed, zero runtime dependencies (Node.js
built-ins only).

It's a prioritization aid, not a guarantee — it won't promise you higher
rankings or more sales, and it doesn't automate logins, checkouts, or
purchases.

## First comment (maker comment, posted at launch)

Hi Product Hunt 👋

Maker here. We run Mobilistica, a site focused on mobile PageSpeed for
e-commerce, and kept rebuilding the same "what do I fix first" triage logic
for every audit we ran manually. This tool is that logic, cleaned up,
open-sourced, and made consistent across a web UI, a CLI, and a Claude Code
skill.

A few things I'd genuinely like feedback on:
- Does the P0–P4 priority match your intuition when you run it against your
  own site? If a call feels wrong, please open an issue with the specific
  `Finding` — the scoring is meant to be inspectable, not a black box.
- What's missing from "what it checks" that you'd want before trusting this
  for client work?
- Any platform (beyond WordPress/WooCommerce/Shopify) you'd want commerce
  UX detection for next?

Repo: https://github.com/MASUTO1124/mobilistica-mobile-commerce-audit
Try it free: https://www.mobilistica.com/tools/mobile-commerce-audit/

---

## Banned-phrase self-check

Confirmed this draft does **not** contain: "guaranteed to rank higher,"
"GitHub link alone gets you top rankings," "sales will definitely
increase," "guaranteed SEO results," "fully automatic success," "works
with every e-commerce site," "no human review needed" (or their Japanese
equivalents). The description explicitly states it is not a guarantee and
does not automate checkout/purchase flows. Self-checked.
