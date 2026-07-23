/**
 * SYNOPSIS: Layout-family shells for Site Builder catalog templates — structurally
 * distinct HTML per family (not color reskins of one funnel).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { getDesignSystemCss, getDesignSystemFontLinks } from './design-studio.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSystem(system = {}) {
  const t = system.tokens || {};
  const primary = t.primary || t.accent || '#111';
  const fonts = system.fonts || {
    display: `"${t.fontDisplay || 'Inter'}", system-ui, sans-serif`,
    body: `"${t.fontBody || 'Inter'}", system-ui, sans-serif`,
    google: [
      ...(t.fontDisplay ? [{ family: t.fontDisplay, weights: 'wght@400;600;700' }] : []),
      ...(t.fontBody && t.fontBody !== t.fontDisplay ? [{ family: t.fontBody, weights: 'wght@400;500;600' }] : []),
    ],
  };
  return {
    ...system,
    tokens: {
      radius: '16px',
      shadow: '0 12px 40px rgba(0,0,0,0.08)',
      overlay: 'rgba(0,0,0,0.04)',
      ...t,
      primary,
      buttonText: t.buttonText || t.accentText || '#FFF',
    },
    fonts,
  };
}

function head(system, content, extraCss = '') {
  const sys = normalizeSystem(system);
  const primary = sys.tokens.primary;
  const accent = sys.tokens.accent;
  const fontLinks = getDesignSystemFontLinks(sys).join('\n');
  const dsCss = getDesignSystemCss(sys, primary, accent);
  const titleBits = [content.name, content.location || content.industry].filter(Boolean);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(titleBits.join(' | '))}</title>
<meta name="description" content="${escapeHtml(content.tagline)}"/>
${fontLinks}
<style>
${dsCss}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.55}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
.wrap{width:min(1120px,calc(100% - 2rem));margin-inline:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.85rem 1.35rem;border:0;text-decoration:none;font-weight:600;cursor:pointer;background:var(--primary);color:var(--button-text);border-radius:var(--radius)}
.btn-ghost{background:transparent;color:var(--text);border:1px solid var(--line);box-shadow:none}
.muted{color:var(--muted)}
.eyebrow{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600}
h1,h2,h3{font-family:var(--font-display);line-height:1.12;margin:0}
h1{font-size:clamp(2.2rem,5vw,4.2rem)}
h2{font-size:clamp(1.6rem,3vw,2.4rem)}
p{margin:0}
.card{background:var(--card);border-radius:var(--radius);padding:1.25rem;border:1px solid var(--line);box-shadow:var(--shadow)}
.site-footer{padding:2.5rem 0 5rem;border-top:1px solid var(--line)}
.sticky-cta{position:fixed;left:0;right:0;bottom:0;z-index:40;padding:.75rem;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);border-top:1px solid var(--line)}
.sticky-cta .btn{width:100%}
${extraCss}
</style>
</head>`;
}

function footer(content, ctaLabel = 'Book free consult') {
  return `<footer class="site-footer">
  <div class="wrap">
    <strong>${escapeHtml(content.name)}</strong>
    <p class="muted">${escapeHtml([content.location, content.phone, content.address].filter(Boolean).join(' · '))}</p>
    <p class="muted" style="margin-top:.75rem;font-size:.85rem">Preview by Site Builder · facts from the business profile only</p>
  </div>
</footer>
<div class="sticky-cta"><a class="btn" href="${escapeHtml(content.booking)}">${escapeHtml(ctaLabel)}</a></div>`;
}

function faqBlock(content) {
  return content.faq.map((q) => `
    <details class="card" style="margin-bottom:.65rem">
      <summary>${escapeHtml(q.question || 'Question')}</summary>
      <p class="muted" style="margin-top:.65rem">${escapeHtml(q.answer || '')}</p>
    </details>`).join('');
}

function shellPhotoEditorial(system, content) {
  const gallery = (content.gallery || []).slice(0, 8);
  const css = `
.minimal-nav{position:absolute;top:0;left:0;right:0;z-index:5;padding:1.25rem 0;color:#fff;background:linear-gradient(180deg,rgba(0,0,0,.45),transparent)}
.minimal-nav .wrap{display:flex;justify-content:space-between;align-items:center}
.hero-full{position:relative;min-height:88vh;display:grid;align-items:end}
.hero-full img,.hero-full .fallback{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero-full .fallback{background:linear-gradient(145deg,var(--line),var(--bg))}
.hero-full .overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.65))}
.hero-full .copy{position:relative;z-index:2;padding:3rem 0;color:#fff;max-width:640px}
.hero-full h1{color:#fff}
.scroll-gallery{display:flex;gap:.75rem;overflow-x:auto;padding:1.5rem 0 2.5rem;scroll-snap-type:x mandatory}
.scroll-gallery img{flex:0 0 min(280px,70vw);aspect-ratio:4/5;object-fit:cover;border-radius:calc(var(--radius) - 4px);scroll-snap-align:start}
.section{padding:3.5rem 0}
.grid-3{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="photo-editorial">
<header class="minimal-nav"><div class="wrap"><span>${escapeHtml(content.name)}</span><a class="btn btn-ghost" style="color:#fff;border-color:rgba(255,255,255,.35)" href="${escapeHtml(content.booking)}">Book</a></div></header>
<main>
  <section class="hero-full">
    ${content.hero ? `<img src="${escapeHtml(content.hero)}" alt="" loading="eager"/>` : '<div class="fallback"></div>'}
    <div class="overlay"></div>
    <div class="wrap copy">
      <p class="eyebrow" style="color:rgba(255,255,255,.75)">${escapeHtml(content.industry)}</p>
      <h1 style="margin-top:.75rem">${escapeHtml(content.tagline)}</h1>
      <p style="margin-top:1rem;opacity:.9;max-width:42ch">${escapeHtml(content.about.slice(0, 180))}</p>
    </div>
  </section>
  ${gallery.length ? `<section class="wrap"><div class="scroll-gallery" aria-label="Gallery">${gallery.map((u) => `<img src="${escapeHtml(u)}" alt="" loading="lazy"/>`).join('')}</div></section>` : ''}
  <section class="section"><div class="wrap"><h2 style="margin-bottom:1.25rem">Services</h2><div class="grid-3">${content.services.map((s) => `<article class="card"><h3>${escapeHtml(s)}</h3><p class="muted" style="margin-top:.5rem">Details confirmed in consult.</p></article>`).join('')}</div></div></section>
  <section class="section" style="background:var(--card)"><div class="wrap"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</div></section>
</main>
${footer(content)}
</body></html>`;
}

function shellStickyCall(system, content) {
  const phone = content.phone || 'Call now';
  const tel = content.phone ? `tel:${String(content.phone).replace(/[^\d+]/g, '')}` : content.booking;
  const css = `
.emergency{background:var(--primary);color:var(--button-text);text-align:center;padding:.55rem;font-size:.9rem;font-weight:700}
.phone-bar{position:sticky;top:0;z-index:30;background:var(--card);border-bottom:2px solid var(--primary);padding:.85rem 0}
.phone-bar .wrap{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
.call-mega{display:block;text-align:center;padding:4rem 0 3rem;background:radial-gradient(circle at 50% 0%,color-mix(in srgb,var(--primary) 22%,transparent),transparent 60%)}
.call-mega a{font-size:clamp(2rem,8vw,4.5rem);font-family:var(--font-display);font-weight:800;color:var(--primary);letter-spacing:-.02em}
.call-mega .sub{margin-top:1rem;color:var(--muted);font-size:1.05rem}
.section{padding:2.5rem 0}
.grid-2{display:grid;gap:1rem}
@media(min-width:720px){.grid-2{grid-template-columns:1fr 1fr}}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="sticky-call">
<div class="emergency">24/7 emergency response · same-day availability when possible</div>
<div class="phone-bar"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(tel)}">Call ${escapeHtml(phone)}</a></div></div>
<main>
  <section class="wrap call-mega">
    <p class="eyebrow">${escapeHtml(content.industry)}${content.location ? ` · ${escapeHtml(content.location)}` : ''}</p>
    <h1 style="margin-top:.75rem">${escapeHtml(content.tagline)}</h1>
    <a href="${escapeHtml(tel)}" style="margin-top:1.5rem">${escapeHtml(phone)}</a>
    <p class="sub">Tap to call — or <a href="${escapeHtml(content.booking)}" style="text-decoration:underline">book online</a></p>
  </section>
  <section class="section"><div class="wrap"><h2 style="margin-bottom:1rem">Why call first</h2><div class="grid-2">${content.pains.map((p) => `<article class="card"><p>${escapeHtml(p)}</p></article>`).join('')}</div></div></section>
  <section class="section" style="background:var(--card)"><div class="wrap"><h2 style="margin-bottom:1rem">Services</h2><div class="grid-2">${content.services.map((s) => `<article class="card"><h3>${escapeHtml(s)}</h3></article>`).join('')}</div></div></section>
</main>
${footer(content, 'Call or book')}
</body></html>`;
}

function shellBeforeAfter(system, content) {
  const before = content.heroes?.[0] || content.hero || '';
  const after = content.heroes?.[1] || content.gallery?.[1] || before;
  const css = `
.hero-split{display:grid;gap:0}
@media(min-width:800px){.hero-split{grid-template-columns:1fr 1fr;min-height:70vh}}
.compare-col{position:relative;min-height:320px}
.compare-col img,.compare-col .fallback{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.compare-col .fallback{background:var(--line)}
.compare-label{position:absolute;top:1rem;left:1rem;z-index:2;background:rgba(0,0,0,.65);color:#fff;padding:.35rem .75rem;border-radius:999px;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.compare-copy{padding:2.5rem 0}
.section{padding:3rem 0}
.grid-3{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="before-after">
<main>
  <section class="hero-split">
    <div class="compare-col">${before ? `<img src="${escapeHtml(before)}" alt="" loading="eager"/>` : '<div class="fallback"></div>'}<span class="compare-label">Before</span></div>
    <div class="compare-col">${after ? `<img src="${escapeHtml(after)}" alt="" loading="eager"/>` : '<div class="fallback"></div>'}<span class="compare-label">After</span></div>
  </section>
  <section class="wrap compare-copy">
    <h1>${escapeHtml(content.tagline)}</h1>
    <p class="muted" style="margin-top:1rem;max-width:48ch">${escapeHtml(content.about.slice(0, 220))}</p>
    <a class="btn" style="margin-top:1.5rem" href="${escapeHtml(content.booking)}">Book a consult</a>
  </section>
  <section class="section"><div class="wrap"><h2 style="margin-bottom:1rem">Services</h2><div class="grid-3">${content.services.map((s) => `<article class="card"><h3>${escapeHtml(s)}</h3></article>`).join('')}</div></div></section>
  <section class="section" style="background:var(--card)"><div class="wrap"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</div></section>
</main>
${footer(content)}
</body></html>`;
}

function shellPortfolioMasonry(system, content) {
  const shots = (content.gallery || content.heroes || []).slice(0, 9);
  const css = `
.masonry{columns:2;column-gap:.75rem;padding:1.5rem 0}
@media(min-width:900px){.masonry{columns:3}}
.masonry img{width:100%;margin-bottom:.75rem;border-radius:calc(var(--radius) - 4px);break-inside:avoid;object-fit:cover}
.masonry img:nth-child(3n+2){aspect-ratio:3/4}
.masonry img:nth-child(3n){aspect-ratio:1}
.masonry img:nth-child(3n+1){aspect-ratio:4/5}
.intro{padding:2rem 0 0}
.section{padding:3rem 0;border-top:1px solid var(--line)}
.grid-3{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="portfolio-masonry">
<main class="wrap">
  <section class="intro">
    <p class="eyebrow">${escapeHtml(content.name)}</p>
    <h1 style="margin-top:.5rem">${escapeHtml(content.tagline)}</h1>
  </section>
  ${shots.length ? `<section class="masonry" aria-label="Portfolio">${shots.map((u) => `<img src="${escapeHtml(u)}" alt="" loading="lazy"/>`).join('')}</section>` : ''}
  <section class="section" id="services">
    <h2 style="margin-bottom:1.25rem">Services</h2>
    <div class="grid-3">${content.services.map((s, i) => `<article class="card"><h3>${escapeHtml(s)}</h3><p class="muted" style="margin-top:.5rem">Portfolio slot ${i + 1} — book to confirm scope.</p><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book</a></article>`).join('')}</div>
  </section>
</main>
${footer(content)}
</body></html>`;
}

function shellMenuBoard(system, content) {
  const css = `
.board{background:color-mix(in srgb,var(--text) 92%,#000);color:color-mix(in srgb,var(--bg) 90%,#fff);min-height:100vh}
.board-nav{padding:1rem 0;border-bottom:2px dashed color-mix(in srgb,var(--accent) 50%,transparent)}
.board-nav .wrap{display:flex;justify-content:space-between;align-items:center}
.menu-hero{padding:3rem 0 2rem;text-align:center}
.menu-hero h1{font-size:clamp(2.8rem,7vw,5rem)}
.menu-list{max-width:720px;margin:0 auto;padding:0 0 3rem}
.menu-item{display:flex;justify-content:space-between;gap:1rem;padding:1rem 0;border-bottom:1px dotted color-mix(in srgb,var(--muted) 60%,transparent)}
.menu-item h3{font-size:1.25rem}
.menu-item .dots{flex:1;border-bottom:1px dotted color-mix(in srgb,var(--muted) 40%,transparent);margin:0 .5rem .35rem;align-self:flex-end}
.cta-row{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:2rem}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="menu-board">
<div class="board">
<header class="board-nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Order / Reserve</a></div></header>
<main class="wrap">
  <section class="menu-hero">
    <p class="eyebrow" style="color:var(--accent)">Today's board</p>
    <h1>${escapeHtml(content.tagline)}</h1>
    <p style="margin-top:1rem;color:var(--muted)">${escapeHtml(content.about.slice(0, 160))}</p>
  </section>
  <section class="menu-list" aria-label="Menu">
    ${content.services.map((s) => `<article class="menu-item"><h3>${escapeHtml(s)}</h3><span class="dots"></span><a class="btn btn-ghost" style="color:inherit;border-color:currentColor" href="${escapeHtml(content.booking)}">Book</a></article>`).join('')}
  </section>
  <div class="cta-row">
    <a class="btn" href="${escapeHtml(content.booking)}">Order now</a>
    <a class="btn btn-ghost" style="color:inherit;border-color:currentColor" href="${escapeHtml(content.booking)}">Reserve a table</a>
  </div>
</main>
</div>
${footer(content, 'Order / reserve')}
</body></html>`;
}

function shellDarkTech(system, content) {
  const css = `
.nav{padding:1rem 0;border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
.bento{display:grid;gap:.85rem;padding:2rem 0}
@media(min-width:900px){.bento{grid-template-columns:repeat(12,1fr)}}
.bento .tile{background:var(--card);border:1px solid var(--line);border-radius:calc(var(--radius) - 2px);padding:1.35rem;box-shadow:var(--shadow)}
.bento .hero-tile{grid-column:span 12;min-height:320px;display:grid;align-content:end;background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 25%,var(--card)),var(--card))}
@media(min-width:900px){.bento .hero-tile{grid-column:span 7;grid-row:span 2}.bento .stat{grid-column:span 5}.bento .product{grid-column:span 4}}
.bento .hero-tile img{width:100%;max-height:220px;object-fit:cover;border-radius:calc(var(--radius) - 4px);margin-bottom:1rem}
.section{padding:2.5rem 0}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="dark-tech">
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Get demo</a></div></header>
<main class="wrap">
  <section class="bento">
    <article class="tile hero-tile">
      ${content.hero ? `<img src="${escapeHtml(content.hero)}" alt="" loading="eager"/>` : ''}
      <p class="eyebrow">${escapeHtml(content.industry)}</p>
      <h1 style="margin-top:.5rem">${escapeHtml(content.tagline)}</h1>
      <a class="btn" style="margin-top:1.25rem;width:fit-content" href="${escapeHtml(content.booking)}">Book consult</a>
    </article>
    <article class="tile stat"><h3>Problem</h3><p class="muted" style="margin-top:.75rem">${escapeHtml(content.pains[0] || '')}</p></article>
    <article class="tile stat"><h3>Outcome</h3><p class="muted" style="margin-top:.75rem">${escapeHtml(content.about.slice(0, 120))}</p></article>
    ${content.services.slice(0, 3).map((s) => `<article class="tile product"><h3>${escapeHtml(s)}</h3><p class="muted" style="margin-top:.5rem">Productized offer — scope in consult.</p></article>`).join('')}
  </section>
  <section class="section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
</main>
${footer(content)}
</body></html>`;
}

function shellSpaZen(system, content) {
  const css = `
.page{padding:4rem 0}
.stack{display:grid;gap:4rem}
.stack section{max-width:640px;margin:0 auto;text-align:center}
.stack h2{margin-bottom:1rem}
.soft-band{padding:5rem 0;background:color-mix(in srgb,var(--accent) 8%,var(--bg))}
.hero-img{width:min(520px,100%);aspect-ratio:5/6;object-fit:cover;border-radius:999px 999px 24px 24px;margin:2rem auto 0;box-shadow:var(--shadow)}
.services-calm{display:grid;gap:1.25rem;margin-top:2rem;text-align:left}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="spa-zen">
<main class="wrap page">
  <section class="stack">
    <div>
      <p class="eyebrow">${escapeHtml(content.name)}</p>
      <h1 style="margin-top:1rem">${escapeHtml(content.tagline)}</h1>
      <p class="muted" style="margin-top:1.5rem">${escapeHtml(content.about.slice(0, 200))}</p>
      ${content.hero ? `<img class="hero-img" src="${escapeHtml(content.hero)}" alt="" loading="eager"/>` : ''}
    </div>
    <div class="soft-band" style="padding:3rem;border-radius:var(--radius)">
      <h2>Offerings</h2>
      <div class="services-calm">${content.services.map((s) => `<article class="card"><h3>${escapeHtml(s)}</h3><p class="muted" style="margin-top:.5rem">Unhurried consult — book when ready.</p></article>`).join('')}</div>
      <a class="btn" style="margin-top:2rem" href="${escapeHtml(content.booking)}">Book calmly</a>
    </div>
    <div><h2>Questions</h2>${faqBlock(content)}</div>
  </section>
</main>
${footer(content, 'Book when ready')}
</body></html>`;
}

function shellIndustrialTrade(system, content) {
  const css = `
.utility{background:var(--text);color:var(--bg);padding:.6rem 0;font-size:.85rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.nav{border-bottom:3px solid var(--primary);padding:1rem 0}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
.hero{padding:2.5rem 0;display:grid;gap:1.5rem}
@media(min-width:900px){.hero{grid-template-columns:1.1fr .9fr;align-items:center}}
.badges{display:flex;flex-wrap:wrap;gap:.5rem;margin:1.25rem 0}
.badge{background:var(--card);border:2px solid var(--primary);padding:.35rem .75rem;font-weight:800;font-size:.8rem}
.proof-strip{display:grid;grid-template-columns:repeat(2,1fr);gap:.65rem;margin:2rem 0}
@media(min-width:800px){.proof-strip{grid-template-columns:repeat(4,1fr)}}
.proof-strip img{width:100%;aspect-ratio:4/3;object-fit:cover;border:2px solid var(--line)}
.section{padding:2.5rem 0}
.grid-3{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="industrial-trade">
<div class="utility"><div class="wrap">Licensed · insured · warranty-backed work</div></div>
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Get quote</a></div></header>
<main>
  <section class="wrap hero">
    <div>
      <h1>${escapeHtml(content.tagline)}</h1>
      <div class="badges"><span class="badge">Warranty</span><span class="badge">Local crew</span>${content.location ? `<span class="badge">${escapeHtml(content.location)}</span>` : ''}</div>
      <p class="muted" style="max-width:42ch">${escapeHtml(content.about.slice(0, 180))}</p>
      <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Schedule service</a>
    </div>
    ${content.hero ? `<img src="${escapeHtml(content.hero)}" alt="" loading="eager" style="width:100%;aspect-ratio:4/3;object-fit:cover;border:3px solid var(--line)"/>` : ''}
  </section>
  ${(content.gallery || []).length ? `<section class="wrap proof-strip">${(content.gallery || []).slice(0, 4).map((u) => `<img src="${escapeHtml(u)}" alt="" loading="lazy"/>`).join('')}</section>` : ''}
  <section class="section" style="background:var(--card)"><div class="wrap"><h2 style="margin-bottom:1rem">Services</h2><div class="grid-3">${content.services.map((s) => `<article class="card"><h3>${escapeHtml(s)}</h3></article>`).join('')}</div></div></section>
</main>
${footer(content)}
</body></html>`;
}

function shellLegalAuthority(system, content) {
  const css = `
.nav{padding:1.25rem 0;border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
.hero{padding:4rem 0 3rem;text-align:center;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 12%,var(--bg)),var(--bg))}
.hero h1{font-family:var(--font-display);letter-spacing:.02em}
.verdicts{display:flex;justify-content:center;flex-wrap:wrap;gap:1.5rem;padding:1.5rem 0;border-block:1px solid var(--line);background:var(--card)}
.verdicts div{text-align:center}
.verdicts strong{display:block;font-size:1.35rem;color:var(--accent)}
.section{padding:3rem 0}
.consult-form{max-width:520px;margin:0 auto;display:grid;gap:.75rem}
.consult-form input,.consult-form textarea{width:100%;padding:.85rem;border:1px solid var(--line);border-radius:calc(var(--radius) - 4px);background:var(--bg);color:var(--text);font:inherit}
.grid-2{display:grid;gap:1rem}
@media(min-width:720px){.grid-2{grid-template-columns:1fr 1fr}}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="legal-authority">
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Free consult</a></div></header>
<main>
  <section class="wrap hero">
    <p class="eyebrow">${escapeHtml(content.industry)} · trusted counsel</p>
    <h1 style="margin-top:.75rem">${escapeHtml(content.tagline)}</h1>
    <p class="muted" style="margin-top:1rem;max-width:52ch;margin-inline:auto">${escapeHtml(content.about.slice(0, 220))}</p>
  </section>
  <section class="verdicts wrap" aria-label="Trust indicators">
    <div><strong>${content.rating ? escapeHtml(String(content.rating)) : '—'}</strong><span class="muted">Client rating</span></div>
    <div><strong>${content.reviewCount ? escapeHtml(String(content.reviewCount)) : '—'}</strong><span class="muted">Reviews</span></div>
    <div><strong>Free</strong><span class="muted">Initial consult</span></div>
  </section>
  <section class="section"><div class="wrap"><h2 style="text-align:center;margin-bottom:1.5rem">Practice areas</h2><div class="grid-2">${content.services.map((s) => `<article class="card"><h3>${escapeHtml(s)}</h3><p class="muted" style="margin-top:.5rem">Discuss fit in a confidential consult.</p></article>`).join('')}</div></div></section>
  <section class="section" style="background:var(--card)"><div class="wrap">
    <h2 style="text-align:center;margin-bottom:1.25rem">Request consultation</h2>
    <form class="consult-form" action="${escapeHtml(content.booking)}" method="get">
      <input type="text" name="name" placeholder="Your name" aria-label="Your name"/>
      <input type="email" name="email" placeholder="Email" aria-label="Email"/>
      <textarea name="message" rows="4" placeholder="Brief summary of your situation" aria-label="Message"></textarea>
      <button class="btn" type="submit">Submit consult request</button>
    </form>
  </div></section>
</main>
${footer(content, 'Free consult')}
</body></html>`;
}

function shellMedicalCalm(system, content) {
  const css = `
.nav{padding:1rem 0;border-bottom:1px solid var(--line);background:var(--card)}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
.insurance{background:color-mix(in srgb,var(--primary) 12%,var(--bg));border-block:1px solid var(--line);padding:.85rem 0;text-align:center;font-size:.95rem}
.hero{padding:2.5rem 0;display:grid;gap:1.5rem}
@media(min-width:900px){.hero{grid-template-columns:1fr 1fr;align-items:center}}
.clinical-grid{display:grid;gap:1rem;margin-top:1.5rem}
@media(min-width:800px){.clinical-grid{grid-template-columns:repeat(3,1fr)}}
.clinical-card{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--primary);border-radius:calc(var(--radius) - 4px);padding:1.25rem}
.section{padding:2.5rem 0}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="medical-calm">
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Book online</a></div></header>
<div class="insurance"><div class="wrap">Most major insurance accepted · confirm coverage when you book</div></div>
<main>
  <section class="wrap hero">
    <div>
      <p class="eyebrow">${escapeHtml(content.industry)}</p>
      <h1 style="margin-top:.5rem">${escapeHtml(content.tagline)}</h1>
      <p class="muted" style="margin-top:1rem;max-width:42ch">${escapeHtml(content.about.slice(0, 200))}</p>
      <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Book appointment</a>
    </div>
    ${content.hero ? `<img src="${escapeHtml(content.hero)}" alt="" loading="eager" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)"/>` : ''}
  </section>
  <section class="section"><div class="wrap">
    <h2 style="margin-bottom:1rem">Clinical services</h2>
    <div class="clinical-grid">${content.services.map((s) => `<article class="clinical-card"><h3>${escapeHtml(s)}</h3><p class="muted" style="margin-top:.5rem">Clear next step at booking.</p></article>`).join('')}</div>
  </div></section>
  <section class="section" style="background:var(--card)"><div class="wrap"><h2 style="margin-bottom:1rem">Patient FAQ</h2>${faqBlock(content)}</div></section>
</main>
${footer(content, 'Book online')}
</body></html>`;
}

function shellBoutiqueRetail(system, content) {
  const rows = (content.gallery || content.heroes || []).slice(0, 6);
  const css = `
.nav{padding:1rem 0}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
.lookbook{display:grid;gap:2rem;padding:2rem 0}
.look-row{display:grid;gap:1rem;align-items:center}
@media(min-width:800px){.look-row{grid-template-columns:1.1fr .9fr}.look-row:nth-child(even){grid-template-columns:.9fr 1.1fr}}
.look-row img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:calc(var(--radius) - 4px)}
.intro{text-align:center;padding:2rem 0 1rem}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="boutique-retail">
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Shop / visit</a></div></header>
<main class="wrap">
  <section class="intro">
    <p class="eyebrow">Lookbook</p>
    <h1 style="margin-top:.5rem">${escapeHtml(content.tagline)}</h1>
  </section>
  <section class="lookbook">
    ${rows.map((u, i) => `<article class="look-row">
      <img src="${escapeHtml(u)}" alt="" loading="lazy"/>
      <div>
        <h2>${escapeHtml(content.services[i] || `Collection ${i + 1}`)}</h2>
        <p class="muted" style="margin-top:.75rem">${escapeHtml(content.about.slice(0, 120))}</p>
        <a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Inquire</a>
      </div>
    </article>`).join('')}
  </section>
</main>
${footer(content, 'Shop / visit')}
</body></html>`;
}

function shellRealtorSearch(system, content) {
  const prov = content.salesBrief?.providerSale || {};
  const cat = content.salesBrief?.categorySale || {};
  const css = `
.nav{padding:1rem 0;border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
.search-hero{padding:3.5rem 0;background:linear-gradient(180deg,var(--card),var(--bg))}
.search-box{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.5rem}
.search-box input{flex:1;min-width:200px;padding:1rem;border:1px solid var(--line);border-radius:calc(var(--radius) - 4px);font:inherit}
.doors{display:grid;gap:.75rem;margin-top:2rem}
@media(min-width:720px){.doors{grid-template-columns:repeat(3,1fr)}}
.door{padding:1.25rem;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)}
.door strong{display:block;margin-bottom:.35rem}
.section{padding:2.5rem 0}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="realtor-search">
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Schedule showing</a></div></header>
<main>
  <section class="search-hero"><div class="wrap">
    <p class="eyebrow">${escapeHtml(content.location || content.industry)}</p>
    <h1 style="margin-top:.5rem">${escapeHtml(content.tagline)}</h1>
    <form class="search-box" action="${escapeHtml(content.searchUrl || content.booking)}" method="get">
      <input type="search" name="q" placeholder="Search neighborhoods, addresses, MLS#" aria-label="Property search"/>
      <button class="btn" type="submit">Search homes</button>
    </form>
    <div class="doors">
      <a class="door" href="${escapeHtml(content.searchUrl || content.booking)}"><strong>Search listings</strong><span class="muted">Browse what's on market now</span></a>
      <a class="door" href="#why-agent"><strong>${escapeHtml(prov.cta || 'Why this agent')}</strong><span class="muted">${escapeHtml(prov.blurb || 'Local expertise and negotiation')}</span></a>
      <a class="door" href="${escapeHtml(content.booking)}"><strong>${escapeHtml(cat.cta || 'Free consult')}</strong><span class="muted">${escapeHtml(cat.blurb || 'Talk through goals first')}</span></a>
    </div>
  </div></section>
  <section id="why-agent" class="section"><div class="wrap">
    <h2 style="margin-bottom:1rem">Why ${escapeHtml(content.name)}</h2>
    <p class="muted" style="max-width:52ch">${escapeHtml(content.about.slice(0, 220))}</p>
    <ul style="margin-top:1rem;padding:0;list-style:none;display:grid;gap:.5rem">${(content.providerWhy || []).slice(0, 4).map((p) => `<li class="card">${escapeHtml(p)}</li>`).join('')}</ul>
  </div></section>
</main>
${footer(content, 'Schedule showing')}
</body></html>`;
}

function shellFitnessEnergy(system, content) {
  const css = `
body{background:#0a0a0a}
.nav{padding:1rem 0;border-bottom:2px solid var(--accent)}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
.hero{padding:3rem 0;text-transform:uppercase}
.hero h1{font-size:clamp(3rem,10vw,6rem);letter-spacing:-.04em;color:var(--accent)}
.class-blocks{display:grid;gap:.75rem;padding:2rem 0}
@media(min-width:800px){.class-blocks{grid-template-columns:repeat(3,1fr)}}
.class-block{background:var(--card);border:2px solid var(--line);padding:1.5rem;min-height:180px;display:grid;align-content:space-between}
.class-block h3{color:var(--accent);font-size:1.4rem}
.cta-band{margin:2rem 0;padding:2.5rem;background:var(--primary);color:var(--button-text);text-align:center}
.cta-band .btn{background:var(--bg);color:var(--text)}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="fitness-energy">
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Start now</a></div></header>
<main class="wrap">
  <section class="hero">
    <p class="eyebrow" style="color:var(--accent)">${escapeHtml(content.industry)}</p>
    <h1>${escapeHtml(content.tagline)}</h1>
    <a class="btn" style="margin-top:1.5rem" href="${escapeHtml(content.booking)}">Book a class</a>
  </section>
  <section class="class-blocks">
    ${content.services.map((s, i) => `<article class="class-block"><h3>${escapeHtml(s)}</h3><p class="muted">Session ${i + 1} · high intensity</p><a class="btn btn-ghost" href="${escapeHtml(content.booking)}">Reserve</a></article>`).join('')}
  </section>
  <section class="cta-band"><h2>No excuses</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Claim your spot</a></section>
</main>
${footer(content, 'Book a class')}
</body></html>`;
}

function shellKidsPlayful(system, content) {
  const css = `
.nav{padding:1rem 0}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
.hero{text-align:center;padding:2.5rem 0}
.hero h1{font-size:clamp(2.4rem,6vw,3.8rem)}
.chips{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:1.5rem 0}
.chip{background:color-mix(in srgb,var(--accent) 20%,var(--card));border:2px solid var(--accent);border-radius:999px;padding:.5rem 1rem;font-weight:700;transform:rotate(-2deg)}
.chip:nth-child(even){transform:rotate(2deg)}
.card{border-radius:28px}
.card-grid{display:grid;gap:1rem;padding:1rem 0 2.5rem}
@media(min-width:800px){.card-grid{grid-template-columns:repeat(3,1fr)}}
.hero-blob{width:min(360px,80%);aspect-ratio:1;border-radius:40% 60% 55% 45%/50% 40% 60% 50%;object-fit:cover;margin:1.5rem auto 0;border:4px solid var(--accent)}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="kids-playful">
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Tour / enroll</a></div></header>
<main class="wrap">
  <section class="hero">
    <h1>${escapeHtml(content.tagline)}</h1>
    <div class="chips">${content.services.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>
    ${content.hero ? `<img class="hero-blob" src="${escapeHtml(content.hero)}" alt="" loading="eager"/>` : ''}
  </section>
  <section class="card-grid">${content.pains.map((p) => `<article class="card"><p>${escapeHtml(p)}</p></article>`).join('')}</section>
  <section style="text-align:center;padding:2rem 0"><a class="btn" href="${escapeHtml(content.booking)}">Schedule a tour</a></section>
</main>
${footer(content, 'Tour / enroll')}
</body></html>`;
}

function shellSwissGrid(system, content) {
  const css = `
.btn{border-radius:0!important}
.grid12{display:grid;grid-template-columns:repeat(12,1fr);gap:0;border-top:2px solid var(--text)}
.cell{padding:1.25rem;border-bottom:1px solid var(--line);border-right:1px solid var(--line)}
.cell.span12{grid-column:span 12}
.cell.span8{grid-column:span 12}
.cell.span4{grid-column:span 12}
@media(min-width:900px){.cell.span8{grid-column:span 8}.cell.span4{grid-column:span 4}.cell.span6{grid-column:span 6}}
.cell.span6{grid-column:span 12}
.label{font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.72rem;color:var(--muted)}
.hero-type{font-size:clamp(2.2rem,5vw,3.6rem);font-weight:800;letter-spacing:-.03em}
.nav{border-bottom:2px solid var(--text);padding:1rem 0}
.nav .wrap{display:flex;justify-content:space-between;align-items:center}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout-family="swiss-grid">
<header class="nav"><div class="wrap"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Book</a></div></header>
<main class="wrap">
  <div class="grid12">
    <div class="cell span8"><p class="label">01 / Hero</p><h1 class="hero-type" style="margin-top:.75rem">${escapeHtml(content.tagline)}</h1><p class="muted" style="margin-top:1rem;max-width:40ch">${escapeHtml(content.about.slice(0, 160))}</p></div>
    <div class="cell span4">${content.hero ? `<img src="${escapeHtml(content.hero)}" alt="" loading="eager" style="width:100%;height:100%;min-height:200px;object-fit:cover"/>` : '<p class="muted">Image</p>'}</div>
    ${content.services.map((s, i) => `<div class="cell span6"><p class="label">S${String(i + 1).padStart(2, '0')}</p><h3 style="margin-top:.5rem">${escapeHtml(s)}</h3></div>`).join('')}
    <div class="cell span12" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;background:var(--text);color:#fff">
      <h2 style="color:#fff">Next step</h2>
      <a class="btn" style="background:var(--accent);color:#fff" href="${escapeHtml(content.booking)}">Book consult</a>
    </div>
  </div>
</main>
${footer(content)}
</body></html>`;
}

const FAMILY_RENDERERS = {
  'photo-editorial': shellPhotoEditorial,
  'sticky-call': shellStickyCall,
  'before-after': shellBeforeAfter,
  'portfolio-masonry': shellPortfolioMasonry,
  'menu-board': shellMenuBoard,
  'dark-tech': shellDarkTech,
  'spa-zen': shellSpaZen,
  'industrial-trade': shellIndustrialTrade,
  'legal-authority': shellLegalAuthority,
  'medical-calm': shellMedicalCalm,
  'boutique-retail': shellBoutiqueRetail,
  'realtor-search': shellRealtorSearch,
  'fitness-energy': shellFitnessEnergy,
  'kids-playful': shellKidsPlayful,
  'swiss-grid': shellSwissGrid,
};

let visitorSalesShell = null;

export function registerVisitorSalesShell(fn) {
  visitorSalesShell = fn;
}

export function renderLayoutFamily(family, system, content) {
  if (family === 'visitor-sales') {
    if (typeof visitorSalesShell === 'function') return visitorSalesShell(system, content);
    throw new Error('visitor-sales shell not registered — import design-studio-layouts first');
  }
  const renderer = FAMILY_RENDERERS[family] || FAMILY_RENDERERS['photo-editorial'];
  return renderer(system, content);
}

export default renderLayoutFamily;