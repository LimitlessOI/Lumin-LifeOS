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
 * Register siteBld routes on the Express app. Also registers static file serving for /previews/.
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
    res.sendFile(filePath, (err) => {
      if (err) next();
    });
  });

  /**
   * POST /api/v1/sites/