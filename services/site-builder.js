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
import { pickDesignSystems, getDesignSystem, renderDesignSystemDirectives, DEFAULT_DESIGN_SYSTEM_ID, getDesignSystemCss, getDesignSystemFontLinks } from './site-builder-design-systems.js';
import { renderDesignSystemLayout } from '../config/design-studio-layouts.js';
import { getVariantSwitcherHtml } from '../config/site-builder-switcher.js';
import { ingestAll } from './site-builder-asset-ingestion.js';
import { SITE_BUILDER_PRICING } from '../config/site-builder-pricing.js';
import { getModelForTask, getCandidateModelsForTask } from '../config/task-model-routing.js';
import { renderSalesDoctrineForPrompt } from '../config/site-builder-sales-doctrine.js';
import { matchIndustrySalesPack } from '../config/site-builder-industry-sales.js';

function createEditToken() {
  return crypto.randomBytes(24).toString('hex');
}

function safeJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function injectPreviewChrome(html, { clientId, baseUrl, editToken }) {
  if (!html || !clientId || !baseUrl) return html;
  const publishUrl = `/api/v1/sites/publish/checkout?clientId=${encodeURIComponent(clientId)}`;
  const editorUrl = `/api/v1/sites/editor?clientId=${encodeURIComponent(clientId)}&token=${encodeURIComponent(editToken || '')}`;
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
// Site generation uses the canonical task-model router. Start with a strong,
// paid, provider-diverse model (claude_sonnet for long-form HTML) and fail over
// across OpenAI lanes so the build never hard-fails and never sits idle per SO-003.
const GENERATION_CANDIDATES = [...new Set([
  getModelForTask('site_builder.generate_site') || 'claude_sonnet',
  'openai_builder_standard',
  'deepseek',
  'openai_builder_escalation',
  'openai_gpt',
  'gemini_flash',
  'openai_builder_mini',
])].filter(Boolean);
const REPAIR_CANDIDATES = [...new Set([
  getModelForTask('site_builder.repair_site') || 'openai_builder_standard',
  'claude_sonnet',
  'deepseek',
  'openai_builder_escalation',
  'openai_gpt',
  'gemini_flash',
  'openai_builder_mini',
])].filter(Boolean);
const EXTRACTION_CANDIDATES = [...new Set([
  getModelForTask('site_builder.extract_business') || 'deepseek',
  'openai_gpt',
  'claude_sonnet',
  'gemini_flash',
  'openai_builder_mini',
])].filter(Boolean);
const GENERATION_MODEL = GENERATION_CANDIDATES[0] || 'claude_sonnet';
const GENERATION_TIMEOUT_MS = Math.max(15_000, Number(process.env.SITE_BUILDER_GEN_TIMEOUT_MS || '60000'));
const PUPPETEER_LAUNCH_TIMEOUT_MS = Math.max(5_000, Number(process.env.SITE_BUILDER_PUPPETEER_LAUNCH_TIMEOUT_MS || '25000'));
// Real-data enrichment: search the business's Google/Yelp/Facebook presence for REAL
// reviews, ratings, and facts. Fails closed (no data) when no search provider key is set —
// never fabricates. Disabled entirely with SITE_BUILDER_ENRICH=false.
const ENRICHMENT_ENABLED = String(process.env.SITE_BUILDER_ENRICH || 'true') !== 'false';

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    // Ensure timer can fire even if the event loop is busy with a long AI call.
    if (typeof timer?.unref === 'function') timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Deterministic lean preview — no AI. Used for first-dollar / hang-bypass probes. */
export function renderLeanProspectHtml(info = {}, posPartner = null) {
  const partnerObj = posPartner || { name: 'booking', url: '#book' };
  const name = escapeHtml(info.businessName || 'Your Business');
  const tagline = escapeHtml(info.tagline || 'A clearer website for the work you already do');
  const industry = escapeHtml(info.industry || 'wellness');
  const location = escapeHtml(info.location || '');
  const primary = escapeHtml(info.primaryColor || '#0F766E');
  const accent = escapeHtml(info.accentColor || '#F59E0B');
  const services = (info.services || ['Consultation', 'Care', 'Follow-up']).slice(0, 6).map(escapeHtml);
  const pains = (info.painPoints || ['Hard to book online', 'Site feels outdated']).slice(0, 3).map(escapeHtml);
  const booking = escapeHtml(info.bookingUrl || partnerObj.url || '#book');
  const partner = escapeHtml(partnerObj.name || 'booking');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${name} | ${location || industry}</title>
<meta name="description" content="${tagline}"/>
<script src="${TAILWIND_CDN}"></script>
<style>
:root{--p:${primary};--a:${accent}}
:focus-visible{outline:3px solid var(--a);outline-offset:2px}
.sticky-cta{position:fixed;left:0;right:0;bottom:0;z-index:40}
</style>
</head>
<body class="bg-stone-50 text-stone-900">
<header class="sticky top-0 bg-white/95 border-b border-stone-200">
  <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
    <strong>${name}</strong>
    <a href="${booking}" class="px-4 py-2 rounded-lg text-white font-semibold" style="background:var(--p)">Book free call</a>
  </div>
</header>
<main>
  <section class="max-w-5xl mx-auto px-4 py-16 md:py-24">
    <p class="text-sm uppercase tracking-wide text-stone-500">${industry}${location ? ` · ${location}` : ''}</p>
    <h1 class="mt-3 text-4xl md:text-5xl font-semibold leading-tight">${tagline}</h1>
    <p class="mt-4 text-lg text-stone-600 max-w-2xl">This is a free preview upgrade for ${name}. No invented claims — just a clearer path to book.</p>
    <div class="mt-8 flex flex-wrap gap-3">
      <a href="${booking}" class="px-5 py-3 rounded-lg text-white font-semibold" style="background:var(--p)">Book your free consultation</a>
      <a href="#services" class="px-5 py-3 rounded-lg border border-stone-300 font-semibold">See services</a>
    </div>
  </section>
  <section class="bg-white border-y border-stone-200 py-16">
    <div class="max-w-5xl mx-auto px-4">
      <h2 class="text-2xl font-semibold">Does this sound familiar?</h2>
      <div class="mt-6 grid md:grid-cols-3 gap-4">
        ${pains.map((p) => `<div class="p-4 rounded-xl border border-stone-200 bg-stone-50"><p>${p}</p></div>`).join('')}
      </div>
    </div>
  </section>
  <section id="services" class="max-w-5xl mx-auto px-4 py-16">
    <h2 class="text-2xl font-semibold">How we help</h2>
    <div class="mt-6 grid md:grid-cols-3 gap-4">
      ${services.map((s) => `<div class="p-5 rounded-xl border border-stone-200"><h3 class="font-semibold">${s}</h3><p class="mt-2 text-stone-600">Request details or book a consult — pricing shared when confirmed.</p><a href="${booking}" class="inline-block mt-4 font-semibold" style="color:var(--p)">Book</a></div>`).join('')}
    </div>
  </section>
  <section class="py-16 text-white" style="background:var(--p)">
    <div class="max-w-5xl mx-auto px-4 text-center">
      <h2 class="text-3xl font-semibold">Ready to start?</h2>
      <p class="mt-3 opacity-90">Book through ${partner} when you are ready.</p>
      <a href="${booking}" class="inline-block mt-6 px-6 py-3 rounded-lg font-semibold bg-white text-stone-900">Book now</a>
    </div>
  </section>
</main>
<footer class="max-w-5xl mx-auto px-4 py-10 text-sm text-stone-500">
  <p>${name}${location ? ` · ${location}` : ''}</p>
  <p class="mt-2">Preview generated by Site Builder. Facts only from provided business profile.</p>
</footer>
<div class="sticky-cta md:hidden p-3 bg-white border-t border-stone-200">
  <a href="${booking}" class="block text-center px-4 py-3 rounded-lg text-white font-semibold" style="background:var(--p)">Book free call</a>
</div>
</body>
</html>`;
}

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

function renderAssetData(asset) {
  if (!asset) return 'ASSET DATA: NONE FOUND.\n- Use subtle gradient placeholders or CSS shapes for imagery; do not invent image URLs.\n';
  const lines = ['ASSET DATA (real images, social profiles, videos, testimonials — use these exact URLs):'];
  if (asset.images?.logo) lines.push(`- Logo URL: ${asset.images.logo}`);
  if (asset.images?.hero?.length) lines.push(`- Hero image URLs: ${asset.images.hero.join(', ')}`);
  if (asset.images?.team?.length) lines.push(`- Team/people image URLs: ${asset.images.team.join(', ')}`);
  if (asset.images?.product?.length) lines.push(`- Service/facility image URLs: ${asset.images.product.join(', ')}`);
  if (asset.images?.social?.length) lines.push(`- Social/Instagram image URLs: ${asset.images.social.map((i) => i.url).join(', ')}`);
  if (asset.social?.instagram) {
    const ig = asset.social.instagram;
    lines.push(`- Instagram @${ig.username}: ${ig.followers || 0} followers, ${ig.postsCount || 0} posts. Bio: "${String(ig.bio || '').slice(0, 160)}"`);
    if (ig.posts?.length) {
      for (const p of ig.posts.slice(0, 4)) {
        lines.push(`  Instagram post: ${p.displayUrl} — "${String(p.caption || '').slice(0, 120)}"`);
      }
    }
  }
  if (asset.social?.youtube?.videos?.length) {
    lines.push(`- YouTube videos: ${asset.social.youtube.videos.length} found.`);
    for (const v of asset.social.youtube.videos.slice(0, 4)) {
      lines.push(`  Video: ${v.embedUrl} — thumbnail ${v.thumbnailUrl} — "${v.title}"`);
    }
  }
  if (asset.social?.facebook?.url) lines.push(`- Facebook page: ${asset.social.facebook.url}`);
  if (asset.testimonials?.length) {
    lines.push(`- Real testimonials (${asset.testimonials.length} found):`);
    for (const t of asset.testimonials.slice(0, 4)) {
      lines.push(`  • "${String(t.text).slice(0, 240)}" — ${t.author}${t.source ? ` (${t.source})` : ''}`);
    }
  }
  if (asset.businessDetails?.address) lines.push(`- Address: ${asset.businessDetails.address}`);
  if (asset.businessDetails?.phone) lines.push(`- Phone: ${asset.businessDetails.phone}`);
  if (asset.businessDetails?.hours && Object.keys(asset.businessDetails.hours).length) {
    lines.push(`- Hours: ${JSON.stringify(asset.businessDetails.hours)}`);
  }
  return lines.join('\n') + '\n';
}

function renderIndustryBenchmarks(benchmarks) {
  if (!benchmarks?.standards?.length) return 'INDUSTRY BENCHMARKS: NOT AVAILABLE.\n';
  const lines = ['INDUSTRY BENCHMARKS (use this to build an honest "Digital Presence Score" section):'];
  lines.push(benchmarks.summary || 'Scores compare this business to typical small-business peers in the industry.');
  for (const s of benchmarks.standards) {
    lines.push(`- ${s.area}: client ${s.clientScore ?? '—'}/10 vs industry avg ${s.industryAverage ?? '—'}/10 — ${s.verdict}${s.notes ? ` (${s.notes})` : ''}`);
  }
  return lines.join('\n') + '\n';
}

function renderBlogPostsForPrompt(posts = []) {
  if (!posts.length) return 'BLOG POSTS: NONE PROVIDED — omit the blog preview section or label it Coming Soon.\n';
  const lines = ['BLOG POSTS (use these exact titles and excerpts for the "Latest from the Blog" cards; link to /blog/<slug>/):'];
  for (const p of posts.slice(0, 3)) {
    lines.push(`- Title: ${p.title || 'Blog post'}\n  Slug: ${p.slug || '#'}\n  Excerpt: ${p.excerpt || ''}`);
  }
  return lines.join('\n') + '\n';
}

function renderFaqForPrompt(faq = []) {
  if (!faq.length) return 'FAQ ITEMS: NONE PROVIDED — generate 5 useful Q&As from the business profile and common client questions. Each answer must be complete, not empty.\n';
  const lines = ['FAQ ITEMS (use these exact questions and answers in the FAQ accordion):'];
  for (const q of faq.slice(0, 8)) {
    lines.push(`Q: ${q.question || 'Question'}\nA: ${q.answer || ''}`);
  }
  return lines.join('\n') + '\n';
}

function renderVideoListForPrompt(videos = []) {
  if (!videos.length) return 'REAL VIDEOS: NONE PROVIDED — show an educational teaser or omit the video section.\n';
  const lines = ['REAL VIDEOS (embed these exact YouTube URLs as iframes in the video section):'];
  for (const v of videos.slice(0, 3)) {
    const url = typeof v === 'string' ? v : (v.embedUrl || v.url || `https://www.youtube.com/embed/${v.videoId || ''}`);
    lines.push(`- ${url}`);
  }
  return lines.join('\n') + '\n';
}

function extractVideoEmbedUrls(info = {}) {
  const videos = [];
  if (info.youtubeVideos?.length) videos.push(...info.youtubeVideos);
  if (info.assetData?.social?.youtube?.videos?.length) {
    for (const v of info.assetData.social.youtube.videos) {
      if (!videos.some((x) => (x.videoId || x.id) === (v.videoId || v.id))) {
        videos.push(v);
      }
    }
  }
  return videos;
}

export default class SiteBuilder {
  constructor({ callCouncil, previewsDir = 'public/previews', baseUrl = '', pool = null } = {}) {
    this.callCouncil = callCouncil;
    this.previewsDir = previewsDir;
    this.baseUrl = baseUrl;
    this.pool = pool;
  }

  /**
   * Try a list of council member keys in order; return the first successful response.
   * Implements SO-003: never sit idle on a provider error; fail over to the next strong model.
   */
  async callWithFallback(candidates, prompt, { maxOutputTokens = 4000, taskType = 'site_builder.generate_site', useCache = false, label = 'callWithFallback' } = {}) {
    let lastErr = null;
    for (const member of candidates) {
      try {
        const response = await withTimeout(
          this.callCouncil(member, prompt, { maxOutputTokens, allowModelDowngrade: false, useCache, taskType, builderExecution: true }),
          GENERATION_TIMEOUT_MS,
          `${label}:${member}`
        );
        return response;
      } catch (err) {
        lastErr = err;
        logger.warn('[SITE] model candidate failed, trying next', { member, label, taskType, error: err.message });
      }
    }
    throw new Error(`${label} failed on all candidates: ${lastErr?.message}`);
  }

  /**
   * Full pipeline: URL → scraped info → new site → deploy → return preview URL
   */
  async buildFromUrl(targetUrl, options = {}) {
    const clientId = options.clientId || `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const progress = async (stage) => {
      if (!onProgress) return;
      try { await onProgress(stage); } catch { /* non-fatal */ }
    };
    logger.info('[SITE] Building site from URL', { clientId, targetUrl });

    try {
      // Step 1: Scrape business info
      await progress('scrape');
      const businessInfo = await this.scrapeBusinessInfo(targetUrl, options);

      // Step 1b: Enrich with REAL data from the business's live web presence
      // (Google/Yelp/Facebook reviews, rating, facts). Fails closed — never fabricates.
      if (ENRICHMENT_ENABLED && options.enrich !== false) {
        try {
          await progress('enrich');
          businessInfo.verifiedData = await withTimeout(
            this.enrichWithRealData(businessInfo, options),
            Math.min(60_000, GENERATION_TIMEOUT_MS),
            'enrichWithRealData'
          );
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
          await progress('benchmark');
          benchmark = await this.benchmarkCompetitors(businessInfo, competitorUrls);
        } catch (err) {
          logger.warn('[SITE] competitor benchmark failed (continuing)', { clientId, error: err.message });
        }
        try {
          await progress('presence');
          presence = await this.auditPresence(businessInfo, competitorUrls);
        } catch (err) {
          logger.warn('[SITE] presence audit failed (continuing)', { clientId, error: err.message });
        }
      }

      // Step 2c: Generate shared content BEFORE the main site so the homepage can use real blog posts, FAQ, and videos.
      await progress(options.skipBlogs ? 'skip_blogs' : 'blogs');
      const blogPosts = options.skipBlogs ? [] : await withTimeout(this.generateBlogPosts(businessInfo, 3), GENERATION_TIMEOUT_MS, 'generateBlogPosts');
      let faq = [];
      try {
        faq = await withTimeout(this.generateFaq(businessInfo, 5), GENERATION_TIMEOUT_MS, 'generateFaq');
      } catch (err) {
        logger.warn('[SITE] FAQ generation failed (continuing)', { clientId, error: err.message });
      }
      const videos = businessInfo.youtubeVideos?.length
        ? businessInfo.youtubeVideos
        : (businessInfo.youtubeChannelId ? await this.fetchYouTubeVideos(businessInfo.youtubeChannelId) : []);
      businessInfo.blogPosts = blogPosts;
      businessInfo.faq = faq;
      businessInfo.youtubeVideos = videos;

      // Step 3: Generate main site HTML
      await progress('generate');
      let siteHtml = await this.generateSiteHtml(businessInfo, { clientId, posPartner, designBrief: benchmark?.designBrief, ...options });
      let qualityReport = this.scoreSiteHtml(siteHtml, businessInfo);

      // Step 3b: Deterministic patch — inject schema, focus styles, sticky CTA regardless of AI output
      siteHtml = this.patchSiteHtml(siteHtml, businessInfo);
      qualityReport = this.scoreSiteHtml(siteHtml, businessInfo);

      // Step 3c: AI repair passes for remaining quality gaps
      if (!options.skipRepair && this.callCouncil && qualityReport.scorePct < TARGET_QUALITY_SCORE && MAX_REPAIR_PASSES > 0) {
        for (let pass = 1; pass <= MAX_REPAIR_PASSES; pass++) {
          await progress(`repair_${pass}`);
          const repairedHtml = await withTimeout(
            this.improveSiteHtml(siteHtml, businessInfo, qualityReport, {
              clientId,
              posPartner,
              pass,
            }),
            GENERATION_TIMEOUT_MS,
            `improveSiteHtml:pass${pass}`
          );
          // Patch again after repair (AI may have dropped injected elements)
          const patchedRepair = this.patchSiteHtml(repairedHtml, businessInfo);
          const repairedScore = this.scoreSiteHtml(patchedRepair, businessInfo);
          if (repairedScore.scorePct <= qualityReport.scorePct) break;
          siteHtml = patchedRepair;
          qualityReport = repairedScore;
          if (qualityReport.scorePct >= TARGET_QUALITY_SCORE) break;
        }
      }

      // Step 4: Build blog index page from blog posts already generated before the main site HTML
      const blogHtml = this.generateBlogIndex(businessInfo, blogPosts);

      // Step 7: Generate SEO files
      const sitemap = this.generateSitemap(clientId, blogPosts);
      const robots = this.generateRobots();

      // Step 8: Deploy all files
      const deployDir = path.join(process.cwd(), this.previewsDir, clientId);
      await fs.mkdir(deployDir, { recursive: true });
      await fs.mkdir(path.join(deployDir, 'blog'), { recursive: true });
      const editToken = createEditToken();

      // Inject view tracking pixel — when prospect opens preview we auto-mark them as 'viewed'
      if (this.baseUrl) {
        const pixel = `<img src="/api/v1/sites/preview-view?id=${clientId}" style="position:absolute;opacity:0;pointer-events:none" width="1" height="1" alt="">`;
        siteHtml = siteHtml.includes('</body>') ? siteHtml.replace('</body>', `${pixel}\n</body>`) : siteHtml;
        siteHtml = injectPreviewChrome(siteHtml, { clientId, baseUrl: this.baseUrl, editToken });
      }
      await fs.writeFile(path.join(deployDir, 'index.html'), siteHtml);
      await fs.writeFile(path.join(deployDir, 'blog', 'index.html'), blogHtml);
      await fs.writeFile(path.join(deployDir, 'sitemap.xml'), sitemap);
      await fs.writeFile(path.join(deployDir, 'robots.txt'), robots);

      // Client-facing scorecard — before/after, industry benchmarks, competitor/presence.
      if (businessInfo.existingSiteScore || businessInfo.industryBenchmarks?.standards?.length || (benchmark && benchmark.analyzedCount > 0) || presence) {
        await fs.writeFile(
          path.join(deployDir, 'scorecard.html'),
          this.generateScorecardHtml(businessInfo, benchmark, presence, {
            before: businessInfo.existingSiteScore,
            after: qualityReport,
          }),
        );
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
        videos: (businessInfo.youtubeVideos || []).length,
        qualityReport,
        benchmark,
        presence,
        editToken,
        createdAt: new Date().toISOString(),
        previewUrl: `${this.baseUrl}/previews/${clientId}`,
        scorecardUrl: businessInfo.industryBenchmarks?.standards?.length || (benchmark && benchmark.analyzedCount > 0) || presence ? `${this.baseUrl}/previews/${clientId}/scorecard.html` : null,
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
        siteHtml,
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
    const clientId = options.clientId || `prev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const count = Math.max(1, Number(options.variantCount || process.env.SITE_BUILDER_VARIANTS || (SITE_BUILDER_PRICING.templates.freeCount + SITE_BUILDER_PRICING.templates.additional.slotCount) || 10));
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
      let benchmark = null;
      let presence = null;
      const competitorUrls = options.competitorUrls || businessInfo.competitorUrls || [];
      if (this.callCouncil && competitorUrls.length > 0) {
        try {
          benchmark = await this.benchmarkCompetitors(businessInfo, competitorUrls);
          designBrief = benchmark?.designBrief || null;
        } catch (err) {
          logger.warn('[SITE] competitor benchmark failed (continuing)', { clientId, error: err.message });
        }
        try {
          presence = await this.auditPresence(businessInfo, competitorUrls);
        } catch (err) {
          logger.warn('[SITE] presence audit failed (continuing)', { clientId, error: err.message });
        }
      }

      // Shared content (built once, reused across every variant)
      const blogPosts = options.skipBlogs ? [] : await this.generateBlogPosts(businessInfo, 3);
      let faq = [];
      try {
        faq = await withTimeout(this.generateFaq(businessInfo, 5), GENERATION_TIMEOUT_MS, 'generateFaq');
      } catch (err) {
        logger.warn('[SITE] variant FAQ generation failed (continuing)', { clientId, error: err.message });
      }
      const videos = businessInfo.youtubeVideos?.length
        ? businessInfo.youtubeVideos
        : (businessInfo.youtubeChannelId ? await this.fetchYouTubeVideos(businessInfo.youtubeChannelId) : []);
      businessInfo.blogPosts = blogPosts;
      businessInfo.faq = faq;
      businessInfo.youtubeVideos = videos;
      const blogHtml = options.skipBlogs ? '' : this.generateBlogIndex(businessInfo, blogPosts);
      const sitemap = this.generateSitemap(clientId, blogPosts);
      const robots = this.generateRobots();

      const deployDir = path.join(process.cwd(), this.previewsDir, clientId);
      await fs.mkdir(path.join(deployDir, 'blog'), { recursive: true });
      if (!options.skipBlogs) {
        await fs.writeFile(path.join(deployDir, 'blog', 'index.html'), blogHtml);
      }
      await fs.writeFile(path.join(deployDir, 'sitemap.xml'), sitemap);
      await fs.writeFile(path.join(deployDir, 'robots.txt'), robots);
      for (const post of blogPosts) {
        const postDir = path.join(deployDir, 'blog', post.slug);
        await fs.mkdir(postDir, { recursive: true });
        await fs.writeFile(path.join(postDir, 'index.html'), post.html);
      }

      const pixel = this.baseUrl
        ? `<img src="/api/v1/sites/preview-view?id=${clientId}" style="position:absolute;opacity:0;pointer-events:none" width="1" height="1" alt="">`
        : '';

      const variants = [];
      const variantHtmls = {};
      // Default: hand-authored layout shells so variants are structurally different.
      // Opt into the old same-funnel AI HTML path with useAiLayouts: true.
      const useLayoutShells = options.useAiLayouts !== true && options.useLayoutShells !== false;
      for (const ds of systems) {
        try {
          businessInfo.designSystemId = ds.id;
          businessInfo.designSystemName = ds.name;
          let html;
          let usedShell = false;
          if (useLayoutShells) {
            html = renderDesignSystemLayout(ds, businessInfo, posPartner);
            usedShell = Boolean(html);
          }
          if (!html) {
            html = await this.generateSiteHtml(businessInfo, { clientId, posPartner, designBrief, designSystem: ds, leanTemplate: options.leanTemplate, skipAi: options.skipAi });
          }
          html = this.patchSiteHtml(html, businessInfo);
          let quality = this.scoreSiteHtml(html, businessInfo);
          // Do not run AI repair on hand shells — repair homogenizes art direction.
          if (!usedShell && !options.skipRepair && this.callCouncil && quality.scorePct < TARGET_QUALITY_SCORE && MAX_REPAIR_PASSES > 0) {
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
          variantHtmls[ds.id] = html;
          variants.push({
            id: ds.id,
            name: ds.name,
            blurb: ds.blurb,
            tier: ds.tier || 'paid',
            file: `variants/${ds.id}/index.html`,
            scorePct: quality.scorePct,
            layoutShell: usedShell,
          });
        } catch (err) {
          logger.warn('[SITE] variant generation failed (skipping)', { clientId, style: ds.id, error: err.message });
        }
      }

      if (!variants.length) throw new Error('all variant generations failed');

      // Top-level qualityReport = the BEST-scoring variant. Callers (the prospect
      // pipeline's send-quality gate) need one canonical score to decide whether
      // this build is ready to email, same contract buildFromUrl provides.
      const bestVariant = variants.reduce((best, v) => (v.scorePct > (best?.scorePct ?? -1) ? v : best), null);
      if (bestVariant) {
        businessInfo.designSystemId = bestVariant.id;
        businessInfo.designSystemName = bestVariant.name;
      }
      let qualityReport = null;
      try {
        const bestHtml = variantHtmls[bestVariant.id];
        qualityReport = this.scoreSiteHtml(bestHtml, businessInfo);
      } catch (err) {
        logger.warn('[SITE] Could not re-score best variant (non-fatal)', { clientId, error: err.message });
        qualityReport = { scorePct: bestVariant.scorePct, readyToSend: bestVariant.scorePct >= MIN_SEND_SCORE, grade: null, issues: [] };
      }

      const editToken = createEditToken();
      const switcher = this.generateVariantSwitcher(businessInfo, clientId, variants, editToken, benchmark, presence);
      await fs.writeFile(path.join(deployDir, 'index.html'), switcher);

      if (businessInfo.existingSiteScore || businessInfo.industryBenchmarks?.standards?.length || (benchmark && benchmark.analyzedCount > 0) || presence) {
        await fs.writeFile(
          path.join(deployDir, 'scorecard.html'),
          this.generateScorecardHtml(businessInfo, benchmark, presence, {
            before: businessInfo.existingSiteScore,
            after: qualityReport,
          }),
        );
      }

      const metadata = {
        clientId,
        targetUrl,
        businessInfo,
        posPartner,
        variants,
        qualityReport,
        blogPosts: blogPosts.map((p) => ({ slug: p.slug, title: p.title })),
        editToken,
        createdAt: new Date().toISOString(),
        previewUrl: `${this.baseUrl}/previews/${clientId}`,
        scorecardUrl: businessInfo.industryBenchmarks?.standards?.length || (benchmark && benchmark.analyzedCount > 0) || presence ? `${this.baseUrl}/previews/${clientId}/scorecard.html` : null,
        editorUrl: this.baseUrl ? `${this.baseUrl}/api/v1/sites/editor?clientId=${clientId}&token=${editToken}` : null,
        publishCheckoutUrl: this.baseUrl ? `${this.baseUrl}/api/v1/sites/publish/checkout?clientId=${clientId}` : null,
        mode: 'variants',
      };
      // Write a lightweight meta.json to disk; keep the full variant HTMLs in
      // memory for the DB payload and the runtime variant-file fallback route.
      const diskMeta = { ...metadata };
      await fs.writeFile(path.join(deployDir, 'meta.json'), JSON.stringify(diskMeta, null, 2));

      // Durable DB payload: switcher as previewHtml + every variant HTML for
      // recovery when ephemeral disk is lost on another Railway instance.
      metadata.previewHtml = switcher;
      metadata.variantHtmls = variantHtmls;

      logger.info('[SITE] Variants deployed', { clientId, count: variants.length, previewUrl: metadata.previewUrl, bestScore: qualityReport.scorePct });
      return {
        success: true,
        clientId,
        previewUrl: metadata.previewUrl,
        businessName: businessInfo.businessName,
        variants,
        qualityReport,
        posPartner: posPartner.name,
        metadata,
        siteHtml: switcher,
      };
    } catch (err) {
      logger.error('[SITE] Variant build failed', { clientId, error: err.message });
      return { success: false, clientId, error: err.message };
    }
  }

  /**
   * Build the variant switcher shell: a top bar of design buttons + an iframe
   * that swaps between the generated variants, plus a light/dark toggle and
   * an interactive competitor comparison popup.
   */
  generateVariantSwitcher(info, clientId, variants, editToken = '', benchmark = null, presence = null) {
    return getVariantSwitcherHtml({ info, clientId, variants, editToken, benchmark, presence, baseUrl: this.baseUrl });
  }

  /**
   * Scrape business info from existing website using Puppeteer.
   * Extracts: name, tagline, services, contact, colors, testimonials, social links.
   */
  async scrapeBusinessInfo(url, options = {}) {
    // If manual info is provided (no scraping needed), use it directly, but
    // always attach the source URL so richer ingestion knows what to look up.
    if (options.businessInfo) {
      const info = options.businessInfo;
      if (!info.sourceUrl) info.sourceUrl = url;
      return info;
    }

    let puppeteer;
    let browser;
    try {
      puppeteer = await import('puppeteer');
      browser = await withTimeout(
        puppeteer.default.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] }),
        PUPPETEER_LAUNCH_TIMEOUT_MS,
        'puppeteer.launch'
      );
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

      // Score their existing site with the same objective rubric the new site
      // is judged by, so the "before" and "after" numbers are directly comparable.
      let existingSiteScore = null;
      try {
        const existingHtml = await page.content();
        existingSiteScore = this.scoreSiteHtml(existingHtml, {});
      } catch (err) {
        logger.warn('[SITE] Existing-site scoring failed (non-fatal)', { url, error: err.message });
      }

      await browser.close();

      // Use AI to extract structured business info from the raw scraped text
      const extracted = await this.extractBusinessInfoWithAI(scraped, url);
      return { ...scraped, ...extracted, sourceUrl: url, existingSiteScore };

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

    const response = await this.callWithFallback(EXTRACTION_CANDIDATES, prompt, { maxOutputTokens: 1000, taskType: 'extraction', useCache: false, label: 'extractBusinessInfoWithAI' });
    try {
      const jsonMatch = response.match(/\{[\s\S]+\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return {};
    }
  }

  /**
   * Enrich a business profile with REAL, sourced data from its live web presence
   * (Google Business, Yelp, Facebook, its own socials, Instagram, YouTube):
   * rating, review count, real review snippets, images, videos, and industry
   * benchmarks. Fails closed — never fabricates.
   */
  async enrichWithRealData(info, options = {}) {
    if (!info.businessName) return null;

    // Primary richer pipeline: discover the real homepage, social profiles,
    // testimonials, and images. This mutates info with discovered fields.
    let result = null;
    try {
      result = await ingestAll(info, {
        callCouncil: this.callCouncil,
        targetUrl: info.sourceUrl || options.targetUrl,
        timeoutMs: Math.min(65_000, GENERATION_TIMEOUT_MS),
      });
    } catch (err) {
      logger.warn('[SITE] asset ingestion failed (falling back to web search)', { error: err.message });
    }

    // If richer ingestion produced verified data and updated the profile, use it.
    if (result?.verifiedData && (result.verifiedData.rating || result.verifiedData.testimonials?.length)) {
      return result.verifiedData;
    }

    // Fallback to the original web-search-only path when asset ingestion found nothing.
    const search = createWebSearchService({
      BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    });
    const name = info.businessName;
    const locale = info.location ? ` ${info.location}` : '';
    const queries = [`${name}${locale} reviews rating`, `${name}${locale} yelp`, `${name}${locale} google reviews`, `${name}${locale} facebook`];
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
    if (!snippets.length || !this.callCouncil) return null;

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
    try {
      const resp = await this.callCouncil('groq_llama', prompt, { maxOutputTokens: 800, taskType: 'extraction', useCache: false, builderExecution: true });
      const m = resp.match(/\{[\s\S]+\}/);
      const parsed = m ? JSON.parse(m[0]) : null;
      if (!parsed) return null;
      const rating = typeof parsed.rating === 'number' && parsed.rating >= 1 && parsed.rating <= 5 ? parsed.rating : null;
      const testimonials = Array.isArray(parsed.testimonials)
        ? parsed.testimonials.filter((t) => t && typeof t.text === 'string' && t.text.trim().length > 12).slice(0, 4)
        : [];
      const facts = Array.isArray(parsed.facts) ? parsed.facts.filter((f) => typeof f === 'string' && f.trim()).slice(0, 4) : [];
      const designCues = Array.isArray(parsed.designCues) ? parsed.designCues.filter((d) => typeof d === 'string' && d.trim()).slice(0, 5) : [];
      if (!rating && !testimonials.length && !facts.length && !designCues.length) return null;
      return { rating, reviewCount: Number.isInteger(parsed.reviewCount) ? parsed.reviewCount : null, ratingSource: parsed.ratingSource || null, testimonials, facts, designCues };
    } catch (err) {
      logger.warn('[SITE] enrichment extraction failed', { error: err.message });
      return null;
    }
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
    const useLean = options.skipAi === true || options.leanTemplate === true;
    if (useLean) {
      logger.info('[SITE] lean template (no AI)', { clientId, businessName: info?.businessName });
      return renderLeanProspectHtml(info, posPartner);
    }
    const designIntel = await this.loadDesignIntel();
    const competitorBrief = designBrief?.text
      ? `\n\nCOMPETITOR-INFORMED DESIGN BRIEF (beat the market, do not copy):\n${designBrief.text}`
      : '';
    const designSystem = options.designSystem || pickDesignSystems(1, options.styleIds || [])[0];
    if (designSystem) {
      info.designSystemId = designSystem.id;
      info.designSystemName = designSystem.name;
    }
    const designSystemBlock = designSystem
      ? `\n\n${renderDesignSystemDirectives(designSystem, info)}`
      : '';
    const primary = designSystem?.tokens?.primary || info.primaryColor || '#7C3AED';
    const accent = designSystem?.tokens?.accent || info.accentColor || '#EC4899';
    const blogPosts = info.blogPosts || [];
    const faq = info.faq || [];
    const videos = extractVideoEmbedUrls(info);

    const salesDoctrine = renderSalesDoctrineForPrompt(info);
    const salesPack = matchIndustrySalesPack(info);
    const unanswered = (salesPack?.unansweredClientQuestions || []).slice(0, 8);
    const prompt = `You are building a COMPLETE, PRODUCTION-READY website for a local business (any industry — not wellness-default).

${salesDoctrine}

${unanswered.length ? `UNANSWERED CLIENT QUESTIONS FOR THIS INDUSTRY (start here — answer these on the page):\n${unanswered.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n` : 'UNANSWERED CLIENT QUESTIONS: Infer the top questions a buyer still has before hiring THIS business — put those on the page as interview/FAQ proof, not vanity copy.\n'}

BUSINESS PROFILE:
- Name: ${info.businessName || 'The Business'}
- Industry: ${info.industry || 'local business'}
- Tagline: ${info.tagline || 'Clear outcomes with a clear next step'}
- Services: ${(info.services || []).join(', ') || 'core services'}
- Target audience: ${info.targetAudience || 'local clients'}
- Location: ${info.location || ''}
- Address: ${info.address || ''}
- Hours: ${JSON.stringify(info.hours || {})}
- Unique value: ${info.uniqueValue || 'proven results and a clear path to book'}
- Tone: ${info.tone || 'professional and direct'}
- Client pain points: ${(info.painPoints || []).join('; ')}
- SEO keywords: ${(info.keywords || []).join(', ')}
- Phone: ${info.phone || ''}
- Email: ${info.email || ''}
- Booking URL: ${info.bookingUrl || '#book'}
- Search / IDX URL (if any): ${info.searchUrl || info.idxUrl || info.listingSearchUrl || ''}
- Brand colors: Primary ${primary}, Accent ${accent}
- Testimonials: ${(info.testimonials || []).join(' | ')}
${renderVerifiedData(info.verifiedData)}
${renderAssetData(info.assetData)}
${renderVideoListForPrompt(videos)}
${renderBlogPostsForPrompt(blogPosts)}
${renderFaqForPrompt(faq)}
PAYMENT/BOOKING SYSTEM:
- We recommend ${posPartner.name} for scheduling + payments
- Referral link: ${posPartner.url}
- Include a primary money CTA (Book / Schedule showing / Schedule consultation) that links to booking

TRUTH RULE (HIGHEST PRIORITY — overrides everything below):
- NEVER invent facts. Do not fabricate prices, dollar amounts, star ratings, review counts, client counts, years in business, awards, MLS ranks, or named testimonials/quotes.
- Use ONLY the concrete facts provided in BUSINESS PROFILE, VERIFIED REAL DATA, ASSET DATA, BLOG POSTS, FAQ ITEMS, and REAL VIDEOS. If a fact is not provided, leave it out entirely — do not guess or approximate.
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
9. Do NOT use placeholder lorem ipsum, fake star ratings with no basis, "Blog Post Title 1", "An excerpt from the blog post goes here", "[framemarker...]", or generic "AI agency" language
10. If real testimonials are missing, use a clearly labeled section like "What clients often appreciate" instead of fabricated quotes
11. Use real image/photo URLs from ASSET DATA when provided; otherwise use subtle gradient placeholders or CSS shapes
12. Embed the real YouTube URLs from REAL VIDEOS as iframes in the VIDEO SECTION when available
13. Do NOT include a "Digital Presence Score" section in the public page; that lives on the separate scorecard.html and must not appear here
14. Do NOT default to midwifery/spa/wellness language unless the BUSINESS PROFILE is that industry

CLICK FUNNEL STRUCTURE (visitor-state multi-path — adapt labels to THIS industry):
1. NAVIGATION: Logo + nav links + primary money CTA (sticky)
2. HERO: Outcome headline. Subheadline. Path doors by visitor state — e.g. Why this provider · How to choose / unanswered questions · Search/IDX or secondary offer when real. Always include schedule consult/showing. Use real logo/hero from ASSET DATA when available.
3. SOCIAL PROOF BAR: ONLY real provided metrics — else OMIT (never invent)
4. PROBLEM / UNANSWERED QUESTIONS: what buyers still need answered before they hire
5. SOLUTION SECTION: clear process / next steps
6. SERVICES SECTION: real services only; prices only if provided
7. WHY THIS PROVIDER: proof from real facts + interview questions buyers should ask
8. TESTIMONIALS: real only, or clearly labeled samples
9. OFFER/PACKAGES: real pricing only — else request pricing / book CTA
10. ABOUT SECTION: brief, personal, truthful
11. FAQ SECTION: 5 Q&As (Alpine accordion) from FAQ ITEMS or inferred unanswered questions
12. BLOG PREVIEW: from BLOG POSTS or omit
13. VIDEO SECTION: real YouTube only or omit
14. BOOKING CTA SECTION: full-width money action
15. FOOTER + MOBILE STICKY CTA

SEO REQUIREMENTS:
- <title> tag: [Business Name] | [City] [Industry] | [Tagline]
- <meta name="description"> with natural keyword inclusion
- Schema.org LocalBusiness JSON-LD in <head>
- Open Graph tags (og:title, og:description, og:type=website)
- Include only truthful schema properties that are supported by the provided business data
- All H1/H2/H3 hierarchy correct (only ONE h1)
- Alt text on any images. Use real external image URLs from ASSET DATA when available; otherwise gradient placeholders
- Internal links between sections

DESIGN INTELLIGENCE:
${designIntel}${competitorBrief}${designSystemBlock}

DESIGN REQUIREMENTS:
- Use Tailwind utility classes for layout and components, plus the MANDATORY CSS <style> block from the DESIGN SYSTEM SPEC above for theme tokens, fonts, and visual effects
- Primary color: ${primary} and Accent color: ${accent} are used as described in the DESIGN SYSTEM SPEC
- The DESIGN SYSTEM SPEC is the source of truth for color, typography, layout, motifs, and anti-patterns — follow it exactly
- Make the site feel custom to this business, not like a generic template
- Avoid default purple-on-white unless the extracted brand colors actually call for it
- Use stronger hierarchy, editorial spacing, clear card groupings, and at least one visually distinctive section treatment
- Use subtle motion only where it improves clarity; avoid heavy animations and anything that hurts performance
- CTA buttons: large tap targets, high contrast, clear hover/focus states
- Section padding: py-16 md:py-24
- Keep the page fast and conversion-focused: concise copy, strong above-the-fold trust, repeated CTA placement, no dead sections
- Both beauty AND financial activity — a pretty brochure with no path to money is a failed build

Output the ENTIRE HTML file from <!DOCTYPE html> to </html> then BUILD_COMPLETE.`;

    if (!this.callCouncil) throw new Error('callCouncil required for site generation');

    const response = await this.callWithFallback(GENERATION_CANDIDATES, prompt, { maxOutputTokens: GENERATION_MAX_TOKENS, taskType: 'site_builder.generate_site', useCache: false, label: 'generateSiteHtml' });
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
    const phone = info.phone || '';
    const email = info.email || '';
    const bookingUrl = info.bookingUrl || '#book';
    const name = info.businessName || 'the practice';

    // 0. Inject shared design-system tokens, Google Fonts, and body marker so the
    // AI-generated design system is enforced regardless of which Tailwind classes the model emits.
    const designSystem = getDesignSystem(info.designSystemId) || getDesignSystem(DEFAULT_DESIGN_SYSTEM_ID);
    const primary = designSystem?.tokens?.primary || info.primaryColor || '#0F766E';
    const accent = designSystem?.tokens?.accent || info.accentColor || '#F59E0B';
    if (designSystem && !h.includes('<!--design-system-tokens-->')) {
      const fontLinks = getDesignSystemFontLinks(designSystem)
        .filter((link) => !h.includes(link))
        .join('\n');
      const dsCss = `<style>\n${getDesignSystemCss(designSystem, primary, accent)}\n</style>\n<!--design-system-tokens-->`;
      const dsBlock = fontLinks ? `${fontLinks}\n${dsCss}` : dsCss;
      h = h.includes('</head>')
        ? h.replace('</head>', `${dsBlock}\n</head>`)
        : dsBlock + h;
    }
    if (!/<body\b[^>]*data-lumin-ds/i.test(h)) {
      h = h.replace(/<body\b([^>]*)>/i, '<body data-lumin-ds="1" data-theme="light"$1>');
    } else if (!/<body\b[^>]*data-theme/i.test(h)) {
      h = h.replace(/<body\b([^>]*)>/i, '<body data-theme="light"$1>');
    }

    // 0a. Theme query-param + postMessage support so the preview switcher can toggle light/dark.
    const themeScript = `<script>
(function(){ var p = new URLSearchParams(location.search); var t = p.get('theme') === 'dark' ? 'dark' : 'light'; document.body.setAttribute('data-theme', t); window.addEventListener('message', function(e){ if(e && e.data && e.data.type === 'lumin-theme'){ document.body.setAttribute('data-theme', e.data.theme || 'light'); } }, false); })();
</script>`;
    if (!h.includes('lumin-theme')) {
      h = h.includes('</body>') ? h.replace('</body>', `${themeScript}\n</body>`) : h + themeScript;
    }

    // 0b. Remove any customer-facing Digital Presence Score section if the model emitted one
    h = h.replace(/<section[^>]*\bdata-section=["']digital-presence-score["'][^>]*>[\s\S]*?<\/section>/gi, '');
    h = h.replace(/<section[^>]*>[^]*?\bDigital Presence Score\b[^]*?<\/section>/gi, (match) => {
      return match.length > 0 ? '' : match;
    });

    // 0c. Replace placeholder blog titles/excerpts with real blog posts if available
    const blogPosts = info.blogPosts || [];
    if (blogPosts.length && /Blog Post Title|An excerpt from the blog post goes here/i.test(h)) {
      let blogIdx = 0;
      h = h.replace(/Blog Post Title \d+/gi, () => blogPosts[blogIdx]?.title || 'Blog Post');
      h = h.replace(/An excerpt from the blog post goes here\.?\.?/gi, () => blogPosts[blogIdx]?.excerpt || 'Read more on the blog.');
    }

    // 0c.1 If no blog posts were generated, remove any "Coming Soon" blog placeholder section.
    if (!blogPosts.length) {
      h = h.replace(/<section[^>]*>[\s\S]*?Coming Soon:[\s\S]*?<\/section>/gi, '');
      h = h.replace(/<p[^>]*>\s*Coming Soon:[\s\S]*?<\/p>/gi, '');
    }

    // 0d. Replace [framemarker...] placeholders with real YouTube embeds or remove them
    const videos = extractVideoEmbedUrls(info);
    h = h.replace(/\[\s*framemarker[^\]]*\]/gi, (match) => {
      const video = videos.find((v) => !v.used);
      if (video) {
        video.used = true;
        return `<iframe width="560" height="315" src="${video.embedUrl || video.url}" title="${video.title || 'Video'}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full rounded-2xl"></iframe>`;
      }
      return '';
    });

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

${renderSalesDoctrineForPrompt(info)}

BUSINESS PROFILE:
- Name: ${info.businessName || 'The Business'}
- Industry: ${info.industry || 'local business'}
- Services: ${(info.services || []).join(', ') || 'core services'}
- Target audience: ${info.targetAudience || 'local clients'}
- Location: ${info.location || ''}
- Tone: ${info.tone || 'professional and direct'}
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

    const response = await this.callWithFallback(REPAIR_CANDIDATES, prompt, { maxOutputTokens: REPAIR_MAX_TOKENS, taskType: 'site_builder.repair_site', useCache: false, label: 'improveSiteHtml' });
    const clean = String(response || '').replace(/BUILD_COMPLETE[\s\S]*$/, '').trim();
    if (!clean.includes('<!DOCTYPE html') && !clean.includes('<html')) {
      logger.warn('[SITE] repair pass returned non-HTML; falling back to existing site', { scorePct: qualityReport?.scorePct });
      return existingHtml;
    }
    return clean;
  }

  /**
   * Generate SEO blog posts for the business's industry.
   * Generate one post per call so truncation never corrupts the JSON array.
   */
  async generateBlogPosts(info, count = 3) {
    if (!this.callCouncil) return [];

    const posts = [];
    for (let i = 0; i < count; i++) {
      const prompt = `Generate 1 SEO-optimized blog post for a ${info.industry || 'wellness'} business called "${info.businessName || 'the practice'}".

Target audience: ${info.targetAudience || 'local clients'}
Keywords to include: ${(info.keywords || []).join(', ')}
Location: ${info.location || 'local area'}

Return ONLY a valid JSON object:
{
  "title": "SEO-optimized blog title with keyword",
  "slug": "url-friendly-slug",
  "metaDescription": "150-160 char meta description with keyword",
  "excerpt": "2-3 sentence preview of the post",
  "content": "Full 400-500 word blog post in plain HTML (use <h2>, <h3>, <p>, <ul>, <li> tags). Include the business name naturally. End with a CTA to book a consultation."
}`;

      try {
        const response = await this.callWithFallback(GENERATION_CANDIDATES, prompt, { maxOutputTokens: 4000, taskType: 'site_builder.generate_blogs', useCache: false, label: `generateBlogPosts:${i}` });
        const jsonMatch = response.match(/\{[\s\S]+\}/);
        const post = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        if (post && post.title && post.content) {
          posts.push({ ...post, html: this.wrapBlogPost(post, info) });
        }
      } catch (err) {
        logger.warn('[SITE] blog post generation failed (continuing)', { index: i, error: err.message });
      }
    }
    return posts;
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
   * Generate 5 real FAQ questions and answers for the business.
   */
  async generateFaq(info, count = 5) {
    if (!this.callCouncil) return [];
    const prompt = `Generate ${count} real, useful FAQ questions and answers for a ${info.industry || 'wellness'} business called "${info.businessName || 'the practice'}".

Target audience: ${info.targetAudience || 'local clients'}
Location: ${info.location || 'local area'}
Services: ${(info.services || []).join(', ') || 'wellness services'}
Unique value: ${info.uniqueValue || ''}
${renderVerifiedData(info.verifiedData)}

Return ONLY a valid JSON array:
[
  { "question": "...", "answer": "..." }
]

Each answer must be a complete, helpful sentence. If a specific fact is unknown, say "This is best discussed during your free consultation." — do not leave an answer empty or use placeholder text.`;
    try {
      const response = await this.callWithFallback(GENERATION_CANDIDATES, prompt, { maxOutputTokens: 2500, taskType: 'site_builder.generate_faq', useCache: false, label: 'generateFaq' });
      const m = response.match(/\[[\s\S]+\]/);
      const faq = m ? JSON.parse(m[0]) : [];
      return Array.isArray(faq) ? faq.slice(0, count) : [];
    } catch (err) {
      logger.warn('[SITE] FAQ generation failed', { error: err.message });
      return [];
    }
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
   * Render a client-facing scorecard page: before/after, competitor scores,
   * presence audit, and industry benchmarks.
   */
  generateScorecardHtml(info, benchmark, presence = null, beforeAfter = null) {
    const designSystem = getDesignSystem(info.designSystemId) || getDesignSystem(DEFAULT_DESIGN_SYSTEM_ID);
    const primary = designSystem?.tokens?.primary || info.primaryColor || '#0F766E';
    const accent = designSystem?.tokens?.accent || info.accentColor || '#F59E0B';
    const name = info.businessName || 'Your Business';
    const fontLinks = getDesignSystemFontLinks(designSystem).join('\n');
    const dsCss = getDesignSystemCss(designSystem, primary, accent);
    const presenceSection = presence ? this.generatePresenceSectionHtml(presence, primary, accent) : '';
    const beforeAfterSection = beforeAfter && beforeAfter.before && beforeAfter.after
      ? this.generateBeforeAfterSectionHtml(beforeAfter.before, beforeAfter.after, primary, accent)
      : '';
    const industrySection = info.industryBenchmarks?.standards?.length
      ? this.generateIndustryBenchmarksSectionHtml(info.industryBenchmarks, primary, accent)
      : '';
    const siteScore = beforeAfter?.after?.scorePct ?? 0;
    const benchmarkScores = info.industryBenchmarks?.standards?.map((s) => s.clientScore).filter((s) => typeof s === 'number') || [];
    const benchmarkAvg = benchmarkScores.length ? Math.round(benchmarkScores.reduce((a, b) => a + b, 0) / benchmarkScores.length) : null;
    const overall = this.renderOverallRings(siteScore, benchmarkAvg);
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
<title>${this.escapeHtml(name)} — Site Scorecard</title>
${fontLinks}
<style>
  ${dsCss}
  *{box-sizing:border-box}
  body[data-lumin-ds]{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body);line-height:1.6}
  h1,h2,h3,h4{font-family:var(--font-display);margin:0 0 .5rem}
  header{background:linear-gradient(135deg,var(--primary),var(--accent));color:var(--button-text,#fff);padding:48px 24px;text-align:center}
  header h1{margin:0 0 8px;font-size:clamp(1.8rem,5vw,2.6rem)}
  header p{margin:0;opacity:.9}
  main{max-width:1040px;margin:0 auto;padding:32px 20px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:24px;margin-bottom:20px;box-shadow:var(--shadow)}
  .card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .host{font-weight:700;font-size:18px;font-family:var(--font-display)}
  .score{font-weight:800;font-size:20px;color:var(--primary);background:var(--overlay);padding:4px 12px;border-radius:999px}
  .summary{color:var(--muted);margin:.25rem 0 1rem}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  @media(max-width:640px){.cols{grid-template-columns:1fr}}
  h4{margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;font-family:var(--font-body)}
  h4.good{color:#16a34a}h4.bad{color:#dc2626}
  ul{margin:0;padding-left:18px;color:var(--text);font-size:14px;line-height:1.6}
  .beat{background:var(--card);border:2px solid var(--primary);border-radius:var(--radius);padding:24px;margin-top:8px;box-shadow:var(--shadow)}
  .beat h3{margin:0 0 10px;color:var(--primary);font-family:var(--font-display)}
  .section-title{font-size:clamp(1.3rem,3vw,1.7rem);margin:8px 0 16px;font-family:var(--font-display)}
  .ring-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:24px;justify-items:center;margin-bottom:24px}
  .ring-wrap{display:flex;flex-direction:column;align-items:center;gap:8px}
  .score-ring{width:100px;height:100px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:1.6rem;background:conic-gradient(var(--primary) calc(var(--pct,0) * 1%), var(--line) 0);color:var(--text);position:relative}
  .score-ring::before{content:'';position:absolute;width:80px;height:80px;border-radius:50%;background:var(--card)}
  .score-ring span{position:relative;z-index:1;font-family:var(--font-display)}
  .ring-label{font-size:.8rem;color:var(--muted);text-align:center}
  .bar-track{width:100%;height:8px;background:var(--line);border-radius:999px;overflow:hidden}
  .bar-fill{height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));width:calc(var(--pct) * 1%)}
  .metric{display:flex;align-items:center;justify-content:space-between;font-size:.95rem;margin-bottom:4px;color:var(--text)}
  table.presence,table.ib{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}
  table.presence th,table.presence td,table.ib th,table.ib td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--line);font-size:14px}
  table.presence th,table.ib th{background:var(--overlay);font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-family:var(--font-body)}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700}
  .b-ahead{background:#dcfce7;color:#166534}.b-behind{background:#fee2e2;color:#991b1b}
  .b-even{background:#e5e7eb;color:#374151}.b-open{background:#fef9c3;color:#854d0e}.b-unknown{background:var(--overlay);color:var(--muted)}
  .gap{background:var(--card);border-left:4px solid var(--primary);border-radius:var(--radius);padding:18px 20px;margin:16px 0;box-shadow:var(--shadow)}
  .ba-wrap{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;align-items:stretch;margin-bottom:8px}
  .ba-col{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px;box-shadow:var(--shadow)}
  .ba-col.before{border-top:4px solid #dc2626}
  .ba-col.after{border-top:4px solid #16a34a}
  .ba-label{font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--muted);margin-bottom:6px}
  .ba-score{font-size:40px;font-weight:800;line-height:1;font-family:var(--font-display)}
  .ba-col.before .ba-score{color:#dc2626}
  .ba-col.after .ba-score{color:#16a34a}
  .ba-grade{font-size:14px;color:var(--muted);margin-bottom:12px}
  .ba-arrow{display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--primary);font-weight:800}
  .ba-issues{margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:var(--text)}
  @media(max-width:640px){.ba-wrap{grid-template-columns:1fr}.ba-arrow{transform:rotate(90deg);padding:4px 0}}
</style></head>
<body data-lumin-ds="1">
<header>
  <h1>Your Site Scorecard for ${this.escapeHtml(name)}</h1>
  <p>An honest look at where you stand today, what we changed, and how you compare.</p>
</header>
<main>
  ${overall}
  ${beforeAfterSection}
  ${industrySection}
  ${presenceSection}
  ${cards ? `<h2 class="section-title">Competitor websites, scored</h2>${cards}` : ''}
  ${beat ? `<div class="beat"><h3>How your new site wins</h3><ul>${beat}</ul></div>` : ''}
  ${!beforeAfterSection && !industrySection && !presenceSection && !cards ? '<p>No sites could be analyzed.</p>' : ''}
</main>
</body></html>`;
  }

  /**
   * Render a pair of score rings for the new site and the digital presence benchmark.
   */
  renderOverallRings(siteScorePct, benchmarkAvg) {
    if (!siteScorePct && benchmarkAvg == null) return '';
    const items = [];
    if (siteScorePct) {
      items.push(`<div class="ring-wrap"><div class="score-ring" style="--pct:${Math.min(100, siteScorePct)}"><span>${siteScorePct}%</span></div><div class="ring-label">New site quality</div></div>`);
    }
    if (benchmarkAvg != null) {
      items.push(`<div class="ring-wrap"><div class="score-ring" style="--pct:${Math.min(100, benchmarkAvg * 10)}"><span>${benchmarkAvg}/10</span></div><div class="ring-label">Digital presence score</div></div>`);
    }
    return `<div class="ring-grid">${items.join('')}</div>`;
  }

  /**
   * Render the industry-benchmark scorecard: where the business leads or
   * lags against typical small-business peers in each digital area.
   */
  generateIndustryBenchmarksSectionHtml(benchmarks, primary, accent) {
    const standards = benchmarks.standards || [];
    const rows = standards.map((s) => {
      const pct = Math.min(100, Math.max(0, ((s.clientScore ?? 0) / 10) * 100));
      const avgPct = Math.min(100, Math.max(0, ((s.industryAverage ?? 0) / 10) * 100));
      return `<tr>
        <td>${this.escapeHtml(s.area)}</td>
        <td><div class="metric"><span><strong>${s.clientScore ?? '—'}</strong>/10</span></div><div class="bar-track"><div class="bar-fill" style="--pct:${pct}"></div></div></td>
        <td><div class="metric"><span><strong>${s.industryAverage ?? '—'}</strong>/10</span></div><div class="bar-track"><div class="bar-fill" style="--pct:${avgPct};background:var(--line)"></div></div></td>
        <td>${this.escapeHtml(s.verdict)}${s.notes ? ` <small style="color:var(--muted)">(${this.escapeHtml(s.notes)})</small>` : ''}</td>
      </tr>`;
    }).join('');
    const scores = standards.map((s) => s.clientScore).filter((s) => typeof s === 'number');
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const avgPct = Math.min(100, avg * 10);
    return `<h2 class="section-title">Your digital presence vs. industry averages</h2>
  <div class="card">
    <div class="ring-wrap" style="align-items:flex-start;margin-bottom:18px">
      <div class="score-ring" style="--pct:${avgPct}"><span>${avg}</span></div>
      <div class="ring-label">Overall presence score (out of 10)</div>
    </div>
    <p style="color:var(--muted);font-size:14px;margin-bottom:16px">${this.escapeHtml(benchmarks.summary || 'Directional scores based on publicly available metrics vs typical peers.')}</p>
    <table class="ib">
      <thead><tr><th>Area</th><th>You</th><th>Industry avg</th><th>Verdict</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
  }

  /**
   * Render the before/after site-score comparison — same objective rubric
   * (scoreSiteHtml) applied to the prospect's existing site and the new one,
   * so the improvement is a real, comparable number, not a marketing claim.
   */
  generateBeforeAfterSectionHtml(before, after, primary, accent) {
    const beforeIssues = (before.summaryIssues || before.issues || []).slice(0, 5)
      .map(x => `<li>${this.escapeHtml(x)}</li>`).join('') || '<li>—</li>';
    const afterFixed = (before.summaryIssues || before.issues || [])
      .filter(issue => !(after.issues || []).includes(issue))
      .slice(0, 5)
      .map(x => `<li>${this.escapeHtml(x)}</li>`).join('') || '<li>Every issue below was resolved.</li>';
    return `<h2 class="section-title">Before &amp; After — Same Scoring, Real Numbers</h2>
    <div class="ba-wrap">
      <div class="ba-col before">
        <div class="ba-label">Your current site</div>
        <div class="ba-score">${before.scorePct}%</div>
        <div class="ba-grade">Grade ${this.escapeHtml(before.grade || '—')}</div>
        <div class="ba-label">Why it scores this way</div>
        <ul class="ba-issues">${beforeIssues}</ul>
      </div>
      <div class="ba-arrow">&#8594;</div>
      <div class="ba-col after">
        <div class="ba-label">Your new site</div>
        <div class="ba-score">${after.scorePct}%</div>
        <div class="ba-grade">Grade ${this.escapeHtml(after.grade || '—')}</div>
        <div class="ba-label">What we fixed</div>
        <ul class="ba-issues">${afterFixed}</ul>
      </div>
    </div>`;
  }

  /**
   * Render the head-to-head presence section: per-channel you-vs-competitors
   * table + plain-English gap/opportunity readout.
   */
  generatePresenceSectionHtml(presence, primary, accent) {
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
        return `<tr><td>${labels[c.channel] || c.channel}</td><td>${you}</td><td>${comp} <small style="color:var(--muted)">(${c.competitorsPresent}/${c.totalCompetitors})</small></td><td>${verdictBadge(c.verdict)}</td></tr>`;
      })
      .join('');
    const gap = presence.gap || {};
    const quickWins = (gap.quickWins || []).map(w => `<li>${this.escapeHtml(w)}</li>`).join('');
    return `<h2 class="section-title">Your online presence vs. competitors</h2>
    <div class="card">
      <table class="presence">
        <thead><tr><th>Channel</th><th>You</th><th>Competitors (avg)</th><th>Verdict</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${gap.summary ? `<div class="gap"><p>${this.escapeHtml(gap.summary)}</p>${gap.biggestOpportunity ? `<p><strong>Biggest opportunity:</strong> ${this.escapeHtml(gap.biggestOpportunity)}</p>` : ''}${quickWins ? `<p><strong>Quick wins:</strong></p><ul>${quickWins}</ul>` : ''}</div>` : ''}
    </div>`;
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
   * List all deployed preview sites. Merges disk previews with durable Postgres
   * metadata so Railway redeploys / ephemeral disk wipes do not hide previews.
   */
  async listPreviews() {
    const byId = new Map();
    try {
      const dir = path.join(process.cwd(), this.previewsDir);
      const entries = await fs.readdir(dir);
      for (const entry of entries) {
        const metaPath = path.join(dir, entry, 'meta.json');
        const meta = await fs.readFile(metaPath, 'utf-8').then(JSON.parse).catch(() => null);
        if (meta?.clientId) byId.set(meta.clientId, meta);
      }
    } catch { /* dir may not exist yet */ }

    if (this.pool) {
      try {
        const result = await this.pool.query(
          `SELECT client_id, business_name, preview_url, email_sent, status, metadata, created_at, updated_at
             FROM prospect_sites
            WHERE status IN ('built', 'qa_hold', 'sent', 'viewed', 'converted')
              AND metadata->>'previewUrl' IS NOT NULL
              AND metadata->>'editToken' IS NOT NULL
            ORDER BY updated_at DESC
            LIMIT 200`
        );
        for (const row of result.rows || []) {
          const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
          const clientId = row.client_id;
          const preview = byId.get(clientId) || {
            clientId,
            businessName: row.business_name || meta.businessName,
            businessInfo: meta.businessInfo || {},
            previewUrl: meta.previewUrl || row.preview_url,
            editToken: meta.editToken,
            scorecardUrl: meta.scorecardUrl,
            editorUrl: meta.editorUrl,
            publishCheckoutUrl: meta.publishCheckoutUrl,
            status: row.status,
            createdAt: row.created_at?.toISOString?.() || meta.createdAt,
            updatedAt: row.updated_at?.toISOString?.() || meta.updatedAt,
          };
          byId.set(clientId, preview);
        }
      } catch (err) {
        logger.warn('[SITE] listPreviews DB merge failed', { error: err.message });
      }
    }

    return Array.from(byId.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}
