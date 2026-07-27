/**
 * SYNOPSIS: services/model-capability-ledger.js
 * Real, per-model-tier outcome ledger for governed-factory codegen dispatches.
 * Founder, direct: "every model that sits in here needs to be rated... what
 * level of model and which LLM... Have we ranked any of them? If not, why
 * not?" -- answer before this file: no, nothing tracked real per-model
 * outcomes anywhere live (self_repair_target_reputation tracks by target
 * FILE, not model; cognitive-core-trust tracks advisor delegation, not raw
 * LLM quality). This is the real thing: wired directly into
 * runGovernedAutonomousShipOnce's per-step result processing -- the single
 * chokepoint every governed-factory codegen dispatch already passes through
 * (autonomous loop and manual /factory/ship-queue-and-commit calls alike) --
 * so recording cannot be silently skipped by a caller forgetting to opt in.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */

async function ensureTable(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS model_capability_ledger (
      model_tier TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      shipped_ok INTEGER NOT NULL DEFAULT 0,
      trust_earned_count INTEGER NOT NULL DEFAULT 0,
      theater_detected_count INTEGER NOT NULL DEFAULT 0,
      escalated_count INTEGER NOT NULL DEFAULT 0,
      last_effective_grade TEXT,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );
}

/**
 * Record one real governed-factory codegen outcome for a model tier.
 * Called once per shipped step from runGovernedAutonomousShipOnce -- never
 * from a hypothetical/simulated dispatch.
 */
export async function recordModelOutcome(pool, {
  model_tier,
  ok = false,
  trust_earned = false,
  theater_detected = false,
  escalated = false,
  effective_grade = null,
} = {}) {
  const tier = String(model_tier || '').trim();
  if (!pool || !tier) return;
  await ensureTable(pool);
  await pool.query(
    `INSERT INTO model_capability_ledger
       (model_tier, attempts, shipped_ok, trust_earned_count, theater_detected_count, escalated_count, last_effective_grade, last_seen_at, updated_at)
     VALUES ($1, 1, $2, $3, $4, $5, $6, now(), now())
     ON CONFLICT (model_tier) DO UPDATE SET
       attempts = model_capability_ledger.attempts + 1,
       shipped_ok = model_capability_ledger.shipped_ok + $2,
       trust_earned_count = model_capability_ledger.trust_earned_count + $3,
       theater_detected_count = model_capability_ledger.theater_detected_count + $4,
       escalated_count = model_capability_ledger.escalated_count + $5,
       last_effective_grade = $6,
       last_seen_at = now(),
       updated_at = now()`,
    [tier, ok ? 1 : 0, trust_earned ? 1 : 0, theater_detected ? 1 : 0, escalated ? 1 : 0, effective_grade]
  );
}

/**
 * Real per-model rankings from actual recorded outcomes, ordered best-first
 * by trust-earned rate (the strictest signal -- a step can ship ok:true and
 * still not be trust_earned per the self/peer/compare honesty-grade law).
 * Ties broken by raw success rate, then attempt volume (more data = more
 * confidence in the score).
 */
export async function getModelRankings(pool) {
  if (!pool) return [];
  await ensureTable(pool);
  const { rows } = await pool.query(
    `SELECT model_tier, attempts, shipped_ok, trust_earned_count, theater_detected_count,
            escalated_count, last_effective_grade, last_seen_at
     FROM model_capability_ledger
     ORDER BY
       CASE WHEN attempts > 0 THEN trust_earned_count::numeric / attempts ELSE 0 END DESC,
       CASE WHEN attempts > 0 THEN shipped_ok::numeric / attempts ELSE 0 END DESC,
       attempts DESC`
  );
  return rows.map((r) => ({
    model_tier: r.model_tier,
    attempts: r.attempts,
    shipped_ok: r.shipped_ok,
    success_rate: r.attempts > 0 ? Number((r.shipped_ok / r.attempts).toFixed(3)) : null,
    trust_earned_count: r.trust_earned_count,
    trust_earned_rate: r.attempts > 0 ? Number((r.trust_earned_count / r.attempts).toFixed(3)) : null,
    theater_detected_count: r.theater_detected_count,
    escalated_count: r.escalated_count,
    last_effective_grade: r.last_effective_grade,
    last_seen_at: r.last_seen_at,
  }));
}
