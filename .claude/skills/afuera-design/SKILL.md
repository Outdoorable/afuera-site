---
name: afuera-design
description: Use when designing, editing, or extending any visual element of the Afuera site — covers brand identity, typography, color palette, section backgrounds, card patterns, animations, decorative elements, and the visual logic behind every design choice. Trigger when the user asks to add, restyle, or change anything on afuera-site (or asks "what should this look like?" / "make this more on-brand"). Read this BEFORE making CSS or visual changes.
---

# Afuera Design System

This skill is the source of truth for how the Afuera site should look, feel, and behave. Read it whenever you're about to touch CSS, add a new section, restyle a component, or make a visual judgment call. The site lives at `~/Desktop/afuera-site/index.html` (single-file static site).

## 1. Brand identity in one paragraph

Afuera is an AI consultancy for tour and experience operators — a small founder-led shop that knows the travel industry from the inside. The site needs to feel **smart but warm, modern but human, premium but approachable.** The reader is usually a tour operator, travel advisor, or trip designer who is overwhelmed by spreadsheets and skeptical of "AI" hype. Design choices should feel like they were made by someone who has been on the ground (because they were), not someone selling enterprise SaaS.

Visual reference: think Jasper.ai's premium polish, but with warmer color, more personality, and a touch of editorial weight. Not Apple-sterile. Not corporate-sleek. **Confident, playful, considered.**

## 2. Typography

| Family | Use | Weights loaded |
|---|---|---|
| **Space Grotesk** | All headlines, logo, button labels, micro-labels (`.section-label`, `.track-number`, `.track-price`) | 400, 500, 600, 700 |
| **DM Sans** | Body copy, paragraphs, form inputs, descriptive text, footer | 400, 500, 700 + italic 400 |

Loaded from Google Fonts in the `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Type scale (use these exact patterns, don't invent):**
- Hero h1: `font-size: clamp(3.5rem, 8vw, 7rem); font-weight: 700; line-height: 0.95; letter-spacing: -0.04em;`
- Section title (h2): `font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; line-height: 1.05; letter-spacing: -0.03em;`
- Big card titles (h3 in track/icp): `font-size: 1.4–1.75rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15;`
- Card titles (h3 in problem/blog): `font-size: 1.1–1.25rem; font-weight: 700; letter-spacing: -0.01em;`
- Body text: `font-size: 1rem–1.15rem; line-height: 1.6–1.8; color: var(--text-light-secondary)` on dark, `var(--text-secondary)` on light
- Section labels (eyebrow): `font-size: 0.72–0.8rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase;` always preceded by a colored dot
- Micro-labels (track-number, hero-label): `font-size: 0.7–0.8rem; letter-spacing: 0.15–0.18em; text-transform: uppercase;` often with a leading short rule (`::before` width 24–28px) instead of a dot

**Italic emphasis pattern**: When a headline has an `<em>` in it (e.g. "Think outside *the docs.*"), the em uses **DM Sans italic** instead of Space Grotesk italic, and gets an accent color (pink on dark via gradient text-fill, orange on light). This creates a deliberate font-pair contrast inside a single line — it's a signature move, use it sparingly but use it.

Example:
```html
<h2 class="section-title">AI-powered operations for <em>better human experiences.</em></h2>
```

## 3. Color palette

**These hex values are intentional. Don't change them. Don't introduce new accent colors without asking.**

```css
/* Backgrounds */
--bg-light:        #FAF7F5;   /* warm cream */
--bg-secondary:    #F1ECE9;   /* sand */
--bg-soft-pink:    #F4A6B5;   /* (rarely used as bg) */

/* Dark sections */
--bg-eggplant:     #2E2A39;   /* deep purple-charcoal */
--bg-deep-teal:    #24333A;   /* deep teal-charcoal */

/* Text */
--text-primary:           #1F1F1F;
--text-secondary:         #4A4A4A;
--text-light:             #FFFFFF;
--text-light-secondary:   rgba(255,255,255,0.7);

/* Core accents */
--accent-orange:   #FF7A59;   /* primary CTA — warm coral */
--accent-teal:     #2EC4B6;   /* secondary energy */
--accent-pink:     #F4A6B5;   /* soft warmth */
--accent-yellow:   #FFD166;   /* gold highlight */

/* Decorative (rarely used directly) */
--deco-teal:   #3AAFB9;
--deco-burnt:  #E76F51;
--deco-mauve:  #B089A6;

/* Hover states */
--accent-orange-hover:  #E56745;
--accent-teal-hover:    #26A69A;
```

**Color logic**:
- Orange is the primary CTA and emotional accent. It's the "Afuera" color.
- Teal balances it — used in secondary CTAs, hover accents, gradient stops.
- Yellow is the editorial highlight (used in market stats, eyebrow dots on dark sections).
- Pink is the soft warmth — used in italic em text on dark sections, and as a gradient stop.
- All four accents work together as a warm, friendly palette. **Never use them flat next to each other in solid blocks** — they need to coexist as gradient stops, dot colors, and subtle washes.

## 4. Section background system

The site **alternates between dark and light sections** — this rhythm is the primary visual structure. Don't break it. The pattern (top to bottom):

1. Hero — eggplant (dark)
2. Problem — light cream
3. AI Audit — deep teal (dark)
4. How Engagements Work — sand (light)
5. Custom Engineering — eggplant (dark)
6. Who We Work With — light cream (warmer than #2 — has pink+gold radial washes)
7. About — deep teal (dark)
8. Blog — sand (light)
9. Community — eggplant (dark)
10. Final CTA — light cream gradient
11. Footer — eggplant (dark)

**Each section wrapper is one of four classes:** `.section-eggplant`, `.section-deep-teal`, `.section-light`, `.section-secondary`. Each has a baked-in radial gradient + noise overlay (via `::before` pseudo-element) that adds atmospheric depth — sections are NEVER flat solid colors.

```css
.section-eggplant {
  background:
    radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255, 122, 89, 0.035) 0%, transparent 60%),
    radial-gradient(ellipse at center, #352F44 0%, #2E2A39 45%, #231F2E 100%);
}
```

**Section-blend transitions**: Every section after the hero has class `.section-blend` and an inline `style="--blend-from: rgba(...)"` matching the previous section's background. This creates a soft top-edge bleed between sections instead of a hard color seam.

```html
<div class="section-light section-blend" style="--blend-from: rgba(35, 31, 46, 0.9);">
```

## 5. Card patterns

There are three card "moods" on this site. Use them consistently.

### A. Dark glassmorphism (on dark sections)
```css
background: rgba(255,255,255,0.04);
backdrop-filter: blur(16px);
border: 1px solid rgba(255,255,255,0.06);
border-radius: 16px;
padding: 2rem;
box-shadow: 0 4px 24px rgba(0,0,0,0.12);
```
Hover: lift `translateY(-6px)`, expand shadow, optional gradient-border pseudo-element fades in (orange→teal mask trick — see `.problem-card::before`).

### B. Light glassmorphism (on light sections)
```css
background: rgba(255,255,255,0.72);
backdrop-filter: blur(20px);
border: 1px solid rgba(255,255,255,0.85);
border-radius: 16px;
box-shadow: 0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
```

### C. Editorial soft (used for `.icp-card` on light)
```css
background: rgba(255,255,255,0.85);
border: none;
border-left: 3px solid var(--accent);   /* per-card accent color */
border-radius: 20px;
padding: 2.75rem;
box-shadow: 0 2px 16px rgba(0,0,0,0.04);
```
Each card has its own `--accent` and `--accent-rgb` custom property; hover uses the card's accent color for the ring (`box-shadow: 0 12px 36px rgba(0,0,0,0.07), 0 0 0 1px rgba(var(--accent-rgb), 0.12)`).

### Special: callout cards
For section-spanning callouts (like the "Stop sending Word docs" card in the Problem section), use a warm gradient background:
```css
background: linear-gradient(135deg, rgba(255,209,102,0.16) 0%, rgba(255,122,89,0.12) 100%);
border: 1px solid rgba(255,122,89,0.28);
```
And split with internal `display: grid; grid-template-columns: 1fr 1fr;` for text + image.

## 6. Buttons

Three button styles. They're already defined — just use them.

| Class | Use |
|---|---|
| `.btn-primary` | Main CTA — orange gradient pill with inner highlight + glow on hover, letter-spacing micro-interaction |
| `.btn-secondary` | Outlined pill, fills with subtle tint on hover |
| `.btn-white` | White fill, used on dark hero/CTA backgrounds |

All buttons:
- Border-radius: 100px (full pill)
- Font: DM Sans, weight 600, font-size 1rem
- Padding: 1rem 2.25rem
- Transition: `cubic-bezier(0.16, 1, 0.3, 1)` 0.35s
- Hover: `translateY(-2px) scale(1.02)`, expanded shadow, slight letter-spacing increase to 0.02em
- Inner highlight: `inset 0 1px 0 rgba(255,255,255,0.2–0.25)` for tactility

**The pulse-on-load**: The nav CTA gets a single gentle scale pulse on page load (`animation: navPulse 2.2s 1`) — keep this. It draws the eye without being annoying.

**With-an-element CTA**: For the Ali-headshot CTA in the funnel section, the button uses `display: inline-flex; align-items: center; gap: 0.75rem;` with a 32×32px circle headshot inline before the text. This humanizing pattern is on-brand — use it whenever a CTA is about a real human action.

## 7. Animation principles

This is where Afuera's playful side lives. Be willing to add motion that has personality. Defaults:

**Easing**: Almost everything uses `cubic-bezier(0.16, 1, 0.3, 1)` — a spring-like ease-out that feels physical. Use this instead of plain `ease-out` or `ease-in-out`.

**Duration**: Reveals are 0.7–1.1s (long enough to feel deliberate, not snappy). Hovers are 0.3–0.45s (responsive but smooth). Continuous animations (floats, glows) are 6–8s loops.

**On scroll**:
- `.stagger-reveal` — opacity 0 → 1, translateY(40px) → 0, scale(0.97) → 1, all over 0.85s
- `.scroll-fade` — fades in/out as it crosses viewport center
- `[data-parallax]` decorative orbs drift on scroll at 0.02–0.06 multiplier
- Hero parallax: `0.12` multiplier (gentle), fade starts at 200px scroll, ends at 700px
- Stat counters use `easeOutExpo` over 1.8s

**Continuous loops**:
- Hero graphic: `heroFloat 6.5s ease-in-out infinite` — translateY ±5px
- Hero radial glow: `heroGlow 8s ease-in-out infinite` — opacity + scale wobble
- Nav CTA: single `navPulse 2.2s 1` pulse on load only

**Curvy timeline (the showpiece animation)**: The About section has a vertical serpentine timeline with an SVG bezier path that draws itself based on scroll position (`stroke-dashoffset`), with nodes fading in from alternating sides as the line reaches them, and dots that pop in (`scale(0) → 1`) with a colored glow ring. This is intentionally elaborate. It's the "we're confident enough to be playful" moment of the site. **If asked to add similar storytelling animations, default to using SVG paths + scroll-progress mapping, not just sequential fades.**

**Reduced-motion**: Always respect `@media (prefers-reduced-motion: reduce)` — kill all animations and infinite loops.

**Willing to be playful** means:
- ✅ Springy easings (the cubic-bezier above)
- ✅ Subtle continuous floats and glows
- ✅ Scroll-driven storytelling (path drawing, node staggers)
- ✅ Hover micro-interactions (letter-spacing tweaks, scale, glow pulse)
- ✅ Color-coded accents per item (each ICP card has its own accent color)
- ❌ Bouncy/elastic over-easing (don't use `cubic-bezier(0.68, -0.55, 0.265, 1.55)`)
- ❌ Spinning, flipping, or rotating UI elements
- ❌ Animations that interrupt reading (auto-cycling headlines, marquees, etc.)
- ❌ Loud "wow factor" effects that distract from copy

## 8. Decorative elements (floating orbs + rings)

Most dark sections (and some light ones) have 2–4 absolutely-positioned decorative shapes that drift on scroll via `[data-parallax]`. Two flavors:

**Blurred color orbs** — atmospheric color washes:
```html
<div class="deco deco-blur" style="width: 280px; height: 280px; background: var(--accent-orange); top: 12%; right: -60px;" data-parallax="0.04"></div>
```
- Use `filter: blur(40px)` (already in `.deco-blur`)
- Opacity 0.15–0.3 typical
- Position partially off-edge so they bleed into the section

**Thin accent rings** — geometric punctuation:
```html
<div class="deco deco-ring" style="width: 36px; height: 36px; top: 24%; left: 8%; color: var(--accent-yellow); opacity: 0.18;" data-parallax="0.06"></div>
```

**Rules**:
- 2–4 per section, never more
- Vary sizes (small, medium, large mix)
- Use the section's complementary accent colors (don't dump all 4 into one section)
- Always set `data-parallax` (0.02 = barely moves, 0.06 = noticeable drift)
- Position with both x and y offsets, often partially off-screen
- Light sections get lower-opacity decorations (0.1–0.18); dark sections can go up to 0.3

## 9. Imagery

- **Hero graphic** (`hero-graphic.png`): black-background illustration. Uses `mix-blend-mode: screen` on dark eggplant section so the black becomes transparent and the colored artwork glows. **Don't remove the blend mode.** Behind it: a pulsing radial glow halo (`.hero-graphic::before`) using accent colors.
- **Headshot** (`ali-headshot.png`): cropped to circle via `border-radius: 50%`, `object-fit: cover`, `object-position: center top`. Used in About section (260×260) and as a 32×32 inline accent in the funnel CTA.
- **Itinerary transformation** (`itinerary-transformation.png`): shown raw inside the callout card, half-width, `object-fit: cover`.

If asked to add a new image:
- If it's a colored illustration on black, use `mix-blend-mode: screen` on dark sections
- If it's on white/light, use `mix-blend-mode: multiply` on dark sections OR present it as a clean rounded card with `border-radius: 16–20px`
- Always add a soft `box-shadow` to lift it off the background
- Photos of people: circle-crop with object-position: center top to keep heads in frame

## 10. Layout principles

- **Max-width**: sections cap at `1200px` (`.section section`), occasionally `1280px` for hero. Always centered (`margin: 0 auto`).
- **Padding**: `6–7rem` top/bottom on desktop, `4rem` on tablet, `3rem` on mobile.
- **Grid systems**: 3-col for ICP/blog, 2-col for tracks, 4-col for funnel. Cards collapse to 2-col at <820px and 1-col at <600px.
- **Asymmetric layouts**: The hero is text-left, image-right. The About section is text-left, headshot-right. **Don't center-align long-form text**; left-align is the default.
- **Section heights**: Most sections are content-driven (no `min-height`). Hero is `min-height: 100vh`. Don't add forced heights elsewhere.
- **Generous whitespace**: When in doubt, increase padding/margin. Cramped feels cheap.

## 11. Voice (in copy you write or suggest)

The user often dictates copy directly, but if asked to suggest:
- Direct and a little dry. Not corporate. Not "synergy."
- Short sentences. Em-dashes are encouraged.
- Real-world specificity over abstract claims ("a guide folds a printed spreadsheet into his pocket" not "operational inefficiency")
- Italics for emphasis on the human/emotional pivot ("better *human* experiences", "the *docs.*")
- Numbers when relevant ("9.9/10 guest satisfaction", "60+ markets", not "many" or "lots")
- "We" voice when speaking as the company, "Ali" voice when personal

## 12. What's "off-brand"

Things to push back on / avoid:
- ❌ Stock photography of people in suits
- ❌ Gradients that include cool blues or greens (this isn't a fintech)
- ❌ Drop shadows that look like bevel-and-emboss (always soft + warm)
- ❌ Geometric icon sets (Heroicons, Lucide) used naively — if you use SVG icons, they should feel hand-tuned and use accent colors, not flat black/gray
- ❌ Carousels and sliders (we have a curvy timeline if motion-storytelling is needed)
- ❌ Modal popups, cookie banners that interrupt
- ❌ Anything that screams "AI" visually (no glowing brain illustrations, neural-net backgrounds, etc.) — Afuera SELLS AI but doesn't LOOK like a stereotypical AI startup

## Quick reference — when starting a new design task

1. **What section is this in?** → determines bg color/class and which card pattern to use
2. **Is it interactive?** → use spring easing + subtle hover lift
3. **Does it tell a story across the screen?** → consider scroll-driven SVG / staggered reveals
4. **Is it a primary CTA?** → orange `.btn-primary`. Secondary? Outline. On dark? White.
5. **Need decoration?** → 2–4 orbs/rings with `data-parallax`, in the section's complementary accents
6. **Custom one-off styles?** → first check if an existing class fits. The site is small enough that style consistency matters more than DRY.
