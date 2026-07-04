/**
 * SYNOPSIS: Exports createReplacementPlanService — services/replacement-plan-service.js.
 */
const TABLE_NAME = 'replacement_plans';

function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clampLimit(value, fallback = 50, min = 1, max = 200) {
  return Math.min(Math.max(toInt(value, fallback), min), max);
}

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || '').trim();
}

function buildPrompt({ currentTools, goals, constraints, context }) {
  const toolsBlock = Array.isArray(currentTools) && currentTools.length
    ? currentTools.map((t) => `- ${typeof t === 'string' ? t : JSON.stringify(t)}`).join('\n')
    : '- none provided';

  const goalsBlock = Array.isArray(goals) && goals.length
    ? goals.map((g) => `- ${typeof g === 'string' ? g : JSON.stringify(g)}`).join('\n')
    : '- reduce cost and simplify tooling';

  const constraintsBlock = Array.isArray(constraints) && constraints.length
    ? constraints.map((c) => `- ${typeof c === 'string' ? c : JSON.stringify(c)}`).join('\n')
    : '- preserve existing workflows';

  const contextBlock = context ? JSON.stringify(context, null, 2) : '{}';

  return [
    'Generate a practical replacement plan for tools/surfaces in a product stack.',
    'Return concise, structured JSON only when possible.',
    '',
    'Current tools:',
    toolsBlock,
    '',
    'Goals:',
    goalsBlock,
    '',
    'Constraints:',
    constraintsBlock,
    '',
    'Context:',
    contextBlock,
    '',
    'Include: replacement_candidates, savings_estimate, risk_notes, rollout_steps.',
  ].join('\n');
}

export function createReplacementPlanService(pool, callCouncilMember) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function createReplacementPlan({
    ownerId,
    currentTools = [],
    goals = [],
    constraints = [],
    context = {},
    metadata = {},
  }) {
    const resolvedOwnerId = ownerId == null ? null : ownerId;
    if (!resolvedOwnerId) {
      const err = new Error('owner_id_required');
      err.status = 400;
      throw err;
    }

    const prompt = buildPrompt({ currentTools, goals, constraints, context });
    const aiResponse = await callCouncilMember('openai', prompt, { taskType: 'general' });

    const aiText =
      typeof aiResponse === 'string'
        ? aiResponse
        : aiResponse?.content ??
          aiResponse?.text ??
          aiResponse?.message?.content ??
          aiResponse?.output ??
          '';

    const parsed = safeJsonParse(aiText, null);
    const plan = parsed && typeof parsed === 'object'
      ? parsed
      : {
          summary: normalizeText(aiText) || 'AI replacement plan generated.',
          replacement_candidates: [],
          savings_estimate: null,
          risk_notes: [],
          rollout_steps: [],
        };

    const { rows } = await pool.query(
      `INSERT INTO ${TABLE_NAME}
         (owner_id, current_tools, goals, constraints, context, ai_raw, ai_plan, metadata)
       VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8::jsonb)
       RETURNING *`,
      [
        resolvedOwnerId,
        JSON.stringify(Array.isArray(currentTools) ? currentTools : []),
        JSON.stringify(Array.isArray(goals) ? goals : []),
        JSON.stringify(Array.isArray(constraints) ? constraints : []),
        JSON.stringify(context || {}),
        normalizeText(aiText),
        JSON.stringify(plan),
        JSON.stringify(metadata || {}),
      ],
    );

    return rows[0];
  }

  async function getReplacementPlan(planId, ownerId) {
    const { rows } = await pool.query(
      `SELECT * FROM ${TABLE_NAME} WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [planId, ownerId],
    );
    if (!rows[0]) {
      const err = new Error('replacement_plan_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function listReplacementPlans(ownerId, { limit = 50 } = {}) {
    const lim = clampLimit(limit, 50, 1, 200);
    const { rows } = await pool.query(
      `SELECT * FROM ${TABLE_NAME} WHERE owner_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [ownerId, lim],
    );
    return rows;
  }

  async function updateReplacementPlan(planId, ownerId, patch = {}) {
    const existing = await getReplacementPlan(planId, ownerId);

    const nextPlan = {
      ...(safeJsonParse(existing.ai_plan, existing.ai_plan) || {}),
      ...(patch.ai_plan && typeof patch.ai_plan === 'object' ? patch.ai_plan : {}),
    };

    const { rows } = await pool.query(
      `UPDATE ${TABLE_NAME}
          SET ai_plan = $3::jsonb,
              metadata = $4::jsonb,
              updated_at = NOW()
        WHERE id = $1 AND owner_id = $2
        RETURNING *`,
      [
        planId,
        ownerId,
        JSON.stringify(nextPlan),
        JSON.stringify({
          ...(safeJsonParse(existing.metadata, existing.metadata) || {}),
          ...(patch.metadata && typeof patch.metadata === 'object' ? patch.metadata : {}),
        }),
      ],
    );

    return rows[0];
  }

  return {
    createReplacementPlan,
    getReplacementPlan,
    listReplacementPlans,
    updateReplacementPlan,
  };
}

export const generateReplacementPlan = async (service, input) => {
  if (!service || typeof service.createReplacementPlan !== 'function') {
    throw new Error('replacement_plan_service_required');
  }
  return service.createReplacementPlan(input || {});
};