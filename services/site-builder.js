/**
 * SYNOPSIS: Site Builder — Scrape existing site → AI-generates complete click-funnel website
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 * Site Builder — Scrape existing site → AI-generates complete click-funnel website
 *
 * Pipeline:
 *   URL → scrape business info → AI builds full Tailwind HTML site → SEO schema →
 *   auto blog posts → YouTube RSS embed → deploy to /public/previews/{clientId}/
 *
 * Features:
 *   - Full click funnel (Hero → Problem → Services → Proof → CTA → FAQ → Blog → Videos)
 *   - Tailwind CSS via CDN (zero build step)
 *   - Schema.org LocalBusiness + Service markup
 *   - Auto-generated SEO blog posts (3x per build)
 *   - YouTube channel RSS embed (no API key needed)
 *   - Booking CTA (Cal.com or Calendly embed, or contact form)
 *   - POS/Payment integration via Stripe Payment Links or Square referral
 *   - sitemap.xml + robots.txt generated
 *
 * POS Commission Partners (wellness-focused):
 *   - Jane App: https://jane.app/affiliates — healthcare/wellness scheduling + POS
 *   - Mindbody: https://www.mindbodyonline.com/partner — fitness/wellness POS
 *   - Square: https://squareup.com/us/en/referral — general POS
 *   We earn referral commission when client signs up via our link.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import logger from './logger.js';
import { scoreGeneratedSite, scoreSummary } from './site-builder-quality-scorer.js';
import CompetitorBenchmark from './competitor-benchmark.js';
import PresenceAudit from './presence-audit.js';
import { createWebSearchService } from './web-search-service.js';
import { pickDesignSystems, getDesignSystem, renderDesignSystemDirectives, DEFAULT_DESIGN_SYSTEM_ID } from './site-builder-design-systems.js';
import { SITE_BUILDER_PRICING } from '../config/site-builder-pricing.js';
import { resolvePreviewsDir } from '../config/site-builder-paths.js';

function createEditToken() {
  return crypto.randomBytes(24).toString('hex');
}

function injectPreviewChrome(html, { clientId, baseUrl, editToken }) {
  if (!html || !clientId || !baseUrl) return html;
  const safeBase = String(baseUrl).replace(/\/$/, '');
  const publishUrl = `${safeBase}/api/v1/sites/publish/checkout?clientId=${encodeURIComponent(clientId)}`;
  const editorUrl = `${safeBase}/api/v1/sites/editor?clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(editToken || '')}`;
  const bar = `
<div id="sb-preview-chrome" style="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:rgba(17,24,39,.96);color:#fff;padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;font-family:system-ui,sans-serif;font-size:14px;box-shadow:0 -8px 30px rgba(0,0,0,.25)">
  <span>Your free preview — customize it or publish when ready.</span>
  <a href="${editorUrl}" style="background:#334155;color:#fff;padding:8px 14px;border-radius:999px;text-decoration:none;font-weight:600">Open editor</a>
  <a href="${publishUrl}" style="background:#7c3aed;color:#fff;padding:8px 14px;border-radius:999px;text-decoration:none;font-weight:600">Publish ${SITE_BUILDER_PRICING.publish.display}</a>
</div>`;
  if (html.includes('</body>')) return html.replace('</body>', `${bar}\n</body>`);
  return `${html}${bar}`;
}

const TAILWIND_CDN = 'https://cdn.tailwindcss.com';
const ALPINE_CDN = 'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js';
const DESIGN_INTEL_PATH = path.join(process.cwd(), 'docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md');
const MIN_SEND_SCORE = Number(process.env.SITE_BUILDER_MIN_SEND_SCORE || '72');
const TARGET_QUALITY_SCORE = Number(process.env.SITE_BUILDER_TARGET_SCORE || '88');
const MAX_REPAIR_PASSES = Math.max(0, Number(process.env.SITE_BUILDER_REPAIR_PASSES || '2'));
const GENERATION_MAX_TOKENS = Number(process.env.SITE_BUILDER_GEN_TOKENS || '14000');
const REPAIR_MAX_TOKENS = Number(process.env.SITE_BUILDER_REPAIR_TOKENS || '14000');
// Design quality is driven mostly by the generation model. claude_sonnet (16k output)
// produces markedly better design. Founder rule (2026-07-06): a PRODUCT never runs on a
// free-tier model — only strong, paid models are hardwired into what the system ships.
// Env-overridable; on any provider error we fall back to another STRONG model (gpt-4o),
// NOT a free tier, so a build never hard-fails but never degrades to free-tier quality.
const GENERATION_MODEL = process.env.SITE_BUILDER_GEN_MODEL || 'claude_sonnet';
const GENERATION_FALLBACK_MODEL = process.env.SITE_BUILDER_GEN_FALLBACK_MODEL || 'openai_gpt';
// Real-data enrichment: search the business's Google/Yelp/Facebook presence for REAL
// reviews, ratings, and facts. Fails closed (no data) when no search provider key is set —
// never fabricates. Disabled entirely with SITE_BUILDER_ENRICH=false.
const ENRICHMENT_ENABLED = String(process.env.SITE_BUILDER_ENRICH || 'true') !== 'false';

// POS partner referral links — set AFFILIATE_*_URL env vars in Railway to activate commission tracking
export const POS_PARTNERS = {
  jane_app: {
    name: 'Jane App',
    description: 'Best for healthcare & wellness scheduling + payments',
    url: process.env.AFFILIATE_JANE_APP_URL || 'https://jane.app',
    commission: '$50 per referral',
    bestFor: ['midwives', 'doulas', 'massage', 'naturopath', 'counselor', 'physio'],
  },
  mindbody: {
    name: 'Mindbody',
    description: 'Best for fitness, yoga, spa & wellness studios',
    url: process.env.AFFILIATE_MINDBODY_URL || 'https://www.mindbodyonline.com',
    commission: 'Up to $200 per referral',
    bestFor: ['yoga', 'spa', 'fitness', 'gym', 'pilates', 'meditation'],
  },
  square: {
    name: 'Square',
    description: 'Best general POS for any small business',
    url: process.env.AFFILIATE_SQUARE_URL || 'https://squareup.com/us/en/referral',
    commission: 'Up to $2,500 per referral (volume-based)',
    bestFor: ['retail', 'restaurant', 'general', 'any'],
  },
};

/**
 * Render the VERIFIED REAL DATA block for the generation prompt. Only real, sourced
 * facts gathered by enrichWithRealData() appear here. When empty, the block explicitly
 * tells the model no verified external data was found so it must not invent any.
 */
function renderVerifiedData(verified) {
  if (!verified || (!verified.rating && !(verified.testimonials || []).length && !(verified.facts || []).length && !(verified.designCues || []).length)) {
    return 'VERIFIED REAL DATA (from the business\'s live web presence): NONE FOUND.\n- No external rating, reviews, or facts were verified. Do NOT invent any. Omit the social-proof bar and testimonial quotes entirely.\n';
  }
  const lines = ['VERIFIED REAL DATA (from the business\'s live web presence — these are REAL, use them; cite the source):'];
  if (verified.rating) {
    const rc = verified.reviewCount ? ` from ${verified.reviewCount} reviews` : '';
    lines.push(`- Rating: ${verified.rating}★${rc} (source: ${verified.ratingSource || 'web'})`);
  }
  for (const f of verified.facts || []) lines.push(`- Fact: ${f}`);
  for (const t of verified.testimonials || []) {
    const src = t.source ? ` — via ${t.source}` : '';
    lines.push(`- Real review: "${String(t.text).slice(0, 280)}"${src}`);
  }
  for (const d of verified.designCues || []) lines.push(`- Design cue from their socials (honor this in the visual style): ${d}`);
  return lines.join('\n') + '\n';
}

export default class SiteBuilder {
  constructor({ callCouncil, previewsDir, baseUrl = '' } = {}) {
    this.callCouncil = callCouncil;
    const dir = previewsDir || resolvePreviewsDir();
    this.previewsRoot = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    this.previewsDir = this.previewsRoot;
    this.baseUrl = baseUrl;
  }

  /**
   * Full pipeline: URL → scraped info → new site → deploy → return preview URL
   */
  async buildFromUrl(targetUrl, options = {}) {
    const clientId = options.clientId || `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    logger.info('[SITE] Building site from URL', { clientId, targetUrl });

    try {
      // Step 1: Scrape business info
      const businessInfo = await this.scrapeBusinessInfo(targetUrl, options);

      // Step 1b: Enrich with REAL data from the business's live web presence
      // (Google/Yelp/Facebook reviews, rating, facts). Fails closed — never fabricates.
      if (ENRICHMENT_ENABLED && options.enrich !== false) {
        try {
          businessInfo.verifiedData = await this.enrichWithRealData(businessInfo, options);
          if (businessInfo.verifiedData) {
            logger.info('[SITE] enrichment found real data', {
              clientId,
              rating: businessInfo.verifiedData.rating || null,
              testimonials: (businessInfo.verifiedData.testimonials || []).length,
            });
          }
        } catch (err) {
          logger.warn('[SITE] enrichment failed (continuing without external data)', { clientId, error: err.message });
        }
      }

      // Step 2: Determine best POS partner for their industry
      const posPartner = this.selectPosPartner(businessInfo.industry || businessInfo.keywords || []);

      // Step 2b: Benchmark competitors → client-facing scorecard + design brief that grounds generation
      let benchmark = null;
      let presence = null;
      const competitorUrls = options.competitorUrls || businessInfo.competitorUrls || [];
      if (this.callCouncil && competitorUrls.length > 0) {
        try {
          benchmark = await this.benchmarkCompetitors(businessInfo, competitorUrls);
        } catch (err) {
          logger.warn('[SITE] competitor benchmark failed (continuing)', { clientId, error: err.message });
        }
        try {
          presence = await this.auditPresence(businessInfo, competitorUrls);
        } catch (err) {
          logger.warn('[SITE] presence audit failed (continuing)', { clientId, error: err.message });
        }
      }

      // Step 3: Generate main site HTML
      let siteHtml = await this.generateSiteHtml(businessInfo, { clientId, posPartner, designBrief: benchmark?.designBrief, ...options });
      let qualityReport = this.scoreSiteHtml(siteHtml, businessInfo);

      // Step 3b: Deterministic patch — inject schema, focus styles, sticky CTA regardless of AI output
      siteHtml = this.patchSiteHtml(siteHtml, businessInfo);
      qualityReport = this.scoreSiteHtml(siteHtml, businessInfo);

      // Step 3c: AI repair passes for remaining quality gaps
      if (this.callCouncil && qualityReport.scorePct < TARGET_QUALITY_SCORE && MAX_REPAIR_PASSES > 0) {
        for (let pass = 1; pass <= MAX_REPAIR_PASSES; pass++) {
          const repairedHtml = await this.improveSiteHtml(siteHtml, businessInfo, qualityReport, {
            clientId,
            posPartner,
            pass,
          });
          // Patch again after repair (AI may have dropped injected elements)
          const patchedRepair = this.patchSiteHtml(repairedHtml, businessInfo);
          const repairedScore = this.scoreSiteHtml(patchedRepair, businessInfo);
          if (repairedScore.scorePct <= qualityReport.scorePct) break;
          siteHtml = patchedRepair;
          qualityReport = repairedScore;
          if (qualityReport.scorePct >= TARGET_QUALITY_SCORE) break;
        }
      }

      // Step 4: Generate 3 SEO blog posts
      const blogPosts = await this.generateBlogPosts(businessInfo, 3);

      // Step 5: Fetch YouTube videos (RSS, no API key)
      const videos = businessInfo.youtubeChannelId
        ? await this.fetchYouTubeVideos(businessInfo.youtubeChannelId)
        : [];

      // Step 6: Build blog index page
      const blogHtml = this.generateBlogIndex(businessInfo, blogPosts);

      // Step 7: Generate SEO files
      const sitemap = this.generateSitemap(clientId, blogPosts);
      const robots = this.generateRobots();

      // Step 8: Deploy all files
      const deployDir = path.join(this.previewsRoot, clientId);
      await fs.mkdir(deployDir, { recursive: true });
      await fs.mkdir(path.join(deployDir, 'blog'), { recursive: true });
      const editToken = createEditToken();

      // Inject view tracking pixel — when prospect opens preview we auto-mark them as 'viewed'
      if (this.baseUrl) {
        const pixel = `<img src="${this.baseUrl}/api/v1/sites/preview-view?id=${clientId}" style="position:absolute;opacity:0;pointer-events:none" width="1" height="1" alt="">`;
        siteHtml = siteHtml.includes('</body>') ? siteHtml.replace('</body>', `${pixel}\n</body>`) : siteHtml;
        siteHtml = injectPreviewChrome(siteHtml, { clientId, baseUrl: this.baseUrl, editToken });
      }
      await fs.writeFile(path.join(deployDir, 'index.html'), siteHtml);
      await fs.writeFile(path.join(deployDir, 'blog', 'index.html'), blogHtml);
      await fs.writeFile(path.join(deployDir, 'sitemap.xml'), sitemap);
      await fs.writeFile(path.join(deployDir, 'robots.txt'), robots);

      // Client-facing competitor scorecard (only when we actually analyzed competitors)
      if ((benchmark && benchmark.analyzedCount > 0) || presence) {
        await fs.writeFile(path.join(deployDir, 'scorecard.html'), this.generateScorecardHtml(businessInfo, benchmark, presence));
      }

      for (const post of blogPosts) {
        const postDir = path.join(deployDir, 'blog', post.slug);
        await fs.mkdir(postDir, { recursive: true });
        await fs.writeFile(path.join(postDir, 'index.html'), post.html);
      }

      // Step 9: Save metadata
      const metadata = {
        clientId,
        targetUrl,
        businessInfo,
        posPartner,
        blogPosts: blogPosts.map(p => ({ slug: p.slug, title: p.title })),
        videos: videos.length,
        qualityReport,
        benchmark,
        presence,
        editToken,
        createdAt: new Date().toISOString(),
        previewUrl: `${this.baseUrl}/previews/${clientId}`,
        scorecardUrl: (benchmark && benchmark.analyzedCount > 0) || presence ? `${this.baseUrl}/previews/${clientId}/scorecard.html` : null,
        editorUrl: this.baseUrl ? `${this.baseUrl}/api/v1/sites/editor?clientId=${clientId}&token=${editToken}` : null,
        publishCheckoutUrl: this.baseUrl ? `${this.baseUrl}/api/v1/sites/publish/checkout?clientId=${clientId}` : null,
      };
      await fs.writeFile(path.join(deployDir, 'meta.json'), JSON.stringify(metadata, null, 2));

      logger.info('[SITE] Site deployed', {
        clientId,
        previewUrl: metadata.previewUrl,
        quality: scoreSummary(qualityReport),
      });

      return {
        success: true,
        clientId,
        previewUrl: metadata.previewUrl,
        businessName: businessInfo.businessName,
        blogPosts: blogPosts.length,
        posPartner: posPartner.name,
        qualityReport,
        benchmark,
        presence,
        metadata,
      };
    } catch (err) {
      logger.error('[SITE] Build failed', { clientId, error: err.message });
      return { success: false, clientId, error: err.message };
    }
  }

  /**
   * Build MULTIPLE design variants of the same site so the client can toggle
   * between cutting-edge templates and pick the one they love. Scraping,
   * real-data enrichment and content stay identical across variants — only the
   * visual design system changes. Produces a switcher preview page (index.html)
   * that lets the client cycle through each variant in place.
   *
   * options: { variantCount, styleIds:[], enrich, skipRepair, ...buildFromUrl opts }
   */
  async buildVariants(targetUrl, options = {}) {
    const clientId = `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const count = Math.max(1, Number(options.variantCount || process.env.SITE_BUILDER_VARIANTS || 3));
    const systems = pickDesignSystems(count, options.styleIds || []);
    logger.info('[SITE] Building variants', { clientId, targetUrl, systems: systems.map((s) => s.id) });

    try {
      const businessInfo = await this.scrapeBusinessInfo(targetUrl, options);

      if (ENRICHMENT_ENABLED && options.enrich !== false) {
        try {
          businessInfo.verifiedData = await this.enrichWithRealData(businessInfo, options);
        } catch (err) {
          logger.warn('[SITE] enrichment failed (continuing without external data)', { clientId, error: err.message });
        }
      }

      const posPartner = this.selectPosPartner(businessInfo.industry || businessInfo.keywords || []);

      let designBrief = null;
      const competitorUrls = options.competitorUrls || businessInfo.competitorUrls || [];
      if (this.callCouncil && competitorUrls.length > 0) {
        try {
          const benchmark = await this.benchmarkCompetitors(businessInfo, competitorUrls);
          designBrief = benchmark?.designBrief || null;
        } catch (err) {
          logger.warn('[SITE] competitor benchmark failed (continuing)', { clientId, error: err.message });
        }
      }

      // Shared content (built once, reused across every variant)
      const blogPosts = await this.generateBlogPosts(businessInfo, 3);
      const blogHtml = this.generateBlogIndex(businessInfo, blogPosts);
      const sitemap = this.generateSitemap(clientId, blogPosts);
      const robots = this.generateRobots();

      const deployDir = path.join(this.previewsRoot, clientId);
      await fs.mkdir(path.join(deployDir, 'blog'), { recursive: true });
      await fs.writeFile(path.join(deployDir, 'blog', 'index.html'), blogHtml);
      await fs.writeFile(path.join(deployDir, 'sitemap.xml'), sitemap);
      await fs.writeFile(path.join(deployDir, 'robots.txt'), robots);
      for (const post of blogPosts) {
        const postDir = path.join(deployDir, 'blog', post.slug);
        await fs.mkdir(postDir, { recursive: true });
        await fs.writeFile(path.join(postDir, 'index.html'), post.html);
      }

      const pixel = this.baseUrl
        ? `<img src="${this.baseUrl}/api/v1/sites/preview-view?id=${clientId}" style="position:absolute;opacity:0;pointer-events:none" width="1" height="1" alt="">`
        : '';

      const variants = [];
      for (const ds of systems) {
        try {
          let html = await this.generateSiteHtml(businessInfo, { clientId, posPartner, designBrief, designSystem: ds });
          html = this.patchSiteHtml(html, businessInfo);
          let quality = this.scoreSiteHtml(html, businessInfo);
          if (!options.skipRepair && this.callCouncil && quality.scorePct < TARGET_QUALITY_SCORE && MAX_REPAIR_PASSES > 0) {
            const repaired = this.patchSiteHtml(
              await this.improveSiteHtml(html, businessInfo, quality, { clientId, posPartner, pass: 1 }),
              businessInfo,
            );
            const rScore = this.scoreSiteHtml(repaired, businessInfo);
            if (rScore.scorePct > quality.scorePct) { html = repaired; quality = rScore; }
          }
          if (pixel && html.includes('</body>')) html = html.replace('</body>', `${pixel}\n</body>`);
          const vDir = path.join(deployDir, 'variants', ds.id);
          await fs.mkdir(vDir, { recursive: true });
          await fs.writeFile(path.join(vDir, 'index.html'), html);
          variants.push({ id: ds.id, name: ds.name, blurb: ds.blurb, file: `variants/${ds.id}/index.html`, scorePct: quality.scorePct });
        } catch (err) {
          logger.warn('[SITE] variant generation failed (skipping)', { clientId, style: ds.id, error: err.message });
        }
      }

      if (!variants.length) throw new Error('all variant generations failed');

      const editToken = createEditToken();
      const switcher = this.generateVariantSwitcher(businessInfo, clientId, variants, editToken);
      await fs.writeFile(path.join(deployDir, 'index.html'), switcher);

      const metadata = {
        clientId,
        targetUrl,
        businessInfo,
        posPartner,
        variants,
        blogPosts: blogPosts.map((p) => ({ slug: p.slug, title: p.title })),
        editToken,
        createdAt: new Date().toISOString(),
        previewUrl: `${this.baseUrl}/previews/${clientId}`,
        editorUrl: this.baseUrl ? `${this.baseUrl}/api/v1/sites/editor?clientId=${clientId}&token=${editToken}` : null,
        publishCheckoutUrl: this.baseUrl ? `${this.baseUrl}/api/v1/sites/publish/checkout?clientId=${clientId}` : null,
        mode: 'variants',
      };
      await fs.writeFile(path.join(deployDir, 'meta.json'), JSON.stringify(metadata, null, 2));

      logger.info('[SITE] Variants deployed', { clientId, count: variants.length, previewUrl: metadata.previewUrl });
      return {
        success: true,
        clientId,
        previewUrl: metadata.previewUrl,
        businessName: businessInfo.businessName,
        variants,
        posPartner: posPartner.name,
        metadata,
      };
    } catch (err) {
      logger.error('[SITE] Variant build failed', { clientId, error: err.message });
      return { success: false, clientId, error: err.message };
    }
  }

  /**
   * Build the variant switcher shell: a top bar of design buttons + an iframe
   * that swaps between the generated variants, plus a "Use this design" action
   * that records the client's choice (best-effort beacon).
   */
  generateVariantSwitcher(info, clientId, variants, editToken = '') {
    const name = (info.businessName || 'Your Website').replace(/</g, '&lt;');
    const selectBase = this.baseUrl ? `${this.baseUrl}/api/v1/sites/select-design` : '';
    const publishUrl = this.baseUrl ? `${this.baseUrl}/api/v1/sites/publish/checkout?clientId=${encodeURIComponent(clientId)}` : '';
    const editorUrl = this.baseUrl && editToken
      ? `${this.baseUrl}/api/v1/sites/editor?clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(editToken)}`
      : '';
    const data = JSON.stringify(variants.map((v) => ({ id: v.id, name: v.name, blurb: v.blurb, file: v.file })));
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name} — Choose your design</title>
<script src="${TAILWIND_CDN}"></script>
<style>
  :root { --bar: #0f172a; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .chip { transition: all .15s ease; }
  .chip[aria-pressed="true"] { background:#fff; color:#0f172a; font-weight:600; }
  iframe { border:0; width:100%; height:calc(100vh - 116px); display:block; background:#fff; }
</style>
</head>
<body class="bg-slate-900">
  <div x-data="switcher()" x-init="init()">
    <header class="bg-slate-900 text-white px-4 pt-3 pb-3 sticky top-0 z-10 shadow-lg">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p class="text-xs uppercase tracking-widest text-slate-400">Preview for</p>
          <h1 class="text-lg font-semibold leading-tight">${name}</h1>
        </div>
        <div class="text-right flex flex-wrap gap-2 justify-end items-center">
          ${editorUrl ? `<a href="${editorUrl}" class="bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold px-3 py-2 rounded-lg">Editor</a>` : ''}
          ${publishUrl ? `<a href="${publishUrl}" class="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-3 py-2 rounded-lg">Publish ${SITE_BUILDER_PRICING.publish.display}</a>` : ''}
          <p class="text-xs text-slate-400 mb-1 w-full" x-text="'Design ' + (index+1) + ' of ' + variants.length + ' — ' + current.name"></p>
          <button @click="choose()" class="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-lg">✓ Use this design</button>
        </div>
      </div>
      <p class="text-xs text-slate-400 mt-2">Not loving it? Toggle through the designs below — each is a different professionally-designed style.</p>
      <nav class="mt-2 flex gap-2 overflow-x-auto pb-1">
        <template x-for="(v,i) in variants" :key="v.id">
          <button class="chip whitespace-nowrap text-sm px-3 py-1.5 rounded-full border border-slate-600 text-slate-200 hover:border-slate-400"
            :aria-pressed="i===index" @click="show(i)" x-text="v.name"></button>
        </template>
      </nav>
    </header>
    <iframe :src="current.file" :title="current.name" x-ref="frame"></iframe>
    <div x-show="saved" x-transition class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg shadow-xl">
      Saved — <span x-text="current.name"></span> selected. We'll be in touch.
    </div>
  </div>
<script src="${ALPINE_CDN}" defer></script>
<script>
  function switcher(){
    return {
      variants: ${data},
      index: 0,
      saved: false,
      get current(){ return this.variants[this.index]; },
      init(){ const h = parseInt(new URLSearchParams(location.search).get('v')); if(!isNaN(h) && this.variants[h]) this.index = h; },
      show(i){ this.index = i; this.saved = false; },
      choose(){
        this.saved = true;
        var base = ${JSON.stringify(selectBase)};
        if(base){ try { navigator.sendBeacon ? navigator.sendBeacon(base + '?id=${clientId}&style=' + this.current.id) : fetch(base + '?id=${clientId}&style=' + this.current.id, {mode:'no-cors'}); } catch(e){} }
        setTimeout(()=>{ this.saved = false; }, 4000);
      },
    };
  }
</script>
</body>
</html>`;
  }

  /**
   * Scrape business info from existing website using Puppeteer.
   * Extracts: name, tagline, services, contact, colors, testimonials, social links.
   */
  async scrapeBusinessInfo(url, options = {}) {
    // If manual info is provided (no scraping needed), use it directly
    if (options.businessInfo) return options.businessInfo;

    let puppeteer;
    let browser;
    try {
      puppeteer = await import('puppeteer');
      browser = await puppeteer.default.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; LuminBot/1.0; +https://lumin.ai)');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

      const scraped = await page.evaluate(() => {
        const getText = sel => document.querySelector(sel)?.innerText?.trim() || '';
        const getMeta = name =>
          document.querySelector(`meta[name="${name}"]`)?.content ||
          document.querySelector(`meta[property="og:${name}"]`)?.content || '';

        // Extract all visible text
        const bodyText = document.body?.innerText?.slice(0, 8000) || '';

        // Look for phone, email, address
        const phoneMatch = bodyText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
        const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/);

        // Find social links
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
        const youtube = links.find(l => l.includes('youtube.com/channel') || l.includes('youtube.com/@'));
        const instagram = links.find(l => l.includes('instagram.com/'));
        const facebook = links.find(l => l.includes('facebook.com/'));

        // Try to get YouTube channel ID from URL
        let youtubeChannelId = null;
        if (youtube) {
          const chMatch = youtube.match(/channel\/(UC[\w-]+)/);
          const handleMatch = youtube.match(/@([\w-]+)/);
          youtubeChannelId = chMatch ? chMatch[1] : (handleMatch ? handleMatch[1] : null);
        }

        return {
          title: document.title || '',
          metaDescription: getMeta('description'),
          h1: getText('h1'),
          bodyText,
          phone: phoneMatch ? phoneMatch[0] : '',
          email: emailMatch ? emailMatch[0] : '',
          youtubeUrl: youtube || '',
          youtubeChannelId,
          instagramUrl: instagram || '',
          facebookUrl: facebook || '',
        };
      });

      await browser.close();

      // Use AI to extract structured business info from the raw scraped text
      const extracted = await this.extractBusinessInfoWithAI(scraped, url);
      return { ...scraped, ...extracted, sourceUrl: url };

    } catch (err) {
      if (browser) await browser.close().catch(() => {});
      logger.warn('[SITE] Scrape failed, using AI extraction only', { url, error: err.message });
      // Fallback: use AI to infer info from URL + domain name alone
      return this.extractBusinessInfoWithAI({ title: url, bodyText: '', sourceUrl: url }, url);
    }
  }

  /**
   * Use AI to structure scraped data into clean business profile.
   */
  async extractBusinessInfoWithAI(scraped, url) {
    if (!this.callCouncil) {
      return { businessName: new URL(url).hostname, services: [], keywords: [] };
    }

    const prompt = `Extract structured business information from this scraped website content.

URL: ${url}
Title: ${scraped.title || ''}
Meta description: ${scraped.metaDescription || ''}
H1: ${scraped.h1 || ''}
Body text (first 4000 chars):
${(scraped.bodyText || '').slice(0, 4000)}

Return ONLY valid JSON with this exact structure:
{
  "businessName": "exact business name",
  "tagline": "their main value proposition in 1 sentence",
  "industry": "e.g. midwifery, wellness, massage, yoga, doula, naturopath",
  "services": ["service 1", "service 2", "service 3"],
  "targetAudience": "who they serve",
  "location": "city, state if found",
  "priceRange": "e.g. $150-$300/session or unknown",
  "tone": "professional/warm/holistic/clinical/friendly",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "painPoints": ["pain point their clients have 1", "pain point 2", "pain point 3"],
  "testimonials": ["testimonial snippet 1 if found", "testimonial 2 if found"],
  "primaryColor": "#hex color if apparent from branding, else #7C3AED",
  "accentColor": "#hex color, else #EC4899",
  "bookingUrl": "their existing booking URL if found, else null",
  "uniqueValue": "what makes them different in 1-2 sentences"
}`;

    // groq_llama is fine for structured JSON extraction — fast and cheap
    const response = await this.callCouncil('groq_llama', prompt, { maxOutputTokens: 1000, taskType: 'extraction' });
    try {
      const jsonMatch = response.match(/\{[\s\S]+\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return {};
    }
  }

  /**
   * Enrich a business profile with REAL, sourced data from its live web presence
   * (Google Business, Yelp, Facebook, its own socials): rating, review count, real
   * review snippets, and verifiable facts. Uses real search providers only — no AI
   * fabrication fallback (callAI is intentionally omitted). Returns null when no
   * search provider key is configured or nothing verifiable is found. Fails closed:
   * it will NEVER invent a rating, review, or fact.
   */
  async enrichWithRealData(info, options = {}) {
    const search = createWebSearchService({
      BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      // No callAI on purpose — factual enrichment must come from real search, not model memory.
    });

    const name = info.businessName;
    if (!name) return null;
    const locale = info.location ? ` ${info.location}` : '';
    const queries = [
      `${name}${locale} reviews rating`,
      `${name}${locale} yelp`,
      `${name}${locale} google reviews`,
      `${name}${locale} facebook`,
    ];

    const snippets = [];
    for (const q of queries) {
      try {
        const { source, results } = await search.search(q, { count: 4 });
        if (source === 'none' || !results.length) continue;
        for (const r of results) {
          if (r.description) snippets.push({ title: r.title || '', text: r.description, url: r.url || '' });
        }
      } catch (err) {
        logger.warn('[SITE] enrichment query failed', { q, error: err.message });
      }
    }

    // No provider key / no results → fail closed, no fabrication.
    if (!snippets.length || !this.callCouncil) return null;

    // Extract ONLY what is literally present in the real snippets. The extractor is
    // instructed to leave fields null rather than infer or estimate.
    const corpus = snippets.map((s) => `SOURCE: ${s.url}\nTITLE: ${s.title}\nTEXT: ${s.text}`).join('\n\n').slice(0, 6000);
    const prompt = `Below are REAL web search result snippets about a business named "${name}".
Extract ONLY facts that are literally stated in the snippets. If a value is not explicitly present, use null. NEVER estimate, infer, round, or invent.

SNIPPETS:
${corpus}

Return ONLY valid JSON:
{
  "rating": number 1-5 or null (only if an explicit star rating appears),
  "reviewCount": integer or null (only if an explicit review count appears),
  "ratingSource": "Google" | "Yelp" | "Facebook" | null,
  "testimonials": [{ "text": "verbatim quote from a real review", "source": "Google|Yelp|Facebook" }] (only real quotes actually present; else []),
  "facts": ["short verifiable fact explicitly stated, e.g. 'Open since 2011'"] (else []),
  "designCues": ["visual/brand style cues actually described in the snippets, e.g. 'earthy green + cream palette', 'minimalist photography', 'calm spa aesthetic'"] (only if described; else [])
}`;
    let parsed;
    try {
      const resp = await this.callCouncil('groq_llama', prompt, { maxOutputTokens: 800, taskType: 'extraction' });
      const m = resp.match(/\{[\s\S]+\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (err) {
      logger.warn('[SITE] enrichment extraction failed', { error: err.message });
      return null;
    }
    if (!parsed) return null;

    const rating = typeof parsed.rating === 'number' && parsed.rating >= 1 && parsed.rating <= 5 ? parsed.rating : null;
    const testimonials = Array.isArray(parsed.testimonials)
      ? parsed.testimonials.filter((t) => t && typeof t.text === 'string' && t.text.trim().length > 12).slice(0, 4)
      : [];
    const facts = Array.isArray(parsed.facts) ? parsed.facts.filter((f) => typeof f === 'string' && f.trim()).slice(0, 4) : [];
    const designCues = Array.isArray(parsed.designCues) ? parsed.designCues.filter((d) => typeof d === 'string' && d.trim()).slice(0, 5) : [];

    if (!rating && !testimonials.length && !facts.length && !designCues.length) return null;
    return {
      rating,
      reviewCount: Number.isInteger(parsed.reviewCount) ? parsed.reviewCount : null,
      ratingSource: parsed.ratingSource || null,
      testimonials,
      facts,
      designCues,
    };
  }

  /**
   * Select best POS partner based on business industry/keywords.
   */
  selectPosPartner(industryOrKeywords) {
    const text = Array.isArray(industryOrKeywords)
      ? industryOrKeywords.join(' ').toLowerCase()
      : String(industryOrKeywords).toLowerCase();

    if (/midwi|doula|naturo|counsel|physio|chiro|health|clinic|medical/.test(text)) {
      return POS_PARTNERS.jane_app;
    }
    if (/yoga|spa|fitnes|gym|pilates|meditation|wellness|massage|reiki/.test(text)) {
      return POS_PARTNERS.mindbody;
    }
    return POS_PARTNERS.square;
  }

  /**
   * Generate complete click-funnel website HTML using AI.
   * Full funnel: Hero → Problem → Services → Proof → Offer → FAQ → Blog → Videos → Footer
   */
  async generateSiteHtml(info, options = {}) {
    const { clientId, posPartner, designBrief } = options;
    const primary = info.primaryColor || '#7C3AED';
    const accent = info.accentColor || '#EC4899';
    const designIntel = await this.loadDesignIntel();
    const competitorBrief = designBrief?.text
      ? `\n\nCOMPETITOR-INFORMED DESIGN BRIEF (beat the market, do not copy):\n${designBrief.text}`
      : '';
    const designSystemBlock = options.designSystem
      ? `\n\n${renderDesignSystemDirectives(options.designSystem)}`
      : '';

    const prompt = `You are building a COMPLETE, PRODUCTION-READY website for a small wellness/health business.

BUSINESS PROFILE:
- Name: ${info.businessName || 'The Practice'}
- Industry: ${info.industry || 'wellness'}
- Tagline: ${info.tagline || 'Transforming lives through holistic care'}
- Services: ${(info.services || []).join(', ') || 'wellness services'}
- Target audience: ${info.targetAudience || 'local community'}
- Location: ${info.location || ''}
- Unique value: ${info.uniqueValue || 'expert, compassionate care'}
- Tone: ${info.tone || 'warm and professional'}
- Client pain points: ${(info.painPoints || []).join('; ')}
- SEO keywords: ${(info.keywords || []).join(', ')}
- Phone: ${info.phone || ''}
- Email: ${info.email || ''}
- Booking URL: ${info.bookingUrl || '#book'}
- Brand colors: Primary ${primary}, Accent ${accent}
- Testimonials: ${(info.testimonials || []).join(' | ')}
${renderVerifiedData(info.verifiedData)}
PAYMENT/BOOKING SYSTEM:
- We recommend ${posPartner.name} for scheduling + payments
- Referral link: ${posPartner.url}
- Include a "Book Now" CTA that links to booking system

TRUTH RULE (HIGHEST PRIORITY — overrides everything below):
- NEVER invent facts. Do not fabricate prices, dollar amounts, star ratings, review counts, client/family counts, years in business, awards, or named testimonials/quotes.
- Use ONLY the concrete facts provided in the BUSINESS PROFILE and VERIFIED REAL DATA below. If a fact is not provided, leave it out entirely — do not guess or approximate.
- A shorter, truthful page ALWAYS beats an impressive-looking page built on invented claims. Empty is better than fake.

HARD REQUIREMENTS:
1. Output ONE complete HTML file — nothing else, no explanation
2. Use Tailwind CSS via CDN: ${TAILWIND_CDN}
3. Use Alpine.js via CDN for interactivity: ${ALPINE_CDN} (defer)
4. Zero external dependencies beyond those CDNs
5. Mobile-first, fully responsive
6. After </html> write: BUILD_COMPLETE
7. Use semantic HTML, accessible buttons/links, and visible focus states
8. Use CSS custom properties inside ONE small <style> block for theme tokens and any shaped background effects
9. Do NOT use placeholder lorem ipsum, fake star ratings with no basis, or generic "AI agency" language
10. If real testimonials are missing, use a clearly labeled section like "What clients often appreciate" instead of fabricated quotes

CLICK FUNNEL STRUCTURE (in this exact order):
1. NAVIGATION: Logo + nav links + "Book Free Call" CTA button (sticky)
2. HERO: Bold headline about transformation/outcome (not features). Subheadline. Two CTAs: primary "Book Your Free Consultation" + secondary "See How It Works". Add a subtle background gradient using primary color.
3. SOCIAL PROOF BAR: ONLY include real, provided metrics (e.g. a real Google/Yelp rating + review count, or a verified years-in-business figure) from VERIFIED REAL DATA. If no real metrics are provided, OMIT this bar entirely — do NOT invent stats like "200+ served" or "5★ rated".
4. PROBLEM SECTION: "Does this sound familiar?" — 3 pain points as cards with icons (use emoji)
5. SOLUTION SECTION: "Here's how we help" — 3-step process with numbered steps
6. SERVICES SECTION: Service cards with name and description. Include a price ONLY if a real price is provided for that service — otherwise no price. "Learn More" / "Book" CTA.
7. TESTIMONIALS: Prefer REAL reviews from VERIFIED REAL DATA — quote them verbatim with the source (e.g. "— via Google"). If NO real reviews are provided, you MAY show up to 2 illustrative sample testimonials, but EACH card MUST carry a clearly visible small-print label reading exactly: "AI-generated testimonial sample — not a real client review". Never present a sample as real, never invent a real client's name, and never attach a star rating to a sample.
8. OFFER/PACKAGES: Show pricing ONLY if a real price/priceRange is provided in the BUSINESS PROFILE or VERIFIED REAL DATA. If real pricing exists, present it accurately. If NO real pricing is provided, do NOT invent tiers or dollar amounts — instead show a single "Request pricing / Book a free consultation" CTA that links to booking.
9. ABOUT SECTION: Brief about the practitioner, warm and personal
10. FAQ SECTION: 5 Q&As using Alpine.js accordion (x-data, x-show, @click)
11. BLOG PREVIEW: "Latest from the Blog" — 3 blog post cards with title/excerpt placeholders (links to /blog/)
12. VIDEO SECTION: "Watch & Learn" — if videos are unavailable, show a useful educational content teaser instead of an empty embed grid
13. BOOKING CTA SECTION: Full-width colored section "Ready to start your journey?" with big CTA button
14. FOOTER: Logo, nav links, contact info, social links, copyright, concise trust note
15. MOBILE STICKY CTA BAR: a bottom booking bar visible on small screens only

SEO REQUIREMENTS:
- <title> tag: [Business Name] | [City] [Industry] | [Tagline]
- <meta name="description"> with natural keyword inclusion
- Schema.org LocalBusiness JSON-LD in <head>
- Open Graph tags (og:title, og:description, og:type=website)
- Include only truthful schema properties that are supported by the provided business data
- All H1/H2/H3 hierarchy correct (only ONE h1)
- Alt text on any images (use gradient placeholders, no external images)
- Internal links between sections

DESIGN INTELLIGENCE:
${designIntel}${competitorBrief}${designSystemBlock}

DESIGN REQUIREMENTS:
- Use Tailwind utility classes for layout and components, plus one concise <style> block for theme tokens and a few intentional visual effects
- Primary color: ${primary} — use in CTAs, borders, highlights
- Accent color: ${accent} — use in gradients, hover states, and editorial moments
- Make the site feel custom to this business, not like a generic wellness template
- Avoid default purple-on-white unless the extracted brand colors actually call for it
- Use stronger hierarchy, editorial spacing, clear card groupings, and at least one visually distinctive section treatment
- Use subtle motion only where it improves clarity; avoid heavy animations and anything that hurts performance
- CTA buttons: large tap targets, high contrast, clear hover/focus states
- Section padding: py-16 md:py-24
- Keep the page fast and conversion-focused: concise copy, strong above-the-fold trust, repeated CTA placement, no dead sections

Output the ENTIRE HTML file from <!DOCTYPE html> to </html> then BUILD_COMPLETE.`;

    if (!this.callCouncil) throw new Error('callCouncil required for site generation');

    // Prefer the higher-quality design model (claude_sonnet, 16k output). Fall back to another
    // STRONG paid model (gpt-4o) on any provider error — never a free tier (founder rule).
    // allowModelDowngrade:false prevents selectOptimalModel from overriding to groq_llama (4096 token limit)
    let response;
    try {
      response = await this.callCouncil(GENERATION_MODEL, prompt, { maxOutputTokens: GENERATION_MAX_TOKENS, allowModelDowngrade: false });
    } catch (err) {
      if (GENERATION_MODEL !== GENERATION_FALLBACK_MODEL) {
        logger.warn('[SITE] primary generation model failed, falling back', { model: GENERATION_MODEL, error: err.message });
        response = await this.callCouncil(GENERATION_FALLBACK_MODEL, prompt, { maxOutputTokens: GENERATION_MAX_TOKENS, allowModelDowngrade: false });
      } else {
        throw err;
      }
    }
    let clean = response.replace(/BUILD_COMPLETE[\s\S]*$/, '').trim();
    // Strip markdown fences AI models sometimes wrap HTML in (```html...``` or ```...```)
    clean = clean.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

    if (!clean.includes('<!DOCTYPE html') && !clean.includes('<html')) {
      throw new Error('AI did not return valid HTML');
    }
    return clean;
  }

  scoreSiteHtml(html, businessInfo = {}) {
    return scoreGeneratedSite(html, businessInfo, {
      minReadyScore: MIN_SEND_SCORE,
      minExcellentScore: TARGET_QUALITY_SCORE,
    });
  }

  /**
   * Fix malformed inline SVG data-URI backgrounds. Models often emit
   * style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"...\">...')"
   * — the backslash-escaped double quotes are literal in HTML, so the first inner
   * double quote closes the style attribute early and the tail (');"> ) leaks as
   * visible text in the page. We percent-encode the SVG so it is delimiter-safe
   * inside a double-quoted attribute. Idempotent.
   */
  sanitizeInlineSvgBackgrounds(html) {
    let h = String(html || '');
    // Match url( [optional quote] data:image/svg+xml<prefix>, <svg...></svg> [optional quote] )
    const re = /url\(\s*['"]?\s*(data:image\/svg\+xml[^,]*,)([\s\S]*?<\/svg>)\s*['"]?\s*\)/gi;
    return h.replace(re, (match, prefix, svg) => {
      const encoded = svg
        .replace(/\\+(["'])/g, '$1') // drop backslash escapes (\" -> ", \' -> ')
        .replace(/%(?![0-9a-fA-F]{2})/g, '%25') // escape stray % not already an encoding
        .replace(/"/g, '%22')
        .replace(/'/g, '%27')
        .replace(/</g, '%3C')
        .replace(/>/g, '%3E')
        .replace(/ /g, '%20')
        .replace(/\n/g, '');
      // Single-quoted url() with a fully percent-encoded SVG contains no delimiter
      // characters, so it is safe inside a double-quoted style attribute.
      return `url('${prefix}${encoded}')`;
    });
  }

  /**
   * Deterministic post-processor: inject elements the quality scorer requires
   * that AI models sometimes omit. Safe to call multiple times (idempotent).
   */
  patchSiteHtml(html, info = {}) {
    let h = this.sanitizeInlineSvgBackgrounds(String(html || ''));
    const primary = info.primaryColor || '#7C3AED';
    const accent = info.accentColor || '#EC4899';
    const phone = info.phone || '';
    const email = info.email || '';
    const bookingUrl = info.bookingUrl || '#book';
    const name = info.businessName || 'the practice';

    // 1. Schema.org JSON-LD — required for hasSchemaMarkup (8pts)
    if (!/application\/ld\+json/i.test(h)) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: info.businessName || 'Local Business',
        description: info.tagline || info.metaDescription || '',
        url: info.sourceUrl || info.bookingUrl || '',
      };
      if (phone) schema.telephone = phone;
      if (email) schema.email = email;
      if (info.location) schema.address = { '@type': 'PostalAddress', addressLocality: info.location };
      const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
      h = h.includes('</head>')
        ? h.replace('</head>', `${scriptTag}\n</head>`)
        : scriptTag + h;
    }

    // 2. Focus-visible styles — required for hasFocusStyles (4pts)
    if (!/focus:|focus-visible:/i.test(h)) {
      const focusCss = `<style>
*:focus-visible{outline:2px solid ${primary};outline-offset:2px;border-radius:3px;}
button:focus-visible,a:focus-visible{outline:2px solid ${primary};outline-offset:2px;}
</style>`;
      h = h.includes('</head>')
        ? h.replace('</head>', `${focusCss}\n</head>`)
        : focusCss + h;
    }

    // 3. Mobile sticky CTA bar — required for hasStickyMobileCta (6pts)
    if (!/fixed bottom|sticky.*bottom|bottom booking|small screens only/i.test(h)) {
      const callLink = phone
        ? `<a href="tel:${phone.replace(/[^\d+]/g, '')}" class="flex-1 border border-white/30 rounded-full py-2.5 text-center text-sm font-semibold text-white">Call Us</a>`
        : '';
      const stickyBar = `
<!-- Mobile sticky CTA — small screens only -->
<div class="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-black/10 px-4 py-3 flex gap-3 shadow-xl" style="background:rgba(255,255,255,0.97);backdrop-filter:blur(8px)">
  <a href="${bookingUrl}" class="flex-1 rounded-full py-2.5 text-center text-sm font-bold text-white shadow-md" style="background:linear-gradient(135deg,${primary},${accent})">Book Now</a>${callLink}
</div>`;
      h = h.includes('</body>')
        ? h.replace('</body>', `${stickyBar}\n</body>`)
        : h + stickyBar;
    }

    // 4. Contact info — required for hasContactInfo (8pts)
    // Only inject if we have data AND the HTML has neither phone nor email patterns
    const hasContact = /\(\d{3}\)|\d{3}[-.\s]\d{3}[-.\s]\d{4}|@[a-z0-9.-]+\.[a-z]{2,}/i.test(h);
    if (!hasContact && (phone || email)) {
      const contactLine = [
        phone ? `<a href="tel:${phone.replace(/[^\d+]/g, '')}" class="underline">${phone}</a>` : '',
        email ? `<a href="mailto:${email}" class="underline">${email}</a>` : '',
      ].filter(Boolean).join(' &nbsp;·&nbsp; ');
      // Prepend to </footer> if present, otherwise inject before </body>
      const contactSnippet = `<div class="text-center py-2 text-sm text-gray-500">${contactLine}</div>`;
      if (h.includes('<footer')) {
        h = h.replace('<footer', `${contactSnippet}<footer`);
      } else if (h.includes('</body>')) {
        h = h.replace('</body>', `${contactSnippet}\n</body>`);
      }
    }

    // 5. Offer/pricing clarity — inject minimal pricing note if completely absent (6pts)
    if (!/\$|pricing|package|membership|per month|\/mo\b|fee|investment/i.test(h)) {
      const pricingNote = `<p class="text-sm text-gray-500 text-center py-4">Flexible packages available — contact ${name} for current pricing and availability.</p>`;
      h = h.includes('</footer>')
        ? h.replace('</footer>', `${pricingNote}</footer>`)
        : h.includes('</body>')
        ? h.replace('</body>', `${pricingNote}\n</body>`)
        : h + pricingNote;
    }

    return h;
  }

  async improveSiteHtml(existingHtml, info, qualityReport, options = {}) {
    const { posPartner } = options;
    const designIntel = await this.loadDesignIntel();
    const prompt = `You are revising a generated local-business website that scored below target quality.

BUSINESS PROFILE:
- Name: ${info.businessName || 'The Practice'}
- Industry: ${info.industry || 'wellness'}
- Services: ${(info.services || []).join(', ') || 'wellness services'}
- Target audience: ${info.targetAudience || 'local community'}
- Location: ${info.location || ''}
- Tone: ${info.tone || 'warm and professional'}
- Booking URL: ${info.bookingUrl || '#book'}
- Recommended scheduling/payments partner: ${posPartner?.name || 'Square'}

CURRENT SCORE:
- Score: ${qualityReport.score}/${qualityReport.maxScore}
- Percent: ${qualityReport.scorePct}%
- Grade: ${qualityReport.grade}
- Recommended action: ${qualityReport.recommendedAction}
- Top issues: ${(qualityReport.summaryIssues || qualityReport.issues || []).join('; ') || 'none'}

DESIGN INTELLIGENCE:
${designIntel}

REVISION GOALS:
- Keep the site truthful, specific, and conversion-oriented.
- Fix the listed issues without bloating the page.
- Make the mobile CTA flow clearer.
- Strengthen trust and section hierarchy.
- Preserve semantic HTML, Tailwind, Alpine, schema markup, and fast-loading structure.
- If proof/testimonials are weak, replace fake-sounding claims with truthful proof framing.

HARD REQUIREMENTS:
1. Return ONE full HTML document only.
2. Keep Tailwind + Alpine CDNs.
3. Keep a single H1 and proper heading hierarchy.
4. Keep visible focus states and strong CTAs.
5. End with BUILD_COMPLETE after </html>.

CURRENT HTML:
${existingHtml}
`;

    // Repair rewrites the actual client-facing site HTML → use the STRONG product model.
    const response = await this.callCouncil(GENERATION_MODEL, prompt, { maxOutputTokens: REPAIR_MAX_TOKENS, allowModelDowngrade: false });
    const clean = String(response || '').replace(/BUILD_COMPLETE[\s\S]*$/, '').trim();
    if (!clean.includes('<!DOCTYPE html') && !clean.includes('<html')) {
      throw new Error('AI did not return valid repaired HTML');
    }
    return clean;
  }

  /**
   * Generate 3 SEO blog posts for the business's industry.
   */
  async generateBlogPosts(info, count = 3) {
    if (!this.callCouncil) return [];

    const prompt = `Generate ${count} SEO-optimized blog post outlines for a ${info.industry || 'wellness'} business called "${info.businessName || 'the practice'}".

Target audience: ${info.targetAudience || 'local clients'}
Keywords to include: ${(info.keywords || []).join(', ')}
Location: ${info.location || 'local area'}

Return ONLY valid JSON array:
[
  {
    "title": "SEO-optimized blog title with keyword",
    "slug": "url-friendly-slug",
    "metaDescription": "150-160 char meta description with keyword",
    "excerpt": "2-3 sentence preview of the post",
    "content": "Full 600-800 word blog post in HTML (use <h2>, <h3>, <p>, <ul>, <li> tags). Include the business name naturally. End with a CTA to book a consultation."
  }
]`;

    // Blog posts are client-facing product content → use the STRONG product model
    // (never a free tier). 3 posts × 600-800 words needs long output; claude_sonnet (16k) fits.
    const response = await this.callCouncil(GENERATION_MODEL, prompt, { maxOutputTokens: Math.max(4000, GENERATION_MAX_TOKENS), allowModelDowngrade: false });
    try {
      const jsonMatch = response.match(/\[[\s\S]+\]/);
      const posts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      return posts.map(post => ({
        ...post,
        html: this.wrapBlogPost(post, info),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Wrap blog post content in full HTML page.
   */
  wrapBlogPost(post, info) {
    const primary = info.primaryColor || '#7C3AED';
    const accent = info.accentColor || '#EC4899';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title} | ${info.businessName || 'Blog'}</title>
  <meta name="description" content="${post.metaDescription || post.excerpt}">
  <meta property="og:title" content="${post.title}">
  <meta property="og:type" content="article">
  <script src="${TAILWIND_CDN}"></script>
  <style>
    :root {
      --brand-primary: ${primary};
      --brand-accent: ${accent};
      --brand-paper: #fffdfa;
      --brand-ink: #171717;
    }
  </style>
</head>
<body class="bg-[var(--brand-paper)] text-[var(--brand-ink)]">
  <nav class="border-b border-black/5 bg-white/90 px-6 py-4 backdrop-blur">
    <a href="/" class="text-lg font-bold" style="color: var(--brand-primary)">${info.businessName || 'Home'}</a>
  </nav>
  <main class="max-w-3xl mx-auto px-6 py-12">
    <div class="mb-8 inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-black/55">Article</div>
    <h1 class="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">${post.title}</h1>
    <p class="mb-8 text-gray-500">Published by ${info.businessName || 'the team'}</p>
    <div class="prose prose-lg max-w-none">${post.content}</div>
    <div class="mt-12 rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
      <h3 class="mb-3 text-2xl font-bold" style="color: var(--brand-primary)">Ready to take the next step?</h3>
      <p class="text-gray-600 mb-6">Book a free consultation with ${info.businessName || 'us'} today.</p>
      <a href="${info.bookingUrl || '/#book'}" class="inline-block rounded-full px-8 py-3 font-semibold text-white shadow-lg transition hover:-translate-y-0.5" style="background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent))">Book Free Consultation</a>
    </div>
  </main>
  <footer class="border-t bg-white/80 px-6 py-8 text-center text-sm text-gray-500">
    <p>&copy; ${new Date().getFullYear()} ${info.businessName || ''}. Site powered by <a href="https://lumin.ai" style="color: var(--brand-primary)">Lumin AI</a>.</p>
  </footer>
</body>
</html>`;
  }

  /**
   * Generate blog index page.
   */
  generateBlogIndex(info, posts) {
    const primary = info.primaryColor || '#7C3AED';
    const postCards = posts.map(p => `
      <a href="/blog/${p.slug || p.slug}/" class="block rounded-[24px] border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
        <h2 class="text-xl font-bold text-gray-900 mb-2">${p.title}</h2>
        <p class="text-gray-600 text-sm mb-4">${p.excerpt || ''}</p>
        <span class="text-sm font-medium" style="color: ${primary}">Read more →</span>
      </a>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog | ${info.businessName || ''}</title>
  <meta name="description" content="Wellness tips, advice, and insights from ${info.businessName || 'our team'}.">
  <script src="${TAILWIND_CDN}"></script>
</head>
<body class="bg-stone-50">
  <nav class="border-b bg-white px-6 py-4">
    <a href="/" class="text-lg font-bold" style="color: ${primary}">${info.businessName || 'Home'}</a>
  </nav>
  <main class="max-w-4xl mx-auto px-6 py-12">
    <h1 class="mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">Latest from the Blog</h1>
    <p class="text-gray-600 mb-10">Tips, guides, and insights for ${info.targetAudience || 'our community'}.</p>
    <div class="grid md:grid-cols-3 gap-6">${postCards}</div>
  </main>
</body>
</html>`;
  }

  /**
   * Benchmark competitor sites: returns a client-facing 1-10 scorecard per site
   * (strengths/weaknesses) plus a design brief that grounds generation in the
   * real market instead of a generic template.
   */
  async benchmarkCompetitors(businessInfo, competitorUrls = []) {
    const benchmark = new CompetitorBenchmark({ callCouncil: this.callCouncil });
    return benchmark.benchmark({ businessInfo, competitorUrls });
  }

  /**
   * Head-to-head presence audit: scores the business AND competitors across
   * website/GBP/Instagram/Facebook/LinkedIn and returns a gap/opportunity readout.
   */
  async auditPresence(businessInfo, competitorUrls = []) {
    const audit = new PresenceAudit({ callCouncil: this.callCouncil });
    return audit.compare({ businessInfo, competitorUrls });
  }

  /**
   * Render a client-facing competitor scorecard page. Shows each competitor's
   * 1-10 score with what they do well / poorly, and how the new site beats them.
   */
  generateScorecardHtml(info, benchmark, presence = null) {
    const primary = info.primaryColor || '#7C3AED';
    const accent = info.accentColor || '#EC4899';
    const name = info.businessName || 'Your Business';
    const presenceSection = presence ? this.generatePresenceSectionHtml(presence) : '';
    const cards = (benchmark?.scorecards || [])
      .map(c => {
        const scoreLabel = c.score != null ? `${c.score}/10` : 'N/A';
        const host = (() => { try { return new URL(c.url).hostname.replace(/^www\./, ''); } catch { return c.url; } })();
        const well = (c.doesWell || []).map(x => `<li>${this.escapeHtml(x)}</li>`).join('') || '<li>—</li>';
        const poor = (c.doesPoorly || []).map(x => `<li>${this.escapeHtml(x)}</li>`).join('') || '<li>—</li>';
        return `<div class="card">
      <div class="card-head">
        <span class="host">${this.escapeHtml(host)}</span>
        <span class="score">${scoreLabel}</span>
      </div>
      <p class="summary">${this.escapeHtml(c.summary || '')}</p>
      <div class="cols">
        <div><h4 class="good">What they do well</h4><ul>${well}</ul></div>
        <div><h4 class="bad">Where they fall short</h4><ul>${poor}</ul></div>
      </div>
    </div>`;
      })
      .join('\n');
    const brief = benchmark?.designBrief || {};
    const beat = (brief.beat || []).map(x => `<li>${this.escapeHtml(x)}</li>`).join('');
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${this.escapeHtml(name)} — Competitor Scorecard</title>
<style>
  :root{--primary:${primary};--accent:${accent}}
  *{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a2e;background:#faf9fc}
  header{background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;padding:48px 24px;text-align:center}
  header h1{margin:0 0 8px;font-size:28px}header p{margin:0;opacity:.9}
  main{max-width:960px;margin:0 auto;padding:32px 20px}
  .card{background:#fff;border:1px solid #eee;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,.04)}
  .card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .host{font-weight:700;font-size:18px}
  .score{font-weight:800;font-size:20px;color:var(--primary);background:rgba(124,58,237,.08);padding:4px 12px;border-radius:999px}
  .summary{color:#555;margin:.25rem 0 1rem}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  @media(max-width:640px){.cols{grid-template-columns:1fr}}
  h4{margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.04em}
  h4.good{color:#16a34a}h4.bad{color:#dc2626}
  ul{margin:0;padding-left:18px;color:#333;font-size:14px;line-height:1.6}
  .beat{background:#fff;border:2px solid var(--primary);border-radius:16px;padding:24px;margin-top:8px}
  .beat h3{margin:0 0 10px;color:var(--primary)}
  .section-title{font-size:20px;margin:8px 0 16px}
  table.presence{width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-radius:16px;overflow:hidden}
  table.presence th,table.presence td{padding:12px 14px;text-align:left;border-bottom:1px solid #f0f0f0;font-size:14px}
  table.presence th{background:#f7f5fb;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700}
  .b-ahead{background:#dcfce7;color:#166534}.b-behind{background:#fee2e2;color:#991b1b}
  .b-even{background:#e5e7eb;color:#374151}.b-open{background:#fef9c3;color:#854d0e}.b-unknown{background:#f3f4f6;color:#6b7280}
  .gap{background:#fff;border-left:4px solid var(--primary);border-radius:8px;padding:18px 20px;margin:16px 0}
</style></head>
<body>
<header>
  <h1>Presence & Competitor Scorecard for ${this.escapeHtml(name)}</h1>
  <p>An honest look at where you stand across every channel — and how we help you win.</p>
</header>
<main>
  ${presenceSection}
  ${cards ? `<h2 class="section-title">Competitor websites, scored</h2>${cards}` : ''}
  ${beat ? `<div class="beat"><h3>How your new site wins</h3><ul>${beat}</ul></div>` : ''}
  ${!presenceSection && !cards ? '<p>No sites could be analyzed.</p>' : ''}
</main>
</body></html>`;
  }

  /**
   * Render the head-to-head presence section: per-channel you-vs-competitors
   * table + plain-English gap/opportunity readout.
   */
  generatePresenceSectionHtml(presence) {
    const labels = { website: 'Website', google: 'Google Business', instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn' };
    const verdictBadge = v => {
      const map = { ahead: ['b-ahead', 'You lead'], behind: ['b-behind', 'Behind'], even: ['b-even', 'Even'], open_lane: ['b-open', 'Open lane'], unknown: ['b-unknown', '—'] };
      const [cls, txt] = map[v] || map.unknown;
      return `<span class="badge ${cls}">${txt}</span>`;
    };
    const rows = (presence.perChannel || [])
      .map(c => {
        const you = c.clientScore != null ? `${c.clientScore}/10` : '—';
        const comp = c.competitorAvg != null ? `${c.competitorAvg}/10` : (c.competitorsPresent ? 'present' : '—');
        return `<tr><td>${labels[c.channel] || c.channel}</td><td>${you}</td><td>${comp} <small>(${c.competitorsPresent}/${c.totalCompetitors})</small></td><td>${verdictBadge(c.verdict)}</td></tr>`;
      })
      .join('');
    const gap = presence.gap || {};
    const quickWins = (gap.quickWins || []).map(w => `<li>${this.escapeHtml(w)}</li>`).join('');
    return `<h2 class="section-title">Your online presence vs. competitors</h2>
  <table class="presence">
    <thead><tr><th>Channel</th><th>You</th><th>Competitors (avg)</th><th>Verdict</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${gap.summary ? `<div class="gap"><p>${this.escapeHtml(gap.summary)}</p>${gap.biggestOpportunity ? `<p><strong>Biggest opportunity:</strong> ${this.escapeHtml(gap.biggestOpportunity)}</p>` : ''}${quickWins ? `<p><strong>Quick wins:</strong></p><ul>${quickWins}</ul>` : ''}</div>` : ''}`;
  }

  escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async loadDesignIntel() {
    try {
      const raw = await fs.readFile(DESIGN_INTEL_PATH, 'utf8');
      return raw.slice(0, 5000);
    } catch {
      return [
        '- Prioritize mobile-first layouts, clear tap targets, and visible focus states.',
        '- Prefer fast-loading pages with concise sections, strong trust cues, and repeated CTAs.',
        '- Use truthful structured data, semantic headings, and a sitemap-friendly layout.',
        '- Avoid generic AI-looking purple templates; make the visual direction feel specific to the business.',
      ].join('\n');
    }
  }

  /**
   * Fetch latest YouTube videos via public RSS (no API key required).
   */
  async fetchYouTubeVideos(channelIdOrHandle) {
    try {
      const { default: https } = await import('https');
      // If it looks like a channel ID (starts with UC), use channel RSS
      // If it's a handle (@name), we'd need the channel ID — best effort
      const rssUrl = channelIdOrHandle.startsWith('UC')
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdOrHandle}`
        : `https://www.youtube.com/feeds/videos.xml?user=${channelIdOrHandle}`;

      const xml = await new Promise((resolve, reject) => {
        https.get(rssUrl, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });

      // Extract video IDs and titles from RSS XML
      const videos = [];
      const entries = xml.match(/<entry>[\s\S]+?<\/entry>/g) || [];
      for (const entry of entries.slice(0, 6)) {
        const idMatch = entry.match(/yt:videoId>([\w-]+)</);
        const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
        if (idMatch) {
          videos.push({
            videoId: idMatch[1],
            title: titleMatch ? titleMatch[1] : 'Video',
            embedUrl: `https://www.youtube.com/embed/${idMatch[1]}`,
          });
        }
      }
      return videos;
    } catch {
      return [];
    }
  }

  /**
   * Generate sitemap.xml for the deployed site.
   */
  generateSitemap(clientId, blogPosts) {
    const baseUrl = `${this.baseUrl}/previews/${clientId}`;
    const blogUrls = blogPosts.map(p => `
  <url>
    <loc>${baseUrl}/blog/${p.slug}/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>${blogUrls}
</urlset>`;
  }

  generateRobots() {
    return `User-agent: *\nAllow: /\nSitemap: ${this.baseUrl}/sitemap.xml`;
  }

  /**
   * List all deployed preview sites.
   */
  async listPreviews() {
    const previews = [];
    try {
      const dir = this.previewsRoot;
      const entries = await fs.readdir(dir);
      for (const entry of entries) {
        const metaPath = path.join(dir, entry, 'meta.json');
        const meta = await fs.readFile(metaPath, 'utf-8').then(JSON.parse).catch(() => null);
        if (meta) previews.push(meta);
      }
    } catch { /* dir may not exist yet */ }
    return previews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}
