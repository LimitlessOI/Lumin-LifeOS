/**
 * SYNOPSIS: services/model-capability-ledger.js
 * Real, per-(model-tier, role) outcome ledger. Founder, direct: "every
 * model that sits in here needs to be rated... what level of model and
 * which LLM... Have we ranked any of them? If not, why not?"
 *
 * North Star §2.0J Model Benchmarking Law: "Models must be benchmarked by
 * role, not generic intelligence" and names ~9 roles (AIC debate, BPB
 * blueprinting, OIL adversarial review, BuilderOS execution, Verifier,
 * summarizer, historian, founder intent modeling, security review,
 * external research). The first version of this file only ever recorded
 * one role (BuilderOS codegen execution) -- honest gap, named in its own
 * receipt at the time. This version adds a `role` column (composite key
 * with model_tier) so a model's measured trust/success can genuinely
 * differ by role, matching the law's own text, and wires in a second real
 * role (`aic_debate` -- Chair/CFO reasoning in
 * services/lifere-council-router.js) using data that call site already
 * produces, not a new AI call invented to feed this ledger.
 *
 * Still honestly partial: only 2 of ~9 named roles have real recording
 * wired in. The rest (BPB blueprinting, OIL review, Verifier, summarizer,
 * historian, founder intent modeling, security review, external research)
 * are named here so the gap stays visible rather than silently forgotten,
 * and get wired as those call sites are touched for other reasons -- not
 * retrofitted speculatively just to claim full coverage.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
import { computeTrustDelta, buildCapabilityProfile } from '../config/trust-scoring.js';

export const KNOWN_ROLES = {
  builderos_execution: 'BuilderOS codegen execution (governed factory dispatch)',
  aic_debate: 'AI Council / Chair debate and reasoning',
  // Not yet wired to real recording -- named so the gap stays visible:
  bpb_blueprinting: 'Blueprint Builder -- not yet wired',
  oil_review: 'OIL adversarial review -- not yet wired',
  verifier: 'SENTRY / verification layer -- not yet wired',
  summarizer: 'Summarization tasks -- not yet wired',
  historian: 'Historian record-keeping -- not yet wired',
  founder_intent_modeling: 'Founder Intent Model -- not yet wired',
  security_review: 'Security review -- not yet wired',
  external_research: 'Web/vendor-doc research -- not yet wired',
};

async function ensureTable(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS model_capability_ledger (
      model_tier TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'builderos_execution',
      attempts INTEGER NOT NULL DEFAULT 0,
      shipped_ok INTEGER NOT NULL DEFAULT 0,
      trust_earned_count INTEGER NOT NULL DEFAULT 0,
      theater_detected_count INTEGER NOT NULL DEFAULT 0,
      escalated_count INTEGER NOT NULL DEFAULT 0,
      last_effective_grade TEXT,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (model_tier, role)
    )`
  );
  // Safety net for an environment where the old single-column-PK version of
  // this table was already created (this session's own production table was
  // confirmed empty before this change, but ensureTable must stay safe to
  // run against any prior state, not just the one observed).
  await pool.query(`ALTER TABLE model_capability_ledger ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'builderos_execution'`).catch(() => {});

  // Reality write-back columns. The ledger previously CLOSED AT DISPATCH: it
  // recorded that a model was asked to do something and whether the dispatch
  // looked fine, then never learned whether the thing actually worked. These are
  // the counters that let a Reality outcome reach the row that predicted it.
  // Additive and idempotent — same pattern as the `role` backfill above.
  for (const col of REALITY_COLUMNS) {
    await pool.query(`ALTER TABLE model_capability_ledger ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`).catch(() => {});
  }
}

/**
 * `factory_id` exists so trust can attach to a FACTORY, not only a model tier.
 * Two factories on the same tier are different actors with different records;
 * without an identity there is nothing to hold capable. Defaults to factory-1 so
 * every historical row keeps a truthful owner rather than becoming anonymous.
 */
export const DEFAULT_FACTORY_ID = 'factory-1';

const REALITY_COLUMNS = [
  { name: 'factory_id', type: `TEXT NOT NULL DEFAULT '${DEFAULT_FACTORY_ID}'` },
  { name: 'reality_verified_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'reality_failed_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'blueprint_fidelity_ok_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'blueprint_fidelity_violation_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'self_caught_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'escaped_defect_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'peer_defect_found_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'reuse_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'unnecessary_invention_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'lesson_verified_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'concealment_count', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'trust_delta_total', type: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'reality_last_scored_at', type: 'TIMESTAMPTZ' },
];

/**
 * Record one real outcome for a (model_tier, role) pair. Called from real
 * call sites only -- never from a hypothetical/simulated dispatch.
 */
export async function recordModelOutcome(pool, {
  model_tier,
  role = 'builderos_execution',
  ok = false,
  trust_earned = false,
  theater_detected = false,
  escalated = false,
  effective_grade = null,
} = {}) {
  const tier = String(model_tier || '').trim();
  const roleKey = String(role || 'builderos_execution').trim() || 'builderos_execution';
  if (!pool || !tier) return;
  await ensureTable(pool);
  await pool.query(
    `INSERT INTO model_capability_ledger
       (model_tier, role, attempts, shipped_ok, trust_earned_count, theater_detected_count, escalated_count, last_effective_grade, last_seen_at, updated_at)
     VALUES ($1, $2, 1, $3, $4, $5, $6, $7, now(), now())
     ON CONFLICT (model_tier, role) DO UPDATE SET
       attempts = model_capability_ledger.attempts + 1,
       shipped_ok = model_capability_ledger.shipped_ok + $3,
       trust_earned_count = model_capability_ledger.trust_earned_count + $4,
       theater_detected_count = model_capability_ledger.theater_detected_count + $5,
       escalated_count = model_capability_ledger.escalated_count + $6,
       last_effective_grade = $7,
       last_seen_at = now(),
       updated_at = now()`,
    [tier, roleKey, ok ? 1 : 0, trust_earned ? 1 : 0, theater_detected ? 1 : 0, escalated ? 1 : 0, effective_grade]
  );
}

/**
 * THE MISSING WRITER (§2.0L). Applies a real Reality outcome to the ledger row
 * that produced the work, so a prediction that was scored actually changes who
 * gets the next job. Before this, `trust_adjustment.delta` was named in the
 * department role contract with no writer and no reader.
 *
 * Scoring policy lives in config/trust-scoring.js and is pure — this function
 * only persists what that policy computed. It never decides what to reward,
 * which keeps "what counts as good" a founder decision rather than a side effect
 * of persistence code.
 */
export async function recordRealityOutcome(pool, outcome = {}) {
  const tier = String(outcome.model_tier || '').trim();
  const roleKey = String(outcome.role || 'builderos_execution').trim() || 'builderos_execution';
  const factoryId = String(outcome.factory_id || DEFAULT_FACTORY_ID).trim() || DEFAULT_FACTORY_ID;
  const scored = computeTrustDelta(outcome);
  if (!pool || !tier) return { persisted: false, ...scored };

  await ensureTable(pool);
  const inc = (v) => (v === true ? 1 : 0);
  const realityFailed = outcome.reality_verified === false && outcome.reality_scored === true;

  await pool.query(
    `INSERT INTO model_capability_ledger
       (model_tier, role, factory_id, attempts, shipped_ok,
        reality_verified_count, reality_failed_count,
        blueprint_fidelity_ok_count, blueprint_fidelity_violation_count,
        self_caught_count, escaped_defect_count, peer_defect_found_count,
        reuse_count, unnecessary_invention_count, lesson_verified_count,
        concealment_count, trust_delta_total, reality_last_scored_at,
        last_seen_at, updated_at)
     VALUES ($1, $2, $3, 0, 0, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now(), now(), now())
     ON CONFLICT (model_tier, role) DO UPDATE SET
       reality_verified_count = model_capability_ledger.reality_verified_count + $4,
       reality_failed_count = model_capability_ledger.reality_failed_count + $5,
       blueprint_fidelity_ok_count = model_capability_ledger.blueprint_fidelity_ok_count + $6,
       blueprint_fidelity_violation_count = model_capability_ledger.blueprint_fidelity_violation_count + $7,
       self_caught_count = model_capability_ledger.self_caught_count + $8,
       escaped_defect_count = model_capability_ledger.escaped_defect_count + $9,
       peer_defect_found_count = model_capability_ledger.peer_defect_found_count + $10,
       reuse_count = model_capability_ledger.reuse_count + $11,
       unnecessary_invention_count = model_capability_ledger.unnecessary_invention_count + $12,
       lesson_verified_count = model_capability_ledger.lesson_verified_count + $13,
       concealment_count = model_capability_ledger.concealment_count + $14,
       trust_delta_total = model_capability_ledger.trust_delta_total + $15,
       reality_last_scored_at = now(),
       updated_at = now()`,
    [
      tier,
      roleKey,
      factoryId,
      inc(outcome.reality_verified === true),
      inc(realityFailed),
      inc(outcome.blueprint_fidelity_ok === true),
      inc(outcome.blueprint_fidelity_violation === true),
      inc(outcome.self_caught_defect === true),
      inc(outcome.escaped_defect === true),
      inc(outcome.peer_defect_found === true),
      inc(outcome.reused_existing === true),
      inc(outcome.unnecessary_invention === true),
      inc(outcome.lesson_verified === true),
      inc(scored.concealment === true),
      scored.delta,
    ]
  );
  return { persisted: true, factory_id: factoryId, ...scored };
}

/**
 * Multi-dimensional capability profiles. A rank may be presented on top, but the
 * dimensions stay separate: once one number is the target, the system learns to
 * maximize the number instead of doing the work.
 */
export async function getCapabilityProfiles(pool, { role = null, factory_id = null } = {}) {
  if (!pool) return [];
  await ensureTable(pool);
  const where = [];
  const params = [];
  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (factory_id) {
    params.push(factory_id);
    where.push(`factory_id = $${params.length}`);
  }
  const { rows } = await pool.query(
    `SELECT * FROM model_capability_ledger
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY trust_delta_total DESC, attempts DESC`,
    params
  );
  return rows.map(buildCapabilityProfile);
}

/**
 * Real per-(model,role) rankings, optionally filtered to one role. Ordered
 * best-first by trust-earned rate (the strictest signal), then raw success
 * rate, then attempt volume.
 */
export async function getModelRankings(pool, { role = null } = {}) {
  if (!pool) return [];
  await ensureTable(pool);
  const params = [];
  let where = '';
  if (role) {
    params.push(role);
    where = 'WHERE role = $1';
  }
  const { rows } = await pool.query(
    `SELECT model_tier, role, attempts, shipped_ok, trust_earned_count, theater_detected_count,
            escalated_count, last_effective_grade, last_seen_at
     FROM model_capability_ledger ${where}
     ORDER BY
       CASE WHEN attempts > 0 THEN trust_earned_count::numeric / attempts ELSE 0 END DESC,
       CASE WHEN attempts > 0 THEN shipped_ok::numeric / attempts ELSE 0 END DESC,
       attempts DESC`,
    params
  );
  return rows.map((r) => ({
    model_tier: r.model_tier,
    role: r.role,
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
