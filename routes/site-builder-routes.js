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
 *   POST /api/v1/sites/public-lead        — Public beta lead intake (no key; rate-limited)
 *   GET  /site-builder                    — Public sales landing redirect
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
import ProspectPipeline, { runFollowUpCron } from '../services/prospect-pipeline.js';
import logger from '../services/logger.js';
import {
  enqueueProspectJob,
  enqueueDeferredProspectJob,
  triggerBuildOnView,
  getProspectJobStatus,
  failStaleProspectJobs,
  evaluateSiteBuilderEmailReadiness,
} from '../services/site-builder-prospect-runner.js';
import {
  isUnresolvedPublicBase,
  resolveDurablePublicBase,
  resolveRequestPublicBase,
} from '../services/site-builder-public-base.js';
import {
  getInstantlyConfig,
  createInstantlySendEmailAdapter,
} from '../services/site-builder-instantly-outreach.js';

/** Strip legacy "Complimentary code / Apply free publish" chrome from baked preview HTML. Discount belongs on checkout only. */
function stripLegacyCompCodeChrome(html) {
  if (typeof html !== 'string' || !html) return html;
  let out = html;
  // Older switcher headers baked a form that posted/applied a "free publish" code.
  out = out.replace(/<form\b[^>]*\bapplyCompCode\b[\s\S]*?<\/form>/gi, '');
  out = out.replace(/<form\b[^>]*>[\s\S]*?\bx-model=['"]compCode['"][\s\S]*?<\/form>/gi, '');
  out = out.replace(/<form\b[^>]*>[\s\S]*?\bComplimentary code\b[\s\S]*?<\/form>/gi, '');
  return out;
}

function buildingPlaceholderHtml(clientId, businessName = '') {
  const safeName = String(businessName || 'your site').replace(/[<>&"]/g, '');
  const safeId = String(clientId || '').replace(/[^\w-]/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Building your preview…</title>
  <style>
    :root { color-scheme: light; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:Georgia, "Times New Roman", serif;
      background: radial-gradient(circle at top, #ecfeff, #f8fafc 55%); color:#0f172a; }
    .card { max-width:28rem; padding:2rem; text-align:center; }
    h1 { font-size:1.75rem; margin:0 0 .75rem; }
    p { color:#475569; line-height:1.5; }
    .bar { height:4px; width:100%; background:#e2e8f0; border-radius:999px; overflow:hidden; margin:1.5rem 0; }
    .bar > span { display:block; height:100%; width:35%; background:#0f766e; animation:slide 1.2s ease-in-out infinite; }
    @keyframes slide { 0%{transform:translateX(-100%)} 100%{transform:translateX(280%)} }
    .meta { font-size:.8rem; color:#94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Building ${safeName}</h1>
    <p>Your preview is being prepared. Most lean previews land in under 90 seconds.</p>
    <div class="bar" aria-hidden="true"><span></span></div>
    <p class="meta" id="status">Starting…</p>
  </div>
  <script>
    const id = ${JSON.stringify(safeId)};
    async function poll() {
      try {
        const r = await fetch('/api/v1/sites/public-preview-status/' + encodeURIComponent(id), { cache: 'no-store' });
        const j = await r.json();
        const el = document.getElementById('status');
        if (j.ready) {
          el.textContent = 'Ready — loading…';
          location.reload();
          return;
        }
        if (j.error) el.textContent = 'Still working…';
        else el.textContent = j.building ? 'Building now…' : 'Queued…';
      } catch (_) {}
      setTimeout(poll, 2500);
    }
    poll();
  </script>
</body>
</html>`;
}


/** Honest terminal state shown once repair retries (triggerBuildOnView, capped at 2) are exhausted — no more fake "still building" spinner with no work happening behind it. */
function previewUnavailableHtml(clientId, businessName = '') {
  const safeName = String(businessName || 'your site').replace(/[<>&"]/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview unavailable</title>
  <style>
    :root { color-scheme: light; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:Georgia, "Times New Roman", serif;
      background: radial-gradient(circle at top, #fef2f2, #f8fafc 55%); color:#0f172a; }
    .card { max-width:28rem; padding:2rem; text-align:center; }
    h1 { font-size:1.5rem; margin:0 0 .75rem; }
    p { color:#475569; line-height:1.5; }
  </style>
</head>
<body>
  <div class="card">
    <h1>We couldn't finish building ${safeName}'s preview</h1>
    <p>Two automatic rebuild attempts didn't produce a viewable page — this needs a human look, not another retry. We've been notified.</p>
  </div>
</body>
</html>`;
}

/**
 * /build and /build-variants write only to the responding instance's local disk
 * (via SiteBuilder's internal fs.writeFile calls) — on Railway's multi-instance /
 * ephemeral-disk deploys, that means the returned previewUrl 404s the moment a
 * later request lands on a different instance or the instance recycles. The
 * prospect-pipeline flow avoids this by also writing metadata.previewHtml to
 * prospect_sites, which GET /previews/:clientId/index.html checks first. Give
 * direct /build and /build-variants calls the same durability, best-effort —
 * a persistence failure here must never fail the build response itself.
 */
async function persistDirectBuild(pool, targetUrl, result) {
  if (!pool || !result?.success || !result.clientId || typeof result.siteHtml !== 'string') return;
  try {
    await pool.query(
      `INSERT INTO prospect_sites
        (client_id, business_url, business_name, preview_url, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'built', $5::jsonb, NOW(), NOW())
       ON CONFLICT (client_id) DO UPDATE SET
         preview_url = EXCLUDED.preview_url,
         metadata = COALESCE(prospect_sites.metadata, '{}'::jsonb) || EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        result.clientId,
        targetUrl,
        result.businessName || null,
        result.previewUrl || null,
        JSON.stringify({
          previewHtml: result.siteHtml.slice(0, 400_000),
          editToken: result.metadata?.editToken || null,
          qualityReport: result.qualityReport || null,
          directBuild: true,
        }),
      ]
    );
  } catch (err) {
    logger.warn('[SITE] persistDirectBuild failed (preview will only exist on this instance)', {
      clientId: result.clientId,
      error: err.message,
    });
  }
}

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
  const text = `${emoji} Warm lead alert — ${label}*\nBusiness:* ${businessName}\n${detail}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch { /* Slack notify is best-effort */ }
}

function getSiteBuilder({ callCouncilMember, baseUrl, pool = null }) {
  if (!_siteBuilder) {
    _siteBuilder = new SiteBuilder({
      callCouncil: callCouncilMember,
      previewsDir: 'public/previews',
      baseUrl,
      pool,
    });
  }
  return _siteBuilder;
}

function getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl }) {
  if (!_prospectPipeline) {
    const builder = getSiteBuilder({ callCouncilMember, baseUrl, pool });

    // Cold lane: Instantly (built for unsolicited B2B). Do NOT use Postmark/Resend/
    // SendGrid for cold prospecting — they ban it (Postmark already refused Adam).
    let sendEmail;
    if (getInstantlyConfig().configured) {
      sendEmail = createInstantlySendEmailAdapter({ logger });
      logger.info('[PROSPECT] Cold outreach provider: Instantly');
    } else if (notificationService) {
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
        return { success: false, error: 'no email sender configured — set INSTANTLY_API_KEY + INSTANTLY_CAMPAIGN_ID' };
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

  const publicLeadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 8,
    message: { ok: false, error: 'Too many preview requests — try again in an hour' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const publicHealthScoreLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 15,
    message: { ok: false, error: 'Too many audits — try again in an hour' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Public launch URL — sales front door
  app.get(['/site-builder', '/sitebuilder', '/sites'], (_req, res) => {
    res.redirect(302, '/overlay/site-builder-landing.html');
  });

  /**
   * POST /api/v1/sites/public-lead
   * Public beta intake — no command key. Builds a lean preview and emails the lead when possible.
   * Body: { businessUrl, contactEmail, businessName?, contactName?, referrer?, vertical? }
   */
  router.post('/public-lead', publicLeadLimiter, async (req, res) => {
    try {
      let businessUrl = String(req.body?.businessUrl || req.body?.url || '').trim();
      const contactEmail = String(req.body?.contactEmail || req.body?.email || '').trim().toLowerCase();
      const businessName = String(req.body?.businessName || req.body?.name || '').trim() || undefined;
      const contactName = String(req.body?.contactName || '').trim() || undefined;
      const referrer = String(req.body?.referrer || req.body?.referrerClientId || req.body?.ref || '').trim() || undefined;
      const vertical = String(req.body?.vertical || req.query?.vertical || '').trim() || undefined;

      // Real users type "yourbusiness.com", not "https://yourbusiness.com" — normalize instead of rejecting.
      if (businessUrl && !/^https?:\/\//i.test(businessUrl)) {
        businessUrl = `https://${businessUrl.replace(/^\/+/, '')}`;
      }
      if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(businessUrl)) {
        return res.status(400).json({ ok: false, error: 'Enter a valid business website (e.g. yourbusiness.com)' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return res.status(400).json({ ok: false, error: 'A valid contactEmail is required' });
      }

      const pipeline = getProspectPipeline({
        callCouncilMember,
        pool,
        outreachAutomation,
        notificationService,
        baseUrl,
      });

      const options = {
        businessUrl,
        contactEmail,
        contactName,
        businessName,
        referrer,
        vertical,
        enrich: true,
        skipRepair: false,
        skipBlogs: true,
        skipQualify: true,
      };

      const job = await enqueueProspectJob(pipeline, options);
      if (!job.ok) {
        return res.status(job.error?.includes('already running') ? 409 : 400).json(job);
      }

      const previewUrl = job.clientId ? pipeline.resolvePreviewUrl(job.clientId) : null;
      const statusUrl = job.clientId ? `/api/v1/sites/public-preview-status/${job.clientId}` : null;
      const founderNotify = process.env.ADAM_NOTIFY_EMAIL || process.env.WORK_EMAIL || 'adam@hopkinsgroup.org';
      if (notificationService?.sendEmail) {
        notificationService
          .sendEmail({
            to: founderNotify,
            subject: `Site Builder lead — ${businessName || businessUrl}`,
            html: `<p>New public lead from Site Builder launch page (prebuilt preview).</p>
              <p><b>Business:</b> ${businessName || '(none)'}<br>
              <b>URL:</b> ${businessUrl}<br>
              <b>Email:</b> ${contactEmail}<br>
              <b>clientId:</b> ${job.clientId || ''}<br>
              <b>Preview:</b> <a href="${previewUrl || ''}">${previewUrl || ''}</a></p>`,
            text: `Site Builder lead: ${businessUrl} / ${contactEmail}`,
          })
          .catch((err) => logger.warn?.('[SITE] founder lead notify failed', { error: err.message }));
      }

      logger.info('[SITE] Public lead accepted (prebuilt)', { businessUrl, contactEmail, clientId: job.clientId, previewUrl });
      return res.status(202).json({
        ok: true,
        message: 'Preview build started. We will email you when it is ready.',
        clientId: job.clientId || null,
        previewUrl,
        deferred: false,
        statusUrl,
      });
    } catch (err) {
      logger.error('[SITE] Public lead error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/health-score
   * Public website health score — no command key. Rate-limited.
   * Query: { url }
   */
  router.get('/health-score', publicHealthScoreLimiter, async (req, res) => {
    try {
      let targetUrl = String(req.query.url || '').trim();
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'url is required' });
      if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl.replace(/^\/+/, '')}`;
      if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(targetUrl)) {
        return res.status(400).json({ ok: false, error: 'Enter a valid website URL' });
      }

      const { scoreProspectUrl } = await import('../services/site-builder-opportunity-scorer.js');
      const result = await scoreProspectUrl(targetUrl, { timeout: 6000 });

      if (!result.analyzed || result.scanFailed) {
        return res.json({
          ok: true,
          analyzed: false,
          scanFailed: true,
          url: targetUrl,
          message: "We couldn't scan this site",
          recommendation: result.recommendation,
          painPoints: result.painPoints || [],
          error: result.error || null,
          revenueLeakEstimate: 0,
          leadValue: null,
        });
      }

      // Rough revenue-leak estimate for the lead magnet. Not a real forecast.
      const leadValue = { dentist: 2500, attorney: 2400, contractor: 1500, advisor: 1800, default: 1200 };
      const vertical = String(req.query.vertical || '').trim();
      const baseValue = leadValue[vertical] || leadValue.default;
      const leakFactor = result.opportunityScore >= 80 ? 0.12
        : result.opportunityScore >= 60 ? 0.08
        : result.opportunityScore >= 40 ? 0.05
        : result.opportunityScore >= 20 ? 0.02
        : 0;
      const revenueLeakEstimate = result.opportunityScore ? Math.round(baseValue * leakFactor) : 0;

      return res.json({
        ok: true,
        ...result,
        revenueLeakEstimate,
        leadValue: baseValue,
      });
    } catch (err) {
      logger.error('[SITE] Health score error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/audit
   * Public website revenue leak audit — alias for health-score with longer framing.
   * Query: { url }
   */
  router.get('/audit', publicHealthScoreLimiter, async (req, res) => {
    try {
      let targetUrl = String(req.query.url || '').trim();
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'url is required' });
      if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl.replace(/^\/+/, '')}`;
      if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(targetUrl)) {
        return res.status(400).json({ ok: false, error: 'Enter a valid website URL' });
      }

      const { scoreProspectUrl } = await import('../services/site-builder-opportunity-scorer.js');
      const result = await scoreProspectUrl(targetUrl, { timeout: 6000 });

      if (!result.analyzed || result.scanFailed) {
        return res.json({
          ok: true,
          audit: true,
          analyzed: false,
          scanFailed: true,
          url: targetUrl,
          message: "We couldn't scan this site",
          recommendation: result.recommendation,
          painPoints: result.painPoints || [],
          error: result.error || null,
          revenueLeakEstimate: 0,
          leadValue: null,
        });
      }

      const leadValue = { dentist: 2500, attorney: 2400, contractor: 1500, advisor: 1800, default: 1200 };
      const vertical = String(req.query.vertical || '').trim();
      const baseValue = leadValue[vertical] || leadValue.default;
      const leakFactor = result.opportunityScore >= 80 ? 0.12
        : result.opportunityScore >= 60 ? 0.08
        : result.opportunityScore >= 40 ? 0.05
        : result.opportunityScore >= 20 ? 0.02
        : 0;
      const revenueLeakEstimate = result.opportunityScore ? Math.round(baseValue * leakFactor) : 0;

      return res.json({
        ok: true,
        audit: true,
        ...result,
        revenueLeakEstimate,
        leadValue: baseValue,
      });
    } catch (err) {
      logger.error('[SITE] Audit error', { error: err.message });
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // DB fallback FIRST — Railway multi-instance / ephemeral disk often miss files.
  // Static is secondary so durable previewHtml in Postgres always wins.
  // Deferred prospects: first click triggers lean build + building placeholder.
  app.get('/previews/:clientId/index.html', async (req, res, next) => {
    try {
      if (!pool) return next();
      const clientId = String(req.params.clientId || '');
      if (!clientId || !/^[\w-]+$/.test(clientId)) return next();
      const result = await pool.query(
        `SELECT business_name, status, metadata FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
        [clientId]
      );
      const row = result.rows[0];
      const meta = row?.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : {};
      const html = stripLegacyCompCodeChrome(meta.previewHtml);
      if (html && typeof html === 'string') {
        const deployDir = path.join(process.cwd(), 'public', 'previews', clientId);
        await fsp.mkdir(deployDir, { recursive: true }).catch(() => null);
        await fsp.writeFile(path.join(deployDir, 'index.html'), html).catch(() => null);

        // Restore variant HTML files (and a lightweight meta.json) so the
        // switcher iframe / editor work even after ephemeral disk is wiped.
        const variantHtmls = meta.variantHtmls && typeof meta.variantHtmls === 'object' ? meta.variantHtmls : {};
        for (const [variantId, vHtml] of Object.entries(variantHtmls)) {
          if (typeof vHtml !== 'string') continue;
          const vDir = path.join(deployDir, 'variants', variantId);
          await fsp.mkdir(vDir, { recursive: true }).catch(() => null);
          await fsp.writeFile(path.join(vDir, 'index.html'), vHtml).catch(() => null);
        }
        if (meta.editToken) {
          const diskMeta = { ...meta };
          delete diskMeta.previewHtml;
          delete diskMeta.variantHtmls;
          await fsp.writeFile(
            path.join(deployDir, 'meta.json'),
            JSON.stringify(diskMeta, null, 2)
          ).catch(() => null);
        }
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('X-Preview-Source', 'db');
        return res.send(html);
      }

      if (row) {
        const pipeline = getProspectPipeline({
          callCouncilMember,
          pool,
          outreachAutomation,
          notificationService,
          baseUrl,
        });
        const kick = await triggerBuildOnView(pipeline, clientId).catch((err) => ({
          ok: false,
          reason: err.message,
        }));
        logger.info('[SITE] Preview click — deferred build', {
          clientId,
          started: kick?.started,
          reason: kick?.reason,
        });
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Cache-Control', 'no-store');
        // 'not_deferred' with no rebuild started means repair retries are exhausted
        // (or the row was never buildable at all) — showing the spinner here would
        // poll forever with no work happening behind it. Say so honestly instead.
        if (kick?.reason === 'not_deferred' && !kick?.started) {
          res.set('X-Preview-Source', 'unavailable');
          return res.status(200).send(previewUnavailableHtml(clientId, row.business_name || ''));
        }
        res.set('X-Preview-Source', 'building-placeholder');
        return res.status(200).send(buildingPlaceholderHtml(clientId, row.business_name || ''));
      }

      return next();
    } catch {
      return next();
    }
  });

  /** Public poll for deferred preview placeholder (no PII). */
  app.get('/api/v1/sites/public-preview-status/:clientId', async (req, res) => {
    try {
      const clientId = String(req.params.clientId || '');
      if (!clientId || !/^[\w-]+$/.test(clientId) || !pool) {
        return res.status(400).json({ ok: false, error: 'Invalid clientId' });
      }
      const result = await pool.query(
        `SELECT status, metadata FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
        [clientId]
      );
      const row = result.rows[0];
      if (!row) return res.status(404).json({ ok: false, error: 'not found' });
      const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      const ready = typeof meta.previewHtml === 'string' && meta.previewHtml.length > 100;
      return res.json({
        ok: true,
        clientId,
        status: row.status,
        ready,
        building: row.status === 'building' || (!ready && ['queued', 'invited'].includes(row.status)),
        error: ready ? null : (meta.jobError || null),
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use(
    '/previews',
    express.static(path.join(process.cwd(), 'public', 'previews'), {
      dotfiles: 'ignore',
      index: 'index.html',
      fallthrough: true,
    })
  );

  // Variant file DB fallback — serves each variant's HTML from Postgres when the
  // file has been lost due to ephemeral disk. Also writes it back so subsequent
  // requests hit the static file.
  app.get('/previews/:clientId/variants/:variantId/index.html', async (req, res, next) => {
    try {
      if (!pool) return next();
      const clientId = String(req.params.clientId || '');
      const variantId = String(req.params.variantId || '');
      if (!clientId || !/^[\w-]+$/.test(clientId) || !variantId || !/^[\w-]+$/.test(variantId)) {
        return next();
      }
      const result = await pool.query(
        `SELECT metadata FROM prospect_sites WHERE client_id = $1 LIMIT 1`,
        [clientId]
      );
      const row = result.rows[0];
      const meta = row?.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : {};
      const vHtml = meta.variantHtmls?.[variantId];
      if (vHtml && typeof vHtml === 'string') {
        const vDir = path.join(process.cwd(), 'public', 'previews', clientId, 'variants', variantId);
        await fsp.mkdir(vDir, { recursive: true }).catch(() => null);
        await fsp.writeFile(path.join(vDir, 'index.html'), vHtml).catch(() => null);
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('X-Preview-Source', 'db-variant');
        return res.send(vHtml);
      }
      return next();
    } catch {
      return next();
    }
  });

  app.get('/previews/:clientId', (req, res) => {
    res.redirect(302, `/previews/${encodeURIComponent(req.params.clientId)}/index.html`);
  });

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
      const builder = getSiteBuilder({ callCouncilMember, baseUrl, pool });
      const result = await builder.buildFromUrl(targetUrl, { businessInfo, competitorUrls });

      await persistDirectBuild(pool, targetUrl, result);
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
      const { url, businessUrl, businessInfo, competitorUrls, variantCount, styleIds, skipRepair, skipBlogs, skipAi, leanTemplate, enrich } = req.body;
      const targetUrl = url || businessUrl;
      if (!targetUrl) return res.status(400).json({ ok: false, error: 'url or businessUrl is required' });

      logger.info('[SITE] Build-variants request', { url: targetUrl, variantCount: variantCount || null });
      const builder = getSiteBuilder({ callCouncilMember, baseUrl, pool });
      const result = await builder.buildVariants(targetUrl, { businessInfo, competitorUrls, variantCount, styleIds, skipRepair, skipBlogs, skipAi, leanTemplate, enrich });

      await persistDirectBuild(pool, targetUrl, result);
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
          const metaPath = path.join(process.cwd(), 'public/previews', String(clientId), 'meta.json');
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
      const builder = getSiteBuilder({ callCouncilMember, baseUrl, pool });
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
      const builder = getSiteBuilder({ callCouncilMember, baseUrl, pool });
      const result = await builder.auditPresence(info, Array.isArray(competitorUrls) ? competitorUrls : []);
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error('[SITE] Presence report error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/prospect
   * Pre-build by default. The preview is built as soon as the request is accepted,
   * and the outreach email is sent after the build completes. Set deferred=true to
   * email the link immediately and build only when the prospect opens it.
   * Body: { businessUrl, contactEmail?, deferred?, skipEmail?, sync?, leanTemplate?, skipQualify?, ... }
   */
  router.post('/prospect', requireKey, prospectLimiter, async (req, res) => {
    try {
      const {
        businessUrl, contactEmail, contactName, businessName, skipEmail, businessInfo, sync,
        enrich, skipRepair, skipBlogs, skipAi, leanTemplate, deferred, skipQualify,
      } = req.body;
      if (!businessUrl) return res.status(400).json({ ok: false, error: 'businessUrl is required' });

      const useDeferred = deferred === true
        && !!contactEmail
        && skipEmail !== true
        && sync !== true
        && req.query.sync !== '1';

      logger.info('[SITE] Prospect request', {
        businessUrl, contactEmail, sync: !!sync, deferred: useDeferred, enrich, skipRepair, skipBlogs, skipAi,
      });
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });

      const options = {
        businessUrl, contactEmail, contactName, businessName, skipEmail, businessInfo,
        enrich, skipRepair, skipBlogs, skipAi, leanTemplate, skipQualify,
      };

      if (sync === true || req.query.sync === '1') {
        const result = await pipeline.processProspect(options);
        return res.json({ ok: result.success, async: false, ...result });
      }

      if (useDeferred) {
        const job = await enqueueDeferredProspectJob(pipeline, options);
        if (!job.ok) {
          return res.status(job.error?.includes('already running') ? 409 : 400).json(job);
        }
        return res.status(202).json(job);
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
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });
      const status = await getProspectJobStatus(pool, clientId, { pipeline });
      if (!status.ok) return res.status(404).json(status);
      return res.json(status);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/prospects/reclaim-stale
   * Fail orphaned building jobs (no heartbeat / instance recycle).
   */
  router.post('/prospects/reclaim-stale', requireKey, async (req, res) => {
    try {
      const staleMs = Number(req.body?.staleMs);
      const result = await failStaleProspectJobs(pool, Number.isFinite(staleMs) && staleMs > 0 ? { staleMs } : {});
      return res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * POST /api/v1/sites/bulk-prospect
   * Pre-build each preview by default, then email the link. Set deferred=true to email
   * the link immediately and build on first click (legacy/lower cost per non-engager).
   * Body: { prospects: [...], deferred?: boolean }
   */
  router.post('/bulk-prospect', requireKey, prospectLimiter, async (req, res) => {
    try {
      const { prospects = [], deferred } = req.body;
      if (!prospects.length) return res.status(400).json({ ok: false, error: 'prospects array required' });
      if (prospects.length > 20) return res.status(400).json({ ok: false, error: 'Max 20 prospects per batch' });

      logger.info('[SITE] Bulk prospect request', { count: prospects.length, deferred: deferred === true });
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });

      const results = [];
      for (const prospect of prospects) {
        const useDeferred = deferred === true
          && !!prospect.contactEmail
          && prospect.skipEmail !== true;
        const options = {
          ...prospect,
          skipAi: prospect.skipAi !== false,
          leanTemplate: prospect.leanTemplate !== false,
          skipRepair: prospect.skipRepair !== false,
          skipBlogs: prospect.skipBlogs !== false,
          enrich: prospect.enrich === true,
          skipQualify: prospect.skipQualify !== false,
        };
        const job = useDeferred
          ? await enqueueDeferredProspectJob(pipeline, options)
          : await enqueueProspectJob(pipeline, options);
        results.push(job);
      }

      const accepted = results.filter((r) => r.ok).length;
      res.status(202).json({
        ok: true,
        async: true,
        deferred: deferred === true,
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
   * POST /api/v1/sites/prospects/retry-invites
   * Re-fire deferred/outreach email for built prospects that never got external delivery.
   * Body: { limit?: number, onlyExternal?: boolean }
   * Used the moment Postmark/Resend unblocks so the warm queue converts to sends.
   */
  router.post('/prospects/retry-invites', requireKey, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ ok: false, error: 'pool required' });
      const limit = Math.min(Number(req.body?.limit) || 20, 50);
      const onlyExternal = req.body?.onlyExternal !== false;
      const result = await pool.query(
        `SELECT client_id, business_url, contact_email, contact_name, business_name, preview_url, status, metadata
           FROM prospect_sites
          WHERE contact_email IS NOT NULL
            AND preview_url IS NOT NULL
            AND status IN ('built', 'queued', 'invited', 'failed', 'sent')
            AND (
              email_sent = false
              OR COALESCE(metadata->>'emailSendError','') <> ''
            )
          ORDER BY updated_at DESC
          LIMIT $1`,
        [limit]
      );
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });
      const outcomes = [];
      for (const row of result.rows || []) {
        const email = String(row.contact_email || '');
        if (onlyExternal && /(hopkinsgroup|limitlessoi|web-library|adam\+)/i.test(email)) {
          outcomes.push({ clientId: row.client_id, skipped: true, reason: 'internal_test_inbox' });
          continue;
        }
        const resent = await pipeline.resendOutreachEmail(row.client_id, { contactEmail: email });
        outcomes.push({
          clientId: row.client_id,
          email,
          ok: resent.success === true,
          emailSent: resent.emailSent === true,
          error: resent.error || null,
        });
      }
      const sent = outcomes.filter((o) => o.emailSent).length;
      return res.json({ ok: true, attempted: outcomes.length, sent, outcomes });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * GET /api/v1/sites/previews
   * List all built preview sites.
   */
  router.get('/previews', requireKey, async (req, res) => {
    try {
      const builder = getSiteBuilder({ callCouncilMember, baseUrl, pool });
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
      const { status, dealValue, contactEmail } = req.body;
      if (!status && !contactEmail && dealValue == null) {
        return res.status(400).json({ ok: false, error: 'status, contactEmail, or dealValue required' });
      }

      await pool.query(
        `UPDATE prospect_sites
            SET status = COALESCE($1, status),
                deal_value = COALESCE($2, deal_value),
                contact_email = COALESCE($3, contact_email),
                updated_at = NOW()
          WHERE client_id = $4`,
        [status || null, dealValue ?? null, contactEmail || null, clientId]
      );
      res.json({ ok: true, clientId, status: status || undefined, contactEmail: contactEmail || undefined });
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
      const contactEmail = req.body?.contactEmail || req.body?.contact_email || null;
      const pipeline = getProspectPipeline({ callCouncilMember, pool, outreachAutomation, notificationService, baseUrl });
      const result = await pipeline.resendOutreachEmail(clientId, { contactEmail });
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
          `Preview:* ${p.preview_url}\nEmail:* ${p.contact_email}\nLead ID:* \`${id}\``
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
        `Picked design:* \`${style || 'unknown'}\`\nLead ID:* \`${id}\`\nThis prospect toggled through the designs and chose one — strong buying signal.`
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
          `From:* ${fromEmail}\nSubject:* ${subject}\nPreview:* ${snippet}\nLead ID:* \`${prospect.client_id}\``
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
      STRIPE_SECRET_KEY: { required: true, purpose: 'Entry publish checkout ($45 beta default)' },
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

    const configuredPublicBase = resolveDurablePublicBase([
      process.env.SITE_BASE_URL,
      baseUrl,
      process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
    ]);
    const brandedBasePoisoned =
      isUnresolvedPublicBase(process.env.SITE_BASE_URL)
      || isUnresolvedPublicBase(baseUrl)
      || isUnresolvedPublicBase(process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');

    const capabilities = {
      site_build: true,
      preview_serving: true,
      quality_scoring: true,
      prospect_db: !!pool,
      async_prospect_jobs: true,
      cold_email_keys_present: emailReadiness.keysPresent === true,
      cold_email_sending: emailReadiness.coldEmailSending,
      publish_checkout: !!process.env.STRIPE_SECRET_KEY,
      live_editor: true,
      pos_partner_referrals: true,
      follow_up_sequence: emailReadiness.coldEmailSending,
      slack_notifications: !!process.env.SLACK_WEBHOOK_URL,
      public_base_resolvable: !brandedBasePoisoned || Boolean(configuredPublicBase),
      public_base_url: configuredPublicBase,
    };

    // Stripe publish can be ready even when cold email is pending approval.
    const stripeReady = !!process.env.STRIPE_SECRET_KEY;
    const emailNotes = Array.isArray(emailReadiness.notes) ? emailReadiness.notes : [];

    res.json({
      ok: true,
      ready: blockers.length === 0 && stripeReady,
      revenue_blockers: blockers,
      missing,
      present,
      email_provider: emailReadiness.provider,
      email_notes: emailNotes,
      capabilities,
      checked_at: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/sites/referral/:clientId
   * Public referral link for a given preview clientId.
   */
  router.get('/referral/:clientId', (req, res) => {
    const { clientId } = req.params;
    if (!clientId || !/[\w-]+/.test(String(clientId))) {
      return res.status(400).json({ ok: false, error: 'Invalid clientId' });
    }
    const safeBase = resolveRequestPublicBase(req, baseUrl);
    const referralUrl = `${safeBase}/overlay/site-builder-landing.html?ref=${encodeURIComponent(clientId)}`;
    return res.json({ ok: true, clientId, referralUrl, publicBase: safeBase });
  });

  app.use('/api/v1/sites', router);

  logger.info('[SITE] Routes registered at /api/v1/sites/*');

  // Start the 4-step follow-up / nurture cron (1h interval, 1m initial delay).
  if (pool && notificationService?.sendEmail) {
    const sendEmail = async (to, subject, html) => {
      const result = await notificationService.sendEmail({ to, subject, html, text: '' });
      if (!result.success) logger.warn('[SITE] Follow-up email not sent', { to, reason: result.error });
      return result;
    };
    const tick = () => runFollowUpCron({
      pool,
      sendEmail,
      baseUrl: resolveDurablePublicBase([baseUrl]),
    }).catch((err) => {
      logger.warn('[SITE] Follow-up cron error', { error: err.message });
    });
    setTimeout(tick, 60 * 1000);
    setInterval(tick, 60 * 60 * 1000);
  }
}