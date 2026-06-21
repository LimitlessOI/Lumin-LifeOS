/**
 * SYNOPSIS: Canonical Phase 14 proof path — runs on Railway runtime, writes to Railway Neon.
 * Canonical Phase 14 proof path — runs on Railway runtime, writes to Railway Neon.
 * Local shell must NOT claim ALPHA_READY without this path (or matching proof_store_id).
 *
 * Usage: node scripts/oil-phase14-railway-canonical.mjs
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import 'dotenv/config';
import {
  buildPhaseLedger,
  phase14StatusFromLedger,
  proofStoreFingerprint,
} from '../services/builder-phase14-ledger.js';

const base = (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY;

if (!base || !key) {
  console.error('HALT: PUBLIC_BASE_URL (or BUILDER_BASE_URL) and COMMAND_CENTER_KEY required');
  process.exit(1);
}

const headers = { 'Content-Type': 'application/json', 'x-command-key': key };

async function fetchJson(path, init = {}) {
  const r = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text.slice(0, 300) };
  }
  return { status: r.status, ok: r.ok, body };
}

async function main() {
  const localStore = proofStoreFingerprint(process.env.DATABASE_URL);
  console.error('=== Phase 14 Railway Canonical Proof ===');
  console.error(`Local proof_store_id: ${localStore.proof_store_id || 'unset'}`);

  const storeBefore = await fetchJson('/api/v1/lifeos/command-center/phase14/proof-store');
  if (storeBefore.status === 404) {
    console.error('proof-store endpoint not deployed yet — falling back to run-proofs + phase14 only');
  } else if (storeBefore.ok) {
    console.error(`Railway proof_store_id: ${storeBefore.body.proof_store_id}`);
    if (localStore.proof_store_id && storeBefore.body.proof_store_id !== localStore.proof_store_id) {
      console.error('HALT: PROOF_STORE_MISMATCH — local DATABASE_URL is not Railway Neon');
      console.error(JSON.stringify({ local: localStore, railway: storeBefore.body }, null, 2));
      process.exit(2);
    }
  }

  console.error('POST run-proofs ...');
  const run = await fetchJson('/api/v1/lifeos/command-center/phase14/run-proofs', {
    method: 'POST',
    body: JSON.stringify({ trigger: 'oil-phase14-railway-canonical' }),
  });
  if (!run.ok) {
    console.error('HALT: run-proofs failed', run.status, run.body);
    process.exit(1);
  }

  const get = await fetchJson('/api/v1/lifeos/command-center/phase14?reconcile=1');
  const storeAfter = await fetchJson('/api/v1/lifeos/command-center/phase14/proof-store');

  const result = {
    ok: run.body.ok !== false,
    alpha_ready: get.body.alpha_ready,
    status: get.body.status,
    receipt_id: get.body.receipt_id,
    cert_receipt_id: run.body.cert_receipt_id,
    proof_store_id: get.body.proof_store_id || storeAfter.body?.proof_store_id,
    ledger_reconciled: get.body.ledger_reconciled,
    verified_phases: get.body.verified_phases,
    blockers: get.body.blockers_detail,
    proof_source: 'railway_runtime',
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.alpha_ready ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});