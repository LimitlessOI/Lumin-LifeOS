/**
 * SYNOPSIS: Exports shouldQuarantineTarget — services/self-repair-quarantine.js.
 */
import { getTargetReputation } from './self-repair-target-reputation.js';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS self_repair_quarantine_state (
    target_path TEXT PRIMARY KEY,
    quarantined BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    quarantined_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

export function shouldQuarantineTarget({ reputation, recentFailureCount }) {
  const needsQuarantine =
    (reputation && reputation.hardness_score >= 0.75 && reputation.attempts >= 3) ||
    recentFailureCount >= 3;

  const reason = needsQuarantine ? 'Automated quarantine due to repeated failure or high hardness score.' : null;

  return { quarantine: needsQuarantine, reason };
}

export async function evaluateQuarantine(pool, { target_path }) {
  await pool.query(CREATE_TABLE_SQL);

  const reputation = await getTargetReputation(pool, { target_path });
  const { quarantine, reason } = shouldQuarantineTarget({ reputation, recentFailureCount: reputation?.recent_failure_count || 0 });

  const query = `
    INSERT INTO self_repair_quarantine_state (target_path, quarantined, reason, quarantined_at, updated_at)
    VALUES ($1, $2, $3, CASE WHEN $2 IS TRUE THEN now() ELSE NULL END, now())
    ON CONFLICT (target_path) DO UPDATE SET
      quarantined = EXCLUDED.quarantined,
      reason = EXCLUDED.reason,
      quarantined_at = CASE
        WHEN EXCLUDED.quarantined IS TRUE AND self_repair_quarantine_state.quarantined IS FALSE THEN now()
        ELSE self_repair_quarantine_state.quarantined_at
      END,
      released_at = NULL,
      updated_at = now()
    RETURNING *;
  `;
  const res = await pool.query(query, [target_path, quarantine, reason]);
  return res.rows[0];
}

export async function isTargetQuarantined(pool, { target_path }) {
  await pool.query(CREATE_TABLE_SQL);

  const query = `
    SELECT * FROM self_repair_quarantine_state WHERE target_path = $1;
  `;
  const res = await pool.query(query, [target_path]);
  return res.rows[0] || null;
}

export async function releaseQuarantine(pool, { target_path, reason }) {
  await pool.query(CREATE_TABLE_SQL);

  const query = `
    UPDATE self_repair_quarantine_state
    SET quarantined = FALSE,
        released_at = now(),
        reason = $2,
        updated_at = now()
    WHERE target_path = $1
    RETURNING *;
  `;
  const res = await pool.query(query, [target_path, reason]);
  return res.rows[0] || null;
}