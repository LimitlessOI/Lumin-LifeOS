#!/usr/bin/env node
/**
 * SYNOPSIS: Conductor sealing authority — mints the detached consensus seal that
 * the builder's gate can only VERIFY. Deliberately lives outside
 * factory-staging/factory-core so the builder cannot mint its own approval: the
 * gate imports verification, this script owns issuance, and the two never share
 * a module. Closes the other half of OPEN-7.
 *
 * Usage:
 *   node scripts/conductor-seal-plan.mjs --plan <path.json> [--issuer conductor] [--out <path.json>]
 *   node scripts/conductor-seal-plan.mjs --plan-id <id> --issuer council
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  planHash,
  AUTHORIZED_SEAL_ISSUERS,
  verifyConductorSeal,
} from '../factory-staging/factory-core/builder/chair-consensus-gate.mjs';
import { loadReasoningPlan } from '../factory-staging/factory-core/builder/reasoning-plan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEAL_DIR = 'products/receipts/conductor-seals';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

export function sealPlan({ plan, issuer = 'conductor', outRel = null, root = ROOT }) {
  const issuerKey = String(issuer).toLowerCase();
  if (!AUTHORIZED_SEAL_ISSUERS.includes(issuerKey)) {
    throw new Error(`unauthorized_seal_issuer:${issuerKey} (allowed: ${AUTHORIZED_SEAL_ISSUERS.join(', ')})`);
  }
  if (!plan || !plan.id) throw new Error('plan_missing_id');

  const hash = planHash(plan);
  const receipt = {
    schema: 'conductor_seal_receipt_v1',
    plan_id: plan.id,
    plan_hash: hash,
    issuer: issuerKey,
    sealed_at: new Date().toISOString(),
    classification: plan.classification?.type ?? null,
    note: 'Issued by the sealing authority outside the builder. The builder gate verifies this receipt and cannot mint one.',
  };

  const rel = outRel || `${SEAL_DIR}/${plan.id}.json`;
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(receipt, null, 2)}\n`);

  // Prove the seal we just wrote actually satisfies the independent verifier.
  const verified = verifyConductorSeal({ plan, seal: receipt });
  if (!verified.ok) throw new Error(`seal_failed_self_verification:${verified.reason}`);

  return { receipt, path: rel, verified };
}

function main() {
  const planPath = arg('plan');
  const planId = arg('plan-id');
  const issuer = arg('issuer', 'conductor');
  const out = arg('out');

  let plan = null;
  if (planPath) {
    plan = JSON.parse(fs.readFileSync(path.resolve(ROOT, planPath), 'utf8'));
  } else if (planId) {
    plan = loadReasoningPlan(planId);
  }
  if (!plan) {
    console.error('CONDUCTOR_SEAL: need --plan <path.json> or --plan-id <id>');
    process.exit(2);
  }

  try {
    const result = sealPlan({ plan, issuer, outRel: out });
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } catch (err) {
    console.error(`CONDUCTOR_SEAL: FAIL — ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('conductor-seal-plan.mjs')) {
  main();
}
