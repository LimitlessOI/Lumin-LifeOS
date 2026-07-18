// SYNOPSIS: SocialMediaOS Content Intelligence JSON API route registration
// @ssot docs/products/marketingos/PRODUCT_HOME.md
import { generateTitleUniverse } from '../services/marketing-title-universe.js';
import { scoreEarnedAttention } from '../services/marketing-script-scorer.js';
import { publishOrKill } from '../services/marketing-publish-gate.js';
import { repurposePiece } from '../services/marketing-repurpose.js';

function sendError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toPositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function registerMarketingIntelRoutes(app, deps = {}) {
  const requireKey = deps.requireKey;
  const callCouncilMember = deps.callCouncilMember;
  const logger = deps.logger ?? console;

  if (typeof requireKey !== 'function') {
    throw new Error('registerMarketingIntelRoutes requires deps.requireKey');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('registerMarketingIntelRoutes requires deps.callCouncilMember');
  }

  app.post('/api/v1/marketing/intel/titles', requireKey, async (req, res) => {
    try {
      const topic = req.body?.topic || req.body?.niche || req.body?.subject;
      if (!isNonEmptyString(topic)) {
        return sendError(res, 400, 'Missing required field: topic');
      }

      const count = toPositiveInt(req.body?.count, 10);
      const transcript = isNonEmptyString(req.body?.transcript) ? req.body.transcript : undefined;

      const result = await generateTitleUniverse({
        topic: topic.trim(),
        transcript,
        count,
        callCouncilMember,
      });

      return res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error }, 'marketing intel titles failed');
      return sendError(res, 500, 'Failed to generate title universe');
    }
  });

  app.post('/api/v1/marketing/intel/score-script', requireKey, async (req, res) => {
    try {
      const scriptText = req.body?.scriptText || req.body?.script || req.body?.script_text;
      if (!isNonEmptyString(scriptText)) {
        return sendError(res, 400, 'Missing required field: scriptText');
      }

      const result = await scoreEarnedAttention({
        scriptText: scriptText,
        callCouncilMember,
      });

      return res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error }, 'marketing intel score-script failed');
      return sendError(res, 500, 'Failed to score script');
    }
  });

  app.post('/api/v1/marketing/intel/publish-gate', requireKey, async (req, res) => {
    try {
      const piece = req.body?.piece
        ?? (isNonEmptyString(req.body?.content_text) ? { content_text: req.body.content_text, platform: req.body.platform } : null)
        ?? (isNonEmptyString(req.body?.contentText) ? { content_text: req.body.contentText, platform: req.body.platform } : null);
      if (piece === undefined || piece === null || piece === '') {
        return sendError(res, 400, 'Missing required field: piece');
      }

      const result = await publishOrKill({
        piece,
        callCouncilMember,
      });

      return res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error }, 'marketing intel publish-gate failed');
      return sendError(res, 500, 'Failed to evaluate publish gate');
    }
  });

  app.post('/api/v1/marketing/intel/repurpose', requireKey, async (req, res) => {
    try {
      const piece = req.body?.piece
        ?? (isNonEmptyString(req.body?.content_text) ? { content_text: req.body.content_text } : null)
        ?? (isNonEmptyString(req.body?.contentText) ? { content_text: req.body.contentText } : null);
      if (piece === undefined || piece === null || piece === '') {
        return sendError(res, 400, 'Missing required field: piece');
      }

      const formats = req.body?.formats || (req.body?.target ? [req.body.target] : undefined);
      const result = await repurposePiece({
        piece,
        formats,
        callCouncilMember,
      });

      return res.json({ ok: true, ...result });
    } catch (error) {
      logger.error?.({ err: error }, 'marketing intel repurpose failed');
      return sendError(res, 500, 'Failed to repurpose piece');
    }
  });
}

export default registerMarketingIntelRoutes;