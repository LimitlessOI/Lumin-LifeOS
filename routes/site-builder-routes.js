/**
 * SYNOPSIS: Site Builder Routes — Done-for-you website pipeline
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 * Site Builder Routes — Done-for-you website pipeline
 *
 * Endpoints:
 *   POST /api/v1/sites/build              — Build a new site from a business URL
 *   POST /api/v1/sites/prospect           — Async build + cold email (202 Accepted; poll /prospects/:id/status)
 *   GET  /api/v1/sites/previews           — List all built preview sites
 *   GET  /api/v1/sites/prospects          — List all prospects in DB
 *   POST /api/v1/sites/follow-up          — Send follow-up email to a prospect
 *   GET  /api/v1/sites/pos-partners       — List POS commission partners
 *   GET  /api/v1/sites/launch-readiness   — Revenue readiness check (env vars + blockers)
 *
 * Usage (register in server.js):
 *   import { createSiteBuilderRoutes } from './routes/site-builder-routes.js';
 *   createSiteBuilderRoutes(app, { pool, requireKey, callCouncilMember, baseUrl, outreachAutomation });
 */

import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import SiteBuilder, { POS_PARTNERS } from '../services/site-builder.js';
import { DESIGN_SYSTEMS } from '../services/site-builder-design-systems.js';
import { generateLogoStudioPage } from '../services/site-builder-logo-studio.js';
import ProspectPipeline from '../services/prospect-pipeline.js';
import logger from '../services/logger.js';
import { resolvePreviewsDir } from '../config/site-builder-paths.js';
import {
  enqueueProspectJob,
  getProspectJobStatus,
  evaluateSiteBuilderEmailReadiness,
  reconcileStuckProspectJobs,
} from '../services/site-builder-prospect-runner.js';


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
      previewsDir: resolvePreviewsDir(),
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

  app.use(
    '/previews',
    express.static(resolvePreviewsDir(), {
      dotfiles: 'ignore',
      index: 'index.html',
    })
  );

  // Reconcile prospect jobs orphaned at 'building' by a mid-build redeploy — best-effort, on boot.
  if (pool) {
    reconcileStuckProspectJobs(pool).catch((err) =>
      logger.warn('[SITE] Stuck-job reconcile failed on boot', { error: err.message })
    );
  }

  /**
   * POST /api/v1/sites/build
   * Build a new site from a business URL.
   * Body: { url, businessInfo? }
   */
  router.post('/build', requireKey, buildLimiter, async (req, res) => {
    try {
      const { url, businessUrl, businessInfo, competitorUrls } = req.body;
      const targetUrl = url || businessUrl;
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'url or businessUrl is required' });

      logger.info('[SITE] Build request', { url: targetUrl, competitors: (competitorUrls || []).length });
      const builder = getSiteBuilder({ callCouncilMember, baseUrl });
      const result = await builder.buildFromUrl(targetUrl, { businessInfo, competitorUrls });

      res.json({ ok: result.success, ...result });
    } catch (err) {
      logger.error('[SITE] Build error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/build-variants
   * Build multiple design variants of the same site so the client can toggle
   * between cutting-edge templates and pick the one they love.
   * Body: { url|businessUrl, variantCount?, styleIds?, businessInfo?, competitorUrls? }
   */
  router.post('/build-variants', requireKey, buildLimiter, async (req, res) => {
    try {
      const { url, businessUrl, businessInfo, competitorUrls, variantCount, styleIds } = req.body;
      const targetUrl = url || businessUrl;
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'url or businessUrl is required' });

      logger.info('[SITE] Build-variants request', { url: targetUrl, variantCount: variantCount || null });
      const builder = getSiteBuilder({ callCouncilMember, baseUrl });
      const result = await builder.buildVariants(targetUrl, { businessInfo, competitorUrls, variantCount, styleIds });

      res.json({ ok: result.success, ...result });
    } catch (err) {
      logger.error('[SITE] Build-variants error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/design-systems
   * List the available cutting-edge design templates the builder can produce.
   */
  router.get('/design-systems', (req, res) => {
    res.json({ ok: true, designSystems: DESIGN_SYSTEMS.map(({ id, name, blurb }) => ({ id, name, blurb })) });
  });

  /**
   * GET /api/v1/sites/logo-studio
   * Serve the interactive Logo Studio page. If a clientId is given, prefills the
   * business name/colors from that preview's metadata; otherwise uses query params.
   * Query: { clientId?, name?, primary?, accent?, tagline? }
   */
  router.get('/logo-studio', async (req, res) => {
    try {
      const { clientId, name, primary, accent, tagline } = req.query;
      let info = { businessName: name, primaryColor: primary, accentColor: accent, tagline };
      if (clientId && /^[\w-]+$/.test(String(clientId))) {
        try {
          const metaPath = path.join(resolvePreviewsDir(), String(clientId), 'meta.json');
          const meta = JSON.parse(await fsp.readFile(metaPath, 'utf8'));
          if (meta.businessInfo) info = { ...meta.businessInfo, ...info, businessName: name || meta.businessInfo.businessName };
        } catch { /* fall back to query params */ }
      }
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(generateLogoStudioPage(info));
    } catch (err) {
      logger.error('[SITE] Logo studio error', { error: err.message });
      res.status(500).send('Logo studio unavailable');
    }
  });

  /**
   * POST /api/v1/sites/competitor-scorecard
   * Standalone competitor analysis — scores each competitor 1-10 with strengths/weaknesses
   * and returns a design brief. Client-facing value-add; also used inside /build.
   * Body: { competitorUrls: string[], businessInfo?, industry? }
   */
  router.post('/competitor-scorecard', requireKey, buildLimiter, async (req, res) => {
    try {
      const { competitorUrls, businessInfo, industry } = req.body;
      if (!Array.isArray(competitorUrls) || competitorUrls.length === 0) {
        return res.status(400).json({ ok: false, error: 'competitorUrls (non-empty array) is required' });
      }
      const builder = getSiteBuilder({ callCouncilMember, baseUrl });
      const info = businessInfo || { industry };
      const result = await builder.benchmarkCompetitors(info, competitorUrls);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('[SITE] Competitor scorecard error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/presence-report
   * Head-to-head presence audit — scores the business AND competitors across
   * website/GBP/Instagram/Facebook/LinkedIn and returns a gap/opportunity readout.
   * Body: { businessInfo | url, competitorUrls: string[] }
   */
  router.post('/presence-report', requireKey, buildLimiter, async (req, res) => {
    try {
      const { businessInfo, url, competitorUrls, industry } = req.body;
      const info = businessInfo || (url ? { sourceUrl: url, website: url, industry } : null);
      if (!info) return res.status(400).json({ ok: false, error: 'businessInfo or url is required' });
      const builder = getSiteBuilder({ callCouncilMember, baseUrl });
      const result = await builder.auditPresence(info, Array.isArray(competitorUrls) ? competitorUrls : []);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('[SITE] Presence report error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/prospect
   * Async by default: returns 202 immediately, builds + emails in background.
   * Body: { businessUrl, contactEmail?, contactName?, businessName?, skipEmail?, businessInfo?, sync? }
   * sync=true waits for full pipeline (may hit Railway HTTP timeout on long builds).
   */
  router.post('/prospect', requireKey, prospectLimiter, async (req, res) => {
    try {
      const { businessUrl, contactEmail, contactName, businessName, skipEmail, businessInfo, sync } = req.body;
      if (!businessUrl) return res.status(400).json({ ok: false, error: 'businessUrl is required' });

      logger.info('[SITE] Prospect request', { businessUrl, contactEmail, sync: !!sync });
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });

      const options = {
        businessUrl, contactEmail, contactName, businessName, skipEmail, businessInfo,
      };

      if (sync === true || req.query.sync === '1') {
        const result = await pipeline.processProspect(options);
        return res.json({ ok: result.success, async: false, ...result });
      }

      const job = await enqueueProspectJob(pipeline, options);
      if (!job.ok) {
        return res.status(job.error?.includes('already running') ? 409 : 400).json(job);
      }

      return res.status(202).json(job);
    } catch (err) {
      logger.error('[SITE] Prospect pipeline error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/prospects/:clientId/status
   * Poll async prospect job — building → sent | built | qa_hold | failed
   */
  router.get('/prospects/:clientId/status', requireKey, async (req, res) => {
    try {
      const { clientId } = req.params;
      if (!clientId || !/^[\w-]+$/.test(clientId)) {
        return res.status(400).json({ ok: false, error: 'Invalid clientId' });
      }
      const status = await getProspectJobStatus(pool, clientId);
      if (!status.ok) return res.status(404).json(status);
      return res.json(status);
    } catch (err) {
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
        const job = await enqueueProspectJob(pipeline, prospect);
        results.push(job);
      }

      const accepted = results.filter((r) => r.ok).length;
      res.status(202).json({
        ok: true,
        async: true,
        total: prospects.length,
        accepted,
        failed: prospects.length - accepted,
        results,
      });
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
   * POST /api/v1/sites/prospects/:clientId/resend-outreach
   * Resend initial cold email for a built prospect (no site rebuild).
   */
  router.post('/prospects/:clientId/resend-outreach', requireKey, async (req, res) => {
    try {
      const { clientId } = req.params;
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });
      const result = await pipeline.resendOutreachEmail(clientId);
      if (!result.success) {
        return res.status(result.error === 'prospect not found' ? 404 : 400).json({ ok: false, ...result });
      }
      return res.json({ ok: true, ...result });
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
   * GET /api/v1/sites/select-design
   * Best-effort beacon fired when a prospect clicks "Use this design" on the
   * variant switcher. No auth (called from prospect's browser). A design pick is
   * a strong buying signal — log it and notify Slack.
   */
  router.get('/select-design', async (req, res) => {
    const { id, style } = req.query;
    res.set('Cache-Control', 'no-store');
    res.status(204).end();
    if (!id) return;
    logger.info('[SITE] Design selected — hot lead', { clientId: id, style });
    try {
      let businessName = id;
      if (pool) {
        const r = await pool.query(
          `UPDATE prospect_sites SET status = 'viewed', last_viewed_at = NOW(), updated_at = NOW()
             WHERE client_id = $1 RETURNING business_name, preview_url, contact_email`,
          [id]
        );
        if (r.rowCount > 0) businessName = r.rows[0].business_name || id;
      }
      notifySlack('viewed', businessName,
        `*Picked design:* \`${style || 'unknown'}\`\n*Lead ID:* \`${id}\`\nThis prospect toggled through the designs and chose one — strong buying signal.`
      );
    } catch (err) {
      logger.warn('[SITE] select-design tracking failed', { error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/email-reply-webhook
   * Postmark inbound webhook — called when a prospect replies to a cold outreach email.
   * No command-key auth (Postmark calls this). Verified by X-Postmark-Signature or token header.
   * Auto-marks prospect status as 'replied' and logs the reply to outreach_log.
   */
  router.post('/email-reply-webhook', async (req, res) => {
    const webhookToken = process.env.POSTMARK_WEBHOOK_TOKEN;
    if (!webhookToken) {
      logger.error('[SITE] Reply webhook disabled — POSTMARK_WEBHOOK_TOKEN is not configured');
      return res.status(503).json({ ok: false, error: 'webhook not configured' });
    }

    const provided = req.headers['x-postmark-signature'] || req.headers['x-webhook-token'] || req.query.token;
    if (!provided || provided !== webhookToken) {
      logger.warn('[SITE] Reply webhook — invalid token');
      return res.status(403).json({ ok: false, error: 'invalid token' });
    }

    res.json({ ok: true }); // Respond quickly so Postmark doesn't retry

    if (!pool) return;
    try {
      const body = req.body || {};
      const fromEmail = (body.From || body.from || '').toLowerCase().replace(/.*<|>/g, '').trim();
      const subject = body.Subject || body.subject || '';
      const strippedText = body.StrippedTextReply || body.TextBody || '';

      if (!fromEmail) {
        logger.warn('[SITE] Reply webhook — no From email in payload');
        return;
      }

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

  /**
   * GET /api/v1/sites/launch-readiness
   * Site Builder revenue readiness — checks only Site Builder env vars.
   */
  router.get('/launch-readiness', async (req, res) => {
    const emailReadiness = evaluateSiteBuilderEmailReadiness(process.env);

    const siteBuilderVars = {
      EMAIL_FROM: { required: true, purpose: 'Sender email address for outreach' },
      EMAIL_PROVIDER: { required: true, purpose: 'Email provider: smtp (Gmail) or postmark' },
      SITE_BASE_URL: { required: false, purpose: 'Public preview URL base (falls back to RAILWAY_PUBLIC_DOMAIN)' },
      STRIPE_SECRET_KEY: { required: true, purpose: 'Entry publish checkout ($49 default)' },
      SLACK_WEBHOOK_URL: { required: false, purpose: 'Warm lead notifications (optional)' },
    };

    const blockers = [...emailReadiness.blockers];
    const missing = [];
    const present = [...emailReadiness.present];

    for (const [name, info] of Object.entries(siteBuilderVars)) {
      const val = (process.env[name] || '').trim();
      if (!val) {
        if (info.required && !blockers.some((b) => b.name === name)) {
          blockers.push({ name, purpose: info.purpose });
        }
        missing.push({ name, purpose: info.purpose, required: info.required });
      } else if (!present.includes(name)) {
        present.push(name);
      }
    }

    const capabilities = {
      site_build: true,
      preview_serving: true,
      quality_scoring: true,
      prospect_db: !!pool,
      async_prospect_jobs: true,
      cold_email_sending: emailReadiness.coldEmailSending,
      publish_checkout: !!process.env.STRIPE_SECRET_KEY,
      live_editor: true,
      pos_partner_referrals: true,
      follow_up_sequence: emailReadiness.coldEmailSending,
      slack_notifications: !!process.env.SLACK_WEBHOOK_URL,
    };

    res.json({
      ok: true,
      ready: blockers.length === 0,
      revenue_blockers: blockers,
      missing,
      present,
      email_provider: emailReadiness.provider,
      capabilities,
      checked_at: new Date().toISOString(),
    });
  });

  app.use('/api/v1/sites', router);

  logger.info('[SITE] Routes registered at /api/v1/sites/*');
}
