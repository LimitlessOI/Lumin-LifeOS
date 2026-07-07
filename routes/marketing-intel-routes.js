// SYNOPSIS: SocialMediaOS content-intelligence JSON API routes
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import express from 'express';
import { generateTitleUniverse } from '../services/marketing-title-universe.js';
import { scoreEarnedAttention } from '../services/marketing-script-scorer.js';
import { publishOrKill } from '../services/marketing-publish-gate.js';
import { repurposePiece } from '../services/marketing-repurpose.js';

function jsonError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function clampCount(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const int = Math.trunc(n);
  if (int < 1) return null;
  return int;
}

export function registerMarketingIntelRoutes(app, deps = {}) {
  if (!app || typeof app.post !== 'function') {
    throw new Error('registerMarketingIntelRoutes requires an Express app');
  }

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
      const { topic, transcript, count } = req.body ?? {};
      const parsedCount = clampCount(count);

      if (!isNonEmptyString(topic)) {
        return jsonError(res, 400, 'Missing required field: topic');
      }
      if (count !== undefined && parsedCount === null) {
        return jsonError(res, 400, 'Invalid field: count');
      }

      const result = await generateTitleUniverse({
        topic: topic.trim(),
        transcript: isNonEmptyString(transcript) ? transcript.trim() : undefined,
        count: parsedCount,
        callCouncilMember
      });

      return res.json(result);
    } catch (error) {
      logger.error?.({ err: error }, 'marketing intel titles failed');
      return jsonError(res, 500, 'Failed to generate title universe');
    }
  });

  app.post('/api/v1/marketing/intel/score-script', requireKey, async (req, res) => {
    try {
      const { scriptText } = req.body ?? {};

      if (!isNonEmptyString(scriptText)) {
        return jsonError(res, 400, 'Missing required field: scriptText');
      }

      const result = await scoreEarnedAttention({
        scriptText: scriptText.trim(),
        callCouncilMember
      });

      return res.json(result);
    } catch (error) {
      logger.error?.({ err: error }, 'marketing intel score-script failed');
      return jsonError(res, 500, 'Failed to score script');
    }
  });

  app.post('/api/v1/marketing/intel/publish-gate', requireKey, async (req, res) => {
    try {
      const { piece } = req.body ?? {};

      if (piece === undefined || piece === null) {
        return jsonError(res, 400, 'Missing required field: piece');
      }

      const result = await publishOrKill({
        piece,
        callCouncilMember
      });

      return res.json(result);
    } catch (error) {
      logger.error?.({ err: error }, 'marketing intel publish-gate failed');
      return jsonError(res, 500, 'Failed to evaluate publish gate');
    }
  });

  app.post('/api/v1/marketing/intel/repurpose', requireKey, async (req, res) => {
    try {
      const { piece, formats } = req.body ?? {};

      if (piece === undefined || piece === null) {
        return jsonError(res, 400, 'Missing required field: piece');
      }

      const result = await repurposePiece({
        piece,
        formats,
        callCouncilMember
      });

      return res.json(result);
    } catch (error) {
      logger.error?.({ err: error }, 'marketing intel repurpose failed');
      return jsonError(res, 500, 'Failed to repurpose piece');
    }
  });

  return app;
}

export default registerMarketingIntelRoutes;