/**
 * SYNOPSIS: Exports shouldQuarantineTarget — services/self-repair-quarantine.js.
 */
import { getTargetReputation } from './self-repair-target-reputation.js';

export function shouldQuarantineTarget({ reputation, recentFailureCount }) {
  if (
    (reputation && reputation.hardness_score >= 0.75 && reputation.attempts >= 3) ||
    recentFailureCount >= 3
  ) {
    return { quarantine: true, reason: 'Repeated failures or high hardness score' };
  }
  return { quarantine: false, reason: null };
}

export async function evaluateQuarantine(pool, { target_path, recentFailureCount = 0 }) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_quarantine_state (
      target_path TEXT PRIMARY KEY,
      quarantined BOOLEAN NOT NULL DEFAULT false,
      reason TEXT,
      quarantined_at TIMESTAMPTZ,
      released_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const reputation = await getTargetReputation(pool, { target_path });
  const { quarantine, reason } = shouldQuarantineTarget({ reputation, recentFailureCount });

  const query = `
    INSERT INTO self_repair_quarantine_state (target_path, quarantined, reason, quarantined_at, updated_at)
    VALUES ($1, $2, $3, CASE WHEN $2 = TRUE THEN now() ELSE NULL END, now())
    ON CONFLICT (target_path) DO UPDATE SET
      quarantined = $2,
      reason = $3,
      quarantined_at = CASE
        WHEN self_repair_quarantine_state.quarantined = FALSE AND $2 = TRUE THEN now()
        ELSE self_repair_quarantine_state.quarantined_at
      END,
      released_at = CASE
        WHEN self_repair_quarantine_state.quarantined = TRUE AND $2 = FALSE THEN now()
        ELSE NULL
      END,
      updated_at = now()
    RETURNING *;
  `;

  const res = await pool.query(query, [target_path, quarantine, reason]);
  return { quarantine, reason };
}

export async function isTargetQuarantined(pool, { target_path }) {
  const res = await pool.query(
    'SELECT * FROM self_repair_quarantine_state WHERE target_path = $1',
    [target_path]
  );
  return res.rows[0] || null;
}

export async function releaseQuarantine(pool, { target_path, reason }) {
  const query = `
    UPDATE self_repair_quarantine_state
    SET
      quarantined = FALSE,
      released_at = now(),
      reason = $2,
      updated_at = now()
    WHERE target_path = $1
    RETURNING *;
  `;
  const res = await pool.query(query, [target_path, reason]);
  return res.rows[0] || null;
}