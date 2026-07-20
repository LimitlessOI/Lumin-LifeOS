/**
 * SYNOPSIS: Exports computeExportsSignatureHash — services/self-repair-contract-gate.js.
 */
import crypto from 'crypto';

export function computeExportsSignatureHash(exportNames) {
  const joined = exportNames.sort().join(',');
  return crypto.createHash('sha256').update(joined).digest('hex');
}

export async function detectSharedContractChange({ target_file, knownConsumers = [] }) {
  const requires_cosign = knownConsumers.length > 0;
  const reason = requires_cosign ? 'External consumers detected, signature change requires co-sign.' : 'No external consumers, no co-sign required.';
  return { requires_cosign, consumers: knownConsumers, reason };
}

export async function recordContractVersion(pool, { contract_id, target_file, exports_signature_hash }) {
  await pool.query('CREATE TABLE IF NOT EXISTS self_repair_contract_versions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), contract_id TEXT NOT NULL, target_file TEXT NOT NULL, exports_signature_hash TEXT NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  await pool.query(
    'INSERT INTO self_repair_contract_versions (contract_id, target_file, exports_signature_hash) VALUES ($1, $2, $3)',
    [contract_id, target_file, exports_signature_hash]
  );
}

export async function checkContractCompatibility(pool, { contract_id, new_exports_signature_hash }) {
  await pool.query('CREATE TABLE IF NOT EXISTS self_repair_contract_versions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), contract_id TEXT NOT NULL, target_file TEXT NOT NULL, exports_signature_hash TEXT NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const result = await pool.query(
    'SELECT exports_signature_hash FROM self_repair_contract_versions WHERE contract_id = $1 ORDER BY recorded_at DESC LIMIT 1',
    [contract_id]
  );
  const previous_hash = result.rows.length > 0 ? result.rows[0].exports_signature_hash : null;
  const breaking = previous_hash !== null && previous_hash !== new_exports_signature_hash;
  return { breaking, previous_hash, new_hash: new_exports_signature_hash };
}
