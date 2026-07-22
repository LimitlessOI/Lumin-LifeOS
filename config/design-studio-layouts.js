/**
 * SYNOPSIS: Hand-authored layout shells per design system — real structural
 * differentiation for Site Builder variants (not AI reskins of one funnel).
 * Sales shells apply visitor-state multi-path doctrine to EVERY industry.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { getDesignSystemCss, getDesignSystemFontLinks } from './design-studio.js';
import { matchIndustrySalesPack, buildProviderWhyBullets, practiceOffersEnergyWellness, buildWellnessWhyBullets } from './site-builder-industry-sales.js';
import { resolveSalesBrief } from './site-builder-sales-doctrine.js';

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
  const igPosts = (info.assetData?.social?.instagram?.posts || [])
    .map((p) => p.displayUrl || p.url)
    .filter(Boolean);
  const social = (info.assetData?.images?.social || []).map((i) => i.url || i);
  const rawHeroes = [
    ...igPosts,
    ...social,
    ...(info.heroImages || []),
    ...(info.assetData?.images?.hero || []),
    ...(info.assetData?.images?.product || []),
    ...(info.assetData?.images?.team || []),
  ];
  let heroes = uniqUrls(rawHeroes).filter((u) => u !== logo && !/\blogo\b|favicon/i.test(u));
  const owned = heroes.filter((u) => !/replicate\.delivery|oaidalle/i.test(u));
  if (owned.length) heroes = owned;
  const hero = heroes[0] || '';
  const partner = posPartner || { name: 'booking', url: '#book' };
  const booking = info.bookingUrl || partner.url || '#book';
  const salesPack = matchIndustrySalesPack(info);
  const salesBrief = resolveSalesBrief(info, salesPack);
  const services = (info.services || ['Core service', 'Consult', 'Follow-up']).slice(0, 6);
  const pains = (info.painPoints || salesBrief?.fears || [
    'Hard to tell who is actually credible',
    'Website feels dated and hard to trust',
    'Booking or buying takes too many steps',
  ]).slice(0, 4);
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
    || `${info.businessName || 'This business'} delivers clear outcomes with a simple next step to book.`;
  const igHandle = info.assetData?.social?.instagram?.username
    || (String(info.instagramUrl || '').match(/instagram\.com\/([A-Za-z0-9_.]+)/)?.[1])
    || '';
  const secondary = salesBrief?.wellnessSale || salesBrief?.secondarySale || null;
  const showSecondaryPath = Boolean(
    secondary?.anchor && (
      practiceOffersEnergyWellness(info, salesPack)
      || salesBrief?.secondarySale
    ),
  );

  return {
    name: info.businessName || 'Your Business',
    tagline: info.tagline || 'Clear outcomes — with a clear next step',
    industry: info.industry || info.category || 'local business',
    location: info.location || '',
    phone: info.phone || info.assetData?.businessDetails?.phone || '',
    address: info.address || info.assetData?.businessDetails?.address || '',
    logo,
    hero,
    heroes,
    gallery: heroes.slice(0, 6),
    booking,
    searchUrl: info.searchUrl || info.idxUrl || info.listingSearchUrl || booking,
    partnerName: partner.name || 'booking',
    services,
    pains,
    testimonials,
    faq,
    about,
    rating: info.verifiedData?.rating || info.rating || null,
    reviewCount: info.verifiedData?.reviewCount || info.reviewCount || null,
    igHandle,
    photoSource: heroes.length
      ? (/cdninstagram|fbcdn|scontent/.test(hero) ? 'instagram' : (/replicate\.delivery/.test(hero) ? 'generated' : 'website'))
      : 'none',
    salesPack,
    salesBrief,
    whySeek: salesBrief?.whySeek || [],
    benefits: salesBrief?.benefits || [],
    reluctantBuyer: salesBrief?.reluctantBuyer || [],
    providerWhy: buildProviderWhyBullets(info, salesPack),
    showWellnessPath: showSecondaryPath,
    showSecondaryPath,
    secondaryOffer: secondary,
    wellnessWhy: buildWellnessWhyBullets(info, salesPack),
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
.photo-strip{display:grid;grid-template-columns:repeat(2,1fr);gap:.65rem;margin:1.5rem 0}
@media(min-width:800px){.photo-strip{grid-template-columns:repeat(4,1fr)}}
.photo-strip img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:calc(var(--radius) - 2px);background:var(--line)}
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
  return content.services.map((s, i) => {
    const photo = content.gallery?.[i + 1] || content.gallery?.[i] || '';
    return `
    <article class="${className}">
      ${photo ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:calc(var(--radius) - 4px);margin-bottom:.85rem"/>` : ''}
      <h3>${escapeHtml(s)}</h3>
      <p class="muted">Real care details confirmed in consult — book to see if we are the right fit.</p>
      <a class="btn" href="${escapeHtml(content.booking)}" style="margin-top:1rem">Book</a>
    </article>`;
  }).join('');
}

function photoStrip(content) {
  const shots = (content.gallery || []).slice(0, 4);
  if (!shots.length) return '';
  return `<div class="photo-strip" aria-label="Photos from ${escapeHtml(content.name)}">${shots.map((u) => `<img src="${escapeHtml(u)}" alt="" loading="lazy"/>`).join('')}</div>`;
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
  ${photoStrip(content)}
  <section id="services" class="section"><h2 style="margin-bottom:1rem">Services</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1rem">Proof</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><h2>Ready?</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book now</a></section>
</main>
${footer(content)}
</body></html>`;
}

function shellSoftPastel(system, content) {
  const css = `
.nav{padding:1.1rem 0}
.nav-inner{display:flex;justify-content:space-between;align-items:center}
.hero{padding:3rem 0 2rem;text-align:center;background:radial-gradient(circle at 50% 0%,color-mix(in srgb,var(--primary) 18%,transparent),transparent 55%)}
.hero h1{max-width:14ch;margin:1rem auto 0}
.pill-row{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin-top:1.25rem}
.pill{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:.4rem .9rem;font-size:.85rem;color:var(--muted)}
.hero-media,.hero-fallback{margin:2rem auto 0;width:min(640px,100%);aspect-ratio:1;border-radius:50%;object-fit:cover;box-shadow:var(--shadow);background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 30%,white),var(--card))}
.section{padding:3rem 0}
.stack{display:grid;gap:1rem;max-width:720px;margin:0 auto}
.card{background:var(--card);border-radius:var(--radius);padding:1.35rem;box-shadow:var(--shadow);border:1px solid var(--line)}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.cta{text-align:center;padding:3.5rem 1rem;background:color-mix(in srgb,var(--accent) 16%,var(--bg))}
.site-footer{padding:2.5rem 0 5rem}
details{background:var(--card);border-radius:var(--radius);padding:1rem;margin-bottom:.7rem}
summary{cursor:pointer;font-weight:600}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="soft-pastel">
<header class="nav"><div class="wrap nav-inner"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Book gently</a></div></header>
<main>
  <section class="wrap hero">
    ${proofLine(content)}
    <h1>${escapeHtml(content.tagline)}</h1>
    <div class="pill-row"><span class="pill">Calm first visit</span><span class="pill">No pressure</span>${content.igHandle ? `<span class="pill">@${escapeHtml(content.igHandle)}</span>` : ''}</div>
    ${heroMedia(content)}
  </section>
  <section class="wrap section"><div class="stack">${content.pains.map((p) => `<article class="card"><p>${escapeHtml(p)}</p></article>`).join('')}</div></section>
  <section id="services" class="wrap section"><h2 style="text-align:center;margin-bottom:1.25rem">Care offerings</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  ${photoStrip(content) ? `<section class="wrap">${photoStrip(content)}</section>` : ''}
  <section class="wrap section"><h2 style="text-align:center;margin-bottom:1.25rem">Kind words</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="wrap section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><h2>When you're ready</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book a free consult</a></section>
</main>
${footer(content)}
</body></html>`;
}

function shellRetroWarm(system, content) {
  const css = `
.nav{padding:1rem 0;border-bottom:3px solid var(--primary)}
.nav-inner{display:flex;justify-content:space-between;align-items:center}
.hero{display:grid;gap:1.5rem;padding:2.5rem 0}
@media(min-width:900px){.hero{grid-template-columns:.9fr 1.1fr;align-items:center}}
.hero h1{font-size:clamp(2.6rem,6vw,4.6rem)}
.arch{border-radius:999px 999px 24px 24px;overflow:hidden;border:4px solid var(--accent);box-shadow:var(--shadow)}
.hero-media,.hero-fallback{width:100%;aspect-ratio:4/5;object-fit:cover;background:color-mix(in srgb,var(--accent) 30%,var(--bg))}
.section{padding:3rem 0}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}.grid-3 article:nth-child(2){transform:translateY(1rem)}}
.card{background:var(--card);padding:1.3rem;border-radius:var(--radius);border:2px solid var(--line);box-shadow:var(--shadow)}
.cta{background:var(--primary);color:#fff;padding:3.5rem 1rem;text-align:center;border-top:6px solid var(--accent)}
.cta .btn{background:var(--accent);color:#411}
.site-footer{padding:2.5rem 0 5rem}
details{border:2px solid var(--line);border-radius:var(--radius);padding:1rem;margin-bottom:.75rem;background:var(--card)}
summary{cursor:pointer;font-weight:700}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="retro-warm">
<header class="nav"><div class="wrap nav-inner"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Book now</a></div></header>
<main>
  <section class="wrap hero">
    <div class="arch">${heroMedia(content)}</div>
    <div>
      ${proofLine(content)}
      <h1 style="margin-top:.6rem">${escapeHtml(content.tagline)}</h1>
      <p class="muted" style="margin-top:1rem;max-width:34ch">${escapeHtml(content.about.slice(0, 190))}</p>
      <a class="btn" style="margin-top:1.4rem" href="${escapeHtml(content.booking)}">Book free call</a>
    </div>
  </section>
  <section class="wrap section"><h2 style="margin-bottom:1.2rem">Sound familiar?</h2><div class="grid grid-3">${painCards(content)}</div></section>
  <section id="services" class="wrap section"><h2 style="margin-bottom:1.2rem">The menu</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="wrap">${photoStrip(content)}</section>
  <section class="wrap section"><h2 style="margin-bottom:1.2rem">Stories</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="wrap section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><h2>Come as you are</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book</a></section>
</main>
${footer(content)}
</body></html>`;
}

function shellLocalTrust(system, content) {
  const css = `
.topbar{background:var(--primary);color:var(--button-text);padding:.55rem 0;font-size:.9rem}
.nav{border-bottom:1px solid var(--line);background:var(--card)}
.nav-inner{display:flex;justify-content:space-between;align-items:center;padding:1rem 0}
.hero{padding:2.5rem 0;display:grid;gap:1.5rem}
@media(min-width:900px){.hero{grid-template-columns:1.2fr .8fr}}
.trust{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0}
.trust span{background:color-mix(in srgb,var(--primary) 12%,var(--bg));border:1px solid var(--line);border-radius:8px;padding:.35rem .7rem;font-size:.82rem}
.hero-media,.hero-fallback{border-radius:var(--radius);aspect-ratio:4/3;object-fit:cover;border:1px solid var(--line);background:var(--card)}
.phone{font-size:1.4rem;font-weight:700;margin-top:1rem}
.section{padding:2.75rem 0}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1.2rem;box-shadow:var(--shadow)}
.cta{background:var(--card);border-block:1px solid var(--line);padding:3rem 0;text-align:center}
.site-footer{padding:2.5rem 0 5rem}
details{border:1px solid var(--line);border-radius:var(--radius);padding:1rem;margin-bottom:.65rem;background:var(--card)}
summary{cursor:pointer;font-weight:600}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="local-trust">
<div class="topbar"><div class="wrap">${escapeHtml(content.location || 'Local care')} · Serving families nearby${content.phone ? ` · ${escapeHtml(content.phone)}` : ''}</div></div>
<header class="nav"><div class="wrap nav-inner"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Book free consult</a></div></header>
<main>
  <section class="wrap hero">
    <div>
      ${proofLine(content)}
      <h1 style="margin-top:.5rem">${escapeHtml(content.tagline)}</h1>
      <div class="trust"><span>Local & reachable</span><span>Clear next step</span><span>Real photos from their work</span></div>
      <p class="muted">${escapeHtml(content.about.slice(0, 200))}</p>
      ${content.phone ? `<p class="phone"><a href="tel:${escapeHtml(content.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(content.phone)}</a></p>` : ''}
      <a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book online</a>
    </div>
    ${heroMedia(content)}
  </section>
  <section class="wrap">${photoStrip(content)}</section>
  <section class="wrap section"><h2 style="margin-bottom:1rem">Common hang-ups</h2><div class="grid grid-3">${painCards(content)}</div></section>
  <section id="services" class="wrap section"><h2 style="margin-bottom:1rem">Services</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="wrap section"><h2 style="margin-bottom:1rem">Neighbors' words</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="wrap section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><h2>Talk to a real person</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book now</a></section>
</main>
${footer(content)}
</body></html>`;
}

function shellArtisanHeritage(system, content) {
  const css = `
.nav{padding:1.25rem 0;border-bottom:1px solid var(--line)}
.nav-inner{display:flex;justify-content:space-between;align-items:center}
.hero{padding:3.5rem 0 2rem}
.hero h1{max-width:16ch;font-size:clamp(2.4rem,5vw,4rem)}
.collage{display:grid;grid-template-columns:1.2fr 1fr;gap:.75rem;margin-top:2rem}
.collage img,.hero-fallback{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:4px;background:var(--line)}
.collage img:first-child{aspect-ratio:3/4}
.section{padding:3.25rem 0;border-top:1px solid var(--line)}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);padding:1.25rem;border-top:2px solid var(--accent)}
.cta{padding:4rem 0;text-align:center;background:var(--text);color:#fff}
.cta .btn{background:var(--accent);color:#111}
.site-footer{padding:2.5rem 0 5rem}
details{border-bottom:1px solid var(--line);padding:1rem 0}
summary{cursor:pointer;font-weight:600}
`;
  const g = content.gallery || [];
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="artisan-heritage">
<header class="nav"><div class="wrap nav-inner"><strong style="font-family:var(--font-display)">${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Book</a></div></header>
<main class="wrap">
  <section class="hero">
    ${proofLine(content)}
    <h1 style="margin-top:.75rem">${escapeHtml(content.tagline)}</h1>
    <p class="muted" style="margin-top:1rem;max-width:42ch">${escapeHtml(content.about.slice(0, 210))}</p>
    <div class="collage">
      ${g[0] ? `<img src="${escapeHtml(g[0])}" alt=""/>` : '<div class="hero-fallback"></div>'}
      ${g[1] ? `<img src="${escapeHtml(g[1])}" alt=""/>` : (content.hero ? `<img src="${escapeHtml(content.hero)}" alt=""/>` : '<div class="hero-fallback"></div>')}
    </div>
  </section>
  <section class="section"><h2 style="margin-bottom:1.2rem">The friction</h2><div class="grid grid-3">${painCards(content)}</div></section>
  <section id="services" class="section"><h2 style="margin-bottom:1.2rem">Craft of care</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1.2rem">From the work</h2>${photoStrip(content)}</section>
  <section class="section"><h2 style="margin-bottom:1.2rem">Voices</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
</main>
<section class="cta"><div class="wrap"><h2>Begin the conversation</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book free consult</a></div></section>
${footer(content)}
</body></html>`;
}

function shellUrbanGold(system, content) {
  const css = `
body{background:#0E0E0E;color:#F5F0E6}
.nav{border-bottom:1px solid #2A2A2A;background:#0E0E0E}
.nav-inner{display:flex;justify-content:space-between;align-items:center;padding:1rem 0}
.btn{background:var(--accent)!important;color:#111!important;border-radius:2px!important}
.hero{padding:4rem 0;display:grid;gap:2rem}
@media(min-width:900px){.hero{grid-template-columns:1fr 1fr;align-items:end}}
.hero h1{font-size:clamp(2.8rem,7vw,5rem);letter-spacing:-.03em}
.rule-gold{height:2px;background:var(--accent);width:4rem;margin:1rem 0}
.hero-media,.hero-fallback{width:100%;aspect-ratio:5/6;object-fit:cover;border:1px solid #2A2A2A;background:#1A1A1A}
.section{padding:3rem 0;border-top:1px solid #2A2A2A}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:#161616;border:1px solid #2A2A2A;padding:1.25rem}
.cta{padding:4rem 0;text-align:center;background:#161616;border-top:1px solid var(--accent)}
.site-footer{padding:2.5rem 0 5rem;color:#A8A090}
.muted{color:#A8A090!important}
details{border:1px solid #2A2A2A;padding:1rem;margin-bottom:.7rem;background:#161616}
summary{cursor:pointer;font-weight:600}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="urban-gold" data-theme="dark">
<header class="nav"><div class="wrap nav-inner"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Reserve</a></div></header>
<main class="wrap">
  <section class="hero">
    <div>
      ${proofLine(content)}
      <div class="rule-gold"></div>
      <h1>${escapeHtml(content.tagline)}</h1>
      <p class="muted" style="margin-top:1rem;max-width:36ch">${escapeHtml(content.about.slice(0, 180))}</p>
      <a class="btn" style="margin-top:1.5rem" href="${escapeHtml(content.booking)}">Book consultation</a>
    </div>
    ${heroMedia(content)}
  </section>
  <section class="section"><h2 style="margin-bottom:1rem">Friction</h2><div class="grid grid-3">${painCards(content)}</div></section>
  <section id="services" class="section"><h2 style="margin-bottom:1rem">Offerings</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="section">${photoStrip(content)}</section>
  <section class="section"><h2 style="margin-bottom:1rem">Proof</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
</main>
<section class="cta"><h2>Private next step</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book</a></section>
${footer(content)}
</body></html>`;
}

function shellRefinedBrutalist(system, content) {
  const css = `
.btn{border-radius:0!important;border:2px solid var(--text)!important;background:var(--bg)!important;color:var(--text)!important;box-shadow:4px 4px 0 var(--text)!important}
.nav{border-bottom:3px solid var(--text)}
.nav-inner{display:flex;justify-content:space-between;padding:1rem 0;align-items:center}
.hero{padding:3rem 0;border-bottom:3px solid var(--text)}
.hero h1{font-size:clamp(3rem,8vw,6rem);line-height:.95;text-transform:uppercase}
.slab{display:grid;gap:0;border:3px solid var(--text);margin-top:2rem}
.slab > *{border-top:3px solid var(--text);padding:1rem}
.slab > *:first-child{border-top:0}
@media(min-width:800px){.slab{grid-template-columns:1.2fr 1fr}.slab > *:first-child{border-right:3px solid var(--text);border-top:0}.slab > *:last-child{border-top:0}}
.hero-media,.hero-fallback{width:100%;aspect-ratio:16/11;object-fit:cover;filter:contrast(1.05);background:var(--line)}
.section{padding:0}
.block{border-bottom:3px solid var(--text);padding:2rem 0}
.grid{display:grid;gap:0}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{border-right:3px solid var(--text);padding:1.25rem;min-height:160px}
.card:last-child{border-right:0}
.cta{background:var(--text);color:#fff;padding:3rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center}
.cta .btn{background:#fff!important;box-shadow:4px 4px 0 var(--accent)!important}
.site-footer{padding:2rem 0 5rem}
details{border-bottom:3px solid var(--text);padding:1rem 0}
summary{cursor:pointer;font-weight:800;text-transform:uppercase}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="refined-brutalist">
<header class="nav"><div class="wrap nav-inner"><strong style="text-transform:uppercase">${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Book</a></div></header>
<main class="wrap">
  <section class="hero">
    <p class="eyebrow">RAW / DIRECT / CLEAR</p>
    <h1>${escapeHtml(content.tagline)}</h1>
    <div class="slab">
      <div>${heroMedia(content)}</div>
      <div>
        <p>${escapeHtml(content.about.slice(0, 180))}</p>
        <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Book free call</a>
      </div>
    </div>
  </section>
  <section class="block"><h2 style="margin-bottom:1rem;text-transform:uppercase">Problems</h2><div class="grid grid-3">${painCards(content)}</div></section>
  <section id="services" class="block"><h2 style="margin-bottom:1rem;text-transform:uppercase">Services</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="block">${photoStrip(content)}</section>
  <section class="block"><h2 style="margin-bottom:1rem;text-transform:uppercase">Proof</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="block"><h2 style="margin-bottom:1rem;text-transform:uppercase">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><h2>DO THE THING</h2><a class="btn" href="${escapeHtml(content.booking)}">Book</a></section>
</main>
${footer(content)}
</body></html>`;
}

function shellAgentic(system, content) {
  const css = `
.nav{padding:1rem 0}
.nav-inner{display:flex;justify-content:space-between;align-items:center}
.hero{display:grid;gap:1.5rem;padding:2rem 0}
@media(min-width:900px){.hero{grid-template-columns:1.1fr .9fr}}
.chat{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1.25rem;box-shadow:var(--shadow);display:grid;gap:.75rem}
.bubble{background:color-mix(in srgb,var(--primary) 10%,var(--bg));border-radius:16px 16px 16px 4px;padding:.85rem 1rem}
.bubble.me{background:var(--primary);color:var(--button-text);border-radius:16px 16px 4px 16px;justify-self:end;max-width:85%}
.quick{display:flex;flex-wrap:wrap;gap:.5rem}
.quick a{border:1px solid var(--line);border-radius:999px;padding:.45rem .85rem;text-decoration:none;font-size:.85rem;background:var(--bg)}
.hero-media,.hero-fallback{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius);background:var(--line)}
.section{padding:2.75rem 0}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1.2rem;box-shadow:var(--shadow)}
.cta{text-align:center;padding:3rem;border-radius:var(--radius);background:color-mix(in srgb,var(--primary) 12%,var(--bg));border:1px solid var(--line)}
.site-footer{padding:2.5rem 0 5rem}
details{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1rem;margin-bottom:.65rem}
summary{cursor:pointer;font-weight:600}
`;
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="agentic-conversational">
<header class="nav"><div class="wrap nav-inner"><strong>${escapeHtml(content.name)}</strong><a class="btn" href="${escapeHtml(content.booking)}">Start chat → book</a></div></header>
<main class="wrap">
  <section class="hero">
    <div>
      ${proofLine(content)}
      <h1 style="margin-top:.6rem">${escapeHtml(content.tagline)}</h1>
      <div class="chat" style="margin-top:1.25rem">
        <div class="bubble">Hi — looking for ${escapeHtml(content.industry)} care${content.location ? ` in ${escapeHtml(content.location)}` : ''}.</div>
        <div class="bubble me">Perfect. Here's the fastest path: book a free consult and we'll confirm fit.</div>
        <div class="quick">
          <a href="${escapeHtml(content.booking)}">Book free consult</a>
          <a href="#services">See services</a>
          ${content.igHandle ? `<a href="https://instagram.com/${escapeHtml(content.igHandle)}" target="_blank" rel="noopener">Instagram</a>` : ''}
        </div>
      </div>
    </div>
    ${heroMedia(content)}
  </section>
  <section>${photoStrip(content)}</section>
  <section class="section"><h2 style="margin-bottom:1rem">What usually blocks people</h2><div class="grid grid-3">${painCards(content)}</div></section>
  <section id="services" class="section"><h2 style="margin-bottom:1rem">Services</h2><div class="grid grid-3">${serviceCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1rem">Proof</h2><div class="grid grid-3">${testimonialCards(content)}</div></section>
  <section class="section"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</section>
  <section class="cta"><h2>Your move</h2><a class="btn" style="margin-top:1rem" href="${escapeHtml(content.booking)}">Book now</a></section>
</main>
${footer(content)}
</body></html>`;
}
/**
 * Visitor-state multi-path sales shell — ALL industries.
 * Start from client unanswered questions; doors for searching / why provider / how to choose /
 * optional secondary. Midwifery + real estate packs specialize content; universal brief covers others.
 */
function shellVisitorStateSales(system, content) {
  const pack = content.salesBrief || content.salesPack || {};
  const cat = pack?.categorySale || {};
  const prov = pack?.providerSale || {};
  const search = pack?.searchPath || null;
  const secondary = content.secondaryOffer || pack?.wellnessSale || pack?.secondarySale || null;
  const showSearch = Boolean(search?.anchor);
  const showSecondary = content.showSecondaryPath && secondary?.anchor && !showSearch;
  // Prefer search as third door when pack defines it (e.g. real estate IDX); else wellness/secondary
  const third = showSearch ? search : (showSecondary ? secondary : null);
  const showThird = Boolean(third?.anchor);
  const provAnchor = prov.anchor || 'why-this-provider';
  const catAnchor = cat.anchor || 'why-category';
  const unanswered = pack?.unansweredClientQuestions || [];
  const lead = pack?.heroLead
    || `Already know what you need? Meet ${content.name}. Still exploring? Start with the questions buyers still have unanswered.`;
  const pathCols = showThird
    ? '@media(min-width:720px){.path-cta{grid-template-columns:repeat(3,1fr)}}'
    : '@media(min-width:560px){.path-cta{grid-template-columns:1fr 1fr}}';

  const searchBlock = showSearch ? `
  <section id="${escapeHtml(search.anchor)}" class="section">
    <div class="wrap">
      <p class="sale-label">${escapeHtml(search.eyebrow || 'If you are already looking')}</p>
      <h2>${escapeHtml(search.title || 'Search')}</h2>
      <p class="muted" style="margin-top:.75rem;max-width:52ch">${escapeHtml(search.blurb || 'Browse, then schedule when something fits.')}</p>
      <div class="bridge" style="margin-top:1.5rem">
        <a class="btn" href="${escapeHtml(content.searchUrl || content.booking)}">${escapeHtml(search.actionLabel || 'Open search')}</a>
        <a class="btn btn-ghost" href="${escapeHtml(content.booking)}">${escapeHtml(search.showingLabel || 'Schedule a showing')}</a>
        <a class="btn btn-ghost" href="#${escapeHtml(provAnchor)}">Why ${escapeHtml(content.name.split(/[—-]/)[0].trim())}?</a>
      </div>
    </div>
  </section>` : '';

  const secondaryBlock = (!showSearch && showSecondary) ? `
  <section id="${escapeHtml(secondary.anchor)}" class="section">
    <div class="wrap">
      <p class="sale-label">${escapeHtml(secondary.eyebrow || 'Another path')}</p>
      <h2>${escapeHtml(secondary.title || 'Another way to work together')}</h2>
      <p class="muted" style="margin-top:.75rem;max-width:52ch">${escapeHtml(secondary.blurb || 'Skip any part that is not for you.')}</p>
      <div class="skip-row" aria-label="Skip within this path">
        ${(secondary.jumpLinks || [
          { label: 'Why this offer', href: '#secondary-why' },
          { label: 'Why this provider', href: '#secondary-provider' },
          { label: 'Book', href: null },
        ]).map((j) => {
          const href = j.href || content.booking;
          return `<a href="${escapeHtml(href)}">${escapeHtml(j.label)}</a>`;
        }).join('')}
      </div>
      <div class="grid grid-2" style="margin-top:1.5rem">
        <article class="card" id="secondary-why">
          <h3>${escapeHtml(secondary.whyEnergy?.heading || 'Why this offer')}</h3>
          <p class="muted" style="margin-top:.5rem">${escapeHtml(secondary.whyEnergy?.body || secondary.blurb || '')}</p>
          <ul class="list">${(secondary.whyEnergy?.bullets || content.whySeek || []).slice(0, 4).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </article>
        <article class="card" id="sound-acutonics">
          <h3>${escapeHtml(secondary.modalities?.heading || 'How it works')}</h3>
          <p class="muted" style="margin-top:.5rem">${escapeHtml(secondary.modalities?.body || String(content.about || '').slice(0, 180))}</p>
          <ul class="list">${(secondary.modalities?.bullets || content.benefits || []).slice(0, 4).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </article>
      </div>
      <article class="card" id="secondary-provider" style="margin-top:1rem">
        <h3>${escapeHtml(secondary.whyPractitioner?.heading || `Why ${content.name}`)}</h3>
        <p class="muted" style="margin-top:.5rem">${escapeHtml(secondary.whyPractitioner?.body || content.about.slice(0, 220))}</p>
        <ul class="list">${(content.wellnessWhy?.length ? content.wellnessWhy : content.providerWhy || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        <div class="bridge">
          <a class="btn" href="${escapeHtml(content.booking)}">Book a consult</a>
          <a class="btn btn-ghost" href="#${escapeHtml(provAnchor)}">Also exploring the main offer?</a>
        </div>
      </article>
    </div>
  </section>` : '';

  const css = `
.nav{position:sticky;top:0;z-index:20;backdrop-filter:blur(12px);background:color-mix(in srgb,var(--bg) 90%,transparent);border-bottom:1px solid var(--line)}
.nav-inner{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem 0}
.brand{display:flex;align-items:center;gap:.7rem;font-family:var(--font-display);font-weight:700}
.brand img{width:42px;height:42px;border-radius:50%;object-fit:cover}
.hero{display:grid;gap:2rem;padding:3rem 0 2rem}
@media(min-width:900px){.hero{grid-template-columns:1.05fr .95fr;align-items:center;padding:4.5rem 0 3rem}}
.hero h1{max-width:14ch}
.lead{margin-top:1.1rem;font-size:1.12rem;color:var(--muted);max-width:44ch}
.path-cta{display:grid;gap:.75rem;margin-top:1.75rem}
${pathCols}
.path-cta a{display:flex;flex-direction:column;gap:.25rem;padding:1rem 1.15rem;border-radius:var(--radius);text-decoration:none;border:1px solid var(--line);background:var(--card);box-shadow:var(--shadow)}
.path-cta a.primary{background:var(--primary);color:var(--button-text);border-color:transparent}
.path-cta strong{font-size:1.05rem}
.path-cta span{font-size:.85rem;opacity:.85}
.book-row{margin-top:1rem}
.hero-media,.hero-fallback{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--radius);box-shadow:var(--shadow);background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--accent) 35%,white),var(--bg))}
.section{padding:3.25rem 0}
.section-alt{background:color-mix(in srgb,var(--accent) 10%,var(--bg));border-block:1px solid var(--line)}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-2{grid-template-columns:1fr 1fr}.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);border-radius:var(--radius);padding:1.35rem;box-shadow:var(--shadow);border:1px solid var(--line)}
.card h3{margin-bottom:.5rem;font-size:1.15rem}
.sale-label{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:.5rem}
.list{display:grid;gap:.65rem;margin-top:1rem}
.list li{list-style:none;padding-left:1.1rem;position:relative}
.list li:before{content:"";position:absolute;left:0;top:.55rem;width:.45rem;height:.45rem;border-radius:50%;background:var(--primary)}
.bridge{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;margin-top:1.5rem}
.skip-row{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 0}
.skip-row a{font-size:.85rem;padding:.4rem .75rem;border-radius:999px;border:1px solid var(--line);text-decoration:none;background:var(--card);color:var(--text)}
.cta{text-align:center;padding:3.75rem 1rem;background:linear-gradient(160deg,color-mix(in srgb,var(--primary) 88%,#000),var(--primary));color:#fff}
.cta .btn{background:#fff;color:var(--text)}
.site-footer{padding:2.5rem 0 5rem}
details{background:var(--card);border-radius:var(--radius);padding:1rem;margin-bottom:.7rem;box-shadow:var(--shadow)}
summary{cursor:pointer;font-weight:700}
`;
  const shortName = content.name.split(/[—-]/)[0].trim();
  const bookLabel = pack?.bookCta?.label || 'Schedule a consultation';
  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="visitor-state-sales" data-sales-source="${escapeHtml(pack.source || content.salesPack?.id || 'universal')}">
<header class="nav"><div class="wrap nav-inner">
  <div class="brand">${content.logo ? `<img src="${escapeHtml(content.logo)}" alt=""/>` : ''}<span>${escapeHtml(content.name)}</span></div>
  <a class="btn" href="${escapeHtml(content.booking)}">${escapeHtml(bookLabel)}</a>
</div></header>
<main>
  <section class="wrap hero">
    <div>
      ${proofLine(content)}
      <h1 style="margin-top:.7rem">${escapeHtml(content.tagline)}</h1>
      <p class="lead">${escapeHtml(lead)}</p>
      <div class="path-cta">
        <a class="primary" href="#${escapeHtml(provAnchor)}">
          <strong>${escapeHtml(prov.cta || `Why ${shortName}`)}</strong>
          <span>${escapeHtml(prov.blurb || `Already deciding who to hire? Meet ${content.name}.`)}</span>
        </a>
        <a href="#${escapeHtml(catAnchor)}">
          <strong>${escapeHtml(cat.cta || `How to choose`)}</strong>
          <span>${escapeHtml(cat.blurb || 'Still exploring — unanswered questions first')}</span>
        </a>
        ${showThird ? `<a href="#${escapeHtml(third.anchor)}">
          <strong>${escapeHtml(third.cta || 'Search / other')}</strong>
          <span>${escapeHtml(third.blurb || 'Another path — skip what is not for you')}</span>
        </a>` : ''}
      </div>
      <div class="book-row"><a class="btn btn-ghost" href="${escapeHtml(content.booking)}">Or ${escapeHtml(bookLabel.toLowerCase())} now</a></div>
    </div>
    ${heroMedia(content)}
  </section>

  <section id="${escapeHtml(provAnchor)}" class="section">
    <div class="wrap">
      <p class="sale-label">${escapeHtml(prov.eyebrow || 'If you are choosing who to hire')}</p>
      <h2>Why ${escapeHtml(content.name)}</h2>
      <p class="muted" style="margin-top:.75rem;max-width:52ch">${escapeHtml(content.about.slice(0, 240))}</p>
      <div class="grid grid-2" style="margin-top:1.75rem">
        <article class="card">
          <h3>Why hire ${escapeHtml(shortName)}</h3>
          <ul class="list">${(content.providerWhy || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">${escapeHtml(bookLabel)}</a>
        </article>
        <article class="card">
          <h3>Questions to ask in an interview</h3>
          <ul class="list">${(prov.promptQuestions || unanswered).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </article>
      </div>
      ${photoStrip(content)}
      <p class="muted" style="margin-top:1.25rem">Still weighing how to choose? <a href="#${escapeHtml(catAnchor)}">Start from unanswered questions</a>.${showThird ? ` Need the search / other path? <a href="#${escapeHtml(third.anchor)}">Skip there</a>.` : ''}</p>
    </div>
  </section>

  <section id="${escapeHtml(catAnchor)}" class="section section-alt">
    <div class="wrap">
      <p class="sale-label">${escapeHtml(cat.eyebrow || 'If you are still exploring')}</p>
      <h2>${escapeHtml(cat.title || `How to choose`)}</h2>
      <p class="muted" style="margin-top:.75rem;max-width:52ch">Start from what buyers still need answered — fears, fit, and how to interview — before you pick.</p>
      ${unanswered.length ? `<article class="card" style="margin-top:1.25rem"><h3>Unanswered questions buyers bring</h3><ul class="list">${unanswered.map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ul></article>` : ''}
      <div class="grid grid-2" style="margin-top:1.75rem">
        <article class="card">
          <h3>What buyers are afraid of</h3>
          <ul class="list">${(content.pains || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </article>
        <article class="card">
          <h3>Why they seek this out anyway</h3>
          <ul class="list">${(content.whySeek || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </article>
      </div>
      <div class="grid grid-2" style="margin-top:1rem">
        <article class="card">
          <h3>Benefits of this model</h3>
          <ul class="list">${(content.benefits || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </article>
        <article class="card">
          <h3>What makes someone hesitate</h3>
          <ul class="list">${(content.reluctantBuyer || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
        </article>
      </div>
      <p class="muted" style="margin-top:1.5rem;max-width:56ch">Outcome stats belong in consult with real numbers — we will not invent rates on a marketing page.</p>
      <div class="bridge">
        <a class="btn" href="${escapeHtml(content.booking)}">${escapeHtml(bookLabel)}</a>
        <a class="btn btn-ghost" href="#${escapeHtml(provAnchor)}">Why ${escapeHtml(shortName)}?</a>
      </div>
      <p class="muted" style="margin-top:.75rem">${escapeHtml(cat.nextAfter || `If that sounds right, meet ${shortName} — or book if you are ready.`)}</p>
    </div>
  </section>

  ${searchBlock}
  ${secondaryBlock}

  <section id="services" class="section"><div class="wrap">
    <h2 style="margin-bottom:1.25rem">How we help</h2>
    <div class="grid grid-3">${serviceCards(content)}</div>
  </div></section>

  <section class="section section-alt"><div class="wrap">
    <h2 style="margin-bottom:1.25rem">From people who hired this</h2>
    <div class="grid grid-3">${testimonialCards(content)}</div>
  </div></section>

  <section class="section"><div class="wrap"><h2 style="margin-bottom:1rem">FAQ</h2>${faqBlock(content)}</div></section>

  <section class="cta">
    <div class="wrap">
      <h2>Wherever you are in the decision</h2>
      <p style="margin:1rem auto 0;max-width:46ch;opacity:.9">Choosing who · learning how · or searching now. Skip what is not for you — then book.</p>
      <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem">
        <a class="btn" href="#${escapeHtml(provAnchor)}" style="background:transparent;border:1px solid #fff;color:#fff">Why ${escapeHtml(shortName)}</a>
        ${showThird ? `<a class="btn" href="#${escapeHtml(third.anchor)}" style="background:transparent;border:1px solid #fff;color:#fff">${escapeHtml(third.cta || 'Other path')}</a>` : ''}
        <a class="btn" href="${escapeHtml(content.booking)}">${escapeHtml(bookLabel)}</a>
      </div>
    </div>
  </section>
</main>
${footer(content)}
</body></html>`;
}

/** Well Rounded Momma–derived feminine midwifery shell (photo pillars + consult CTA). */
function shellWellroundedFeminine(system, content) {
  const phoneHref = content.phone ? `tel:${String(content.phone).replace(/[^\d+]/g, '')}` : content.booking;
  const callLabel = content.phone || 'Request a consult';
  const t0 = content.testimonials[0];
  const quote = t0
    ? `“${escapeHtml(String(t0.text || '').slice(0, 280))}”`
    : `“Clear, calm care — with a real conversation before you decide.”`;
  const cite = t0 ? `— ${escapeHtml(t0.author || 'Client')}` : `— ${escapeHtml(content.name)} family`;
  const pillarPhotos = [
    content.gallery?.[0] || content.hero || '',
    content.gallery?.[1] || content.gallery?.[0] || content.hero || '',
    content.gallery?.[2] || content.gallery?.[0] || content.hero || '',
  ];
  const services = content.services.slice(0, 3);
  const css = `
.script{font-family:"Sacramento",cursive;font-weight:400;color:var(--primary);line-height:1}
.topbar{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.topbar .wrap{display:flex;align-items:center;justify-content:space-between;height:66px}
.brand{display:flex;align-items:center;gap:.65rem;font-family:var(--font-display);font-weight:500;text-decoration:none}
.brand img{height:42px;width:auto}
.callbtn{display:inline-flex;align-items:center;background:var(--primary);color:#fff;text-decoration:none;padding:.65rem 1.1rem;border-radius:999px;font-weight:700;font-size:.92rem;box-shadow:var(--shadow)}
.hero{position:relative;min-height:72vh;display:flex;align-items:center;overflow:hidden;background:color-mix(in srgb,var(--primary) 12%,var(--bg))}
.hero-bg{position:absolute;inset:-22% 0;background-size:cover;background-position:center 35%;opacity:.75;will-change:transform;z-index:0}
.hero::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(105deg,color-mix(in srgb,var(--bg) 90%,transparent) 0%,color-mix(in srgb,var(--bg) 55%,transparent) 42%,transparent 78%)}
.hero .wrap{position:relative;z-index:2;padding:3rem 0}
.hero-inner{max-width:34rem}
.hero h1{font-size:clamp(1.65rem,2.8vw,2.35rem);font-weight:500;margin-top:.4rem}
.hero .lede{color:var(--muted);margin-top:1rem;font-size:1.05rem;max-width:40ch}
.hero-cta{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}
.btn{border-radius:999px!important;background:var(--primary);color:#fff;box-shadow:var(--shadow)}
.btn-ghost{background:rgba(255,255,255,.75)!important;color:var(--text)!important;border:1px solid var(--line)!important;box-shadow:none!important}
.trust{background:var(--accent);color:#f7ece9}
.trust .wrap{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;padding:1.35rem 0;text-align:center}
.trust b{display:block;font-family:var(--font-display);font-size:1.5rem;color:#fff}
.trust small{font-size:.8rem;opacity:.85}
@media(max-width:720px){.trust .wrap{grid-template-columns:1fr}}
.block{padding:4.5rem 0}
.meet{display:grid;grid-template-columns:.9fr 1.1fr;gap:2.5rem;align-items:center}
.meet .photo{background:color-mix(in srgb,var(--primary) 22%,var(--bg));border-radius:20px 20px 110px 20px;aspect-ratio:4/5;overflow:hidden;box-shadow:var(--shadow)}
.meet .photo img{width:100%;height:100%;object-fit:cover}
.meet .role{color:var(--primary);font-weight:700;margin:.4rem 0 1rem}
@media(max-width:860px){.meet{grid-template-columns:1fr}}
.section-head{text-align:center;max-width:40rem;margin:0 auto 2.2rem}
.pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:1.35rem}
.pillar{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;box-shadow:0 16px 40px -30px rgba(123,85,96,.55);display:flex;flex-direction:column}
.pillar .pimg{height:170px;background:color-mix(in srgb,var(--primary) 28%,var(--bg));position:relative;overflow:hidden}
.pillar .pimg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.pillar .pbody{padding:1.35rem;display:flex;flex-direction:column;flex:1}
.pillar .tag{font-family:"Sacramento",cursive;font-size:1.25rem;color:var(--primary)}
.pillar h3{font-size:1.35rem;margin:.15rem 0}
.pillar .role{color:var(--accent);font-weight:700;font-size:.9rem;margin-bottom:.65rem}
.pillar p{color:var(--muted);font-size:.95rem}
.pillar .foot{margin-top:auto;padding-top:1rem}
@media(max-width:860px){.pillars{grid-template-columns:1fr}}
.band{position:relative;min-height:46vh;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden}
.band-bg{position:absolute;inset:-22% 0;background-size:cover;background-position:center;opacity:.85;will-change:transform;z-index:0}
.band::after{content:"";position:absolute;inset:0;background:rgba(74,59,63,.42);z-index:1}
.band .wrap{position:relative;z-index:2;color:#fff;max-width:42rem}
.band .quote{font-family:var(--font-display);font-style:italic;font-size:clamp(1.3rem,2.8vw,1.9rem);line-height:1.4}
.band cite{display:block;margin-top:1rem;font-style:normal;font-family:var(--font-body);font-weight:700;opacity:.9}
.soft{background:color-mix(in srgb,var(--primary) 10%,var(--bg))}
.grid{display:grid;gap:1rem}
@media(min-width:800px){.grid-3{grid-template-columns:repeat(3,1fr)}}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1.35rem;box-shadow:var(--shadow)}
.cta{text-align:center;padding:3.5rem 1rem;background:linear-gradient(120deg,var(--primary),color-mix(in srgb,var(--primary) 70%,#6a3a32));color:#fff;border-radius:var(--radius);box-shadow:var(--shadow)}
.cta .btn{background:#fff!important;color:var(--primary)!important}
details{background:var(--card);border-radius:14px;padding:1rem 1.1rem;margin-bottom:.65rem;border:1px solid var(--line)}
summary{cursor:pointer;font-weight:700}
details p{margin-top:.55rem}
.site-footer{padding:2.5rem 0 5rem;color:var(--muted);font-size:.9rem}
`;
  const heroBg = content.hero
    ? `style="background-image:url('${escapeHtml(content.hero)}')"`
    : '';
  const bandBg = (content.gallery?.[1] || content.hero)
    ? `style="background-image:url('${escapeHtml(content.gallery?.[1] || content.hero)}')"`
    : '';
  const pillarCards = services.map((s, i) => {
    const photo = pillarPhotos[i];
    const tags = ['The Practice', 'Your Care Team', 'The Choice'];
    return `<article class="pillar">
      <div class="pimg">${photo ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy"/>` : ''}</div>
      <div class="pbody">
        <span class="tag">${escapeHtml(tags[i] || 'Care')}</span>
        <h3>${escapeHtml(s)}</h3>
        <p>Real details confirmed in consult — book to see if this care model is the right fit.</p>
        <div class="foot"><a class="btn" href="${escapeHtml(content.booking)}">Request a consultation</a></div>
      </div>
    </article>`;
  }).join('');

  return `${head(system, content, css)}
<body data-lumin-ds="1" data-layout="wellrounded-feminine">
<header class="topbar"><div class="wrap">
  <a class="brand" href="#top">${content.logo ? `<img src="${escapeHtml(content.logo)}" alt=""/>` : ''}<span>${escapeHtml(content.name)}</span></a>
  <a class="callbtn" href="${escapeHtml(phoneHref)}">${escapeHtml(callLabel)}</a>
</div></header>
<main id="top">
  <section class="hero">
    <div class="hero-bg" data-parallax="0.35" ${heroBg}></div>
    <div class="wrap"><div class="hero-inner">
      ${proofLine(content)}
      <h1>${escapeHtml(content.tagline)}</h1>
      <p class="lede">${escapeHtml(content.about.slice(0, 220))}</p>
      <div class="hero-cta">
        <a class="btn" href="${escapeHtml(content.booking)}">Request a consultation</a>
        <a class="btn btn-ghost" href="#care">Meet the team</a>
      </div>
    </div></div>
  </section>
  <section class="trust"><div class="wrap">
    <div><b>${escapeHtml(content.location || content.industry)}</b><small>local care</small></div>
    <div><b>Personal</b><small>unhurried visits</small></div>
    <div><b>Clear next step</b><small>consult first</small></div>
  </div></section>
  <section class="block" id="meet"><div class="wrap meet">
    <div class="photo">${content.hero ? `<img src="${escapeHtml(content.hero)}" alt="${escapeHtml(content.name)}" loading="eager"/>` : ''}</div>
    <div>
      <p class="script" style="font-size:1.6rem;margin:0">Meet your care</p>
      <h2>${escapeHtml(content.name)}</h2>
      <div class="role">${escapeHtml(content.industry)}${content.location ? ` · ${escapeHtml(content.location)}` : ''}</div>
      <p class="muted">${escapeHtml(content.about.slice(0, 420))}</p>
      <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Request a consultation</a>
    </div>
  </div></section>
  <section class="block" id="care"><div class="wrap">
    <div class="section-head">
      <p class="script" style="font-size:1.5rem;margin:0">Who you'll work with</p>
      <h2>Care built around you</h2>
      <p class="muted" style="margin-top:.75rem">Photo-led pillars so visitors see the people and the choice before scrolling further.</p>
    </div>
    <div class="pillars">${pillarCards || serviceCards(content, 'pillar')}</div>
  </div></section>
  <section class="band">
    <div class="band-bg" data-parallax="0.35" ${bandBg}></div>
    <div class="wrap">
      <p class="quote">${quote}</p>
      <cite>${cite}</cite>
    </div>
  </section>
  <section class="block soft" id="services"><div class="wrap">
    <div class="section-head"><h2>What care includes</h2></div>
    <div class="grid grid-3">${serviceCards(content)}</div>
  </div></section>
  <section class="block"><div class="wrap">
    <h2 style="margin-bottom:1rem">Gentle answers</h2>
    ${faqBlock(content)}
  </div></section>
  <section class="block"><div class="wrap">
    <div class="cta">
      <h2>Ready to talk?</h2>
      <p style="margin:0.85rem auto 0;max-width:40ch;opacity:.92">Fill out a short request — a real person follows up to schedule. No pressure.</p>
      <a class="btn" style="margin-top:1.25rem" href="${escapeHtml(content.booking)}">Request your consultation</a>
    </div>
  </div></section>
</main>
${footer(content)}
<script>
(function(){
  var els=[].slice.call(document.querySelectorAll('[data-parallax]'));
  if(!els.length||window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var t=false;
  function go(){
    els.forEach(function(el){
      var speed=parseFloat(el.getAttribute('data-parallax'))||0.35;
      var rect=el.parentElement.getBoundingClientRect();
      var mid=rect.top+rect.height/2;
      el.style.transform='translate3d(0,'+((window.innerHeight/2-mid)speed).toFixed(1)+'px,0)';
    });
    t=false;
  }
  function on(){ if(!t){ requestAnimationFrame(go); t=true; } }
  window.addEventListener('scroll',on,{passive:true});
  window.addEventListener('resize',go);
  go();
})();
</script>
</body></html>`;
}

const LAYOUT_RENDERERS = {
  'editorial-luxe': shellEditorialLuxe,
  'modern-clinical': shellModernClinical,
  'organic-warm': shellOrganicWarm,
  'wellrounded-feminine': shellWellroundedFeminine,
  'bold-minimal': shellBoldMinimal,
  'dark-aura': shellDarkAura,
  'coastal-light': shellCoastal,
  'swiss-grid': shellSwiss,
  'gradient-energy': shellBento,
  'soft-pastel': shellSoftPastel,
  'retro-warm': shellRetroWarm,
  'local-trust': shellLocalTrust,
  'artisan-heritage': shellArtisanHeritage,
  'urban-gold': shellUrbanGold,
  'refined-brutalist': shellRefinedBrutalist,
  'agentic-conversational': shellAgentic,
};

const MULTI_PATH_SALES_LAYOUT_IDS = new Set([
  'organic-warm',
  'soft-pastel',
  'local-trust',
  'editorial-luxe',
  'modern-clinical',
  'coastal-light',
  'artisan-heritage',
]);

/**
 * Render a distinct hand-authored layout for a design system.
 * Multi-path sales shell applies to every industry on listed layouts — not midwifery-only.
 */
export function renderDesignSystemLayout(system, info = {}, posPartner = null) {
  if (!system?.id) return null;
  const content = normalizeLayoutContent(info, posPartner);
  if (MULTI_PATH_SALES_LAYOUT_IDS.has(system.id)) {
    return shellVisitorStateSales(system, content);
  }
  const renderer = LAYOUT_RENDERERS[system.id] || shellEditorialLuxe;
  return renderer(system, content);
}

export function layoutShellIdForDesignSystem(systemId) {
  const sys = String(systemId || '');
  return LAYOUT_RENDERERS[sys] ? sys : 'editorial-luxe';
}