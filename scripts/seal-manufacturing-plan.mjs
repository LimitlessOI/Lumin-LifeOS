#!/usr/bin/env node
/**
 * SYNOPSIS: Sealing authority for the three-party manufacturing consensus.
 * Deliberately a separate module from the verifier: `scripts/manufacturing-plan.mjs`
 * decides and cannot mint, this one mints and cannot decide. Same separation that
 * closed OPEN-7 — no office may manufacture the evidence of its own approval.
 *
 * Each office seals for its own jurisdiction and states what it actually checked,
 * so a seal is a claim on the record rather than a rubber stamp.
 *
 * Usage:
 *   node scripts/seal-manufacturing-plan.mjs --plan <path.json> --office conductor \
 *        --basis "decomposition and sequencing reviewed"
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { manufacturingPlanHash, verifyManufacturingPlan } from './manufacturing-plan.mjs';
import { REQUIRED_CONSENSUS_OFFICES } from '../config/manufacturing-plan-schema.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** What each office is attesting to. An office may not seal for another's scope. */
export const OFFICE_JURISDICTION = Object.freeze({
  conductor: 'decomposition, sequencing, dependencies, parallelization and factory assignment',
  architect: 'that these pieces, assembled in this order, deterministically produce the specified architecture',
  builder: 'manufacturability — this can be built as specified without making unstated design decisions',
});

export function sealManufacturingPlan({ plan, office, basis = null, blueprint = null }) {
  const officeKey = String(office || '').toLowerCase();
  if (!REQUIRED_CONSENSUS_OFFICES.includes(officeKey)) {
    throw new Error(`unauthorized_office:${officeKey} (allowed: ${REQUIRED_CONSENSUS_OFFICES.join(', ')})`);
  }
  if (!plan?.plan_id) throw new Error('plan_missing_plan_id');

  // An office must not seal a plan that is already structurally broken. Consent to
  // a plan with an unresolved cycle or an uncovered step is consent to nothing.
  if (blueprint) {
    const check = verifyManufacturingPlan(plan, blueprint);
    const structural = check.defects.filter((d) => d.id !== 'MISSING_CONSENSUS_SEAL');
    if (structural.length > 0) {
      throw new Error(
        `plan_has_unresolved_defects:${structural.length} — resolve before sealing: ${structural
          .map((d) => d.id)
          .join(', ')}`
      );
    }
  }

  const seals = Array.isArray(plan.consensus_seals) ? plan.consensus_seals : [];
  if (seals.some((s) => String(s.office).toLowerCase() === officeKey)) {
    throw new Error(`office_already_sealed:${officeKey}`);
  }

  // Hash the substance BEFORE attaching, and the hash excludes seals, so adding a
  // seal never invalidates the seals already present.
  const hash = manufacturingPlanHash(plan);
  const seal = {
    schema: 'manufacturing_consensus_seal_v1',
    office: officeKey,
    jurisdiction: OFFICE_JURISDICTION[officeKey],
    plan_id: plan.plan_id,
    plan_hash: hash,
    basis,
    sealed_at: new Date().toISOString(),
  };
  return { seal, plan: { ...plan, consensus_seals: [...seals, seal] } };
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  const planRel = arg('plan');
  const office = arg('office');
  if (!planRel || !office) {
    console.error('usage: seal-manufacturing-plan.mjs --plan <path.json> --office <conductor|architect|builder> [--basis "..."] [--blueprint <path.json>]');
    process.exit(2);
  }
  const planAbs = path.resolve(ROOT, planRel);
  const plan = JSON.parse(fs.readFileSync(planAbs, 'utf8'));
  const blueprintRel = arg('blueprint');
  const blueprint = blueprintRel ? JSON.parse(fs.readFileSync(path.resolve(ROOT, blueprintRel), 'utf8')) : null;

  try {
    const { seal, plan: sealed } = sealManufacturingPlan({ plan, office, basis: arg('basis'), blueprint });
    fs.writeFileSync(planAbs, `${JSON.stringify(sealed, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, sealed_by: seal.office, plan_hash: seal.plan_hash, offices_now: sealed.consensus_seals.map((s) => s.office) }, null, 2));
  } catch (err) {
    console.error(`SEAL_MANUFACTURING_PLAN: FAIL — ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('seal-manufacturing-plan.mjs')) {
  main();
}
