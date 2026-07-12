/**
 * SYNOPSIS: Registers LifeosUiDirectivesRoutes routes/handlers (routes/lifeos-ui-directives-routes.js).
 */
import express from 'express';

const DEFAULT_MODEL = 'ui-directives-default';

function safeJson(res, status, payload) {
  return res.status(status).json(payload);
}

function asText(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function pickReqDeps(req, deps) {
  return {
    pool: deps?.pool,
    logger: deps?.logger ?? console,
    callCouncilMember: deps?.callCouncilMember,
    baseUrl: deps?.baseUrl,
    requireKey: deps?.requireKey,
    requireAuth: deps?.requireAuth,
  };
}

export function createUiDirectivesService({ pool, callCouncilMember, logger }) {
  async function propose(text) {
    const input = asText(text).trim();
    if (!input) {
      return { ok: false, error: 'text is required' };
    }

    const prompt = [
      'You are drafting UI directives for LifeOS twin operations.',
      'Return concise, actionable directives only.',
      'Input text:',
      input,
    ].join('\n');

    if (typeof callCouncilMember !== 'function') {
      return {
        ok: true,
        directives: input
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => ({ directive: line })),
        source: 'fallback',
      };
    }

    const raw = await callCouncilMember('product', prompt, { purpose: 'ui_directives.propose' });
    return { ok: true, directives: raw, source: 'council' };
  }

  async function apply(directives) {
    const body = directives;
    if (!body) {
      return { ok: false, error: 'directives are required' };
    }
    return { ok: true, applied: body, status: 'accepted' };
  }

  async function get() {
    const query = `
      select id, asset_id, model_data, last_simulation_at, created_at, updated_at
      from digital_twins
      order by created_at desc
      limit 50
    `;
    const { rows } = await pool.query(query);
    return { ok: true, twins: rows };
  }

  return { propose, apply, get };
}

export function createTwinReactionSimulator({ pool, callCouncilMember, logger }) {
  async function simulate({ idea, context }) {
    const cleanIdea = asText(idea).trim();
    const cleanContext = asText(context).trim();
    if (!cleanIdea) {
      return { ok: false, error: 'idea is required' };
    }

    const prompt = [
      'Simulate a twin reaction to the idea.',
      'Return a concise reaction, likely risks, and next-step suggestion.',
      `idea: ${cleanIdea}`,
      cleanContext ? `context: ${cleanContext}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (typeof callCouncilMember !== 'function') {
      return {
        ok: true,
        reaction: {
          sentiment: 'neutral',
          summary: cleanIdea,
          risks: [],
          suggestion: 'No council member available.',
        },
        source: 'fallback',
      };
    }

    const raw = await callCouncilMember('product', prompt, { purpose: 'twin.reaction.simulate' });
    return { ok: true, reaction: raw, source: 'council' };
  }

  return { simulate };
}

export function registerLifeosUiDirectivesRoutes(app, deps = {}) {
  const { pool, logger, callCouncilMember, requireKey, requireAuth } = pickReqDeps(null, deps);
  const authMiddleware = typeof requireAuth === 'function' ? requireAuth : typeof requireKey === 'function' ? requireKey : null;

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerLifeosUiDirectivesRoutes requires an express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerLifeosUiDirectivesRoutes requires deps.pool');
  }

  const uiDirectivesService = createUiDirectivesService({ pool, callCouncilMember, logger });
  const twinReactionSimulator = createTwinReactionSimulator({ pool, callCouncilMember, logger });
  const prefix = '/api/v1/lifeos/twin';

  const withAuth = authMiddleware ? [authMiddleware] : [];

  app.post(
    `${prefix}/ui-directives/propose`,
    ...withAuth,
    async (req, res) => {
      try {
        const result = await uiDirectivesService.propose(req.body?.text);
        if (!result.ok) return safeJson(res, 400, result);
        return safeJson(res, 200, result);
      } catch (error) {
        logger?.error?.({ err: error }, 'ui-directives propose failed');
        return safeJson(res, 500, { ok: false, error: 'internal_error' });
      }
    }
  );

  app.post(
    `${prefix}/ui-directives/apply`,
    ...withAuth,
    async (req, res) => {
      try {
        const result = await uiDirectivesService.apply(req.body?.directives);
        if (!result.ok) return safeJson(res, 400, result);
        return safeJson(res, 200, result);
      } catch (error) {
        logger?.error?.({ err: error }, 'ui-directives apply failed');
        return safeJson(res, 500, { ok: false, error: 'internal_error' });
      }
    }
  );

  app.get(
    `${prefix}/ui-directives`,
    ...withAuth,
    async (_req, res) => {
      try {
        const result = await uiDirectivesService.get();
        return safeJson(res, 200, result);
      } catch (error) {
        logger?.error?.({ err: error }, 'ui-directives get failed');
        return safeJson(res, 500, { ok: false, error: 'internal_error' });
      }
    }
  );

  app.post(
    `${prefix}/reaction/simulate`,
    ...withAuth,
    async (req, res) => {
      try {
        const result = await twinReactionSimulator.simulate({
          idea: req.body?.idea,
          context: req.body?.context,
        });
        if (!result.ok) return safeJson(res, 400, result);
        return safeJson(res, 200, result);
      } catch (error) {
        logger?.error?.({ err: error }, 'reaction simulate failed');
        return safeJson(res, 500, { ok: false, error: 'internal_error' });
      }
    }
  );

  return app;
}

export default registerLifeosUiDirectivesRoutes;