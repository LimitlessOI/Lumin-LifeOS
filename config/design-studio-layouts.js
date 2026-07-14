/**
 * SYNOPSIS: Hand-authored layout shells per design system — real structural
 * differentiation for Site Builder variants (not AI reskins of one funnel).
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

function uniqUrls(urls = []) {
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    const s = String(u || '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function normalizeLayoutContent(info = {}, posPartner = null) {
  const logo = info.logoUrl || info.assetData?.images?.logo || '';
  const rawHeroes = [
    ...(info.heroImages || []),
    ...(info.assetData?.images?.hero || []),
    ...(info.assetData?.images?.product || []),
    ...(info.assetData?.images?.social || []).map((i) => i.url || i),
  ];
  const heroes = uniqUrls(rawHeroes).filter((u) => u !== logo && !/\blogo\b|favicon/i.test(u));
  const hero = heroes[0] || '';
  const partner = posPartner || { name: 'booking', url: '#book' };
  const booking = info.bookingUrl || partner.url || '#book';
  const services = (info.services || ['Prenatal care', 'Home birth support', 'Postpartum care']).slice(0, 6);
  const pains = (info.painPoints || [
    'Hard to tell who is actually attending your birth',
    'Website feels dated and hard to trust',
    'Booking a consult takes too many steps',
  ]).slice(0, 3);
  const testimonials = (
    info.verifiedData?.testimonials
    || info.assetData?.testimonials
    || info.testimonials
    || []
  ).slice(0, 3);
  const faq = (info.faq || [
    { question: `How do I book with ${info.businessName || 'us'}?`, answer: 'Use the book button to request a free consult. We confirm availability by phone or email.' },
    { question: 'What areas do you serve?', answer: info.location ? `We primarily serve ${info.location} and nearby communities.` : 'Share your location when you book and we will confirm coverage.' },
    { question: 'What should I expect at the first visit?', answer: 'A conversation about your goals, history, and whether our care model is the right fit — no pressure.' },
  ]).slice(0, 5);
  const about = info.about || info.description || info.tagline
    || `${info.businessName || 'This practice'} provides grounded, human care with a clear path to book.`;

  return {
    name: info.businessName || 'Your Business',
    tagline: info.tagline || 'Care that feels human — with a clear next step',
    industry: info.industry || 'wellness',
    location: info.location || '',
    phone: info.phone || info.assetData?.businessDetails?.phone || '',
    address: info.address || info.assetData?.businessDetails?.address || '',
    logo,
    hero,
    heroes,
    booking,
    partnerName: partner.name || 'booking',
    services,
    pains,
    testimonials,
    faq,
    about,
    rating: info.verifiedData?.rating || info.rating || null,
    reviewCount: info.verifiedData?.reviewCount || info.reviewCount || null,
  };
}

function head(system, content, extraCss = '') {
  const primary = system.tokens.primary;
  const accent = system.tokens.accent;
  const fontLinks = getDesignSystemFontLinks(system).join('\n');
  const dsCss = getDesignSystemCss(system, primary, accent);
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
a{color:inherit}
.wrap{width:min(1120px,calc(100% - 2rem));margin-inline:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.85rem 1.35rem;border:0;text-decoration:none;font-weight:600;cursor:pointer}
.btn-ghost{background:transparent;color:var(--text);border:1px solid var(--line);box-shadow:none}
.muted{color:var(--muted)}
.eyebrow{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600}
h1,h2,h3{font-family:var(--font-display);line-height:1.12;margin:0}
h1{font-size:clamp(2.2rem,5vw,4.2rem)}
h2{font-size:clamp(1.6rem,3vw,2.4rem)}
p{margin:0}
.sticky-cta{position:fixed;left:0;right:0;bottom:0;z-index:40;padding:.75rem;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(10px);border-top:1px solid var(--line)}
.sticky-cta .btn{width:100%}
@media(min-width:768px){.sticky-cta{display:none}}
${extraCss}
</style>
</head>`;
}

function proofLine(content) {
  if (content.rating) {
    const count = content.reviewCount ? ` · ${escapeHtml(String(content.reviewCount))} reviews` : '';
    return `<p class="eyebrow">${escapeHtml(String(content.rating))}★ trusted care${count}</p>`;
  }
  if (content.location) return `<p class="eyebrow">${escapeHtml(content.industry)} · ${escapeHtml(content.location)}</p>`;
  return `<p class="eyebrow">${escapeHtml(content.industry)}</p>`;
}

function serviceCards(content, className = 'card') {
  return content.services.map((s) => `
    <article class="${className}">
      <h3>${escapeHtml(s)}</h3>
      <p class="muted">Real care details confirmed in consult — book to see if we are the right fit.</p>
      <a class="btn" href="${escapeHtml(content.booking)}" style="margin-top:1rem">Book</a>
    </article>`).join('');
}

function painCards(content, className = 'card') {
  return content.pains.map((p) => `<article class="${className}"><p>${escapeHtml(p)}</p></article>`).join('');
}

function testimonialCards(content, className = 'card') {
  if (!content.testimonials.length) {
    return `<article class="${className}"><p class="muted">Client stories appear here once verified reviews are connected — we do not invent quotes.</p></article>`;
  }
  return content.testimonials.map((t) => `
    <article class="${className}">
      <p>“${escapeHtml(String(t.text || '').slice(0, 220))}”</p>
      <p class="muted" style="margin-top:.75rem">— ${escapeHtml(t.author || 'Client')}${t.source ? ` · ${escapeHtml(t.source)}` : ''}</p>
    </article>`).join('');
}

function faqBlock(content) {
  return content.faq.map((q) => `
    <details>
      <summary>${escapeHtml(q.question || 'Question')}</summary>
      <p class="muted">${escapeHtml(q.answer || '')}</p>
    </details>`).join('');
}

function heroMedia(content, className = 'hero-media') {
  if (content.hero) {
    return `<img class="${className}" src="${escapeHtml(content.hero)}" alt="" loading="eager"/>`;
  }
  return `<div class="${className} hero-fallback" aria-hidden="true"></div>`;
}

function footer(content) {
  return `<footer class="site-footer">
  <div class="wrap">
    <strong>${escapeHtml(content.name)}</strong>
    <p class="muted">${escapeHtml([content.location, content.phone, content.address].filter(Boolean).join(' · '))}</p>
    <p class="muted" style="margin-top:.75rem;font-size:.85rem">Preview by Site Builder · facts from the business profile only</p>
  </div>
</footer>
<div class="sticky-cta"><a class="btn" href="${escapeHtml(content.booking)}">Book free consult</a></div>`;
}

function shellEditorialLuxe(system, content) {
  const css = `
.nav{position:sticky;top:0;z-index:20;backdrop-filter:blur(12px);background:color-mix(in srgb,var(--bg) 88%,transparent);border-bottom:1px solid var(--line)}
.nav-inner{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 0}
.brand{display:flex;align-items:center;gap:.75rem;font-family:var(--font-display);font-weight:600}
.brand img{width:40px;height:40px;object-fit:contain}
.hero{display:grid;gap:2rem;padding:4rem 0 3rem;grid-template-columns:1fr}
@media(min-width:900px){.hero{grid-template-columns:1.05fr .95fr;align-items:center;padding:5.5rem 0}}
.hero-copy h1{max-width:14ch}
.hero-copy .lead{margin-top:1.25rem;font-size:1.15rem;max-width:36ch;color:var(--muted)}
.hero-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.75rem}
.hero-media{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--radius);box-shadow:var(--shadow);background:linear-gradient(145deg,var(--card),color-mix(in srgb,var(--accent) 28%,var(--bg)))}
.rule{height:1px;background:var(--line);margin:0}
.section{padding:4rem 0}
.section-head{display:flex;justify-content:space-between;gap:1rem;align-items:end;margin-bottom:1.75rem;border-top:1px solid var(--line);padding-top:1.5rem}
.grid-3{display:grid;gap:1rem;grid-template-columns:1fr}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}.services{grid-template-columns:1.3fr 1fr 1fr}}
.card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:1.35rem;border-top:3px solid var(--accent)}
.card h3{font-size:1.2rem;margin-bottom:.5rem}
.cta-band{background:var(--text);color:#fff;padding:4rem 0;text-align:center}
.cta-band .btn{background:var(--accent);color:#111}
.site-footer{padding:3rem 0 5rem;border-top:1px solid var(--line)}
details{border-bottom:1px solid var(--line);padding:1rem 0}
summary{cursor:pointer;font-weight:600}
details p{margin-top:.75rem}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="editorial-luxe">
<header class="nav"><div class="wrap nav-inner">
  <div class="brand">${content.logo ? `<img src="${escapeHtml(content.logo)}" alt=""/>` : ''}<span>${escapeHtml(content.name)}</span></div>
  <a class="btn" href="${escapeHtml(content.booking)}">Book free call</a>
</div></header>
<main>
  <section class="wrap hero">
    <div class="hero-copy">
      ${proofLine(content)}
      <h1 style="margin-top:.75rem">${escapeHtml(content.tagline)}</h1>
      <p class="lead">${escapeHtml(content.about.slice(0, 220))}</p>
      <div class="hero-actions">
        <a class="btn" href="${escapeHtml(content.booking)}">Book your free consultation</a>
        <a class="btn btn-ghost" href="#services">See services</a>
      </div>
    </div>
    ${heroMedia(content)}
  </section>
  <div class="rule"></div>
  <section class="wrap section">
    <div class="section-head"><h2>Does this sound familiar?</h2></div>
    <div class="grid-3">${painCards(content)}</div>
  </section>
  <section id="services" class="wrap section">
    <div class="section-head"><h2>How we help</h2><p class="muted">Clear offers. Honest next step.</p></div>
    <div class="grid-3 services">${serviceCards(content)}</div>
  </section>
  <section class="wrap section">
    <div class="section-head"><h2>Words from real clients</h2></div>
    <div class="grid-3">${testimonialCards(content)}</div>
  </section>
  <section class="wrap section">
    <div class="section-head"><h2>Questions</h2></div>
    ${faqBlock(content)}
  </section>
  <section class="cta-band">
    <div class="wrap">
      <h2>Ready when you are</h2>
      <p style="margin:1rem auto 0;max-width:40ch;opacity:.85">Book through ${escapeHtml(content.partnerName)} — no invented claims, just a clearer path.</p>
      <a class="btn" style="margin-top:1.5rem" href="${escapeHtml(content.booking)}">Book now</a>
    </div>
  </section>
</main>
${footer(content)}
</body></html>`;
}

function shellModernClinical(system, content) {
  const css = `
.nav{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);z-index:20}
.nav-inner,.hero-inner,.band-inner{width:min(1200px,calc(100% - 2rem));margin:0 auto}
.nav-inner{display:flex;justify-content:space-between;align-items:center;padding:1rem 0}
.hero{padding:3.5rem 0 2.5rem;background:linear-gradient(180deg,var(--card),var(--bg))}
.hero-inner{display:grid;gap:2rem}
@media(min-width:900px){.hero-inner{grid-template-columns:1.1fr .9fr;align-items:center}}
.badges{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 1.25rem}
.badge{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:.35rem .8rem;font-size:.85rem;color:var(--muted)}
.hero-media,.hero-fallback{border-radius:var(--radius);aspect-ratio:16/11;object-fit:cover;border:1px solid var(--line);background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 18%,white),var(--card))}
.section{padding:3.5rem 0}
.section h2{margin-bottom:1.25rem}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}.grid-2{grid-template-columns:1fr 1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1.25rem;box-shadow:var(--shadow)}
.card h3{font-size:1.05rem;margin-bottom:.4rem}
.icon{width:2.25rem;height:2.25rem;border-radius:999px;background:color-mix(in srgb,var(--primary) 16%,white);display:grid;place-items:center;margin-bottom:.75rem;color:var(--primary);font-weight:700}
.cta{background:var(--primary);color:var(--button-text);padding:3.5rem 0;text-align:center}
.cta .btn{background:var(--bg);color:var(--text)}
.site-footer{padding:2.5rem 0 5rem;border-top:1px solid var(--line)}
details{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1rem;margin-bottom:.75rem}
summary{cursor:pointer;font-weight:600}
details p{margin-top:.6rem}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="modern-clinical">
<header class="nav"><div class="nav-inner">
  <strong>${escapeHtml(content.name)}</strong>
  <a class="btn" href="${escapeHtml(content.booking)}">Book consult</a>
</div></header>
<main>
  <section class="hero"><div class="hero-inner">
    <div>
      ${proofLine(content)}
      <h1 style="margin-top:.6rem">${escapeHtml(content.tagline)}</h1>
      <div class="badges">
        <span class="badge">Clear care path</span>
        <span class="badge">Evidence-minded</span>
        ${content.location ? `<span class="badge">${escapeHtml(content.location)}</span>` : ''}
      </div>
      <p class="muted" style="max-width:42ch">${escapeHtml(content.about.slice(0, 200))}</p>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.5rem">
        <a class="btn" href="${escapeHtml(content.booking)}">Book free consultation</a>
        <a class="btn btn-ghost" href="#services">View services</a>
      </div>
    </div>
    ${heroMedia(content)}
  </div></section>
  <section class="section"><div class="wrap">
    <h2>Common frustrations</h2>
    <div class="grid grid-3">${content.pains.map((p, i) => `<article class="card"><div class="icon">${i + 1}</div><p>${escapeHtml(p)}</p></article>`).join('')}</div>
  </div></section>
  <section id="services" class="section" style="background:var(--card)"><div class="wrap">
    <h2>Services</h2>
    <div class="grid grid-3">${serviceCards(content)}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <h2>Client proof</h2>
    <div class="grid grid-2">${testimonialCards(content)}</div>
  </div></section>
  <section class="section"><div class="wrap"><h2>FAQ</h2>${faqBlock(content)}</div></section>
  <section class="cta"><div class="band-inner">
    <h2>Book with clarity</h2>
    <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Start with a free call</a>
  </div></section>
</main>
${footer(content)}
</body></html>`;
}

function shellOrganicWarm(system, content) {
  const css = `
body{overflow-x:hidden}
.blob{position:absolute;border-radius:50%;filter:blur(40px);opacity:.45;pointer-events:none}
.blob-a{width:280px;height:280px;background:color-mix(in srgb,var(--primary) 45%,transparent);top:-60px;right:-40px}
.blob-b{width:220px;height:220px;background:color-mix(in srgb,var(--accent) 50%,transparent);bottom:10%;left:-50px}
.nav{position:relative;z-index:5;padding:1.25rem 0}
.nav-inner{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:.7rem;font-family:var(--font-display);font-weight:700}
.brand img{width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--line)}
.hero{position:relative;padding:2rem 0 4rem;text-align:center}
.hero h1{max-width:16ch;margin:1rem auto 0}
.hero .lead{max-width:42ch;margin:1.25rem auto 0;color:var(--muted);font-size:1.1rem}
.hero-media,.hero-fallback{margin:2rem auto 0;width:min(720px,100%);aspect-ratio:16/10;border-radius:999px 999px 40px 40px;object-fit:cover;box-shadow:var(--shadow);background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--accent) 35%,white),color-mix(in srgb,var(--primary) 25%,var(--bg)))}
.actions{display:flex;justify-content:center;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}
.section{padding:3.5rem 0;position:relative}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);border-radius:var(--radius);padding:1.4rem;box-shadow:var(--shadow);border:1px solid color-mix(in srgb,var(--accent) 25%,var(--line))}
.card h3{margin-bottom:.45rem}
.soft-band{background:color-mix(in srgb,var(--accent) 12%,var(--bg));border-block:1px solid var(--line)}
.cta{text-align:center;padding:4rem 0;background:linear-gradient(160deg,color-mix(in srgb,var(--primary) 88%,#000),var(--primary));color:#fff}
.cta .btn{background:#fff;color:var(--text)}
.site-footer{padding:2.5rem 0 5rem}
details{background:var(--card);border-radius:var(--radius);padding:1rem 1.15rem;margin-bottom:.75rem;box-shadow:var(--shadow)}
summary{cursor:pointer;font-weight:700}
details p{margin-top:.65rem}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="organic-warm">
<div class="blob blob-a"></div><div class="blob blob-b"></div>
<header class="nav"><div class="wrap nav-inner">
  <div class="brand">${content.logo ? `<img src="${escapeHtml(content.logo)}" alt=""/>` : ''}<span>${escapeHtml(content.name)}</span></div>
  <a class="btn" href="${escapeHtml(content.booking)}">Book free call</a>
</div></header>
<main>
  <section class="wrap hero">
    ${proofLine(content)}
    <h1>${escapeHtml(content.tagline)}</h1>
    <p class="lead">${escapeHtml(content.about.slice(0, 210))}</p>
    <div class="actions">
      <a class="btn" href="${escapeHtml(content.booking)}">Book your free consultation</a>
      <a class="btn btn-ghost" href="#services">Explore care</a>
    </div>
    ${heroMedia(content)}
  </section>
  <section class="section soft-band"><div class="wrap">
    <h2 style="text-align:center;margin-bottom:1.5rem">You're not imagining it</h2>
    <div class="grid grid-3">${painCards(content)}</div>
  </div></section>
  <section id="services" class="section"><div class="wrap">
    <h2 style="text-align:center;margin-bottom:1.5rem">Care that meets you</h2>
    <div class="grid grid-3">${serviceCards(content)}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <h2 style="text-align:center;margin-bottom:1.5rem">From families we've walked with</h2>
    <div class="grid grid-3">${testimonialCards(content)}</div>
  </div></section>
  <section class="section"><div class="wrap"><h2 style="margin-bottom:1rem">Gentle answers</h2>${faqBlock(content)}</div></section>
  <section class="cta"><div class="wrap">
    <h2>Let's talk about your birth</h2>
    <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Book a free consult</a>
  </div></section>
</main>
${footer(content)}
</body></html>`;
}

function shellBoldMinimal(system, content) {
  const css = `
.btn{border-radius:var(--radius)!important;text-transform:uppercase;letter-spacing:.06em;font-size:.85rem}
.nav{border-bottom:1px solid var(--line)}
.nav-inner{display:flex;justify-content:space-between;align-items:center;padding:1.1rem 0}
.hero{padding:5rem 0 4rem;border-bottom:1px solid var(--line)}
.hero h1{font-size:clamp(3rem,8vw,6rem);text-transform:uppercase;letter-spacing:-.02em;max-width:12ch}
.hero .lead{margin-top:1.5rem;max-width:28ch;font-size:1.15rem;color:var(--muted)}
.hero-actions{margin-top:2rem;display:flex;gap:.75rem;flex-wrap:wrap}
.section{padding:4.5rem 0;border-bottom:1px solid var(--line)}
.section h2{text-transform:uppercase;letter-spacing:.04em;font-size:clamp(1.4rem,3vw,2rem);margin-bottom:1.75rem}
.list{display:grid;gap:0}
.list article{padding:1.25rem 0;border-top:1px solid var(--line);display:grid;gap:.5rem}
@media(min-width:800px){.list article{grid-template-columns:180px 1fr auto;align-items:center}}
.list h3{text-transform:uppercase;letter-spacing:.05em;font-size:1rem}
.mega{font-size:clamp(2.5rem,7vw,5rem);text-transform:uppercase;line-height:.95}
.cta{padding:5rem 0;background:var(--text);color:#fff}
.cta .btn{background:#fff;color:#111}
.site-footer{padding:2.5rem 0 5rem}
details{border-top:1px solid var(--line);padding:1rem 0}
summary{cursor:pointer;text-transform:uppercase;letter-spacing:.04em;font-weight:700}
.hero-side{margin-top:2.5rem}
.hero-media,.hero-fallback{width:100%;max-width:520px;aspect-ratio:5/4;object-fit:cover;border:1px solid var(--line);background:var(--card)}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="bold-minimal">
<header class="nav"><div class="wrap nav-inner">
  <strong style="text-transform:uppercase;letter-spacing:.08em">${escapeHtml(content.name)}</strong>
  <a class="btn" href="${escapeHtml(content.booking)}">Book</a>
</div></header>
<main>
  <section class="wrap hero">
    ${proofLine(content)}
    <h1 style="margin-top:1rem">${escapeHtml(content.tagline)}</h1>
    <p class="lead">${escapeHtml(content.about.slice(0, 160))}</p>
    <div class="hero-actions">
      <a class="btn" href="${escapeHtml(content.booking)}">Book free call</a>
      <a class="btn btn-ghost" href="#services">Services</a>
    </div>
    <div class="hero-side">${heroMedia(content)}</div>
  </section>
  <section class="wrap section">
    <h2>The friction</h2>
    <div class="list">${content.pains.map((p, i) => `<article><span class="muted">0${i + 1}</span><p>${escapeHtml(p)}</p></article>`).join('')}</div>
  </section>
  <section id="services" class="wrap section">
    <h2>What we do</h2>
    <div class="list">${content.services.map((s) => `<article><h3>${escapeHtml(s)}</h3><p class="muted">Details confirmed in consult.</p><a class="btn btn-ghost" href="${escapeHtml(content.booking)}">Book</a></article>`).join('')}</div>
  </section>
  <section class="wrap section">
    <h2>Proof</h2>
    <div class="list">${content.testimonials.length
      ? content.testimonials.map((t) => `<article><p>“${escapeHtml(String(t.text || '').slice(0, 220))}”</p><p class="muted">— ${escapeHtml(t.author || 'Client')}</p></article>`).join('')
      : '<article><p class="muted">Verified client quotes appear here when available — we do not invent them.</p></article>'}</div>
  </section>
  <section class="wrap section"><h2>FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><div class="wrap">
    <p class="mega">Book the call.</p>
    <a class="btn" style="margin-top:1.5rem" href="${escapeHtml(content.booking)}">Start now</a>
  </div></section>
</main>
${footer(content)}
</body></html>`;
}

function shellDarkAura(system, content) {
  const css = `
body{background:#0A0A0F;color:var(--text)}
.glow{position:fixed;inset:auto auto 20% -10%;width:420px;height:420px;background:radial-gradient(circle,color-mix(in srgb,var(--primary) 35%,transparent),transparent 70%);pointer-events:none;filter:blur(10px)}
.glow-2{position:fixed;top:-10%;right:-5%;width:360px;height:360px;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 30%,transparent),transparent 70%);pointer-events:none}
.nav{position:sticky;top:0;z-index:20;background:rgba(10,10,15,.8);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.nav-inner{display:flex;justify-content:space-between;align-items:center;padding:1rem 0}
.btn{border-radius:999px!important;box-shadow:0 0 30px color-mix(in srgb,var(--primary) 35%,transparent)}
.hero{padding:4.5rem 0 3rem;position:relative}
.hero h1{font-weight:300;max-width:16ch;font-size:clamp(2.6rem,6vw,4.8rem)}
.hero .lead{margin-top:1.25rem;max-width:40ch;color:var(--muted)}
.actions{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.75rem}
.hero-media,.hero-fallback{margin-top:2.5rem;width:100%;aspect-ratio:21/9;object-fit:cover;border-radius:var(--radius);border:1px solid var(--line);box-shadow:var(--shadow);background:linear-gradient(120deg,#13131A,color-mix(in srgb,var(--primary) 25%,#13131A))}
.section{padding:3.5rem 0}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:rgba(19,19,26,.85);border:1px solid var(--line);border-radius:var(--radius);padding:1.35rem;backdrop-filter:blur(10px);box-shadow:var(--shadow)}
.card h3{margin-bottom:.45rem}
.cta{margin:2rem 0 0;padding:3.5rem;border-radius:var(--radius);border:1px solid var(--line);background:linear-gradient(135deg,rgba(94,207,142,.12),rgba(96,165,250,.08));text-align:center}
.site-footer{padding:2.5rem 0 5rem;border-top:1px solid var(--line)}
details{border:1px solid var(--line);border-radius:var(--radius);padding:1rem;margin-bottom:.75rem;background:rgba(19,19,26,.7)}
summary{cursor:pointer;font-weight:600}
.sticky-cta{background:rgba(10,10,15,.92);border-color:var(--line)}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="dark-aura" data-theme="dark">
<div class="glow"></div><div class="glow-2"></div>
<header class="nav"><div class="wrap nav-inner">
  <strong>${escapeHtml(content.name)}</strong>
  <a class="btn" href="${escapeHtml(content.booking)}">Book free call</a>
</div></header>
<main class="wrap">
  <section class="hero">
    ${proofLine(content)}
    <h1 style="margin-top:.8rem">${escapeHtml(content.tagline)}</h1>
    <p class="lead">${escapeHtml(content.about.slice(0, 210))}</p>
    <div class="actions">
      <a class="btn" href="${escapeHtml(content.booking)}">Book consultation</a>
      <a class="btn btn-ghost" href="#services">View services</a>
    </div>
    ${heroMedia(content)}
  </section>
  <section class="section">
    <h2 style="margin-bottom:1.25rem">Where people get stuck</h2>
    <div class="grid grid-3">${painCards(content)}</div>
  </section>
  <section id="services" class="section">
    <h2 style="margin-bottom:1.25rem">Care menu</h2>
    <div class="grid grid-3">${serviceCards(content)}</div>
  </section>
  <section class="section">
    <h2 style="margin-bottom:1.25rem">Signal from clients</h2>
    <div class="grid grid-3">${testimonialCards(content)}</div>
  </section>
  <section class="section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta">
    <h2>Step into the next conversation</h2>
    <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Book now</a>
  </section>
</main>
${footer(content)}
</body></html>`;
}

function shellCoastal(system, content) {
  const css = `
.nav{padding:1rem 0}
.nav-inner{display:flex;justify-content:space-between;align-items:center}
.hero{display:grid;gap:2rem;padding:2rem 0 3rem}
@media(min-width:900px){.hero{grid-template-columns:1fr 1fr;align-items:stretch;min-height:70vh}}
.hero-panel{background:linear-gradient(160deg,color-mix(in srgb,var(--primary) 90%,#000),var(--primary));color:#fff;border-radius:var(--radius);padding:2.5rem;display:flex;flex-direction:column;justify-content:flex-end;min-height:320px}
.hero-panel h1{color:#fff}
.hero-copy{display:flex;flex-direction:column;justify-content:center}
.hero-media,.hero-fallback{width:100%;height:100%;min-height:280px;object-fit:cover;border-radius:var(--radius);background:linear-gradient(180deg,#dcecf2,var(--bg))}
.section{padding:3.5rem 0}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1.25rem;box-shadow:var(--shadow)}
.cta{background:var(--card);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:3.5rem 0;text-align:center}
.site-footer{padding:2.5rem 0 5rem}
details{border-bottom:1px solid var(--line);padding:1rem 0}
summary{cursor:pointer;font-weight:600}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="coastal-light">
<header class="nav"><div class="wrap nav-inner">
  <strong>${escapeHtml(content.name)}</strong>
  <a class="btn" href="${escapeHtml(content.booking)}">Book free call</a>
</div></header>
<main>
  <section class="wrap hero">
    <div class="hero-copy">
      ${proofLine(content)}
      <h1 style="margin-top:.75rem">${escapeHtml(content.tagline)}</h1>
      <p class="muted" style="margin-top:1rem;max-width:36ch">${escapeHtml(content.about.slice(0, 200))}</p>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.5rem">
        <a class="btn" href="${escapeHtml(content.booking)}">Book consultation</a>
        <a class="btn btn-ghost" href="#services">Services</a>
      </div>
    </div>
    <div class="hero-panel">
      ${content.hero ? `<img class="hero-media" style="margin:0 0 1rem;min-height:180px" src="${escapeHtml(content.hero)}" alt=""/>` : ''}
      <p style="opacity:.9">Airy, clear, and ready when you are.</p>
    </div>
  </section>
  <section class="wrap section"><h2 style="margin-bottom:1.25rem">What's getting in the way</h2><div class="grid grid-3">${painCards(content)}</div></section>
  <section id="services" class="wrap section"><h2 style="margin-bottom:1.25rem">Services</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="wrap section"><h2 style="margin-bottom:1.25rem">Client voices</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="wrap section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><div class="wrap"><h2>Take the next clear step</h2><a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Book now</a></div></section>
</main>
${footer(content)}
</body></html>`;
}

function shellSwiss(system, content) {
  const css = `
.btn{border-radius:0!important}
.nav{border-bottom:2px solid var(--text)}
.nav-inner{display:grid;grid-template-columns:1fr auto;gap:1rem;padding:1rem 0;align-items:center}
.hero{display:grid;gap:0;border-bottom:2px solid var(--text)}
@media(min-width:900px){.hero{grid-template-columns:1.2fr .8fr}}
.hero-copy{padding:3rem 0;border-right:0}
@media(min-width:900px){.hero-copy{padding:4rem 2rem 4rem 0;border-right:1px solid var(--line)}}
.hero h1{font-size:clamp(2.4rem,5vw,4rem);font-weight:800;letter-spacing:-.03em}
.num{color:var(--accent);font-weight:800}
.section{padding:0}
.row{display:grid;border-bottom:1px solid var(--line)}
@media(min-width:800px){.row{grid-template-columns:160px 1fr}}
.row > :first-child{padding:1.25rem 0;font-weight:800;border-right:1px solid var(--line)}
.row > :last-child{padding:1.25rem}
.cta{background:var(--text);color:#fff;padding:3rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center}
.cta .btn{background:var(--accent);color:#fff}
.site-footer{padding:2rem 0 5rem}
.hero-media,.hero-fallback{min-height:260px;object-fit:cover;background:var(--line)}
details{border-bottom:1px solid var(--line);padding:1rem 0}
summary{cursor:pointer;font-weight:700}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="swiss-grid">
<header class="nav"><div class="wrap nav-inner">
  <strong>${escapeHtml(content.name)}</strong>
  <a class="btn" href="${escapeHtml(content.booking)}">Book</a>
</div></header>
<main class="wrap">
  <section class="hero">
    <div class="hero-copy">
      ${proofLine(content)}
      <h1 style="margin-top:.75rem">${escapeHtml(content.tagline)}</h1>
      <p class="muted" style="margin-top:1rem;max-width:40ch">${escapeHtml(content.about.slice(0, 180))}</p>
      <a class="btn" style="margin-top:1.5rem" href="${escapeHtml(content.booking)}">Book free consult</a>
    </div>
    ${heroMedia(content)}
  </section>
  <section class="section">
    ${content.pains.map((p, i) => `<div class="row"><div><span class="num">0${i + 1}</span></div><div>${escapeHtml(p)}</div></div>`).join('')}
  </section>
  <section id="services" class="section">
    ${content.services.map((s, i) => `<div class="row"><div>S${i + 1}</div><div><strong>${escapeHtml(s)}</strong><p class="muted" style="margin-top:.35rem">Confirmed in consult.</p></div></div>`).join('')}
  </section>
  <section class="section">
    ${content.testimonials.length
      ? content.testimonials.map((t) => `<div class="row"><div>QUOTE</div><div><p>“${escapeHtml(String(t.text || '').slice(0, 220))}”</p><p class="muted" style="margin-top:.5rem">— ${escapeHtml(t.author || 'Client')}</p></div></div>`).join('')
      : '<div class="row"><div>QUOTE</div><div class="muted">Verified client quotes appear when available.</div></div>'}
  </section>
  <section class="section" style="padding:1rem 0 2rem">${faqBlock(content)}</section>
  <section class="cta"><h2>Next action</h2><a class="btn" href="${escapeHtml(content.booking)}">Book now</a></section>
</main>
${footer(content)}
</body></html>`;
}

function shellBento(system, content) {
  const css = `
.nav{padding:1rem 0}
.nav-inner{display:flex;justify-content:space-between;align-items:center}
.bento{display:grid;gap:1rem;padding:1rem 0 2rem;grid-template-columns:1fr}
@media(min-width:900px){.bento{grid-template-columns:1.4fr 1fr 1fr;grid-template-rows:auto auto}}
.tile{background:var(--card);border-radius:var(--radius);padding:1.5rem;box-shadow:var(--shadow);border:1px solid var(--line)}
.tile-hero{background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 85%,#000),color-mix(in srgb,var(--accent) 70%,#000));color:#fff}
@media(min-width:900px){.tile-hero{grid-row:span 2;min-height:520px;display:flex;flex-direction:column;justify-content:flex-end}}
.tile-hero h1{color:#fff;font-size:clamp(2rem,4vw,3.2rem)}
.hero-media,.hero-fallback{border-radius:calc(var(--radius) - 4px);aspect-ratio:16/10;object-fit:cover;margin-bottom:1rem;background:rgba(255,255,255,.15)}
.section{padding:2.5rem 0}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);border-radius:var(--radius);padding:1.25rem;box-shadow:var(--shadow)}
.cta{text-align:center;padding:3rem;border-radius:var(--radius);background:var(--primary);color:var(--button-text);margin:1rem 0 2rem}
.cta .btn{background:#fff;color:#111}
.site-footer{padding:2rem 0 5rem}
details{background:var(--card);border-radius:var(--radius);padding:1rem;margin-bottom:.75rem}
summary{cursor:pointer;font-weight:600}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="gradient-energy">
<header class="nav"><div class="wrap nav-inner">
  <strong>${escapeHtml(content.name)}</strong>
  <a class="btn" href="${escapeHtml(content.booking)}">Book</a>
</div></header>
<main class="wrap">
  <section class="bento">
    <article class="tile tile-hero">
      ${content.hero ? `<img class="hero-media" src="${escapeHtml(content.hero)}" alt=""/>` : '<div class="hero-fallback"></div>'}
      <p class="eyebrow" style="color:rgba(255,255,255,.75)">${escapeHtml(content.industry)}${content.location ? ` · ${escapeHtml(content.location)}` : ''}</p>
      <h1 style="margin-top:.5rem">${escapeHtml(content.tagline)}</h1>
      <a class="btn" style="margin-top:1.25rem;background:#fff;color:#111;width:fit-content" href="${escapeHtml(content.booking)}">Book free call</a>
    </article>
    <article class="tile"><h3>Why people stall</h3><p class="muted" style="margin-top:.75rem">${escapeHtml(content.pains[0] || '')}</p></article>
    <article class="tile"><h3>What changes</h3><p class="muted" style="margin-top:.75rem">${escapeHtml(content.about.slice(0, 140))}</p></article>
  </section>
  <section id="services" class="section"><h2 style="margin-bottom:1rem">Services</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1rem">Proof</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><h2>Ready?</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book now</a></section>
</main>
${footer(content)}
</body></html>`;
}

const LAYOUT_RENDERERS = {
  'editorial-luxe': shellEditorialLuxe,
  'modern-clinical': shellModernClinical,
  'organic-warm': shellOrganicWarm,
  'bold-minimal': shellBoldMinimal,
  'dark-aura': shellDarkAura,
  'coastal-light': shellCoastal,
  'swiss-grid': shellSwiss,
  'gradient-energy': shellBento,
  'soft-pastel': shellOrganicWarm,
  'retro-warm': shellOrganicWarm,
  'local-trust': shellModernClinical,
  'artisan-heritage': shellEditorialLuxe,
  'urban-gold': shellBoldMinimal,
  'refined-brutalist': shellSwiss,
  'agentic-conversational': shellBento,
};

/**
 * Render a distinct hand-authored layout for a design system.
 * Returns null only if system is missing.
 */
export function renderDesignSystemLayout(system, info = {}, posPartner = null) {
  if (!system?.id) return null;
  const content = normalizeLayoutContent(info, posPartner);
  const renderer = LAYOUT_RENDERERS[system.id] || shellEditorialLuxe;
  return renderer(system, content);
}

export function layoutShellIdForDesignSystem(systemId) {
  const sys = String(systemId || '');
  if (LAYOUT_RENDERERS[sys]) {
    const shared = {
      'soft-pastel': 'organic-warm',
      'retro-warm': 'organic-warm',
      'local-trust': 'modern-clinical',
      'artisan-heritage': 'editorial-luxe',
      'urban-gold': 'bold-minimal',
      'refined-brutalist': 'swiss-grid',
      'agentic-conversational': 'gradient-energy',
    };
    return shared[sys] || sys;
  }
  return 'editorial-luxe';
}
