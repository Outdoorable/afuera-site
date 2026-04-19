// Shared HTML template fragments. The CSS and nav/footer markup are
// reused from the main index.html so the blog looks identical.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_URL = 'https://www.afuerai.com';
const SITE_NAME = 'Afuera';
const SITE_DESC = 'AI consulting & implementation for travel and tourism';

// Pull the <style> block and <nav> + <footer> HTML from the main
// index.html so the blog pages share design + nav/footer without
// duplicating CSS.
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractBetween(html, start, end) {
  const i = html.indexOf(start);
  const j = html.indexOf(end, i);
  if (i === -1 || j === -1) return '';
  return html.slice(i, j + end.length);
}

const SITE_STYLES = extractBetween(indexHtml, '<style>', '</style>');
const SITE_NAV = extractBetween(indexHtml, '<!-- Navigation -->', '</nav>') + '\n';
// Footer: extract from <!-- FOOTER --> through the closing </footer>
const SITE_FOOTER = extractBetween(indexHtml, '<!-- FOOTER -->', '</footer>') + '\n';

// Extract the <script> block at the end of body (nav scroll, smooth scroll,
// mobile toggle, etc.) so these behaviors work on blog pages too.
const SITE_SCRIPT = extractBetween(indexHtml, '<script>', '</script>');

// ─────────────────────────────────────────────────────────────────────
// Blog-specific styles — additive, not a rewrite. Keeps the post pages
// matching the rest of the site's editorial aesthetic.
// ─────────────────────────────────────────────────────────────────────
const BLOG_STYLES = `
<style>
  /* Blog page wrapper sits on a cream background */
  body.blog-page {
    background: var(--bg-light);
  }

  .blog-hero {
    padding: 10rem 3rem 3rem;
    max-width: 880px;
    margin: 0 auto;
  }
  .blog-hero .section-label { margin-bottom: 1rem; }
  .blog-hero h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(2.25rem, 5vw, 3.75rem);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 1rem;
  }
  .blog-hero .blog-hero-sub {
    font-size: 1.1rem;
    line-height: 1.75;
    color: var(--text-secondary);
    max-width: 640px;
    margin-bottom: 2.5rem;
  }

  /* Post meta row */
  .post-meta {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    color: var(--text-secondary);
    letter-spacing: 0.04em;
    margin-bottom: 2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    align-items: center;
  }
  .post-meta .dot { opacity: 0.4; }
  .post-meta .post-updated {
    font-weight: 600;
    color: var(--accent-orange);
  }

  /* Tag pills — shared across hub cards and post pages */
  .tag-pill {
    display: inline-block;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.3rem 0.7rem;
    border: 1px solid rgba(31,31,31,0.16);
    border-radius: 100px;
    color: var(--text-secondary);
    background: rgba(255,255,255,0.45);
  }

  /* Post header: tags row sits below meta, above byline */
  .post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.5rem 0 2rem;
  }

  /* Post cluster eyebrow */
  .post-cluster {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent-orange);
    margin: 0 0 1rem;
  }

  /* Author byline — above the TL;DR */
  .post-byline {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: rgba(255,255,255,0.6);
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 14px;
    margin: 0 0 2rem;
  }
  .byline-photo {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    object-fit: cover;
    object-position: center top;
    flex-shrink: 0;
    border: 2px solid rgba(0,0,0,0.08);
  }
  .byline-text { line-height: 1.35; }
  .byline-name {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
    text-decoration: none;
    display: block;
    margin-bottom: 0.15rem;
    transition: color 0.25s;
  }
  .byline-name:hover { color: var(--accent-orange); }
  .byline-bio {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  /* TL;DR box */
  .tldr {
    background: linear-gradient(135deg, rgba(255, 209, 102, 0.22) 0%, rgba(255, 122, 89, 0.14) 100%);
    border-left: 3px solid var(--accent-orange);
    border-radius: 4px 14px 14px 4px;
    padding: 1.5rem 1.75rem;
    margin: 2rem 0 3rem;
  }
  .tldr-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--accent-orange);
    margin-bottom: 0.5rem;
  }
  .tldr p {
    font-size: 1.05rem;
    line-height: 1.6;
    color: var(--text-primary);
    margin: 0;
  }

  /* Table of contents */
  .post-toc {
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 14px;
    padding: 1.5rem 1.75rem;
    margin: 0 0 3rem;
  }
  .post-toc-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 0.9rem;
  }
  .post-toc ol {
    list-style: none;
    padding: 0;
    margin: 0;
    counter-reset: toc;
  }
  .post-toc li {
    counter-increment: toc;
    padding: 0.4rem 0;
    border-bottom: 1px solid rgba(0,0,0,0.04);
  }
  .post-toc li:last-child { border-bottom: none; }
  .post-toc li::before {
    content: counter(toc, decimal-leading-zero);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--accent-orange);
    margin-right: 0.9rem;
  }
  .post-toc a {
    color: var(--text-primary);
    text-decoration: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    transition: color 0.25s;
  }
  .post-toc a:hover { color: var(--accent-orange); }

  /* Post body typography */
  .post-body {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 3rem 5rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 1.1rem;
    line-height: 1.75;
    color: var(--text-primary);
  }
  .post-body h2 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(1.5rem, 2.5vw, 2rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin: 3rem 0 1rem;
    line-height: 1.15;
    scroll-margin-top: 6rem;
  }
  .post-body h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 2.25rem 0 0.75rem;
    line-height: 1.2;
  }
  .post-body p { margin: 0 0 1.25rem; color: var(--text-primary); }
  .post-body a { color: var(--accent-orange); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  .post-body a:hover { color: var(--accent-orange-hover); }
  .post-body ul, .post-body ol { margin: 0 0 1.25rem 1.5rem; padding: 0; }
  .post-body li { margin: 0.35rem 0; }
  .post-body blockquote {
    border-left: 3px solid var(--accent-orange);
    margin: 2rem 0;
    padding: 0.25rem 0 0.25rem 1.5rem;
    font-family: 'Fraunces', 'Space Grotesk', serif;
    font-size: 1.3rem;
    font-style: italic;
    line-height: 1.4;
    color: var(--text-secondary);
  }
  .post-body code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
    background: rgba(0,0,0,0.05);
    padding: 0.15em 0.4em;
    border-radius: 4px;
  }
  .post-body pre {
    background: var(--bg-eggplant);
    color: #F5F3EE;
    padding: 1.25rem 1.5rem;
    border-radius: 10px;
    overflow-x: auto;
    margin: 1.5rem 0;
  }
  .post-body pre code { background: transparent; padding: 0; color: inherit; }
  .post-body img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 2rem 0;
  }
  .post-body hr {
    border: none;
    border-top: 1px solid rgba(0,0,0,0.08);
    margin: 3rem 0;
  }

  /* FAQ section */
  .post-faq {
    max-width: 720px;
    margin: 4rem auto 0;
    padding: 0 3rem;
  }
  .post-faq-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--accent-orange);
    margin-bottom: 0.75rem;
  }
  .post-faq h2 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(1.75rem, 3vw, 2.5rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
  }
  .faq-item {
    border-top: 1px solid rgba(0,0,0,0.08);
    padding: 1.5rem 0;
  }
  .faq-q {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }
  .faq-a {
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
    line-height: 1.65;
    color: var(--text-secondary);
    margin: 0;
  }

  /* Back to blog link */
  .back-to-blog {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    text-decoration: none;
    margin-bottom: 2rem;
    transition: color 0.3s, gap 0.3s;
  }
  .back-to-blog:hover {
    color: var(--accent-orange);
    gap: 0.75rem;
  }

  /* Post CTA block */
  .post-cta {
    max-width: 720px;
    margin: 4rem auto;
    padding: 2.5rem 3rem;
    text-align: center;
    background: linear-gradient(135deg, rgba(46,42,57,1) 0%, rgba(36,51,58,1) 100%);
    color: var(--text-light);
    border-radius: 20px;
  }
  .post-cta h3 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    color: var(--text-light);
  }
  .post-cta p {
    font-size: 0.95rem;
    color: var(--text-light-secondary);
    margin-bottom: 1.5rem;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
  }
  .post-cta .btn-primary {
    display: inline-block;
  }

  /* ── BLOG HUB: Every-style grid of photo-cards ── */
  .blog-grid {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 3rem 7rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 3rem 2rem;
  }

  .post-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    text-decoration: none;
    color: var(--text-primary);
    transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .post-card:hover { transform: translateY(-3px); }
  .post-card:hover .post-card-image img { transform: scale(1.03); }
  .post-card:hover h2 { color: var(--accent-orange); }

  .post-card-image {
    aspect-ratio: 3 / 2;
    overflow: hidden;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255,122,89,0.18), rgba(46,196,182,0.15));
  }
  .post-card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .post-card-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin: 0;
  }
  .post-card-cluster {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-orange);
  }
  .post-card-meta .dot { color: rgba(0,0,0,0.3); }
  .post-card-date {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    color: var(--text-secondary);
    letter-spacing: 0;
    text-transform: none;
    font-weight: 500;
  }

  .post-card h2 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.18;
    letter-spacing: -0.018em;
    color: var(--text-primary);
    margin: 0;
    transition: color 0.3s ease;
  }
  .post-card p {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    line-height: 1.55;
    color: var(--text-secondary);
    margin: 0;
  }
  .post-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  /* Author byline row on each card */
  .post-card-byline {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: auto;
    padding-top: 0.25rem;
  }
  .post-card-byline img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    object-position: center top;
    flex-shrink: 0;
  }
  .post-card-byline .byline-name-small {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  /* Filter chips */
  .blog-filters {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 3rem 2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .filter-chip {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.5rem 1rem;
    border: 1px solid rgba(31,31,31,0.15);
    border-radius: 100px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.25s, color 0.25s, border-color 0.25s;
  }
  .filter-chip:hover {
    color: var(--accent-orange);
    border-color: var(--accent-orange);
  }
  .filter-chip.active {
    background: var(--text-primary);
    color: var(--bg-cream, #FAF7F5);
    border-color: var(--text-primary);
  }

  .blog-empty {
    max-width: 720px;
    margin: 4rem auto;
    text-align: center;
    color: var(--text-secondary);
    font-size: 1.05rem;
  }

  /* Community callout at top of the blog hub */
  .blog-community-callout {
    max-width: 1200px;
    margin: 2rem auto 3rem;
    padding: 1.25rem 1.75rem;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
    background: linear-gradient(135deg, rgba(46, 196, 182, 0.12), rgba(255, 209, 102, 0.10));
    border: 1px solid rgba(46, 196, 182, 0.25);
    border-radius: 16px;
  }
  .blog-community-callout .community-emoji {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  .blog-community-callout-text {
    flex: 1;
    min-width: 240px;
  }
  .blog-community-callout-text strong {
    display: block;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.15rem;
  }
  .blog-community-callout-text span {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  .blog-community-callout .callout-cta {
    display: inline-block;
    padding: 0.7rem 1.5rem;
    background: var(--text-primary);
    color: var(--bg-light);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-decoration: none;
    border-radius: 100px;
    transition: background 0.3s ease, transform 0.3s ease;
    flex-shrink: 0;
  }
  .blog-community-callout .callout-cta:hover {
    background: var(--accent-teal);
    transform: translateY(-1px);
  }

  @media (max-width: 600px) {
    .blog-community-callout { padding: 1rem 1.25rem; margin: 1rem 1.5rem 2rem; }
  }

  @media (max-width: 820px) {
    .blog-hero { padding: 8rem 1.5rem 2rem; }
    .blog-grid { padding: 1rem 1.5rem 5rem; gap: 2.5rem 1.25rem; }
    .blog-filters { padding: 0 1.5rem 1.5rem; }
    .post-body { padding: 0 1.5rem 4rem; font-size: 1.05rem; }
    .post-faq { padding: 0 1.5rem; }
    .post-cta { margin: 3rem 1.5rem; padding: 2rem 1.5rem; }
  }
</style>
`;

// ─────────────────────────────────────────────────────────────────────
// Main wrappers
// ─────────────────────────────────────────────────────────────────────

export function siteHead({ title, description, canonical, ogImage, ogType = 'website', articleMeta = null, jsonLd = [] }) {
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const image = ogImage || `${SITE_URL}/hero-graphic.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=Space+Grotesk:wght@400;500;600;700&family=Fraunces:ital,wght@0,400;0,500;0,700;1,400;1,500&display=swap" rel="stylesheet">

<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">

${articleMeta ? `<meta property="article:published_time" content="${esc(articleMeta.date)}">
${articleMeta.author ? `<meta property="article:author" content="${esc(articleMeta.author)}">` : ''}
${(articleMeta.tags || []).map(t => `<meta property="article:tag" content="${esc(t)}">`).join('\n')}` : ''}

<link rel="icon" href="/hero-graphic.png" type="image/png">

${jsonLd.map(ld => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`).join('\n')}

${SITE_STYLES}
${BLOG_STYLES}
</head>
`;
}

export function siteBodyOpen(bodyClass = '') {
  return `<body${bodyClass ? ` class="${bodyClass}"` : ''}>

${SITE_NAV}
`;
}

export function siteBodyClose() {
  return `
${SITE_FOOTER}

<script>
${SITE_SCRIPT.replace(/^<script>|<\/script>$/g, '').trim()}
</script>

</body>
</html>
`;
}

export { SITE_URL, SITE_NAME, SITE_DESC };
