/**
 * SYNOPSIS: Cognitive Core Era-2 Layer 2 — Programs (deep recurring mechanisms as hypotheses).
 * Law 1: a program is NEVER truth. It carries confidence, evidence for/against, and a change
 * trajectory. Confidence moves only on evidence; the surface phrases everything as "hypothesis".
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

const TRAJECTORIES = new Set(['strengthening', 'stable', 'weakening', 'context_dependent']);

function clamp01(n, fallback = 0.3) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * @param {{ pool: import('pg').Pool, logger?: Console }} deps
 */
export function createCognitiveCorePrograms(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;

  async function createProgram({
    userId,
    label,
    hypothesis,
    origin = null,
    triggers = [],
    typicalBehavior = null,
    protectivePurpose = null,
    currentCost = null,
    confidence = 0.3,
    evidenceFor = [],
    evidenceAgainst = [],
    changeTrajectory = 'stable',
    domain = null,
  }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    if (!label || !hypothesis) throw new Error('program_requires_label_and_hypothesis');
    const traj = TRAJECTORIES.has(changeTrajectory) ? changeTrajectory : 'stable';
    const { rows } = await pool.query(
      `INSERT INTO judgment_programs
         (user_id, label, hypothesis, origin, triggers, typical_behavior, protective_purpose,
          current_cost, confidence, evidence_for, evidence_against, change_trajectory, domain)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13)
       RETURNING *`,
      [
        String(userId),
        String(label).slice(0, 200),
        String(hypothesis).slice(0, 2000),
        origin ? String(origin).slice(0, 1000) : null,
        JSON.stringify(asArray(triggers)),
        typicalBehavior ? String(typicalBehavior).slice(0, 1000) : null,
        protectivePurpose ? String(protectivePurpose).slice(0, 1000) : null,
        currentCost ? String(currentCost).slice(0, 1000) : null,
        clamp01(confidence),
        JSON.stringify(asArray(evidenceFor)),
        JSON.stringify(asArray(evidenceAgainst)),
        traj,
        domain ? String(domain).slice(0, 80) : null,
      ],
    );
    return rows[0];
  }

  async function listPrograms(userId, { status = 'active', domain = null, limit = 100 } = {}) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const clauses = ['user_id = $1'];
    const params = [String(userId)];
    if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
    if (domain) { params.push(domain); clauses.push(`(domain = $${params.length} OR domain IS NULL)`); }
    params.push(Math.min(500, Math.max(1, Number(limit) || 100)));
    const { rows } = await pool.query(
      `SELECT * FROM judgment_programs
       WHERE ${clauses.join(' AND ')}
       ORDER BY confidence DESC, updated_at DESC
       LIMIT $${params.length}`,
      params,
    );
    return rows;
  }

  async function getProgram(programId) {
    const { rows } = await pool.query(`SELECT * FROM judgment_programs WHERE program_id = $1`, [programId]);
    return rows[0] || null;
  }

  /**
   * Move confidence on evidence only (Law 2). delta is bounded; appends the evidence note
   * to the correct side; auto-derives change trajectory from the direction of movement.
   */
  async function adjustConfidence({ programId, delta, evidenceNote = null, supports = true, retire = false }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const current = await getProgram(programId);
    if (!current) throw new Error('program_not_found');
    const step = Math.max(-0.34, Math.min(0.34, Number(delta) || 0));
    const next = clamp01(Number(current.confidence) + step, current.confidence);
    const trajectory = step > 0.02 ? 'strengthening' : step < -0.02 ? 'weakening' : current.change_trajectory;
    const forArr = asArray(current.evidence_for);
    const againstArr = asArray(current.evidence_against);
    if (evidenceNote) {
      const entry = { note: String(evidenceNote).slice(0, 500), at: new Date().toISOString() };
      if (supports) forArr.push(entry); else againstArr.push(entry);
    }
    const status = retire ? 'retired' : current.status;
    const { rows } = await pool.query(
      `UPDATE judgment_programs
         SET confidence = $2,
             change_trajectory = $3,
             evidence_for = $4::jsonb,
             evidence_against = $5::jsonb,
             status = $6,
             last_confirmed_at = CASE WHEN $7 THEN NOW() ELSE last_confirmed_at END,
             updated_at = NOW()
       WHERE program_id = $1
       RETURNING *`,
      [programId, next, trajectory, JSON.stringify(forArr), JSON.stringify(againstArr), status, supports],
    );
    return rows[0];
  }

  async function recordActivation({ programId, decisionId, userId, weight = 0.5, source = 'prediction', explainedOutcome = null }) {
    if (!pool) throw new Error('cognitive_core_requires_pool');
    const { rows } = await pool.query(
      `INSERT INTO judgment_program_activations
         (program_id, decision_id, user_id, weight, source, explained_outcome)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [programId, decisionId, String(userId), clamp01(weight, 0.5),
        ['prediction', 'miss_loop'].includes(source) ? source : 'prediction',
        explainedOutcome === null ? null : Boolean(explainedOutcome)],
    );
    return rows[0];
  }

  /**
   * Resolve free-text program refs (labels or ids the model emitted) to real program rows,
   * so predictions link to concrete hypotheses instead of inventing labels.
   */
  async function matchProgramsByRefs(userId, refs = []) {
    if (!pool || !Array.isArray(refs) || !refs.length) return [];
    const active = await listPrograms(userId, { status: 'active' });
    const out = [];
    const seen = new Set();
    for (const ref of refs) {
      const needle = String(ref || '').trim().toLowerCase();
      if (!needle) continue;
      const hit = active.find(
        (p) => p.program_id === ref
          || p.label.toLowerCase() === needle
          || p.label.toLowerCase().includes(needle)
          || needle.includes(p.label.toLowerCase()),
      );
      if (hit && !seen.has(hit.program_id)) { seen.add(hit.program_id); out.push(hit); }
    }
    return out;
  }

  /** Compact hypothesis briefs for injecting into the judgment prompt (perspective layer). */
  async function activeProgramBriefs(userId, domain = null, limit = 6) {
    const rows = await listPrograms(userId, { status: 'active', domain, limit });
    return rows.slice(0, limit).map((p) => ({
      program_id: p.program_id,
      label: p.label,
      hypothesis: p.hypothesis,
      triggers: asArray(p.triggers),
      confidence: Number(p.confidence),
      change_trajectory: p.change_trajectory,
    }));
  }

  return {
    createProgram,
    listPrograms,
    getProgram,
    adjustConfidence,
    recordActivation,
    matchProgramsByRefs,
    activeProgramBriefs,
    TRAJECTORIES: [...TRAJECTORIES],
  };
}

export default createCognitiveCorePrograms;