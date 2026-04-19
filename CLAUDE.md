# Afuera Site — Claude Handoff

Single-page marketing site for **Afuera** — an AI consultancy for tour & experience operators.

## Quick orientation

- **Stack**: pure static HTML/CSS/vanilla JS in a single `index.html` file. No build step, no framework, no dependencies.
- **Hosting**: Vercel project `project-eiu92` under the `Outdoorable` team.
- **Live URL**: https://project-eiu92.vercel.app
- **GitHub repo**: https://github.com/Outdoorable/afuera-site
- **Local working copy**: `~/Desktop/afuera-site/` (this folder)

## Files

```
index.html                      the entire landing page (HTML, CSS, vanilla JS all inline)
vercel.json                     cache headers + build command + cleanUrls + trailingSlash
package.json                    Node deps for the blog build (gray-matter, marked)
hero-graphic.png                hero image (black bg, uses mix-blend-mode: screen)
ali-headshot.png                used in About + How Engagements Work + trust bar
itinerary-transformation.png    used in pain-points callout card
robot-fix.png / guide-glow.png / total-connection.png   AI Audit card header images

content/blog/*.md               blog post sources (markdown + YAML frontmatter)
scripts/build.mjs               build script → generates /blog/*.html + sitemap + robots.txt + llms.txt
scripts/templates.mjs           HTML head/nav/footer shared with index.html

Generated on every `npm run build` (all gitignored — Vercel regenerates on deploy):
  blog/index.html
  blog/<slug>/index.html
  sitemap.xml
  robots.txt
  llms.txt

.env.local                      VERCEL_TOKEN (gitignored, never commit)
.vercel/project.json            Vercel project link (gitignored)
node_modules/                   gitignored; Vercel installs on each build
```

## Blog workflow

The blog is a tiny static generator. Zero runtime framework — every post becomes a pre-rendered HTML file at build time.

### To publish a new post

1. Create `content/blog/<slug>.md` with YAML frontmatter (see schema below)
2. `git add content/blog/<slug>.md && git commit -m "New post: ..."`
3. `git push` — Vercel runs `npm run build` → regenerates `blog/`, `sitemap.xml`, `robots.txt`, `llms.txt` → deploys

That's it. To preview locally first: `npm run build && open blog/<slug>/index.html`.

### Frontmatter schema

```yaml
---
title: "How to stop losing your guides to paper lists"
slug: "guides-to-paper"              # defaults to filename
date: 2026-04-17                      # required; used for sort + sitemap lastmod
summary: "A 2-minute TL;DR..."        # required; becomes TL;DR box + meta desc + og:description
icps:                                 # optional; drives filter chips on /blog/
  - tour operator
  - guide
tags:                                 # optional; article:tag meta + keywords
  - field ops
  - ai
author: "Ali Murphy"                  # optional
cover: "guide-glow.png"               # optional; og:image (default: hero-graphic.png)
faq:                                  # optional; renders FAQ section + JSON-LD FAQPage
  - question: "..."
    answer: "..."
---
```

### What each post page emits automatically

- `<title>`, meta description, `<link rel=canonical>`
- Open Graph (og:type=article, article:published_time, og:image, og:url, ...)
- Twitter Card (summary_large_image)
- **JSON-LD**: `Article`, `BreadcrumbList`, and `FAQPage` (if faq: is present)
- Visible TL;DR callout box at top of post
- Auto-TOC from H2 headings (2+ H2s required)
- FAQ section at bottom (from frontmatter)
- Reuses the main site's nav, footer, CSS — no design drift
- "Book a Free Discovery Call" CTA block at the end

### AEO/SEO primitives (auto-generated on every build)

- `/sitemap.xml` — home + /blog + every post, with dates from frontmatter
- `/robots.txt` — explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot
- `/llms.txt` — emerging AI-crawler manifest (site summary + key pages + recent posts)
- `Organization` JSON-LD is injected into the landing page `<head>` on every build

## Editing → deploying

User edits the site by chatting with you. You edit `index.html` (or images, or `content/blog/*.md`) directly in this folder, then deploy:

```bash
cd ~/Desktop/afuera-site && set -a && source .env.local && set +a && \
  git add -A && \
  git commit -m "your commit message here" && \
  git push && \
  ~/.npm-global/bin/vercel --prod --yes --token "$VERCEL_TOKEN"
```

**Both** `git push` and `vercel --prod` are needed today — the GitHub→Vercel webhook isn't wired (the user can fix this in Vercel Settings → Git → reconnect with the GitHub App installed for this repo, but it's not done yet). Until then, push to git for source-of-truth + deploy via CLI for live update.

The `vercel --prod` command will also run `npm run build` on Vercel's side (per the `buildCommand` in `vercel.json`), which regenerates all blog output. You don't need to run `npm run build` locally before pushing — but if you want to preview blog changes locally, run it.

## Design system

**Full design system is in the `afuera-design` skill** (`.claude/skills/afuera-design/SKILL.md`). Read that BEFORE making any visual change — it covers brand identity, typography, full color palette with hex values, section background system, card patterns, button system, animation principles, decorative element rules, imagery treatment, layout principles, voice, and explicit do/don't lists.

Quick reference (full detail in the skill):

- **Fonts**: `Space Grotesk` (headings) + `DM Sans` (body), both via Google Fonts
- **Palette** (CSS vars at the top of `index.html`):
  - `--bg-eggplant: #2E2A39` (dark sections)
  - `--bg-deep-teal: #24333A` (dark sections, alt)
  - `--bg-light: #FAF7F5` (cream)
  - `--bg-secondary: #F1ECE9` (sand)
  - `--accent-orange: #FF7A59` (primary CTA, terracotta-leaning)
  - `--accent-teal: #2EC4B6`
  - `--accent-pink: #F4A6B5`
  - `--accent-yellow: #FFD166`
- **Aesthetic**: Jasper.ai-inspired. Glassmorphism cards on dark sections; warm gradient cream on light. Smooth spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`). Floating decorative orbs/rings drift on scroll. Pill buttons with inner highlight + soft glow on hover.

## Section map (top → bottom)

1. **Hero** (eggplant) — "Think outside *the docs.*", left-aligned text + right graphic w/ `mix-blend-mode: screen` blending the PNG's black bg into the section
2. **Problem** (light) — "AI-powered operations for *better human experiences.*" — 4 pain-point cards in a 3-col grid; row 2 has a full-width 2-col **callout card** ("Stop sending Word docs.") with the `itinerary-transformation.png` image on the right
3. **AI Audit** (deep teal) — `id="services"` — 3 audit cards (Office, Field, Office+Field full-width "both" card spanning 2 cols), all with the same CTA: "Start with a free Discovery Call →"
4. **How Engagements Work** (sand) — `id="how"` — 4-step funnel + Ali-pic CTA + "Meet Ali — she takes every call" link
5. **Custom Engineering** (eggplant) — `id="engineering"` — 4 problem cards
6. **Who We Work With** (warm light gradient w/ pink+gold washes) — `id="who-we-work"` — 6 ICP cards in 3 cols, soft border-left accent stripe per card
7. **About** (deep teal) — `id="about"` — "Meet Ali — Your AI Sherpa", body + CTA on the left, headshot on the right, then a **curvy serpentine vertical timeline** (5 nodes alternating left/right, SVG path drawn on scroll, dots glow when revealed) — the path is generated in JS from each dot's actual rendered Y position
8. **Blog** (sand) — `id="blog"` — 3 placeholder posts
9. **Community** (eggplant) — `id="community"` — webinar signup form
10. **Final CTA** (light gradient) — `id="contact"` — "Start with a conversation." + form card
11. **Footer** (eggplant, separated from final CTA by clean border-top) — logo, tagline, copyright

## Key JS behaviors (in the `<script>` at the bottom of `index.html`)

- Single `requestAnimationFrame` scroll handler batches: nav scroll-shadow toggle, hero parallax/fade (gentle: `0.12` multiplier), `[data-parallax]` decorative drift, `.scroll-fade` reveal
- `IntersectionObserver` for `.stagger-reveal` cards and `.stat-number` count-ups (easeOutExpo)
- Curvy timeline at `#curvy-timeline`: builds an SVG cubic-bezier path through dot positions on load, draws via `stroke-dashoffset` based on scroll progress, reveals nodes as path passes them
- Mobile hamburger toggle (`.mobile-toggle` → `.nav-links.open`)
- Smooth scroll for `a[href^="#"]` with mobile menu auto-close
- `.tutorial-form` submit handler is null-guarded (form doesn't currently exist in HTML)

## Things to NOT do without asking

- Don't change the color palette hex values (they're intentional)
- Don't change fonts (Space Grotesk + DM Sans stay)
- Don't change the lowercase "afuera" wordmark
- Don't remove sections; the user is opinionated about ordering
- Don't introduce build tooling (no React, no Tailwind, no bundlers — this is intentionally a single-file static site)
- Don't commit `.env.local` or `.vercel/`

## Recurring user requests

The user iterates on copy + design frequently. Typical requests:
- "Change the headline in section X to..."
- "Update the [card/section] copy"
- "Add a CTA that says..."
- "Replace the image with the new one in the folder named the same thing" (just regenerate / re-deploy — files swap by filename)

After any change: deploy with the command in the "Editing → deploying" section above.

## Useful refs

- `gh` CLI is auth'd as `Outdoorable`
- Git user.name/email set on this repo: `Outdoorable` / `Outdoorable@users.noreply.github.com`
- Vercel CLI: `~/.npm-global/bin/vercel` (not on PATH — use full path)
- Vercel project ID: `prj_wgIuaR6brhlN7cH5NbQbZbuvccPi`
- Vercel team ID: `team_apz5iRrJ3HSyj1E7adc0IebD`
