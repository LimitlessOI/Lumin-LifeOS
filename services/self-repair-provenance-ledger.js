/**
 * SYNOPSIS: Exports recordProvenanceClaim — services/self-repair-provenance-ledger.js.
 */
import { execFileSync } from 'node:child_process';

export async function recordProvenanceClaim(pool, { claim, commit_sha }) {
  await pool.query('CREATE TABLE IF NOT EXISTS self_repair_provenance_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), claim TEXT NOT NULL, commit_sha TEXT, is_ancestor_of_tip BOOLEAN, verified_at TIMESTAMPTZ, epistemic_grade TEXT NOT NULL DEFAULT \'GUESS\', result TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  await pool.query('INSERT INTO self_repair_provenance_ledger (claim, commit_sha) VALUES ($1, $2)', [claim, commit_sha]);
}

export async function verifyProvenanceClaim(pool, { claim_id, repoRoot }) {
  await pool.query('CREATE TABLE IF NOT EXISTS self_repair_provenance_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), claim TEXT NOT NULL, commit_sha TEXT, is_ancestor_of_tip BOOLEAN, verified_at TIMESTAMPTZ, epistemic_grade TEXT NOT NULL DEFAULT \'GUESS\', result TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const { rows } = await pool.query('SELECT commit_sha FROM self_repair_provenance_ledger WHERE id = $1', [claim_id]);
  if (rows.length === 0) throw new Error('Claim not found');

  const { commit_sha } = rows[0];
  let isAncestor = false;
  let result = 'FALSE_CLAIM';
  
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', commit_sha, 'HEAD'], { cwd: repoRoot });
    isAncestor = true;
    result = 'verified';
  } catch (error) {
    // If the command fails, we treat it as a FALSE_CLAIM
  }

  const updateResult = await pool.query(
    `UPDATE self_repair_provenance_ledger 
     SET is_ancestor_of_tip = $1, verified_at = now(), epistemic_grade = 'KNOW', result = $2 
     WHERE id = $3 
     RETURNING *`,
    [isAncestor, result, claim_id]
  );
  
  return updateResult.rows[0];
}

export async function getProvenanceLedger(pool, { limit = 50 } = {}) {
  await pool.query('CREATE TABLE IF NOT EXISTS self_repair_provenance_ledger (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), claim TEXT NOT NULL, commit_sha TEXT, is_ancestor_of_tip BOOLEAN, verified_at TIMESTAMPTZ, epistemic_grade TEXT NOT NULL DEFAULT \'GUESS\', result TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const { rows } = await pool.query(
    'SELECT * FROM self_repair_provenance_ledger ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return rows;
}