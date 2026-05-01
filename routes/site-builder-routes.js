/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Site Builder Routes — Done-for-you website pipeline
 *
 * Endpoints:
 *   POST /api/v1/sites/build       — Build a new site from a business URL
 *   POST /api/v1/sites/prospect    — Build mock site + send cold outreach email
 *   GET  /api/v1/sites/previews    — List all built preview sites
 *   GET  /api/v1/sites/prospects   — List all prospects in DB
 *   POST /api/v1/sites/follow-up   — Send follow-up email to a prospect
 *   GET  /api/v1/sites/pos-partners — List POS commission partners
 *
 * Usage (register in server.js):
 *   import { createSiteBuilderRoutes } from './routes/site-builder-routes.js';
 *   createSiteBuilderRoutes(app, { pool, requireKey, callCouncilMember, baseUrl, outreachAutomation });
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import SiteBuilder, { POS_PARTNERS } from '../services/site-builder.js';
import ProspectPipeline from '../services/prospect-pipeline.js';
import logger from '../services/logger.js';

let _siteBuilder = null;
let _prospectPipeline = null;

function getSiteBuilder({ callCouncilMember, baseUrl }) {
  if (!_siteBuilder) {
    _siteBuilder = new SiteBuilder({
      callCouncil: callCouncilMember,
      previewsDir: 'public/previews',
      baseUrl,
    });
  }
  return _siteBuilder;
}

function getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl }) {
  if (!_prospectPipeline) {
    const builder = getSiteBuilder({ callCouncilMember, baseUrl });

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
      callCouncil: callCouncilMember,
      sendEmail,
      baseUrl,
    });
  }
  return _prospectPipeline;
}

/**
 * Register site builder routes on the Express app.
 * Also registers static file serving for /previews/*.
 */
export function createSiteBuilderRoutes(app, { pool, requireKey, callCouncilMember, baseUrl, outreachAutomation, notificationService } = {}) {
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
    res.sendFile(filePath, (err) => { if (err) next(); });
  });

  /**
   * POST /api/v1/sites/build
   * Build a new site from a business URL.
   * Body: { url, businessInfo? }
   */
  router.post('/build', requireKey, buildLimiter, async (req, res) => {
    try {
      const { url, businessUrl, businessInfo } = req.body;
      const targetUrl = url || businessUrl;
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'url or businessUrl is required' });

      logger.info('[SITE] Build request', { url: targetUrl });
      const builder = getSiteBuilder({ callCouncilMember, baseUrl });
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
   * Body: { businessUrl, contactEmail?, contactName?, businessName?, skipEmail?, businessInfo? }
   */
  router.post('/prospect', requireKey, prospectLimiter, async (req, res) => {
    try {
      const { businessUrl, contactEmail, contactName, businessName, skipEmail, businessInfo } = req.body;
      if (!businessUrl) return res.status(400).json({ ok: false, error: 'businessUrl is required' });

      logger.info('[SITE] Prospect request', { businessUrl, contactEmail });
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });
      const result = await pipeline.processProspect({
        businessUrl, contactEmail, contactName, businessName, skipEmail, businessInfo,
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
  router.post('/bulk-prospect', requireKey, prospectLimiter, async (req, res) => {
    try {
      const { prospects = [] } = req.body;
      if (!prospects.length) return res.status(400).json({ ok: false, error: 'prospects array required' });
      if (prospects.length > 20) return res.status(400).json({ ok: false, error: 'Max 20 prospects per batch' });

      logger.info('[SITE] Bulk prospect request', { count: prospects.length });
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });

      const results = [];
      for (const prospect of prospects) {
        const result = await pipeline.processProspect(prospect);
        results.push(result);
      }

      const succeeded = results.filter(r => r.success).length;
      res.json({ ok: true, total: prospects.length, succeeded, failed: prospects.length - succeeded, results });
    } catch (err) {
      logger.error('[SITE] Bulk prospect error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/previews
   * List all built preview sites.
   */
  router.get('/previews', requireKey, async (req, res) => {
    try {
      const builder = getSiteBuilder({ callCouncilMember, baseUrl });
      const previews = await builder.listPreviews();
      res.json({ ok: true, count: previews.length, previews });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/prospects
   * List all prospects in DB.
   */
  router.get('/prospects', requireKey, async (req, res) => {
    try {
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });
      const prospects = await pipeline.listProspects(Number(req.query.limit) || 100);
      res.json({ ok: true, count: prospects.length, prospects });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * PATCH /api/v1/sites/prospects/:clientId/status
   * Update prospect status (e.g. mark as converted).
   * Body: { status, dealValue? }
   */
  router.patch('/prospects/:clientId/status', requireKey, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { status, dealValue } = req.body;

      await pool.query(
        `UPDATE prospect_sites SET status = $1, deal_value = COALESCE($2, deal_value) WHERE client_id = $3`,
        [status, dealValue || null, clientId]
      );
      res.json({ ok: true, clientId, status });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/follow-up
   * Send follow-up email to a prospect.
   * Body: { clientId, followUpNumber? }
   */
  router.post('/follow-up', requireKey, async (req, res) => {
    try {
      const { clientId, followUpNumber = 2 } = req.body;
      if (!clientId) return res.status(400).json({ ok: false, error: 'clientId required' });

      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });
      await pipeline.sendFollowUp(clientId, followUpNumber);
      res.json({ ok: true, clientId, followUpNumber });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/analyze
   * Score a prospect's EXISTING website to determine outreach priority.
   * Body: { businessUrl }
   */
  router.post('/analyze', requireKey, async (req, res) => {
    try {
      const { businessUrl, url } = req.body;
      const targetUrl = businessUrl || url;
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'businessUrl is required' });
      const { scoreProspectUrl } = await import('../services/site-builder-opportunity-scorer.js');
      const result = await scoreProspectUrl(targetUrl);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('[SITE] Analyze error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/pos-partners
   * List POS commission partners and their referral info.
   */
  router.get('/pos-partners', requireKey, (req, res) => {
    res.json({ ok: true, partners: POS_PARTNERS });
  });

  /**
   * GET /api/v1/sites/dashboard
   * Revenue and pipeline overview.
   */
  router.get('/dashboard', requireKey, async (req, res) => {
    try {
      const rows = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'qa_hold') AS qa_hold,
          COUNT(*) FILTER (WHERE status = 'built') AS built,
          COUNT(*) FILTER (WHERE status = 'sent') AS sent,
          COUNT(*) FILTER (WHERE status = 'viewed') AS viewed,
          COUNT(*) FILTER (WHERE status = 'replied') AS replied,
          COUNT(*) FILTER (WHERE status = 'converted') AS converted,
          COUNT(*) FILTER (WHERE status = 'lost') AS lost,
          COALESCE(SUM(deal_value) FILTER (WHERE status = 'converted'), 0) AS total_revenue,
          COUNT(*) AS total
        FROM prospect_sites
      `);
      const stats = rows.rows[0];
      res.json({ ok: true, pipeline: stats });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use('/api/v1/sites', router);

  logger.info('[SITE] Routes registered at /api/v1/sites/*');
}
