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
}

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
