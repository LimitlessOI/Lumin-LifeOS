/**
 * SYNOPSIS: Exports createReplacementPlanRoutes — routes/replacement-plan-routes.js.
 */
import express from 'express';

function coerceJsonb(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function validatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'body_required';
  }
  if (body.current_tools == null) return 'current_tools_required';
  if (body.business_goals == null) return 'business_goals_required';
  return null;
}

function buildPlan({ currentTools, businessGoals, ownerId }) {
  const tools = Array.isArray(currentTools)
    ? currentTools
    : currentTools && typeof currentTools === 'object'
      ? Object.values(currentTools)
      : [];

  const goals = Array.isArray(businessGoals)
    ? businessGoals
    : businessGoals && typeof businessGoals === 'object'
      ? Object.values(businessGoals)
      : [];

  const toolNames = tools
    .map((tool) => {
      if (tool && typeof tool === 'object') {
        return String(tool.name || tool.title || tool.tool || tool.id || '').trim();
      }
      return String(tool || '').trim();
    })
    .filter(Boolean);

  const goalSummaries = goals
    .map((goal) => {
      if (goal && typeof goal === 'object') {
        return String(goal.name || goal.goal || goal.title || goal.description || '').trim();
      }
      return String(goal || '').trim();
    })
    .filter(Boolean);

  const replacement_candidates = toolNames.map((name) => ({
    tool: name,
    replacement_needed: true,
    reason: goalSummaries.length ? 'evaluate against stated business goals' : 'evaluate against current operating needs',
  }));

  return {
    owner_id: ownerId,
    current_tools: currentTools,
    business_goals: businessGoals,
    summary: {
      tool_count: toolNames.length,
      goal_count: goalSummaries.length,
    },
    replacement_candidates,
    recommended_next_steps: [
      'inventory each current tool against business goals',
      'identify overlap, gaps, and maintenance burden',
      'select replacement candidates for detailed migration planning',
    ],
  };
}

export function createReplacementPlanRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/replacement-plan', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const validationError = validatePayload(req.body);
      if (validationError) return res.status(400).json({ ok: false, error: validationError });

      const currentTools = coerceJsonb(req.body.current_tools, null);
      const businessGoals = coerceJsonb(req.body.business_goals, null);

      if (currentTools == null) return res.status(400).json({ ok: false, error: 'current_tools_invalid' });
      if (businessGoals == null) return res.status(400).json({ ok: false, error: 'business_goals_invalid' });

      const { rows } = await pool.query(
        `SELECT id
           FROM lifeos_users
          WHERE id = $1
          LIMIT 1`,
        [ownerId],
      );

      if (!rows[0]) {
        return res.status(404).json({ ok: false, error: 'owner_not_found' });
      }

      const plan = buildPlan({ currentTools, businessGoals, ownerId });

      logger?.info?.('replacement_plan_generated', {
        ownerId,
        toolCount: plan.summary.tool_count,
        goalCount: plan.summary.goal_count,
      });

      return res.json({ ok: true, data: plan });
    } catch (err) {
      next(err);
    }
  });

  return router;
}