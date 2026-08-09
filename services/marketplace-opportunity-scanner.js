/**
 * SYNOPSIS: Marketplace Opportunity Scanner -- pure, deterministic scoring
 * for candidate products/niches (demand, competition, margin, trend, capital
 * required, complexity, risk), plus persistence for scored candidates. No
 * AI/model call anywhere in this file -- Tier 1 deterministic, per the
 * zero-capital economic engine doctrine's own reasoning-tier discipline.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

const FACTOR_KEYS = ['demand', 'competition', 'margin', 'trend', 'capitalRequired', 'complexity', 'risk'];

// Positive factors raise the score; negative factors (competition, capitalRequired,
// complexity, risk) are inverted (100 - value) before weighting, so a HIGH input
// value for a negative factor still LOWERS the final score.
const WEIGHTS = {
  demand: 0.25,
  margin: 0.25,
  trend: 0.15,
  competition: 0.15,
  capitalRequired: 0.10,
  complexity: 0.05,
  risk: 0.05,
};
const NEGATIVE_FACTORS = new Set(['competition', 'capitalRequired', 'complexity', 'risk']);

function clamp0to100(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

/**
 * Pure, deterministic. Each factor in `signals` is 0-100. Missing factors are
 * excluded from the weighted sum (not defaulted to a fake middle value) and
 * named in `missingFactors`, so a partial-data score is never presented as
 * fully evidenced -- the confidence field makes that explicit.
 */
export function scoreOpportunity(signals = {}) {
  const provided = {};
  const missingFactors = [];

  for (const key of FACTOR_KEYS) {
    const raw = signals[key];
    const clamped = clamp0to100(raw);
    if (clamped === null) {
      missingFactors.push(key);
      continue;
    }
    provided[key] = NEGATIVE_FACTORS.has(key) ? 100 - clamped : clamped;
  }

  const providedKeys = Object.keys(provided);
  let weightedSum = 0;
  let weightTotal = 0;
  const breakdown = [];

  for (const key of providedKeys) {
    const weight = WEIGHTS[key];
    weightedSum += provided[key] * weight;
    weightTotal += weight;
    breakdown.push({
      factor: key,
      raw_input: clamp0to100(signals[key]),
      normalized: provided[key],
      weight,
      contribution: provided[key] * weight,
    });
  }

  const score = weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : 0;
  const confidence = missingFactors.length === 0 ? 'full' : (providedKeys.length === 0 ? 'none' : 'partial');

  return {
    score,
    confidence,
    missingFactors,
    breakdown,
    factors_provided: providedKeys.length,
    factors_total: FACTOR_KEYS.length,
  };
}

async function ensureOpportunityScannerSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_opportunities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      niche TEXT NOT NULL,
      source TEXT,
      signals JSONB NOT NULL DEFAULT '{}'::jsonb,
      score NUMERIC,
      confidence TEXT,
      missing_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'candidate',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function recordOpportunity(pool, { niche, source = null, signals = {}, notes = null } = {}) {
  if (!niche || !String(niche).trim()) throw new Error('recordOpportunity requires niche');
  await ensureOpportunityScannerSchema(pool);
  const result = scoreOpportunity(signals);
  const { rows } = await pool.query(
    `INSERT INTO marketplace_opportunities (niche, source, signals, score, confidence, missing_factors, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      String(niche).trim(),
      source,
      JSON.stringify(signals || {}),
      result.score,
      result.confidence,
      JSON.stringify(result.missingFactors),
      notes,
    ],
  );
  return { ...rows[0], scoring: result };
}

export async function listOpportunities(pool, { status = null, minScore = null, limit = 50 } = {}) {
  await ensureOpportunityScannerSchema(pool);
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (minScore !== null && minScore !== undefined) {
    params.push(Number(minScore));
    conditions.push(`score >= $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(Math.min(Math.max(Number(limit) || 50, 1), 200));
  const { rows } = await pool.query(
    `SELECT * FROM marketplace_opportunities ${whereClause} ORDER BY score DESC NULLS LAST, created_at DESC LIMIT $${params.length}`,
    params,
  );
  return rows;
}

export async function updateOpportunityStatus(pool, id, status) {
  if (!id) throw new Error('updateOpportunityStatus requires id');
  const allowed = new Set(['candidate', 'scored', 'sentry_reviewed', 'experiment_launched', 'killed']);
  if (!allowed.has(status)) throw new Error(`invalid status: ${status}`);
  await ensureOpportunityScannerSchema(pool);
  const { rows } = await pool.query(
    `UPDATE marketplace_opportunities SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return rows[0] || null;
}