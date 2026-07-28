/**
 * SYNOPSIS: Exports findSimilarTargets — services/self-repair-pattern-propagation.js.
 */
import { queryRootCauseChains } from './self-repair-root-cause-chains.js';
import { getFixDurability } from './self-repair-fix-durability.js';

export async function findSimilarTargets(pool, { bug_shape_signature, exclude_target }) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_propagation_candidates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_fix_id TEXT NOT NULL,
      source_target TEXT NOT NULL,
      candidate_target TEXT NOT NULL,
      bug_shape_signature TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(source_fix_id, candidate_target)
    )
  `);

  const chains = await queryRootCauseChains(pool, { bug_shape_signature });
  const candidates = new Set();

  chains.forEach(chain => {
    if (chain.symptom && chain.symptom !== exclude_target) {
      candidates.add(chain.symptom);
    }
  });

  return Array.from(candidates);
}

export async function propagateFix(pool, { fix_id, source_target, bug_shape_signature, minHalfLifeMs = 3600000 }) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_propagation_candidates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_fix_id TEXT NOT NULL,
      source_target TEXT NOT NULL,
      candidate_target TEXT NOT NULL,
      bug_shape_signature TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(source_fix_id, candidate_target)
    )
  `);

  const durability = await getFixDurability(pool, { target: source_target, limit: 5 });

  const fix = durability.find(d => d.fix_id === fix_id);
  if (!fix || fix.rebreak_count !== 0 || (fix.half_life_ms !== null && fix.half_life_ms < minHalfLifeMs)) {
    return { ok: false, reason: 'not_yet_durable', candidates: [] };
  }

  const candidates = await findSimilarTargets(pool, { bug_shape_signature, exclude_target: source_target });

  if (candidates.length > 0) {
    const values = candidates.map(candidate => [
      fix_id, source_target, candidate, bug_shape_signature
    ]);

    for (const value of values) {
      await pool.query(`
        INSERT INTO self_repair_propagation_candidates (source_fix_id, source_target, candidate_target, bug_shape_signature)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (source_fix_id, candidate_target) DO NOTHING
      `, value);
    }
  }

  return { ok: true, candidates };
}

export async function getPendingPropagationCandidates(pool, { limit = 50 } = {}) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_propagation_candidates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_fix_id TEXT NOT NULL,
      source_target TEXT NOT NULL,
      candidate_target TEXT NOT NULL,
      bug_shape_signature TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(source_fix_id, candidate_target)
    )
  `);

  const { rows } = await pool.query(`
    SELECT * FROM self_repair_propagation_candidates
    WHERE status = 'pending'
    ORDER BY proposed_at DESC
    LIMIT $1
  `, [limit]);

  return rows;
}