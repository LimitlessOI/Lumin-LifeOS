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

/**
 * Fire a Slack warm-lead notification if SLACK_WEBHOOK_URL is configured.
 * Non-blocking — errors are swallowed so they never affect the caller.
 */
async function notifySlack(event, businessName, detail = '') {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const emoji = event === 'replied' ? '💬' : '👀';
  const label = event === 'replied' ? 'REPLIED to cold email' : 'VIEWED preview';
  const text = `${emoji} *Warm lead alert — ${label}*\n*Business:* ${businessName}\n${detail}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch { /* Slack notify is best-effort */ }
}

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
   * GET /api/v1/sites/preview-view
   * Tracking pixel — called by generated preview sites when a prospect opens them.
   * No auth required (called from prospect's browser). Returns a 1x1 transparent PNG.
   * Updates prospect status to 'viewed' if currently 'sent'.
   */
  router.get('/preview-view', async (req, res) => {
    const { id } = req.query;
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store');
    res.send(transparentPng);

    if (!id || !pool) return;
    try {
      const result = await pool.query(
        `UPDATE prospect_sites
            SET status = 'viewed',
                last_viewed_at = NOW(),
                updated_at = NOW()
          WHERE client_id = $1 AND status IN ('sent', 'built')
          RETURNING business_name, preview_url, contact_email`,
        [id]
      );
      if (result.rowCount > 0) {
        const p = result.rows[0];
        logger.info('[SITE] Preview viewed — warm lead', { clientId: id, businessName: p.business_name });
        notifySlack('viewed', p.business_name,
          `*Preview:* ${p.preview_url}\n*Email:* ${p.contact_email}\n*Lead ID:* \`${id}\``
        );
      }
    } catch (err) {
      logger.warn('[SITE] Preview view DB update failed', { error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/email-reply-webhook
   * Postmark inbound webhook — called when a prospect replies to a cold outreach email.
   * No command-key auth (Postmark calls this). Verified by X-Postmark-Signature or token header.
   * Auto-marks prospect status as 'replied' and logs the reply to outreach_log.
   *
   * Setup in Postmark: Settings → Inbound → Webhook URL = {BASE_URL}/api/v1/sites/email-reply-webhook
   * Set POSTMARK_WEBHOOK_TOKEN in Railway = any secret string → paste same in Postmark's "webhook token" field.
   */
  router.post('/email-reply-webhook', async (req, res) => {
    const webhookToken = process.env.POSTMARK_WEBHOOK_TOKEN;
    if (webhookToken) {
      const provided = req.headers['x-postmark-signature'] || req.headers['x-webhook-token'] || req.query.token;
      if (!provided || provided !== webhookToken) {
        logger.warn('[SITE] Reply webhook — invalid token');
        return res.status(403).json({ ok: false, error: 'invalid token' });
      }
    }

    res.json({ ok: true }); // Respond quickly so Postmark doesn't retry

    if (!pool) return;
    try {
      const body = req.body || {};
      // Postmark inbound fields
      const fromEmail = (body.From || body.from || '').toLowerCase().replace(/.*<|>/g, '').trim();
      const subject = body.Subject || body.subject || '';
      const strippedText = body.StrippedTextReply || body.TextBody || '';

      if (!fromEmail) {
        logger.warn('[SITE] Reply webhook — no From email in payload');
        return;
      }

      // Find prospect by contact_email
      const result = await pool.query(
        `SELECT client_id, business_name, status FROM prospect_sites
          WHERE LOWER(contact_email) = $1
          ORDER BY created_at DESC LIMIT 1`,
        [fromEmail]
      );
      const prospect = result.rows[0];

      if (!prospect) {
        logger.info('[SITE] Reply webhook — no matching prospect for', { fromEmail });
        return;
      }

      const snippet = strippedText.slice(0, 200).replace(/\n/g, ' ');

      // Only advance status if not already past 'replied'
      if (!['converted', 'lost', 'replied'].includes(prospect.status)) {
        await pool.query(
          `UPDATE prospect_sites
              SET status = 'replied',
                  updated_at = NOW()
            WHERE client_id = $1`,
          [prospect.client_id]
        );
        logger.info('[SITE] Prospect marked replied via email webhook', {
          clientId: prospect.client_id,
          businessName: prospect.business_name,
          from: fromEmail,
        });
        notifySlack('replied', prospect.business_name,
          `*From:* ${fromEmail}\n*Subject:* ${subject}\n*Preview:* ${snippet}\n*Lead ID:* \`${prospect.client_id}\``
        );
      }

      // Log the inbound reply regardless
      await pool.query(
        `INSERT INTO outreach_log (channel, recipient, subject, body, status, sent_at, metadata)
          VALUES ('email_reply', $1, $2, $3, 'received', NOW(), $4)`,
        [
          fromEmail,
          subject,
          strippedText.substring(0, 2000),
          JSON.stringify({ clientId: prospect.client_id, businessName: prospect.business_name }),
        ]
      ).catch(() => {}); // outreach_log is best-effort
    } catch (err) {
      logger.error('[SITE] Reply webhook processing error', { error: err.message });
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
