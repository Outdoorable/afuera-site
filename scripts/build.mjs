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
import { siteHead, siteBodyOpen, siteBodyClose, SITE_URL, SITE_NAME, SITE_DESC } from './templates.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const OUT_BLOG_DIR = path.join(ROOT, 'blog');

const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = s => String(s).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// Walk /content/blog and collect all posts
function readPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  return files.map(f => {
    const src = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
    const parsed = matter(src);
    const fm = parsed.data;
    const slug = fm.slug || f.replace(/\.(md|mdx)$/, '');
    return {
      file: f,
      slug,
      title: fm.title || slug,
      date: fm.date ? new Date(fm.date).toISOString().slice(0, 10) : null,
      summary: fm.summary || '',
      icps: fm.icps || [],
      tags: fm.tags || [],
      author: fm.author || '',
      cover: fm.cover || '',
      faq: fm.faq || [],
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
    const plain = inner.replace(/<[^>]+>/g, '').trim();
    const baseSlug = slugify(plain);
    let id = baseSlug;
    const n = slugCounts.get(baseSlug) || 0;
    if (n > 0) id = `${baseSlug}-${n}`;
    slugCounts.set(baseSlug, n + 1);
    if (depth === '2') headings.push({ id, text: plain });
    return `<h${depth} id="${id}">${inner}</h${depth}>`;
  });

  return { html, toc: headings };
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
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
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: post.author || 'Ali Murphy' },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/hero-graphic.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: post.cover ? `${SITE_URL}/${post.cover}` : `${SITE_URL}/hero-graphic.png`,
    keywords: (post.tags || []).join(', '),
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
    title: `${post.title} — ${SITE_NAME}`,
    description: post.summary,
    canonical: url,
    ogImage: post.cover ? `${SITE_URL}/${post.cover}` : undefined,
    ogType: 'article',
    articleMeta: { date: post.date, author: post.author, tags: post.tags },
    jsonLd,
  });

  const tocHtml = toc.length >= 2
    ? `<nav class="post-toc" aria-label="Table of contents">
    <p class="post-toc-label">Contents</p>
    <ol>${toc.map(h => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('')}</ol>
  </nav>`
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
    ? post.tags.map(t => `<span class="tag-chip">${esc(t)}</span>`).join('')
    : '';

  return head + siteBodyOpen('blog-page') + `

<article>
  <header class="blog-hero">
    <a href="/blog/" class="back-to-blog">← All posts</a>
    <h1>${esc(post.title)}</h1>
    <div class="post-meta">
      ${post.date ? `<span>${esc(formatDate(post.date))}</span>` : ''}
      ${post.author ? `<span class="dot">·</span><span>${esc(post.author)}</span>` : ''}
      ${tagsRow ? `<span style="margin-left: auto; display: inline-flex; gap: 0.5rem;">${tagsRow}</span>` : ''}
    </div>
    ${post.summary ? `<div class="tldr">
      <p class="tldr-label">TL;DR</p>
      <p>${esc(post.summary)}</p>
    </div>` : ''}
    ${tocHtml}
  </header>

  <div class="post-body">
    ${bodyHtml}
  </div>

  ${faqHtml}

  <aside class="post-cta">
    <h3>Want help implementing this?</h3>
    <p>Book a free 45-minute discovery call. No pitch — we'll dig into what's working, what's broken, and where AI fits.</p>
    <a href="/#contact" class="btn-primary">Book a Free Discovery Call</a>
  </aside>
</article>

` + siteBodyClose();
}

function renderBlogIndex(posts) {
  const url = `${SITE_URL}/blog/`;
  const head = siteHead({
    title: `Blog — ${SITE_NAME}`,
    description: `AI insight for people in travel and tourism. Articles on AI workflows for tour operators, custom trip designers, and travel advisors.`,
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

  // ICP filter chips — union of all icps values across posts
  const allIcps = [...new Set(posts.flatMap(p => p.icps))];

  const filtersHtml = allIcps.length
    ? `<div class="blog-filters" role="tablist" aria-label="Filter by audience">
    <button class="filter-chip active" data-icp="all">All</button>
    ${allIcps.map(icp => `<button class="filter-chip" data-icp="${esc(icp)}">${esc(icp)}</button>`).join('')}
  </div>`
    : '';

  const cardsHtml = posts.length
    ? posts.map(p => `
    <a class="post-card" href="/blog/${esc(p.slug)}/" data-icps="${esc((p.icps || []).join('|'))}">
      <p class="post-card-date">${esc(formatDate(p.date))}</p>
      <h2>${esc(p.title)}</h2>
      <p>${esc(p.summary)}</p>
      <span class="read-more">Read more →</span>
    </a>
  `).join('')
    : `<p class="blog-empty">No posts yet — check back soon.</p>`;

  const filterScript = `
<script>
(function() {
  const chips = document.querySelectorAll('.filter-chip');
  const cards = document.querySelectorAll('.post-card');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const icp = chip.dataset.icp;
    cards.forEach(card => {
      const icps = (card.dataset.icps || '').split('|').filter(Boolean);
      const show = icp === 'all' || icps.includes(icp);
      card.style.display = show ? '' : 'none';
    });
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

${filtersHtml}

<div class="blog-grid">
  ${cardsHtml}
</div>

${filterScript}

` + siteBodyClose();
}

// ─── Artifacts: sitemap, robots, llms.txt ────────────────────────────

function writeRobots() {
  const body = `User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), body);
}

function writeLlmsTxt(posts) {
  const recent = posts.slice(0, 10);
  const body = `# ${SITE_NAME}

> AI consulting & implementation for travel and tourism. We help tour operators, custom trip designers, and travel advisors redesign their office and field operations with AI — built by practitioners who come from the industry.

## Key pages
- [Home](${SITE_URL}/): Overview of Afuera's services, process, and who we work with
- [Blog](${SITE_URL}/blog/): Articles on AI for tour operators and travel businesses
- [About](${SITE_URL}/#about): Meet Ali Murphy — founder's background
- [Services](${SITE_URL}/#services): AI Audit & Playbook, Custom Software
- [Book a call](${SITE_URL}/#contact): Schedule a free 45-minute discovery call

## Core topics we cover
- AI for tour operators
- Reducing no-shows with automation
- Field operations optimization for experience businesses
- Office operations automation for small travel operators
- Itinerary generation and proposal workflows
- Guide coordination and guest communication systems
- Custom software builds for travel companies

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
      lastmod: p.date,
      priority: '0.7',
      changefreq: 'monthly',
    })),
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

// ─── Inject Organization JSON-LD into the landing page ───────────────

function injectOrgSchemaIntoIndex() {
  const indexPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Remove any previously injected block
  html = html.replace(/<!-- org-schema -->[\s\S]*?<!-- \/org-schema -->\n?/g, '');

  const ld = JSON.stringify(orgJsonLd());
  const block = `<!-- org-schema -->\n<script type="application/ld+json">${ld}</script>\n<!-- /org-schema -->\n`;

  // Insert just before </head>
  html = html.replace('</head>', block + '</head>');

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
  for (const post of posts) {
    const dir = path.join(OUT_BLOG_DIR, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderPostPage(post));
    console.log(`[afuera]   /blog/${post.slug}/  "${post.title}"`);
  }

  // Site-wide artifacts
  writeRobots();
  writeLlmsTxt(posts);
  writeSitemap(posts);
  injectOrgSchemaIntoIndex();

  console.log('[afuera] Wrote robots.txt, llms.txt, sitemap.xml.');
  console.log('[afuera] Injected Organization JSON-LD into index.html.');
  console.log('[afuera] Done.');
}

build();
