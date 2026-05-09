import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import SiteBuilder, { POS_PARTNERS } from '../services/site-builder.js';
import ProspectPipeline from '../services/prospect-pipeline.js';
import logger from '../services/logger.js';
import { getRegistryHealth } from '../services/env-registry-map.js'; // Added import for env-registry-map
let _siteBuilder = null;
let _prospectPipeline = null;

// --- Start of copied/adapted discovery logic from scripts/site-builder-prospect-discovery.mjs ---
const SUPPORTED_TYPES = ['wellness', 'yoga', 'massage', 'midwife', 'chiropractor', 'acupuncture', 'naturopath', 'physical-therapy', 'pilates', 'reiki', 'nutrition', 'counseling'];

async function searchGooglePlaces(city, type, apiKey, count) {
  const query = encodeURIComponent(`${type} business in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const json = await res.json();
    if (json.status === 'REQUEST_DENIED') {
      logger.error('Google Places apiKey rejected:', json.error_message);
      return [];
    }
    if (!json.results?.length) {
      logger.warn(`No Google Places results found for "${type}" in "${city}".`);
      return [];
    }
    return json.results.slice(0, count).map(place => ({
      name: place.name,
      website: place.website || null,
      address: place.formatted_address || null,
      rating: place.rating || null,
      city,
      type,
      source: 'google_places',
    }));
  } catch (err) {
    clearTimeout(timer);
    logger.error('Google Places fetch error:', err.message);
    return [];
  }
}
// --- End of copied/adapted discovery logic ---

async function notifySlack(event, businessName, detail = '') {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const emoji = event === 'replied' ? '💬' : '👀';
  const label = event === 'replied' ? 'REPLIED to cold email' : 'VIEWED preview';
  const text = `${emoji} Warm lead alert — ${label}\nBusiness: ${businessName}\n${detail}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Slack notify is best-effort
  }
}

function getSiteBuilder({ ccm, baseUrl }) {
  if (!_siteBuilder) {
    _siteBuilder = new SiteBuilder({
      callCouncil: ccm,
      previewsDir: 'public/previews',
      baseUrl,
    });
  }
  return _siteBuilder;
}

function getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl }) {
  if (!_prospectPipeline) {
    const builder = getSiteBuilder({ ccm, baseUrl });
    // Build sendEmail adapter — prefer NotificationService (Postmark + suppression),
    // fall back to outreachAutomation, then log-only.
    let sendEmail;
    if (notificationService) {
      sendEmail = async (to, subject, html) => {
        const result = await notificationService.sendEmail({ to, subject, html, text: '' });
        if (!result.success) logger.warn('[PROSPECT] Email not sent', { to, reason: result.error });
        return result;
      };
    } else if (outreachAutomation) {
      sendEmail = async (to, subject, html) => outreachAutomation.sendEmail(to, subject, html);
    } else {
      sendEmail = async (to, subject) => {
        logger.info('[PROSPECT] Email (no sender configured)', { to, subject });
      };
    }
    _prospectPipeline = new ProspectPipeline({
      siteBuilder: builder,
      pool,
      callCouncil: ccm,
      sendEmail,
      baseUrl,
    });
  }
  return _prospectPipeline;
}

/**
 * Register siteBld routes on the Express app. Also registers static file serving for /previews/.
 */
export function createSiteBuilderRoutes(app, { pool, rk, ccm, baseUrl, outreachAutomation, notificationService } = {}) {
  const router = Router();
  const buildLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // max 10 site builds per IP per hour
    message: { error: 'Too many site builds — try again in an hour' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  const prospectLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50, // max 50 prospects per IP per hour
    message: { error: 'Too many prospect requests — try again in an hour' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Serve preview sites statically at /previews/*
  app.use('/previews', async (req, res, next) => {
    const { default: path } = await import('path');
    const filePath = path.join(process.cwd(), 'public/previews', req.path === '/' ? '/index.html' : req.path);
    res.sendFile(filePath, (err) => {
      if (err) next();
    });
  });

  /**
   * POST /api/v1/sites/build
   * Build a new site from a business URL.
   * Body: { url, businessInfo? }
   */
  router.post('/build', rk, buildLimiter, async (req, res) => {
    try {
      const { url, businessUrl, businessInfo } = req.body;
      const targetUrl = url || businessUrl;
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'url or businessUrl is required' });

      logger.info('[SITE] Build request', { url: targetUrl });
      const builder = getSiteBuilder({ ccm, baseUrl });
      const result = await builder.buildFromUrl(targetUrl, { businessInfo });
      res.json({ ok: result.success, ...result });
    } catch (err) {
      logger.error('[SITE] Build error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/prospect
   * Build a mock site for a prospect + send cold outreach email.
   * Body: { businessUrl, contactEmail?, contactName?, businessName?, skipEmail?, businessInfo?
   */
  router.post('/prospect', rk, prospectLimiter, async (req, res) => {
    try {
      const { businessUrl, contactEmail, contactName, businessName, skipEmail, businessInfo } = req.body;
      if (!businessUrl) return res.status(400).json({ ok: false, error: 'businessUrl is required' });

      logger.info('[SITE] Prospect request', { businessUrl, contactEmail });
      const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
      const result = await pipeline.processProspect({
        businessUrl,
        contactEmail,
        contactName,
        businessName,
        skipEmail,
        businessInfo,
      });
      res.json({ ok: result.success, ...result });
    } catch (err) {
      logger.error('[SITE] Prospect pipeline error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/bulk-prospect
   * Process multiple prospects in batch.
   * Body: { prospects: [{ businessUrl, contactEmail, contactName, businessName }] }
   */
  router.post('/bulk-prospect', rk, prospectLimiter, async (req, res) => {
    try {
      const { prospects = [] } = req.body;
      if (!prospects.length) return res.status(400).json({ ok: false, error: 'prospects array required' });
      if (prospects.length > 20) return res.status(400).json({ ok: false, error: 'Max 20 prospects per batch' });

      logger.info('[SITE] Bulk prospect request', { count: prospects.length });
      const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
      const results = [];
      for (const prospect of prospects) {
        const result = await pipeline.processProspect(prospect);
        results.push(result);
      }
      res.json({ total: prospects.length, succeeded: results.filter(r => r.success).length, failed: prospects.length - results.filter(r => r.success).length, results });
    } catch (err) {
      logger.error('[SITE] Bulk prospect error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/discover
   * One-click discovery route for the cmdCtr to find new prospects.
   * Body: { city?: string, niche?: string, count?: number }
   * Response: { ok: true, discovered: number, prospects: object[], receipt: { source: string, city: string|null, niche: string|null } }
   */
  router.post('/discover', rk, async (req, res) => {
    try {
      const { city, niche, count } = req.body;
      const targetCity = city || 'San Diego, CA';
      const targetNiche = niche || 'wellness';
      const targetCount = Math.min(20, Math.max(1, parseInt(count, 10) || 10));

      if (!SUPPORTED_TYPES.includes(targetNiche)) {
        return res.status(400).json({
          ok: false,
          error: `Unsupported niche: "${targetNiche}". Supported: ${SUPPORTED_TYPES.join(', ')}`,
        });
      }

      const apiKey = process.env.GOOGLE_PLACES_KEY;
      let discoveredProspects = [];
      let source = 'manual_guidance';

      if (apiKey) {
        logger.info('[SITE] Discovering prospects via Google Places', { city: targetCity, niche: targetNiche, count: targetCount });
        discoveredProspects = await searchGooglePlaces(targetCity, targetNiche, apiKey, targetCount);
        source = 'google_places';
      } else {
        logger.warn('[SITE] Google Places API key not set. Returning manual guidance receipt.');
      }

      res.json({
        ok: true,
        discovered: discoveredProspects.length,
        prospects: discoveredProspects,
        receipt: {
          source: source,
          city: targetCity,
          niche: targetNiche,
        },
      });
    } catch (err) {
      logger.error('[SITE] Prospect discovery error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/analyze
   * Score a prospect's EXISTING website to determine outreach priority.
   * Body: { businessUrl }
   */
  router.post('/analyze', rk, async (req, res) => {
    try {
      const { businessUrl, url } = req.body;
      const targetUrl = businessUrl || url;
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'businessUrl is required' });

      const { scoreProspectUrl } = await import('../services/site-builder-opportunity-scorer.js');
      const result = await scoreProspectUrl(targetUrl);
      res.json({ ...result });
    } catch (err) {
      logger.error('[SITE] Analyze error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/previews
   * List all built preview sites.
   */
  router.get('/previews', rk, async (req, res) => {
    try {
      const builder = getSiteBuilder({ ccm, baseUrl });
      const previews = await builder.listPreviews();
      res.json