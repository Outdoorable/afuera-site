/**
 * Afuera static blog build.
 * Reads /content/blog/*.md → writes /blog/index.html + /blog/<slug>/index.html
 * Also writes /sitemap.xml, /robots.txt, /llms.txt.
 * No framework runtime — pure static HTML output.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

// GFM (tables, strikethrough, autolinks) is default in marked v12, but
// set it explicitly so this doesn't regress on a minor version bump.
marked.use({ gfm: true, breaks: false });
import { siteHead, siteBodyOpen, siteBodyClose, SITE_URL, SITE_NAME, SITE_DESC } from './templates.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const OUT_BLOG_DIR = path.join(ROOT, 'blog');

const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => String(s).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// Decode HTML entities back to real characters. Used for extracting
// human-readable text from marked's already-encoded HTML output
// (otherwise esc() would double-encode at render time — e.g.
// apostrophes showing up as literal "&#39;" in the TOC).
const decodeEntities = s => String(s || '')
  .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&'); // must be last so we don't re-process other entities

// Author identity — used for Person JSON-LD and the visible byline.
// sameAs links are what LLMs use to verify authorship across the open web.
const AUTHOR = {
  name: 'Ali Murphy',
  photo: '/ali-headshot.png',
  slug: 'ali-murphy',
  url: `${'https://www.afuerai.com'}/author/ali-murphy/`,
  bio: 'Former active travel guide and tour operator executive. Building AI systems for travel and tourism.',
  bioLong: `Ali Murphy is the founder of Afuera. She spent a decade in the active travel industry, first as a wilderness guide running multi-day trips, then as an executive at a global tour operator where she led operations, product, and guide training. She now runs Afuera, an AI consulting and implementation firm built specifically for travel and tourism businesses.

Her work sits at the intersection of three things most AI consultants don't understand together: how a trip actually runs on the ground, how a travel operations team actually spends its day, and where AI can create real leverage without breaking the human parts of the guest experience. She writes about AI strategy, field operations, office operations, and the unglamorous operational honesty that separates travel businesses who ship with AI from those who stall in pilots.

Ali is based in Colorado. She works with tour operators, custom trip designers, travel advisors, DMCs, and experience companies across four continents.`,
  sameAs: [
    'https://www.linkedin.com/in/alimariemurphy',
  ],
};

// ICP code → human-readable label map (strategy abbreviations)
const ICP_LABELS = {
  GTO: 'Global Tour Operator',
  ITL: 'Independent Trip Leader',
  TA: 'Travel Advisor',
  TD: 'Trip Designer',
  CTD: 'Custom Trip Designer',
  EC: 'Experience Company',
  DMC: 'DMC',
  LD: 'Luxury Trip Designer',
};

function normalizeIcps(raw) {
  if (!raw) return [];
  return raw.map(v => ICP_LABELS[v] || v);
}

// Accept both my native schema and the alt schema used by the content
// pipeline (snake_case + a few renamed fields). Content dropped from
// either convention just works.
function pick(fm, ...keys) {
  for (const k of keys) {
    if (fm[k] !== undefined && fm[k] !== null) return fm[k];
  }
  return undefined;
}

function normalizeCover(raw) {
  if (!raw) return '';
  // Already absolute-ish path (starts with /) — store without leading /
  // so renderers can prepend / without producing //images...
  return String(raw).replace(/^\/+/, '');
}

// Walk /content/blog and collect all posts
function readPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  return files.map(f => {
    const src = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
    const parsed = matter(src);
    const fm = parsed.data;
    const slug = pick(fm, 'slug') || f.replace(/\.(md|mdx)$/, '');
    const dateRaw = pick(fm, 'date', 'date_published', 'datePublished');
    const updatedRaw = pick(fm, 'updated', 'date_modified', 'dateModified');
    const published = dateRaw ? new Date(dateRaw).toISOString().slice(0, 10) : null;
    const updated = updatedRaw ? new Date(updatedRaw).toISOString().slice(0, 10) : null;
    return {
      file: f,
      slug,
      // Voice title — display H1, card title, social share title
      title: pick(fm, 'title') || slug,
      // SEO/AEO title — <title>, schema headline, falls back to title
      seoTitle: pick(fm, 'seoTitle', 'seo_title') || pick(fm, 'title') || slug,
      date: published,
      updated,
      summary: pick(fm, 'summary', 'description') || '',
      icps: normalizeIcps(pick(fm, 'icps') || []),
      tags: pick(fm, 'tags') || [],
      cluster: pick(fm, 'cluster') || '',
      type: String(pick(fm, 'type') || 'article').toLowerCase(),
      author: pick(fm, 'author') || AUTHOR.name,
      cover: normalizeCover(pick(fm, 'cover', 'featured_image', 'featuredImage')),
      coverAlt: pick(fm, 'featured_image_alt', 'featuredImageAlt', 'coverAlt') || '',
      hideSubtitle: !!pick(fm, 'hide_subtitle', 'hideSubtitle'),
      faq: pick(fm, 'faq') || [],
      // Strategy taxonomy fields — surfaced on post but not required
      role: pick(fm, 'role') || '',
      angle: pick(fm, 'angle') || '',
      format: pick(fm, 'format') || '',
      funnel: pick(fm, 'funnel') || '',
      body: parsed.content,
    };
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// Render markdown, then add id= attributes to all headings via
// a post-process regex. Collect H2s into the TOC. Simpler than
// wiring a custom renderer class into marked's internals.
function renderMarkdown(md) {
  const headings = [];
  const slugCounts = new Map();
  let html = marked.parse(md);

  html = html.replace(/<h([2-6])>([\s\S]*?)<\/h\1>/g, (_, depth, inner) => {
    // Strip HTML tags and decode entities so `plain` is readable text
    // (apostrophes, quotes, etc. resolve to their real characters).
    const plain = decodeEntities(inner.replace(/<[^>]+>/g, '')).trim();
    const baseSlug = slugify(plain);
    let id = baseSlug;
    const n = slugCounts.get(baseSlug) || 0;
    if (n > 0) id = `${baseSlug}-${n}`;
    slugCounts.set(baseSlug, n + 1);
    if (depth === '2') headings.push({ id, text: plain });
    return `<h${depth} id="${id}">${inner}</h${depth}>`;
  });

  // Wrap tables in a scrollable container so they don't blow out the
  // narrow post column on mobile.
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>')
             .replace(/<\/table>/g, '</table></div>');

  return { html, toc: headings };
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// Human-readable relative date. Used for "Updated X days ago" freshness
// signals on the post page. Falls back to the absolute date for anything
// older than a year. Dates in the future (scheduled posts) render absolute.
function relativeDate(iso) {
  if (!iso) return '';
  const then = new Date(iso + 'T00:00:00Z');
  const now = new Date();
  const msPerDay = 86400000;
  const days = Math.floor((now - then) / msPerDay);
  if (days < 0) return formatDate(iso);       // future dates → absolute
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'last month';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return formatDate(iso);
}

// ─── Voice-rule lint ─────────────────────────────────────────────────
// Scans post body for brand-voice violations: em dashes, AI-fluff
// buzzwords, weak hedges, and generic blogger transitions. Logs as
// warnings. Never fails the build — voice is judgment, not a gate.
const VOICE_BANNED_WORDS = [
  'leverage', 'unlock', 'streamline', 'transform', 'revolutionize',
  'revolutionary', 'seamless', 'cutting-edge', 'cutting edge',
  'world-class', 'world class', 'best-in-class', 'best in class',
  'next-generation', 'next generation', 'synergy', 'synergies',
  'game-changer', 'game changer', 'game-changing',
  'robust', 'holistic', 'paradigm',
];
const VOICE_HEDGES = ['somewhat', 'perhaps', 'potentially', 'arguably', 'seemingly'];
const VOICE_WEAK_ADVERBS = ['really', 'very', 'quite', 'extremely', 'significantly', 'incredibly'];
const VOICE_GENERIC_TRANSITIONS = [
  "here's the kicker", "here's the thing", 'the thing is', 'let me explain',
  'at the end of the day', 'needless to say', 'it goes without saying',
];

function lintVoicePost(post) {
  const warnings = [];
  // Skip frontmatter-derived fields and the subtitle — lint only body prose.
  const body = post.body || '';
  const lines = body.split('\n');

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    // Skip fenced code, markdown table rows, and HTML table rows — false
    // positives (em dash in CLI args, en dashes in numeric ranges, etc.)
    if (/^\s*```/.test(line) || /^\s*\|/.test(line) || /<t[dhr]>|<\/?table|<\/?tbody|<\/?thead|<\/?tr/.test(line)) return;

    // Em dashes (en-dash too, for good measure — voice prefers plain dash)
    if (/—|–/.test(line)) {
      warnings.push({ line: lineNum, type: 'em-dash', snippet: line.trim().slice(0, 100) });
    }

    const lower = line.toLowerCase();
    VOICE_BANNED_WORDS.forEach(w => {
      const re = new RegExp(`\\b${w.replace(/[-\s]/g, '[-\\s]')}\\b`, 'i');
      if (re.test(lower)) warnings.push({ line: lineNum, type: `banned:"${w}"`, snippet: line.trim().slice(0, 100) });
    });
    VOICE_HEDGES.forEach(w => {
      if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
        warnings.push({ line: lineNum, type: `hedge:"${w}"`, snippet: line.trim().slice(0, 100) });
      }
    });
    VOICE_WEAK_ADVERBS.forEach(w => {
      if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
        warnings.push({ line: lineNum, type: `weak-adverb:"${w}"`, snippet: line.trim().slice(0, 100) });
      }
    });
    VOICE_GENERIC_TRANSITIONS.forEach(w => {
      if (lower.includes(w)) warnings.push({ line: lineNum, type: `transition:"${w}"`, snippet: line.trim().slice(0, 100) });
    });
  });

  if (warnings.length) {
    console.warn(`[voice]   ${post.slug}: ${warnings.length} warning(s)`);
    warnings.slice(0, 12).forEach(w => {
      console.warn(`[voice]     L${w.line} ${w.type}  ${w.snippet}`);
    });
    if (warnings.length > 12) console.warn(`[voice]     …and ${warnings.length - 12} more`);
  }
  return warnings.length;
}

// ─── JSON-LD builders ────────────────────────────────────────────────

function orgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    logo: `${SITE_URL}/hero-graphic.png`,
    sameAs: [],
  };
}

function articleJsonLd(post, url) {
  // Use the SEO title for schema headline — this is what ChatGPT / Claude
  // will pull into answer boxes. Per strategy §04, voice title is for
  // display H1; SEO title is for machine-readable fields.
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seoTitle || post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: {
      '@type': 'Person',
      name: post.author || AUTHOR.name,
      url: AUTHOR.url,
      sameAs: AUTHOR.sameAs,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/hero-graphic.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: post.cover ? `${SITE_URL}/${post.cover.replace(/^\/+/, '')}` : `${SITE_URL}/hero-graphic.png`,
    keywords: (post.tags || []).join(', '),
    articleSection: post.cluster || undefined,
  };
}

function faqJsonLd(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

function breadcrumbJsonLd(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}/` },
    ],
  };
}

// ─── Shared: one post card (Every-style: photo, meta, title, byline) ─
function renderPostCard(p) {
  const tags = (p.tags || []).slice(0, 3);
  const coverUrl = p.cover ? `/${p.cover.replace(/^\/+/, '')}` : '/hero-graphic.png';
  const isTool = p.type === 'tool';
  return `
    <a class="post-card" href="/blog/${esc(p.slug)}/"
       data-icps="${esc((p.icps || []).join('|'))}"
       data-type="${esc(p.type || 'article')}">
      <div class="post-card-image">
        <img src="${esc(coverUrl)}" alt="" loading="lazy" />
        ${isTool ? `<span class="post-card-type-badge">Free tool</span>` : ''}
      </div>
      <div class="post-card-meta">
        ${p.cluster ? `<span class="post-card-cluster">${esc(p.cluster)}</span>` : ''}
        ${p.cluster && p.date ? `<span class="dot">·</span>` : ''}
        ${p.date ? `<span class="post-card-date">${esc(formatDate(p.date))}</span>` : ''}
      </div>
      <h2>${esc(p.title)}</h2>
      <p>${esc(p.summary)}</p>
      ${tags.length ? `<div class="post-card-tags">${tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="post-card-byline">
        <img src="${esc(AUTHOR.photo)}" alt="${esc(p.author || AUTHOR.name)}" />
        <span class="byline-name-small">${esc(p.author || AUTHOR.name)}</span>
      </div>
    </a>
  `;
}

// ─── Page renderers ──────────────────────────────────────────────────

function renderPostPage(post) {
  const url = `${SITE_URL}/blog/${post.slug}/`;
  const { html: bodyHtml, toc } = renderMarkdown(post.body);

  const jsonLd = [
    articleJsonLd(post, url),
    breadcrumbJsonLd(post),
  ];
  if (post.faq && post.faq.length) jsonLd.push(faqJsonLd(post.faq));

  const head = siteHead({
    // Use SEO title for <title>. Voice title is the display H1.
    title: `${post.seoTitle || post.title} | ${SITE_NAME}`,
    description: post.summary,
    canonical: url,
    ogImage: post.cover ? `${SITE_URL}/${post.cover.replace(/^\/+/, '')}` : undefined,
    ogType: 'article',
    articleMeta: { date: post.date, author: post.author, tags: post.tags },
    jsonLd,
  });

  const tocHtml = toc.length >= 2
    ? `<aside class="post-toc" aria-label="Table of contents">
      <p class="post-toc-label">In this post</p>
      <ol>${toc.map(h => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('')}</ol>
    </aside>`
    : '';

  const faqHtml = (post.faq && post.faq.length)
    ? `<section class="post-faq" aria-labelledby="post-faq-title">
    <p class="post-faq-label">Frequently asked</p>
    <h2 id="post-faq-title">Common questions</h2>
    ${post.faq.map(f => `
      <div class="faq-item">
        <p class="faq-q">${esc(f.question)}</p>
        <p class="faq-a">${esc(f.answer)}</p>
      </div>`).join('')}
  </section>`
    : '';

  const tagsRow = (post.tags || []).length
    ? `<div class="post-tags">${post.tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join('')}</div>`
    : '';

  // Author byline — name, photo, short bio, link to About. Authority signal
  // per strategy §07. Sits in a bordered block above the TL;DR.
  const bylineHtml = `<div class="post-byline">
    <img src="${AUTHOR.photo}" alt="${esc(post.author || AUTHOR.name)}" class="byline-photo" />
    <div class="byline-text">
      <a href="${AUTHOR.url}" class="byline-name">${esc(post.author || AUTHOR.name)}</a>
      <p class="byline-bio">${esc(AUTHOR.bio)}</p>
    </div>
  </div>`;

  const updatedLine = post.updated && post.updated !== post.date
    ? `<span class="post-updated" title="${esc(formatDate(post.updated))}">Updated ${esc(relativeDate(post.updated))}</span>`
    : '';

  // Hero image on the post page itself — editorial feel, not just card art.
  // Uses the same WebP as the social/OG image. Rendered 3:2 under the H1+dek.
  const heroImgHtml = post.cover
    ? `<div class="post-hero-image"><img src="/${esc(post.cover.replace(/^\/+/, ''))}" alt="${esc(post.coverAlt || post.title)}" /></div>`
    : '';

  // Subtitle / dek — render the SEO title as a visible H2 under the H1
  // when it's different from the voice title. Gives every post a proper
  // editorial dek with zero extra frontmatter. The .post-subtitle class
  // is explicitly excluded from the TOC scan below.
  const subtitleHtml = (!post.hideSubtitle && post.seoTitle && post.seoTitle !== post.title)
    ? `<h2 class="post-subtitle">${esc(post.seoTitle)}</h2>`
    : '';

  return head + siteBodyOpen('blog-page') + `

<article>
  <header class="blog-hero">
    <a href="/blog/" class="back-to-blog">← All posts</a>
    ${post.cluster ? `<p class="post-cluster">${esc(post.cluster)}</p>` : ''}
    <h1>${esc(post.title)}</h1>
    ${subtitleHtml}
    ${heroImgHtml}
    <div class="post-meta">
      ${post.date ? `<span>${esc(formatDate(post.date))}</span>` : ''}
      ${updatedLine ? `<span class="dot">·</span>${updatedLine}` : ''}
    </div>
    ${tagsRow}
    ${bylineHtml}
    ${post.summary ? `<p class="post-lede">${esc(post.summary)}</p>` : ''}
  </header>

  <div class="post-layout${toc.length >= 2 ? ' has-toc' : ''}">
    ${tocHtml}
    <div class="post-body">
      ${bodyHtml}
    </div>
  </div>

  ${faqHtml}

  <aside class="post-cta">
    <h3>Want help implementing this?</h3>
    <p>Book a free 45-minute discovery call. No pitch. We'll dig into what's working, what's broken, and where AI fits.</p>
    <a href="/#contact" class="btn-primary">Book a Free Discovery Call</a>
  </aside>
</article>

${toc.length >= 2 ? `<script>
(function() {
  // Highlight the currently-visible H2 in the sticky TOC
  const tocLinks = document.querySelectorAll('.post-toc a');
  if (!tocLinks.length) return;
  const linkById = new Map();
  tocLinks.forEach(a => {
    const id = a.getAttribute('href').slice(1);
    linkById.set(id, a);
  });
  const headings = Array.from(linkById.keys())
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (!headings.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = linkById.get(entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        tocLinks.forEach(a => a.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
  headings.forEach(h => io.observe(h));
})();
</script>` : ''}

` + siteBodyClose();
}

function renderBlogIndex(posts) {
  const url = `${SITE_URL}/blog/`;
  const head = siteHead({
    title: `Blog | AI for Tour Operators, Advisors & DMCs | ${SITE_NAME}`,
    description: `Writing on AI in travel operations by Ali Murphy. Field ops, proposals, vendor management, AI readiness, and the work behind better trips. New posts weekly.`,
    canonical: url,
    ogType: 'website',
    jsonLd: [
      orgJsonLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `${SITE_NAME} Blog`,
        url,
        description: 'AI insight for people in travel and tourism.',
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
    ],
  });

  // ─── Filters ──────────────────────────────────────────────────────
  // Content-type filter (articles vs. tools) — shown when at least one
  // non-article post exists; otherwise hidden to keep the UI clean.
  const hasTools = posts.some(p => p.type === 'tool');
  const typeFilterHtml = hasTools
    ? `<div class="blog-type-filters" role="tablist" aria-label="Filter by content type">
    <button class="type-tab active" data-type="all">All</button>
    <button class="type-tab" data-type="article">Articles</button>
    <button class="type-tab" data-type="tool">Free tools</button>
  </div>`
    : '';

  // ICP filter chips — union of all icps across posts, alphabetized.
  const allIcps = [...new Set(posts.flatMap(p => p.icps))].sort((a, b) => a.localeCompare(b));
  const icpFilterHtml = allIcps.length
    ? `<div class="blog-filters" role="tablist" aria-label="Filter by audience">
    <span class="blog-filters-label">Filter by role:</span>
    <button class="filter-chip active" data-icp="all">All</button>
    ${allIcps.map(icp => `<button class="filter-chip" data-icp="${esc(icp)}">${esc(icp)}</button>`).join('')}
  </div>`
    : '';

  const cardsHtml = posts.length
    ? posts.map(p => renderPostCard(p)).join('')
    : `<p class="blog-empty">No posts yet. Check back soon.</p>`;

  const communityCallout = `<div class="blog-community-callout">
    <span class="community-emoji">☕</span>
    <div class="blog-community-callout-text">
      <strong>Join the community</strong>
      <span>Free webinars, resources, and a network of travel folk building with AI.</span>
    </div>
    <a href="/#community" class="callout-cta">Join the Community</a>
  </div>`;

  const filterScript = `
<script>
(function() {
  const typeTabs = document.querySelectorAll('.type-tab');
  const icpChips = document.querySelectorAll('.filter-chip');
  const cards = document.querySelectorAll('.post-card');
  const emptyMsg = document.getElementById('blog-empty-filtered');

  let activeType = 'all';
  let activeIcp = 'all';

  function applyFilters() {
    let shown = 0;
    cards.forEach(card => {
      const cardType = card.dataset.type || 'article';
      const cardIcps = (card.dataset.icps || '').split('|').filter(Boolean);
      const typeMatch = activeType === 'all' || cardType === activeType;
      const icpMatch = activeIcp === 'all' || cardIcps.includes(activeIcp);
      const show = typeMatch && icpMatch;
      card.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    if (emptyMsg) emptyMsg.style.display = shown === 0 ? '' : 'none';
  }

  typeTabs.forEach(tab => tab.addEventListener('click', () => {
    typeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeType = tab.dataset.type;
    applyFilters();
  }));

  icpChips.forEach(chip => chip.addEventListener('click', () => {
    icpChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeIcp = chip.dataset.icp;
    applyFilters();
  }));
})();
</script>
`;

  return head + siteBodyOpen('blog-page') + `

<header class="blog-hero">
  <p class="section-label">From the Blog</p>
  <h1>AI insight for people in travel and tourism.</h1>
  <p class="blog-hero-sub">Playbooks, frameworks, and honest takes on what's working (and what isn't) when tour operators, custom trip designers, and travel advisors bring AI into their operations.</p>
</header>

${communityCallout}

${typeFilterHtml}
${icpFilterHtml}

<div class="blog-grid">
  ${cardsHtml}
</div>
<p id="blog-empty-filtered" class="blog-empty" style="display:none;">No posts match that filter combination. Try another.</p>

${filterScript}

` + siteBodyClose();
}

// ─── Author page (/author/ali-murphy/) ───────────────────────────────
// Dedicated E-A-T page for Ali. Hosts the long bio, sameAs links, a
// ProfilePage + Person JSON-LD, and the list of all posts written by
// her. Linked from every post byline.

function renderAuthorPage(posts) {
  const authorPosts = posts.filter(p => (p.author || AUTHOR.name) === AUTHOR.name);
  const url = `${SITE_URL}/author/${AUTHOR.slug}/`;
  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR.name,
    url,
    image: `${SITE_URL}${AUTHOR.photo}`,
    description: AUTHOR.bio,
    sameAs: AUTHOR.sameAs,
    jobTitle: 'Founder',
    worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
  const profileLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${AUTHOR.name} | Author at ${SITE_NAME}`,
    url,
    mainEntity: personLd,
  };

  const head = siteHead({
    title: `${AUTHOR.name} | Author at ${SITE_NAME}`,
    description: AUTHOR.bio,
    canonical: url,
    ogImage: `${SITE_URL}${AUTHOR.photo}`,
    ogType: 'profile',
    jsonLd: [profileLd, breadcrumbJsonLd({ slug: `author/${AUTHOR.slug}`, title: AUTHOR.name })],
  });

  const bioParagraphs = AUTHOR.bioLong.trim().split(/\n\s*\n/)
    .map(p => `<p>${esc(p.trim())}</p>`).join('\n');

  const sameAsHtml = AUTHOR.sameAs.length
    ? `<div class="author-links">
        ${AUTHOR.sameAs.map(href => {
          const label = /linkedin\.com/i.test(href) ? 'LinkedIn'
            : /twitter\.com|x\.com/i.test(href) ? 'X / Twitter'
            : new URL(href).hostname.replace(/^www\./, '');
          return `<a href="${esc(href)}" rel="me noopener" target="_blank">${esc(label)} ↗</a>`;
        }).join('')}
      </div>`
    : '';

  const postsGrid = authorPosts.length
    ? `<div class="blog-grid">${authorPosts.map(p => renderPostCard(p)).join('')}</div>`
    : `<p class="blog-empty">No posts yet.</p>`;

  return head + siteBodyOpen('blog-page') + `

<header class="author-hero">
  <a href="/blog/" class="back-to-blog">← All posts</a>
  <div class="author-hero-inner">
    <img src="${esc(AUTHOR.photo)}" alt="${esc(AUTHOR.name)}" class="author-photo" />
    <div class="author-hero-text">
      <p class="section-label">Author</p>
      <h1>${esc(AUTHOR.name)}</h1>
      <p class="author-tagline">${esc(AUTHOR.bio)}</p>
      ${sameAsHtml}
    </div>
  </div>
</header>

<section class="author-bio">
  ${bioParagraphs}
</section>

<section class="author-posts">
  <h2 class="author-posts-title">Posts by ${esc(AUTHOR.name)}</h2>
  ${postsGrid}
</section>

` + siteBodyClose();
}

function writeAuthorPage(posts) {
  const dir = path.join(ROOT, 'author', AUTHOR.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderAuthorPage(posts));
}

// ─── Artifacts: sitemap, robots, llms.txt ────────────────────────────

function writeRobots() {
  // Full allowlist per blog strategy §07. Covers OpenAI, Anthropic,
  // Perplexity, Google AI Overviews, and Common Crawl.
  // /iconic/ is an unlisted private pitch page — disallowed for everyone.
  const body = `User-agent: GPTBot
Disallow: /iconic/
Allow: /

User-agent: OAI-SearchBot
Disallow: /iconic/
Allow: /

User-agent: ChatGPT-User
Disallow: /iconic/
Allow: /

User-agent: ClaudeBot
Disallow: /iconic/
Allow: /

User-agent: Claude-SearchBot
Disallow: /iconic/
Allow: /

User-agent: PerplexityBot
Disallow: /iconic/
Allow: /

User-agent: Google-Extended
Disallow: /iconic/
Allow: /

User-agent: CCBot
Disallow: /iconic/
Allow: /

User-agent: *
Disallow: /iconic/
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), body);
}

function writeLlmsTxt(posts) {
  const recent = posts.slice(0, 10);
  const body = `# ${SITE_NAME}

> AI consulting and implementation for travel and tourism. Built by someone who has been in the industry.

Afuera helps tour operators, travel advisors, experience companies, DMCs, and custom trip designers modernize their operations with AI. We run audits, build custom AI systems, and train teams.

## Core pages
- [Services](${SITE_URL}/#services): What we offer.
- [How We Work](${SITE_URL}/#how): Discovery, audit, build, custom.
- [About](${SITE_URL}/#about): Ali Murphy, founder.
- [Blog](${SITE_URL}/blog/): Writing on AI in travel operations.

## Key topics covered
- Tour operator workflow automation
- Field operations and guide intelligence
- Custom travel proposals with AI
- Supplier and vendor management
- AI readiness and audits for travel companies
- Trip profitability and accounting

## Author
All content is written by Ali Murphy, former active travel guide, former marketing leader at Context Travel, founder of Afuera.

## Recent articles
${recent.map(p => `- [${p.title}](${SITE_URL}/blog/${p.slug}/): ${p.summary}`).join('\n')}
`;
  fs.writeFileSync(path.join(ROOT, 'llms.txt'), body);
}

function writeSitemap(posts) {
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE_URL}/blog/`, priority: '0.9', changefreq: 'daily' },
    ...posts.map(p => ({
      loc: `${SITE_URL}/blog/${p.slug}/`,
      lastmod: p.updated || p.date,
      priority: '0.7',
      changefreq: 'monthly',
    })),
    { loc: `${SITE_URL}/author/${AUTHOR.slug}/`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${SITE_URL}/aeo-transformer/`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${SITE_URL}/privacy/`, priority: '0.3', changefreq: 'yearly' },
    { loc: `${SITE_URL}/terms/`, priority: '0.3', changefreq: 'yearly' },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
}

// ─── Static legal pages (privacy + terms) ───────────────────────────

function renderLegalPage({ slug, title, description, bodyHtml, lastUpdated }) {
  const url = `${SITE_URL}/${slug}/`;
  const head = siteHead({
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: url,
    ogType: 'website',
    jsonLd: [
      orgJsonLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        description,
        url,
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      },
    ],
  });

  return head + siteBodyOpen('blog-page') + `

<article>
  <header class="blog-hero">
    <a href="/" class="back-to-blog">← Back to home</a>
    <h1>${esc(title)}</h1>
    <p class="blog-hero-sub" style="margin-top: 0.5rem;">Last updated ${esc(lastUpdated)}</p>
  </header>

  <div class="post-body">
    ${bodyHtml}
  </div>
</article>

` + siteBodyClose();
}

const PRIVACY_BODY = `
<p>This policy explains what data Afuera (Outdoorable LLC) collects when you visit <a href="https://www.afuerai.com/">afuerai.com</a>, why we collect it, and what you can do about it. We're a small consulting business and we try to collect the minimum we need to run it.</p>

<h2>What we collect</h2>
<p><strong>When you book a call.</strong> Our scheduling widget is provided by <a href="https://calendly.com/pages/privacy" rel="noopener">Calendly</a>. When you book, Calendly stores your name, email, and the time you chose, and shares that booking with us by email. We use that information to hold the meeting and to follow up afterward. We do not add you to any marketing list without your consent.</p>
<p><strong>When you email us.</strong> If you email us, we store the email in our inbox and any personal information you include in it.</p>
<p><strong>When you visit the site.</strong> Our host, Vercel, receives standard server logs for each page view (IP address, browser, referrer, time). These logs are used for security and traffic-load purposes and are kept for a short period. We do not currently run a third-party web analytics product (such as Google Analytics) on this site. If we add one, this page will be updated first.</p>
<p><strong>Fonts.</strong> The site loads typography from <a href="https://policies.google.com/privacy" rel="noopener">Google Fonts</a>. Google receives your IP address as part of serving those fonts.</p>
<p><strong>What we don't collect.</strong> We don't use behavioural advertising cookies. We don't sell or share personal information with data brokers. We don't track you across other sites.</p>

<h2>How we use your information</h2>
<ul>
  <li>To respond to inquiries you send us.</li>
  <li>To run calls you've scheduled with us.</li>
  <li>To follow up after a meeting with the materials we said we'd send.</li>
  <li>To improve the site (for example, fixing a page someone reported as broken).</li>
</ul>
<p>We don't use your information for automated decision-making or profiling.</p>

<h2>How long we keep it</h2>
<p>Calendly booking records are retained according to <a href="https://calendly.com/pages/privacy" rel="noopener">Calendly's retention policy</a>. Email correspondence we keep for as long as we might reasonably need it for business and legal purposes (typically a few years). Server logs are rotated on a short cycle by our host.</p>

<h2>Your rights</h2>
<p>Depending on where you live, you may have the right to access, correct, or delete personal information we hold about you, and to object to or restrict how we use it. If you live in the EU or UK this is covered by the GDPR; if you live in California it's covered by the CCPA. To exercise any of these rights, email <a href="mailto:hello@afuerai.com">hello@afuerai.com</a> and we'll take care of it within a reasonable time.</p>

<h2>Children</h2>
<p>This site is intended for professional adults in the travel industry. We don't knowingly collect information from anyone under 16. If you believe we have, please contact us and we'll delete it.</p>

<h2>Changes to this policy</h2>
<p>We'll update this page when our practices change. Material changes will bump the "Last updated" date at the top. If the changes are significant (e.g. we start using a new analytics product) we'll note that on the page.</p>

<h2>Contact</h2>
<p>Questions about privacy or your data? Email <a href="mailto:hello@afuerai.com">hello@afuerai.com</a>.</p>
`;

const TERMS_BODY = `
<p>These are the terms for using <a href="https://www.afuerai.com/">afuerai.com</a>, operated by Afuera (Outdoorable LLC). They're written plainly. If you use the site, you're agreeing to them.</p>

<h2>Using the site</h2>
<p>You're welcome to read anything here and to share links with attribution. You may not scrape or republish our content at scale without written permission, use the site to distribute malware or harmful code, attempt to interfere with the site's operation, or use any of our content to train a machine-learning model that competes with our services without permission. Crawling by general-purpose AI systems is allowed and is governed by our <code>/robots.txt</code>.</p>

<h2>Bookings and consulting engagements</h2>
<p>Scheduling a discovery call through the site doesn't create a consulting relationship by itself. Paid engagements are governed by a separate written agreement that we'll share before any work begins. If you haven't signed that agreement, you're not a client.</p>

<h2>Intellectual property</h2>
<p>The site's content (writing, imagery, design, code) is owned by Afuera (Outdoorable LLC) or used under license, unless otherwise noted. You may quote our writing with attribution and a link back. Short blockquotes and excerpts for editorial or educational purposes are welcome. Wholesale republication is not.</p>

<h2>Third-party links and tools</h2>
<p>The site links to other websites and embeds third-party tools (such as Calendly for scheduling). We don't control those sites, and their privacy and terms are their own. We're not responsible for what happens on them.</p>

<h2>No warranty</h2>
<p>Everything on this site is provided "as is." We write honestly and carefully, but the content is general information, not professional advice specific to your operation. If you implement something you read here and it doesn't work in your context, that's a normal part of applying any general advice. Don't make irreversible business decisions based on a blog post. Book a call if you want specific guidance.</p>

<h2>Limitation of liability</h2>
<p>To the maximum extent permitted by law, Afuera (Outdoorable LLC) is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the site. If we are held liable for direct damages, that liability is capped at the greater of (a) US$100 or (b) the total amount you paid us in the twelve months before the claim arose.</p>

<h2>Governing law</h2>
<p>These terms are governed by the laws of the State of Colorado, USA, without regard to conflict-of-laws principles. Any disputes will be resolved in the state or federal courts located in Denver County, Colorado.</p>

<h2>Changes to these terms</h2>
<p>We may update these terms. If the change is material, we'll bump the "Last updated" date at the top. Continued use of the site after a change means you accept the new terms.</p>

<h2>Contact</h2>
<p>Questions? Email <a href="mailto:hello@afuerai.com">hello@afuerai.com</a>.</p>
`;

function writeLegalPages() {
  const lastUpdated = 'April 16, 2026';

  const privacyHtml = renderLegalPage({
    slug: 'privacy',
    title: 'Privacy policy',
    description: 'What data Afuera collects when you visit afuerai.com, why we collect it, and what you can do about it.',
    bodyHtml: PRIVACY_BODY,
    lastUpdated,
  });
  const privacyDir = path.join(ROOT, 'privacy');
  fs.mkdirSync(privacyDir, { recursive: true });
  fs.writeFileSync(path.join(privacyDir, 'index.html'), privacyHtml);

  const termsHtml = renderLegalPage({
    slug: 'terms',
    title: 'Terms of use',
    description: 'Terms for using afuerai.com, operated by Afuera (Outdoorable LLC).',
    bodyHtml: TERMS_BODY,
    lastUpdated,
  });
  const termsDir = path.join(ROOT, 'terms');
  fs.mkdirSync(termsDir, { recursive: true });
  fs.writeFileSync(path.join(termsDir, 'index.html'), termsHtml);
}

// ─── AEO Transformer page (/aeo-transformer/) ────────────────────────
// A lead-gen tool: paste a travel page URL, get a structured AEO-optimized
// version. Uses the site's nav + footer + CSS via siteHead/siteBodyOpen/
// siteBodyClose, so the chrome stays in sync with the rest of the site.
// Page-specific styles are injected as a scoped <style> block in the body.

function renderAeoTransformerPage() {
  const url = `${SITE_URL}/aeo-transformer/`;
  const head = siteHead({
    title: `AEO Transformer | Afuera`,
    description: `Paste any travel blog or destination URL. Get a structured, AEO-optimized version with schema markup, FAQ structure, and the bugs costing you AI search citations. Built for luxury and bespoke tour operators.`,
    canonical: url,
    ogType: 'website',
    jsonLd: [
      orgJsonLd(),
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'AEO Transformer',
        url,
        description: 'Paste any travel blog URL. Get a structured, AEO-optimized version with schema markup, FAQ structure, and the bugs costing you AI search citations.',
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      },
    ],
  });

  // Page-specific CSS. The site nav, buttons, section labels, etc. come
  // from the global stylesheet via siteHead — we only define what's unique
  // to this page (the hero card, result overlay, step + feature grids).
  const pageStyles = `<style>
    body.aeo-page { background: var(--bg-eggplant); }

    /* Hero on dark body background — matches the homepage hero treatment */
    .aeo-hero {
      padding: 10rem 2rem 5rem;
      max-width: 1240px;
      margin: 0 auto;
      text-align: center;
      position: relative;
    }
    .aeo-hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255, 122, 89, 0.10) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 50% 80%, rgba(46, 196, 182, 0.06) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    .aeo-hero > * { position: relative; z-index: 1; }

    .aeo-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent-orange);
      background: rgba(255, 122, 89, 0.12);
      padding: 0.5rem 1rem;
      border-radius: 100px;
      margin-bottom: 1.75rem;
    }
    .aeo-eyebrow .pulse-dot {
      width: 6px; height: 6px;
      background: var(--accent-orange);
      border-radius: 50%;
      animation: aeo-pulse 2s infinite;
    }
    @keyframes aeo-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

    .aeo-hero h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: clamp(2.75rem, 6.5vw, 5rem);
      font-weight: 700;
      line-height: 1.02;
      letter-spacing: -0.035em;
      color: var(--text-light);
      margin: 0 0 1.5rem;
      max-width: 18ch;
      margin-left: auto;
      margin-right: auto;
    }
    .aeo-hero h1 em {
      font-family: 'Fraunces', serif;
      font-style: italic;
      font-weight: 500;
      color: var(--accent-orange);
    }
    .aeo-hero-sub {
      font-family: 'DM Sans', sans-serif;
      font-size: clamp(1.05rem, 1.6vw, 1.2rem);
      line-height: 1.6;
      color: var(--text-light-secondary);
      max-width: 680px;
      margin: 0 auto 2.5rem;
    }

    /* URL input card — sits on the dark hero */
    .aeo-transformer-card {
      max-width: 680px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .aeo-transformer-label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--text-light-secondary);
      text-align: left;
      display: block;
      margin-bottom: 0.75rem;
    }
    .aeo-transformer-form { display: flex; gap: 0.5rem; align-items: center; }

    /* Multi-field lead form */
    .aeo-lead-form { display: flex; flex-direction: column; gap: 1rem; text-align: left; }
    .aeo-field { display: flex; flex-direction: column; }
    .aeo-field-full { width: 100%; }
    .aeo-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .aeo-transformer-btn-full {
      width: 100%;
      justify-content: center;
      margin-top: 0.5rem;
    }
    .aeo-form-note {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.8rem;
      color: var(--text-light-secondary);
      text-align: center;
      margin: 0.5rem 0 0;
      line-height: 1.5;
    }

    /* Thanks + error states (shown after AJAX submit) */
    .aeo-thanks, .aeo-error { display: none; }
    .aeo-thanks.show, .aeo-error.show { display: block; }
    .aeo-thanks {
      max-width: 580px;
      margin: 0 auto;
      padding: 2rem 2.25rem;
      background: rgba(255, 122, 89, 0.10);
      border: 1px solid rgba(255, 122, 89, 0.35);
      border-radius: 16px;
      text-align: center;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .aeo-thanks-icon {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: var(--accent-orange);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 auto 1rem;
    }
    .aeo-thanks h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-light);
      margin: 0 0 0.5rem;
      letter-spacing: -0.015em;
    }
    .aeo-thanks p {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.95rem;
      color: var(--text-light-secondary);
      line-height: 1.55;
      margin: 0;
    }
    .aeo-thanks p strong { color: var(--text-light); }
    .aeo-error {
      max-width: 580px;
      margin: 0 auto;
      padding: 1rem 1.25rem;
      background: rgba(184, 101, 30, 0.12);
      border: 1px solid rgba(184, 101, 30, 0.35);
      border-radius: 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9rem;
      color: var(--text-light);
      text-align: center;
    }
    .aeo-error a { color: var(--accent-orange); }

    .aeo-transformer-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 10px;
      padding: 1rem 1.15rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.92rem;
      color: var(--text-light);
      transition: border-color 0.25s, background 0.25s;
    }
    .aeo-transformer-input::placeholder { color: rgba(240, 237, 229, 0.4); }
    .aeo-transformer-input:focus {
      outline: none;
      border-color: var(--accent-orange);
      background: rgba(255, 255, 255, 0.08);
    }
    .aeo-transformer-btn {
      background: var(--accent-orange);
      color: #fff;
      padding: 1rem 1.75rem;
      border-radius: 100px;
      border: none;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: background 0.25s, transform 0.25s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
    }
    .aeo-transformer-btn:hover { background: var(--accent-orange-hover, #E66345); transform: translateY(-1px); }
    .aeo-transformer-btn .arrow { transition: transform 0.25s; }
    .aeo-transformer-btn:hover .arrow { transform: translateX(3px); }

    /* Light sections (How it works, Features, CTA) */
    .aeo-section { padding: 6rem 2rem; max-width: 1240px; margin: 0 auto; }
    .aeo-section-eyebrow {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--accent-orange);
      margin-bottom: 1rem;
    }
    .aeo-section h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.025em;
      color: var(--text-primary);
      margin: 0 0 1.5rem;
      max-width: 22ch;
    }
    .aeo-section-lead {
      font-family: 'DM Sans', sans-serif;
      font-size: 1.1rem;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 640px;
      margin: 0 0 4rem;
    }

    /* How-it-works steps */
    .aeo-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3rem; }
    .aeo-step-num {
      font-family: 'Fraunces', serif;
      font-size: 4rem;
      font-weight: 400;
      font-style: italic;
      color: var(--accent-orange);
      line-height: 1;
      margin-bottom: 1rem;
      letter-spacing: -0.03em;
    }
    .aeo-step h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: -0.015em;
      line-height: 1.2;
      margin: 0 0 0.75rem;
      color: var(--text-primary);
    }
    .aeo-step p {
      font-family: 'DM Sans', sans-serif;
      color: var(--text-secondary);
      line-height: 1.65;
      margin: 0;
    }

    /* Features grid */
    .aeo-features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1px;
      background: rgba(31, 31, 31, 0.10);
      border: 1px solid rgba(31, 31, 31, 0.10);
      border-radius: 16px;
      overflow: hidden;
      margin-top: 3rem;
    }
    .aeo-feature { padding: 2rem; background: #FDFCF8; }
    .aeo-feature-tag {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--accent-orange);
      margin-bottom: 0.85rem;
      display: inline-block;
      padding: 0.25rem 0.7rem;
      background: rgba(255, 122, 89, 0.10);
      border-radius: 100px;
    }
    .aeo-feature h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.015em;
      margin: 0 0 0.6rem;
      line-height: 1.25;
      color: var(--text-primary);
    }
    .aeo-feature p {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.92rem;
      color: var(--text-secondary);
      line-height: 1.65;
      margin: 0;
    }

    /* CTA */
    .aeo-cta { padding: 7rem 2rem; text-align: center; }
    .aeo-cta-inner { max-width: 780px; margin: 0 auto; }
    .aeo-cta h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: clamp(2.5rem, 5.5vw, 4rem);
      font-weight: 700;
      line-height: 1.02;
      letter-spacing: -0.03em;
      margin: 0 auto 1.5rem;
      color: var(--text-primary);
      max-width: 18ch;
    }
    .aeo-cta h2 em {
      font-family: 'Fraunces', serif;
      font-style: italic;
      font-weight: 500;
      color: var(--accent-orange);
    }
    .aeo-cta-sub {
      font-family: 'DM Sans', sans-serif;
      font-size: 1.1rem;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 540px;
      margin: 0 auto 2.5rem;
    }
    .aeo-cta-buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    .aeo-btn {
      padding: 1rem 2rem;
      border-radius: 100px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      transition: background 0.25s, color 0.25s, border-color 0.25s, transform 0.25s;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      border: none;
      text-decoration: none;
    }
    .aeo-btn-primary { background: var(--accent-orange); color: #fff; }
    .aeo-btn-primary:hover { background: var(--accent-orange-hover, #E66345); transform: translateY(-1px); }
    .aeo-btn-secondary { background: transparent; color: var(--text-primary); border: 1px solid rgba(31, 31, 31, 0.18); }
    .aeo-btn-secondary:hover { border-color: var(--text-primary); }

    /* Result overlay */
    .aeo-overlay {
      position: fixed;
      inset: 0;
      background: rgba(46, 42, 57, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding: 2.5rem 1.25rem;
      overflow-y: auto;
    }
    .aeo-overlay.open { display: flex; animation: aeo-fade 0.3s ease; }
    @keyframes aeo-fade { from { opacity: 0; } to { opacity: 1; } }
    .aeo-panel {
      background: var(--bg-light);
      max-width: 980px;
      width: 100%;
      border-radius: 16px;
      box-shadow: 0 24px 70px rgba(31, 31, 31, 0.18);
      position: relative;
      animation: aeo-slide 0.4s cubic-bezier(0.2, 0.9, 0.3, 1);
    }
    @keyframes aeo-slide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .aeo-close {
      position: absolute;
      top: 1.25rem; right: 1.25rem;
      width: 38px; height: 38px;
      border-radius: 50%;
      background: #FDFCF8;
      border: 1px solid rgba(31, 31, 31, 0.18);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.25s;
      z-index: 2;
    }
    .aeo-close:hover { background: var(--text-primary); color: #fff; border-color: var(--text-primary); }

    .aeo-loading { padding: 5rem 2.5rem; text-align: center; }
    .aeo-spinner {
      width: 32px; height: 32px;
      border: 2px solid rgba(31, 31, 31, 0.18);
      border-top-color: var(--accent-orange);
      border-radius: 50%;
      animation: aeo-spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes aeo-spin { to { transform: rotate(360deg); } }
    .aeo-loading-status {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85rem;
      color: var(--text-secondary);
      min-height: 20px;
    }

    .aeo-result { display: none; padding: 0; }
    .aeo-result.show { display: block; }
    .aeo-result-header { padding: 2.5rem 2.5rem 1.5rem; border-bottom: 1px solid rgba(31, 31, 31, 0.10); }
    .aeo-result-url {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      word-break: break-all;
    }
    .aeo-result-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }
    .aeo-result-score {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(15, 122, 63, 0.10);
      color: #0F7A3F;
      padding: 0.4rem 0.9rem;
      border-radius: 100px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      font-weight: 600;
      margin-top: 0.85rem;
    }

    .aeo-tabs { display: flex; border-bottom: 1px solid rgba(31, 31, 31, 0.10); padding: 0 2.5rem; }
    .aeo-tab {
      padding: 1.15rem 0;
      margin-right: 2rem;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      border: none;
      background: none;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.25s;
    }
    .aeo-tab.active { color: var(--text-primary); border-bottom-color: var(--accent-orange); }
    .aeo-tab:hover { color: var(--text-primary); }

    .aeo-tab-body { padding: 2rem 2.5rem 2.5rem; }
    .aeo-tab-content { display: none; }
    .aeo-tab-content.active { display: block; }

    .aeo-findings { display: flex; flex-direction: column; gap: 1rem; }
    .aeo-finding {
      display: grid;
      grid-template-columns: 36px 1fr;
      gap: 1rem;
      padding: 1.15rem;
      background: #FDFCF8;
      border: 1px solid rgba(31, 31, 31, 0.08);
      border-radius: 12px;
      align-items: flex-start;
    }
    .aeo-finding-icon {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 0.9rem;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .aeo-finding.fix .aeo-finding-icon { background: rgba(184, 101, 30, 0.12); color: #B8651E; }
    .aeo-finding.add .aeo-finding-icon { background: rgba(15, 122, 63, 0.12); color: #0F7A3F; }
    .aeo-finding.add .aeo-finding-icon::before { content: '+'; }
    .aeo-finding.fix .aeo-finding-icon::before { content: '!'; }
    .aeo-finding-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      line-height: 1.3;
      margin-bottom: 0.25rem;
    }
    .aeo-finding-desc {
      font-family: 'DM Sans', sans-serif;
      font-size: 0.92rem;
      color: var(--text-secondary);
      line-height: 1.55;
    }
    .aeo-finding-tag {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.66rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-top: 0.6rem;
      padding: 0.2rem 0.5rem;
      background: var(--bg-light);
      border-radius: 6px;
      border: 1px solid rgba(31, 31, 31, 0.10);
    }

    .aeo-schemas { display: flex; flex-direction: column; gap: 0.75rem; }
    .aeo-schema {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: #FDFCF8;
      border: 1px solid rgba(31, 31, 31, 0.08);
      border-radius: 10px;
      align-items: center;
    }
    .aeo-schema-name {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .aeo-schema-meta {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 0.15rem;
    }
    .aeo-schema-status {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 0.25rem 0.65rem;
      border-radius: 100px;
      background: rgba(15, 122, 63, 0.12);
      color: #0F7A3F;
      font-weight: 600;
    }

    .aeo-preview-frame {
      width: 100%;
      height: 520px;
      border: 1px solid rgba(31, 31, 31, 0.18);
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
    }
    .aeo-preview-frame iframe { width: 100%; height: 100%; border: none; }
    .aeo-preview-note {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-top: 0.9rem;
      text-align: center;
    }

    .aeo-result-footer {
      padding: 1.5rem 2.5rem;
      background: #FDFCF8;
      border-top: 1px solid rgba(31, 31, 31, 0.10);
      display: flex;
      gap: 0.75rem;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      border-radius: 0 0 16px 16px;
    }
    .aeo-result-stats {
      display: flex;
      gap: 1.5rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      color: var(--text-secondary);
    }
    .aeo-result-stats strong { color: var(--text-primary); font-weight: 600; }
    .aeo-result-actions { display: flex; gap: 0.6rem; }

    .aeo-queue { padding: 3rem 2.5rem; text-align: center; }
    .aeo-queue-icon {
      width: 64px; height: 64px;
      background: rgba(255, 122, 89, 0.12);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.5rem;
      font-size: 1.6rem;
      color: var(--accent-orange);
    }
    .aeo-queue h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 0.85rem;
      color: var(--text-primary);
    }
    .aeo-queue p {
      font-family: 'DM Sans', sans-serif;
      color: var(--text-secondary);
      max-width: 480px;
      margin: 0 auto 1.75rem;
      line-height: 1.6;
    }
    .aeo-queue-form { display: flex; gap: 0.5rem; max-width: 440px; margin: 0 auto; }
    .aeo-queue-form input {
      flex: 1;
      background: #FDFCF8;
      border: 1px solid rgba(31, 31, 31, 0.18);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.92rem;
    }
    .aeo-queue-form input:focus { outline: none; border-color: var(--accent-orange); }
    .aeo-queue-success {
      display: none;
      padding: 1.5rem;
      background: rgba(15, 122, 63, 0.08);
      border-radius: 10px;
      color: #0F7A3F;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.92rem;
      margin-top: 1.5rem;
    }
    .aeo-queue-success.show { display: block; }

    @media (max-width: 900px) {
      .aeo-steps { grid-template-columns: 1fr; gap: 3rem; }
      .aeo-features-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .aeo-hero { padding: 7rem 1.25rem 3rem; }
      .aeo-transformer-card { padding: 1rem; }
      .aeo-transformer-form { flex-direction: column; }
      .aeo-transformer-btn { width: 100%; justify-content: center; }
      .aeo-field-row { grid-template-columns: 1fr; }
      .aeo-section { padding: 4rem 1.25rem; }
      .aeo-cta { padding: 4rem 1.25rem; }
      .aeo-overlay { padding: 0; }
      .aeo-panel { border-radius: 0; }
      .aeo-result-header, .aeo-tab-body, .aeo-result-footer { padding-left: 1.5rem; padding-right: 1.5rem; }
      .aeo-tabs { padding: 0 1.5rem; }
      .aeo-tab { margin-right: 1.25rem; font-size: 0.82rem; }
    }
  </style>`;

  // Body markup — hero on default dark body, sections below wrapped in
  // .section-light / .section-secondary so they pick up the homepage's
  // cream/sandstone radial backgrounds.
  const body = `
${pageStyles}

<section class="aeo-hero">
  <div class="aeo-eyebrow">
    <span class="pulse-dot"></span>
    Built for luxury and bespoke tour operators
  </div>
  <h1>Your travel content is invisible to <em>AI search.</em> We fix that.</h1>
  <p class="aeo-hero-sub">Paste any blog or destination page URL. Get a structured version with proper schema markup, FAQ pairs, semantic HTML, and the bugs costing you ChatGPT and Perplexity citations, delivered as a single file your dev can implement.</p>

  <div class="aeo-transformer-card">
    <form id="aeo-form" class="aeo-lead-form" action="https://formsubmit.co/ajax/hello@afuerai.com" method="POST">
      <div class="aeo-field aeo-field-full">
        <label class="aeo-transformer-label" for="aeo-url-input">Page you want transformed</label>
        <input type="url" id="aeo-url-input" name="page_url" class="aeo-transformer-input" placeholder="https://yoursite.com/blog/post-title" required>
      </div>

      <div class="aeo-field-row">
        <div class="aeo-field">
          <label class="aeo-transformer-label" for="aeo-name">Your name</label>
          <input type="text" id="aeo-name" name="name" class="aeo-transformer-input" placeholder="Jane Doe" required>
        </div>
        <div class="aeo-field">
          <label class="aeo-transformer-label" for="aeo-email">Your email</label>
          <input type="email" id="aeo-email" name="email" class="aeo-transformer-input" placeholder="jane@yourcompany.com" required>
        </div>
      </div>

      <div class="aeo-field-row">
        <div class="aeo-field">
          <label class="aeo-transformer-label" for="aeo-company">Company name</label>
          <input type="text" id="aeo-company" name="company_name" class="aeo-transformer-input" placeholder="Acme Travel Co." required>
        </div>
        <div class="aeo-field">
          <label class="aeo-transformer-label" for="aeo-website">Company website</label>
          <input type="url" id="aeo-website" name="company_website" class="aeo-transformer-input" placeholder="https://yourcompany.com" required>
        </div>
      </div>

      <!-- FormSubmit config -->
      <input type="hidden" name="_subject" value="New AEO Transformer request. Afuera.">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_captcha" value="false">
      <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">

      <button type="submit" class="aeo-transformer-btn aeo-transformer-btn-full">Request transform <span class="arrow">→</span></button>
      <p class="aeo-form-note">Free for the first 20 requests. We will send your transformed HTML file plus a short Loom walking through what changed within 24 hours.</p>
    </form>
  </div>

  <div class="aeo-thanks" id="aeo-thanks">
    <div class="aeo-thanks-icon">✓</div>
    <h3>Got it. We are on it.</h3>
    <p>Your transform is in the queue. You will receive an email at <strong id="aeo-thanks-email"></strong> within 24 hours with the structured HTML file and a 5-minute Loom explaining exactly what changed.</p>
  </div>

  <div class="aeo-error" id="aeo-error">
    Something went wrong sending your request. Please email <a href="mailto:hello@afuerai.com">hello@afuerai.com</a> directly and we will get back to you within 24 hours.
  </div>
</section>

<div class="section-light">
  <section class="aeo-section" id="how">
    <div class="aeo-section-eyebrow">How it works</div>
    <h2>One URL in. One implementation-ready HTML file out.</h2>
    <p class="aeo-section-lead">Most travel sites have great content trapped in markup that AI search engines cannot parse. We do not redesign your site. We restructure the underlying HTML so ChatGPT, Perplexity, and Google AI Overview can find and cite you.</p>

    <div class="aeo-steps">
      <div class="aeo-step">
        <div class="aeo-step-num">01</div>
        <h3>Paste your URL</h3>
        <p>Any blog post, destination page, or itinerary. We analyze your existing content, structure, and metadata.</p>
      </div>
      <div class="aeo-step">
        <div class="aeo-step-num">02</div>
        <h3>We restructure</h3>
        <p>Schema markup, FAQ extraction, semantic HTML, proper internal linking, and meta description fixes. All preserving your existing brand and copy.</p>
      </div>
      <div class="aeo-step">
        <div class="aeo-step-num">03</div>
        <h3>You ship it</h3>
        <p>Get a single self-contained HTML file. Hand it to your dev, your Webflow agency, or your Shopify partner. Or hire us to implement.</p>
      </div>
    </div>
  </section>
</div>

<div class="section-secondary">
  <section class="aeo-section" id="features">
    <div class="aeo-section-eyebrow">What gets added</div>
    <h2>The exact AEO improvements, line by line.</h2>
    <p class="aeo-section-lead">Schema markup is the language AI search engines speak. Most travel sites are missing 80% of what they should have.</p>

    <div class="aeo-features-grid">
      <div class="aeo-feature">
        <span class="aeo-feature-tag">Schema</span>
        <h3>TouristTrip and Article schema</h3>
        <p>So ChatGPT understands "this is a 12-day private tour to Sri Lanka," not just "a webpage with text on it."</p>
      </div>
      <div class="aeo-feature">
        <span class="aeo-feature-tag">Schema</span>
        <h3>FAQPage with extracted Q&amp;As</h3>
        <p>Every traveler question on your page becomes an independently extractable answer for AI search engines.</p>
      </div>
      <div class="aeo-feature">
        <span class="aeo-feature-tag">Schema</span>
        <h3>Review and AggregateRating</h3>
        <p>Your testimonials become structured reviews, eligible for ★★★★★ display in Google search results.</p>
      </div>
      <div class="aeo-feature">
        <span class="aeo-feature-tag">Schema</span>
        <h3>BreadcrumbList and Place entities</h3>
        <p>Every destination on your itinerary becomes a named Place. Every breadcrumb properly hierarchical.</p>
      </div>
      <div class="aeo-feature">
        <span class="aeo-feature-tag">Content</span>
        <h3>Semantic HTML restructuring</h3>
        <p>We fix itineraries trapped in H6 tags, lists hiding in paragraphs, and content invisible to crawlers.</p>
      </div>
      <div class="aeo-feature">
        <span class="aeo-feature-tag">Content</span>
        <h3>Question-format headings</h3>
        <p>Match how people actually search ChatGPT and Perplexity. Headings become natural search queries.</p>
      </div>
      <div class="aeo-feature">
        <span class="aeo-feature-tag">Audit</span>
        <h3>Meta description fixes</h3>
        <p>Wrong-page meta descriptions, missing OG tags, broken canonicals. Flagged and corrected.</p>
      </div>
      <div class="aeo-feature">
        <span class="aeo-feature-tag">Audit</span>
        <h3>Image alt text generation</h3>
        <p>Empty alt attributes filled with descriptive context. Helps image search, accessibility, and AI parsing.</p>
      </div>
    </div>
  </section>
</div>

<div class="section-light">
  <section class="aeo-cta" id="book">
    <div class="aeo-cta-inner">
      <div class="aeo-section-eyebrow">Want this implemented?</div>
      <h2>We restructure. <em>You ship.</em></h2>
      <p class="aeo-cta-sub">Most travel operators can implement the transformed HTML themselves or hand it to their existing dev partner. If you would rather have us do it, we offer single-page transforms and full-site audits.</p>
      <div class="aeo-cta-buttons">
        <a href="/#contact" class="aeo-btn aeo-btn-primary">Book a free 45-min call →</a>
        <a href="#" class="aeo-btn aeo-btn-secondary" onclick="document.getElementById('aeo-url-input').focus();return false;">Try the transformer</a>
      </div>
    </div>
  </section>
</div>

<script>
// AEO Transformer lead form — submits to FormSubmit, which emails the
// full submission (URL + name + email + company + website) to
// hello@afuerai.com. Same plumbing as the community signup form.
(function() {
  const form = document.getElementById('aeo-form');
  if (!form) return;
  const thanks = document.getElementById('aeo-thanks');
  const errorBox = document.getElementById('aeo-error');
  const thanksEmail = document.getElementById('aeo-thanks-email');
  const btn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const originalLabel = btn.innerHTML;
    btn.innerHTML = 'Sending…';
    btn.disabled = true;
    errorBox.classList.remove('show');
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error('Network error');
      const email = document.getElementById('aeo-email').value;
      if (thanksEmail) thanksEmail.textContent = email;
      form.style.display = 'none';
      thanks.classList.add('show');
      if (window.gtag) gtag('event', 'aeo_transform_request', {
        company: document.getElementById('aeo-company').value,
      });
    } catch (err) {
      btn.innerHTML = originalLabel;
      btn.disabled = false;
      errorBox.classList.add('show');
    }
  });
})();
</script>
`;

  return head + siteBodyOpen('aeo-page') + body + siteBodyClose();
}

function writeAeoTransformerPage() {
  const dir = path.join(ROOT, 'aeo-transformer');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderAeoTransformerPage());
}

// ─── Inject Organization JSON-LD + blog preview into the landing page ──

function renderHomeBlogCard(p) {
  const coverUrl = p.cover ? `/${p.cover.replace(/^\/+/, '')}` : '/hero-graphic.png';
  return `    <a class="home-blog-card" href="/blog/${esc(p.slug)}/">
      <div class="home-blog-image">
        <img src="${esc(coverUrl)}" alt="" loading="lazy" />
      </div>
      <div class="home-blog-meta">
        ${p.cluster ? `<span class="home-blog-cluster">${esc(p.cluster)}</span>` : ''}
        ${p.cluster && p.date ? `<span class="dot">·</span>` : ''}
        ${p.date ? `<span class="home-blog-date">${esc(formatDate(p.date))}</span>` : ''}
      </div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.summary)}</p>
      <div class="home-blog-byline">
        <img src="${esc(AUTHOR.photo)}" alt="${esc(p.author || AUTHOR.name)}" />
        <span>${esc(p.author || AUTHOR.name)}</span>
      </div>
    </a>`;
}

function updateIndexHtml(posts) {
  const indexPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // 1. Organization JSON-LD (idempotent — remove prior block then re-insert)
  html = html.replace(/<!-- org-schema -->[\s\S]*?<!-- \/org-schema -->\n?/g, '');
  const ld = JSON.stringify(orgJsonLd());
  const orgBlock = `<!-- org-schema -->\n<script type="application/ld+json">${ld}</script>\n<!-- /org-schema -->\n`;
  html = html.replace('</head>', orgBlock + '</head>');

  // 2. Homepage blog preview — inject the 3 most recent posts between
  //    <!-- blog-preview-start --> and <!-- blog-preview-end --> markers.
  const featured = posts.slice(0, 3);
  const featuredHtml = featured.length
    ? featured.map(p => renderHomeBlogCard(p)).join('\n')
    : `    <p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary);">No posts yet. Check back soon.</p>`;

  const startMarker = '<!-- blog-preview-start -->';
  const endMarker = '<!-- blog-preview-end -->';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx !== -1 && endIdx !== -1) {
    const before = html.slice(0, startIdx + startMarker.length);
    const after = html.slice(endIdx);
    html = before + '\n' + featuredHtml + '\n    ' + after;
  }

  fs.writeFileSync(indexPath, html);
}

// ─── Main ────────────────────────────────────────────────────────────

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function build() {
  console.log('[afuera] Building static blog…');

  // Clean /blog output (but keep /content/blog source untouched)
  rmrf(OUT_BLOG_DIR);
  fs.mkdirSync(OUT_BLOG_DIR, { recursive: true });

  const posts = readPosts();
  console.log(`[afuera] Found ${posts.length} post(s).`);

  // Write /blog/index.html
  fs.writeFileSync(path.join(OUT_BLOG_DIR, 'index.html'), renderBlogIndex(posts));

  // Write /blog/<slug>/index.html per post
  let totalVoiceWarnings = 0;
  for (const post of posts) {
    const dir = path.join(OUT_BLOG_DIR, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPostPage(post));
    console.log(`[afuera]   /blog/${post.slug}/  "${post.title}"`);
    totalVoiceWarnings += lintVoicePost(post);
  }
  if (totalVoiceWarnings) {
    console.warn(`[voice] ${totalVoiceWarnings} total voice warning(s) across ${posts.length} post(s). Not failing build.`);
  } else {
    console.log('[voice] 0 warnings — clean.');
  }

  // Author page (/author/ali-murphy/)
  rmrf(path.join(ROOT, 'author'));
  writeAuthorPage(posts);
  console.log(`[afuera]   /author/${AUTHOR.slug}/  "${AUTHOR.name}"`);

  // AEO Transformer page (/aeo-transformer/)
  rmrf(path.join(ROOT, 'aeo-transformer'));
  writeAeoTransformerPage();
  console.log(`[afuera]   /aeo-transformer/  "AEO Transformer"`);

  // Site-wide artifacts
  writeRobots();
  writeLlmsTxt(posts);
  writeSitemap(posts);
  writeLegalPages();
  updateIndexHtml(posts);

  console.log('[afuera] Wrote robots.txt, llms.txt, sitemap.xml.');
  console.log('[afuera] Wrote /privacy/ and /terms/ pages.');
  console.log('[afuera] Updated index.html: injected Organization JSON-LD + 3 latest posts in homepage preview.');
  console.log('[afuera] Done.');
}

build();
