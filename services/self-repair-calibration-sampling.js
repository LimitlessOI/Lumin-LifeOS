/**
 * SYNOPSIS: Exports sampleClaimsForCalibration — services/self-repair-calibration-sampling.js.
 */
export async function sampleClaimsForCalibration(pool, { sampleSize = 5, sinceHours = 24 } = {}) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_calibration_samples (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_claim_id UUID,
      source_claim TEXT,
      sampled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed BOOLEAN NOT NULL DEFAULT false,
      review_result TEXT,
      review_note TEXT,
      reviewed_at TIMESTAMPTZ
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_provenance_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      claim TEXT NOT NULL,
      commit_sha TEXT,
      is_ancestor_of_tip BOOLEAN,
      verified_at TIMESTAMPTZ,
      epistemic_grade TEXT NOT NULL DEFAULT 'GUESS',
      result TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows: eligibleClaims } = await pool.query(
    `SELECT id, claim FROM self_repair_provenance_ledger WHERE result = 'verified' AND verified_at >= now() - ($1 || ' hours')::interval ORDER BY random() LIMIT $2`,
    [String(sinceHours), sampleSize]
  );

  if (eligibleClaims.length === 0) {
    return [];
  }

  const insertPromises = eligibleClaims.map(async (claim) => {
    const { rows } = await pool.query(
      `INSERT INTO self_repair_calibration_samples (source_claim_id, source_claim) VALUES ($1, $2) RETURNING *`,
      [claim.id, claim.claim]
    );
    return rows[0];
  });

  return Promise.all(insertPromises);
}

export async function recordCalibrationReview(pool, { sample_id, review_result, review_note = null }) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_calibration_samples (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_claim_id UUID,
      source_claim TEXT,
      sampled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed BOOLEAN NOT NULL DEFAULT false,
      review_result TEXT,
      review_note TEXT,
      reviewed_at TIMESTAMPTZ
    )
  `);

  const { rows } = await pool.query(
    `UPDATE self_repair_calibration_samples SET reviewed = true, review_result = $1, review_note = $2, reviewed_at = now() WHERE id = $3 RETURNING *`,
    [review_result, review_note, sample_id]
  );
  return rows[0] || null;
}

export async function getPendingCalibrationSamples(pool, { limit = 50 } = {}) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS self_repair_calibration_samples (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_claim_id UUID,
      source_claim TEXT,
      sampled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      reviewed BOOLEAN NOT NULL DEFAULT false,
      review_result TEXT,
      review_note TEXT,
      reviewed_at TIMESTAMPTZ
    )
  `);

  const { rows } = await pool.query(
    `SELECT * FROM self_repair_calibration_samples WHERE reviewed = false ORDER BY sampled_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}