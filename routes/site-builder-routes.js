import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import SiteBuilder, { POS_PARTNERS } from '../services/site-builder.js';
import ProspectPipeline from '../services/prospect-pipeline.js';
import logger from '../services/logger.js';
import { getRegistryHealth } from '../services/env-registry-map.js'; // Added import for env-registry-map
let _siteBuilder = null;
let _prospectPipeline = null;
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
      res.json({
        total: prospects.length,
        succeeded: results.filter(r => r.success).length,
        failed: prospects.length - results.filter(r => r.success).length,
        results
      });
    } catch (err) {
      logger.error('[SITE] Bulk prospect error', { error: err.message });
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
      res.json({ count: previews.length, previews });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * GET /api/v1/sites/prospects
   * List all prospects in DB.
   */
  router.get('/prospects', rk, async (req, res) => {
    try {
      const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
      const prospects = await pipeline.listProspects(Number(req.query.limit) || 100);
      res.json({ count: prospects.length, prospects });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * GET /api/v1/sites/prospects/:clientId
   * Returns single prospect detail with full metadata + qualityReport
   */
  router.get('/prospects/:clientId', rk, async (req, res) => {
    try {
      const { clientId } = req.params;
      if (!clientId) return res.status(400).json({ ok: false, error: 'clientId required' });
      const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
      const prospect = await pipeline.getProspect(clientId);
      if (!prospect) return res.status(404).json({ ok: false, error: 'Prospect not found' });
      res.json({ ok: true, prospect });
    } catch (err) {
      logger.error('[SITE] Get prospect error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * PATCH /api/v1/sites/prospects/:clientId/status
   * Update prospect status (e.g. mark as converted).
   * Body: { status, dealValue? }
   */
  router.patch('/prospects/:clientId/status', rk, async (req, res) => {
    try {
      const { clientId } = req.params;
      const { status, dealValue } = req.body;
      await pool.query(
        `UPDATE prospect_sites SET status = $1, deal_value = COALESCE($2, deal_value), updated_at = NOW() WHERE client_id = $3`,
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
   */
  router.post('/follow-up', rk, async (req, res) => {
    try {
      const { clientId, followUpNumber = 2 } = req.body;
      if (!clientId) return res.status(400).json({ ok: false, error: 'clientId required' });
      const pipeline = getProspectPipeline({ ccm, pool, outreachAutomation, notificationService, baseUrl });
      const result = await pipeline.sendFollowUp(clientId, followUpNumber);
      if (!result.success) return res.status(500).json({ ok: false, error: result.error });
      res.json({ ok: true, clientId, followUpNumber });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * GET /api/v1/sites/pos-partners
   * List POS commission partner names.
   */
  router.get('/pos-partners', rk, async (req, res) => {
    try {
      res.json({ partners: POS_PARTNERS });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * GET /api/v1/sites/dashboard
   * Pipeline stats (total, built, qa_hold, sent, viewed, replied, converted, total_revenue).
   */
  router.get('/dashboard', rk, async (req, res) => {
    try {
      const { rows } = await pool.query(`
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
      const stats = rows[0];
      res.json({ ok: true, pipeline: stats });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * GET /api/v1/sites/pipeline-report
   * JSON pipeline summary for the command center.
   * Returns discovered prospects, outreach sent, viewed, replied, converted, and revenue totals.
   */
  router.get('/pipeline-report', rk, async (req, res) => {
    try {
      const { rows } = await pool.query(`
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
      const stats = rows[0];
      res.json({ ok: true, pipeline: stats });
    } catch (err) {
      logger.error('[SITE] Pipeline report error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * GET /api/v1/sites/launch-readiness
   * Returns GO/NO-GO truth for Site Builder based on envVar configuration.
   */
  router.get('/launch-readiness', rk, async (req, res) => {
    try {
      const healthReport = getRegistryHealth();
      const missingNeeded = healthReport.missingNeeded.map(v => v.name);
      const revenueBlockers = healthReport.revenueBlockers.map(v => v.name);
      const ready = healthReport.summary.healthy;
      res.json({
        ready,
        missing_needed: missingNeeded,
        revenue_blockers: revenueBlockers,
        checked_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('[SITE] Launch readiness error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * GET /api/v1/sites/preview-view
   * Tracking pixel — called by generated preview sites when a prospect opens them.
   * No auth required (called from prospect's browser).
   * Updates prospect status to 'viewed' if currently 'sent'.
   */
  router.get('/preview-view', async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
    try {
      const { rows } = await pool.query(
        `UPDATE prospect_sites
         SET status = 'viewed', last_viewed_at = NOW(), updated_at = NOW()
         WHERE client_id = $1 AND status = 'sent'
         RETURNING business_name`,
        [id]
      );
      if (rows.length > 0) {
        logger.info('[SITE] Prospect viewed preview', { clientId: id, businessName: rows[0].business_name });
        notifySlack('viewed', rows[0].business_name, `Preview URL: ${baseUrl}/previews/${id}/index.html`);
      }
      // Return a 1x1 transparent pixel
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': '43',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (err) {
      logger.error('[SITE] Preview view tracking error', { clientId: id, error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });
  /**
   * POST /api/v1/sites/postmark-webhook
   *