// SYNOPSIS: SocialMediaOS content-intelligence JSON API route module
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import express from 'express';
import { generateTitleUniverse } from '../services/marketing-title-universe.js';
import { scoreEarnedAttention } from '../services/marketing-script-scorer.js';
import { publishOrKill } from '../services/marketing-publish-gate.js';
import { repurposePiece } from '../services/marketing-repurpose.js';

function makeErrorResponse(error, fallbackStatus = 500) {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return {
    status: fallbackStatus,
    body: {
      ok: false,
      error: message,
    },
  };
}

function pickServiceResult(result) {
  if (result && typeof result === 'object' && 'status' in result && 'body' in result) {
    return result;
  }
  return {
    status: 200,
    body: {
      ok: true,
      result,
    },
  };
}

export function registerMarketingIntelRoutes(app, deps = {}) {
  if (!app || typeof app.post !== 'function') {
    throw new Error('registerMarketingIntelRoutes requires an Express app instance');
  }

  const requireKey = deps.requireKey;
  if (typeof requireKey !== 'function') {
    throw new Error('registerMarketingIntelRoutes requires deps.requireKey');
  }

  const callCouncilMember = deps.callCouncilMember;
  if (typeof callCouncilMember !== 'function') {
    throw new Error('registerMarketingIntelRoutes requires deps.callCouncilMember');
  }

  const wrap = (handler) => async (req, res) => {
    try {
      const result = await handler(req, res);
      const { status, body } = pickServiceResult(result);
      res.status(status).json(body);
    } catch (error) {
      const { status, body } = makeErrorResponse(error);
      res.status(status).json(body);
    }
  };

  app.post(
    '/api/v1/marketing/intel/titles',
    requireKey,
    wrap(async (req) => {
      const { topic, transcript, count } = req.body ?? {};
      if (!topic || typeof topic !== 'string' || !topic.trim()) {
        return {
          status: 400,
          body: { ok: false, error: 'Missing required field: topic' },
        };
      }

      const normalizedCount = count == null ? undefined : Number(count);
      if (normalizedCount !== undefined && (!Number.isFinite(normalizedCount) || normalizedCount <= 0)) {
        return {
          status: 400,
          body: { ok: false, error: 'Invalid field: count' },
        };
      }

      const result = await generateTitleUniverse({
        topic: topic.trim(),
        transcript: typeof transcript === 'string' ? transcript : undefined,
        count: normalizedCount,
        callCouncilMember,
      });

      return pickServiceResult(result);
    })
  );

  app.post(
    '/api/v1/marketing/intel/score-script',
    requireKey,
    wrap(async (req) => {
      const { scriptText } = req.body ?? {};
      if (!scriptText || typeof scriptText !== 'string' || !scriptText.trim()) {
        return {
          status: 400,
          body: { ok: false, error: 'Missing required field: scriptText' },
        };
      }

      const result = await scoreEarnedAttention({
        scriptText: scriptText.trim(),
        callCouncilMember,
      });

      return pickServiceResult(result);
    })
  );

  app.post(
    '/api/v1/marketing/intel/publish-gate',
    requireKey,
    wrap(async (req) => {
      const { piece } = req.body ?? {};
      if (!piece || typeof piece !== 'object') {
        return {
          status: 400,
          body: { ok: false, error: 'Missing required field: piece' },
        };
      }

      const result = await publishOrKill({
        piece,
        callCouncilMember,
      });

      return pickServiceResult(result);
    })
  );

  app.post(
    '/api/v1/marketing/intel/repurpose',
    requireKey,
    wrap(async (req) => {
      const { piece, formats } = req.body ?? {};
      if (!piece || typeof piece !== 'object') {
        return {
          status: 400,
          body: { ok: false, error: 'Missing required field: piece' },
        };
      }

      const result = await repurposePiece({
        piece,
        formats,
        callCouncilMember,
      });

      return pickServiceResult(result);
    })
  );

  return app;
}

export default registerMarketingIntelRoutes;