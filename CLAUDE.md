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
index.html                      ~ 100KB — the entire site (HTML, CSS, vanilla JS all inline)
vercel.json                     cache headers for HTML + PNGs
hero-graphic.png                hero image (black bg, uses mix-blend-mode: screen)
ali-headshot.png                used in About + How Engagements Work
itinerary-transformation.png    used in pain-points callout card
.env.local                      VERCEL_TOKEN (gitignored, never commit)
.vercel/project.json            Vercel project link (gitignored)
```

## Editing → deploying

User edits the site by chatting with you. You edit `index.html` (or images) directly in this folder, then deploy:

```bash
cd ~/Desktop/afuera-site && set -a && source .env.local && set +a && \
  git add -A && \
  git commit -m "your commit message here" && \
  git push && \
  ~/.npm-global/bin/vercel --prod --yes --token "$VERCEL_TOKEN"
```

**Both** `git push` and `vercel --prod` are needed today — the GitHub→Vercel webhook isn't wired (the user can fix this in Vercel Settings → Git → reconnect with the GitHub App installed for this repo, but it's not done yet). Until then, push to git for source-of-truth + deploy via CLI for live update.

## Design system (don't change without asking)

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
