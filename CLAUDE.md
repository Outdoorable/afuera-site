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

### Frontmatter schema (per blog strategy §04 + §06)

```yaml
---
title: "The printed spreadsheet"                  # REQUIRED — voice title, display H1, social shares, card titles
seoTitle: "Why tour guides still run trips on paper in 2026"  # optional — <title>, og:title, schema headline. Falls back to title.
slug: "printed-spreadsheet"           # optional — defaults to filename
date: 2026-04-17                      # REQUIRED — sort order, sitemap lastmod, datePublished in schema
updated: 2026-04-20                   # optional — bumps dateModified in schema + shows "Updated …" inline
summary: "A 2-minute TL;DR…"          # REQUIRED — TL;DR box on post, meta description, og:description, Answer Capsule preview
icps:                                 # optional — drives the filter chips on /blog/
  - tour operator
  - guide
tags:                                 # optional — rendered as tag pills on cards + post; article:tag meta + schema keywords
  - field ops
  - ai
cluster: "Field Operations"           # optional — one of the 5 topic clusters; renders as eyebrow + in schema articleSection
author: "Ali Murphy"                  # optional — defaults to "Ali Murphy"
cover: "guide-glow.png"               # optional — og:image; defaults to /hero-graphic.png
faq:                                  # optional — renders FAQ section at bottom + JSON-LD FAQPage schema
  - question: "…"
    answer: "…"
---

## Your markdown body

H2s auto-populate the TOC (if there are 2+ H2s).
```

**Cluster field** — per strategy §06, every post belongs to one of five clusters. These drive the eyebrow label on each post and will later drive related-post surfacing:

1. Field Operations
2. Office Operations
3. Marketing and Sales
4. AI Strategy
5. Industry POV

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
- `/robots.txt` — explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, CCBot
- `/llms.txt` — emerging AI-crawler manifest (site summary + key pages + recent posts)
- JSON-LD per post: `Article` (with `Person` author, `sameAs` to LinkedIn), `BreadcrumbList`, and `FAQPage` (when frontmatter has `faq:`)
- `Organization` JSON-LD is injected into the landing page `<head>` on every build

### Writing conventions (per blog strategy — read the doc!)

A full blog strategy exists in the repo owner's possession (not committed — see `Afuera_Blog_Strategy.md` provided by user). When helping draft or edit blog posts, key rules:

**Voice rules (green list)** — open with a person/trip/moment not a definition; real numbers and names; take a position; translate jargon; cite humans; end on people not tech.

**Voice anti-patterns (red list, hard bans)**:
- **No em dashes** — use short dash, comma, period, parens, or ellipsis
- No "Not X, but Y" rhythms
- No staccato fragments as sentences
- No generic transitions ("Here's the kicker", "The thing is")
- No passive voice, adverbs ("really", "very"), or hedging ("somewhat", "perhaps")
- No AI evangelism, no buzzwords ("leverage", "unlock", "seamless", "transform")
- The word "fluff" is banned

**Structure** (per §05 of the strategy):
1. Hook (person/trip/moment, 80–150 words)
2. Answer Capsule (40–80 words; front-loaded so LLMs can extract it)
3. The Case (300–800 words; story, specifics, numbers)
4. The System (500–1,200 words; H2s that are questions, depth under each)
5. Human Payoff (100–200 words; what this does for a person)
6. What to Do Next (50–100 words; one CTA)
7. FAQ (3–6 Qs, 40–60 words each — goes in `faq:` frontmatter)
8. Sources (5–15 annotated outbound links)

**Outbound links**: every post should have at least 5 links to named authoritative sources (McKinsey, Arival, Skift, USTOA, specific practitioners). This is a top AEO signal per Claude/Perplexity research.

**Internal links**: at least 2 to other Afuera posts, 1 to the cluster pillar, 1 to a post in a different cluster. First internal link within the first 200 words.

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
