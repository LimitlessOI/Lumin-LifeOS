/**
 * SYNOPSIS: Conductor consensus runtime entry gate (§2.0K) — VERIFY ONLY.
 *
 * History that shaped this file: the previous version was found with ZERO
 * callers while §2.0K declared the seal mandatory and a constitutional mapping
 * document listed it as `enforced`. It also manufactured the evidence of its own
 * compliance: it authored the plan it reviewed, minted its own seal and then
 * validated that seal by string prefix, defaulted `propagated_confidence` and
 * then range-checked the default, and filled `unknowns`/`assumptions`/`risks`
 * before type-checking them. `CHAIR_GATE_STRICT` was read but changed nothing.
 *
 * This version cannot do any of that:
 *  - It never authors a plan (`autoGenerate` is gone).
 *  - It never mints a seal. Minting lives outside the builder in
 *    `scripts/conductor-seal-plan.mjs`; this module has verification only.
 *  - It never writes a field it later validates.
 *  - `CHAIR_GATE_STRICT` genuinely changes the verdict.
 *
 * Enforcement honesty: sealing-authority integration into the autonomous
 * dispatch path is NOT complete. Until it is, this gate runs in `advisory`
 * mode by default and its mode is recorded in the step result so no caller can
 * claim enforcement it does not have. `CHAIR_GATE_STRICT=true` makes it
 * fail-closed. See docs/products/builderos/PRODUCT_HOME.md change receipts.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadReasoningPlan, reasoningPlanGate } from './reasoning-plan.mjs';

export const CHAIR_GATE_MODES = { ADVISORY: 'advisory', STRICT: 'strict' };

/** Offices permitted to issue a consensus seal. Builder is deliberately absent. */
export const AUTHORIZED_SEAL_ISSUERS = ['conductor', 'council', 'architect', 'founder'];

export function chairGateMode(env = process.env) {
  return String(env.CHAIR_GATE_STRICT || '').trim().toLowerCase() === 'true'
    ? CHAIR_GATE_MODES.STRICT
    : CHAIR_GATE_MODES.ADVISORY;
}

/**
 * Canonical JSON per the governance-repair blueprint §18.9.1 (`canonical_json_v1`):
 * recursively sorted keys, no insignificant whitespace, UTF-8.
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

/** sha256 over canonical plan bytes — the identity a seal is bound to. */
export function planHash(plan) {
  const material = {
    id: plan?.id ?? null,
    intent: plan?.intent ?? null,
    classification: plan?.classification ?? null,
    responsibilities: plan?.responsibilities ?? null,
    reality_measures: plan?.reality_measures ?? null,
  };
  return crypto.createHash('sha256').update(canonicalJson(material), 'utf8').digest('hex');
}

function validatePlanFields(plan) {
  const missing = [];
  if (!plan.intent) missing.push('intent');
  if (!plan.classification || !plan.classification.type) missing.push('classification.type');
  if (!plan.budget || typeof plan.budget.max_model_calls !== 'number') missing.push('budget.max_model_calls');
  if (!Array.isArray(plan.responsibilities) || plan.responsibilities.length === 0) missing.push('responsibilities');
  if (!Array.isArray(plan.lenses) || plan.lenses.length === 0) missing.push('lenses');
  // `gates` is an object of named boolean flags (deriveGates()), not an array.
  if (!plan.gates || typeof plan.gates !== 'object' || Array.isArray(plan.gates)) missing.push('gates');
  if (!plan.reality_measures || plan.reality_measures.length === 0) missing.push('reality_measures');
  // Deliberately NOT defaulted here: a gate that writes these cannot verify them.
  if (!Array.isArray(plan.unknowns)) missing.push('unknowns');
  if (!Array.isArray(plan.assumptions)) missing.push('assumptions');
  if (!Array.isArray(plan.risks)) missing.push('risks');
  if (typeof plan.propagated_confidence !== 'number' || Number.isNaN(plan.propagated_confidence)) {
    missing.push('propagated_confidence');
  }
  return missing;
}

/**
 * Verify a detached seal receipt. The receipt is written by the sealing
 * authority, never by this module or by the Builder, and binds an issuer to a
 * specific plan hash. Verification is pure: no file is written here.
 */
export function verifyConductorSeal({ plan, seal = null, repoRoot = null } = {}) {
  if (!plan) return { ok: false, reason: 'no_plan' };
  let receipt = seal;
  if (!receipt && plan.seal_receipt_path && repoRoot) {
    try {
      receipt = JSON.parse(fs.readFileSync(path.join(repoRoot, plan.seal_receipt_path), 'utf8'));
    } catch {
      return { ok: false, reason: 'seal_receipt_unreadable', path: plan.seal_receipt_path };
    }
  }
  if (!receipt) return { ok: false, reason: 'no_seal_receipt' };

  const issuer = String(receipt.issuer || '').toLowerCase();
  if (!AUTHORIZED_SEAL_ISSUERS.includes(issuer)) {
    return { ok: false, reason: 'unauthorized_seal_issuer', issuer: issuer || null };
  }
  const expected = planHash(plan);
  if (receipt.plan_hash !== expected) {
    return { ok: false, reason: 'seal_plan_hash_mismatch', expected, got: receipt.plan_hash || null };
  }
  return { ok: true, issuer, plan_hash: expected, sealed_at: receipt.sealed_at || null };
}

/**
 * Run the gate. Returns a verdict plus the mode it ran in. Callers MUST record
 * `mode` so an advisory pass is never reported as enforcement.
 */
export function runChairConsensusGate({
  mission_id = 'unknown',
  blueprint_id = 'unknown',
  step,
  reasoning_plan: explicitPlan = null,
  reasoning_plan_id: planId = null,
  seal = null,
  repoRoot = null,
  mode = null,
} = {}) {
  const activeMode = mode || chairGateMode();
  const strict = activeMode === CHAIR_GATE_MODES.STRICT;
  const base = { mode: activeMode, mission_id, blueprint_id, step_id: step?.step_id || null };

  const blocked = (reason, missing = []) => ({
    ...base,
    ok: !strict,
    approved: false,
    enforced: strict,
    advisory_only: !strict,
    reason,
    missing,
  });

  let plan = explicitPlan;
  if (!plan && planId) plan = loadReasoningPlan(planId);
  if (!plan) return blocked('missing_reasoning_plan', ['reasoning_plan']);

  const planGate = reasoningPlanGate(plan);
  if (!planGate.ok) return blocked(`reasoning_plan_invalid:${planGate.reason}`, [planGate.reason]);

  const missingFields = validatePlanFields(plan);
  if (missingFields.length) return blocked('incomplete_reasoning_plan', missingFields);

  if (plan.propagated_confidence < 0.5) {
    return blocked('propagated_confidence_below_floor', ['propagated_confidence']);
  }

  const sealCheck = verifyConductorSeal({ plan, seal, repoRoot });
  if (!sealCheck.ok) return blocked(`seal_invalid:${sealCheck.reason}`, ['chair_seal']);

  return {
    ...base,
    ok: true,
    approved: true,
    enforced: strict,
    advisory_only: !strict,
    plan_id: plan.id,
    plan_hash: sealCheck.plan_hash,
    seal_issuer: sealCheck.issuer,
    classification: plan.classification,
    propagated_confidence: plan.propagated_confidence,
    reality_measures: plan.reality_measures,
  };
}
