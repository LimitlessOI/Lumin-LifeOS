#!/usr/bin/env node
/**
 * SYNOPSIS: The Conductor resolution pass — the second half of "why can't it fix
 * itself". The Architect can now answer schema questions, but Conductor-class
 * defects had no answering mechanism either, so the loop still terminated in a
 * block it was capable of clearing.
 *
 * Same discipline as the Architect allowlist: a short list of moves that are
 * registrations or already-ratified architectural facts, and a refusal for
 * everything else. A registration is not an invention — the product identity was
 * supplied authoritatively; registering it somewhere is bookkeeping the system is
 * supposed to do for itself under the standing self-execution order.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATE_STATE } from '../config/manufacturing-plan-schema.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SENTRY_REGISTRY_REL = 'builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json';

export const CONDUCTOR_RESOLUTION = Object.freeze({
  REGISTER_PRODUCT_SENTRY: 'register_product_sentry',
  APPLY_TYPED_GATE: 'apply_typed_gate',
  FOUNDER_QUESTION: 'founder_question',
});

/** Moves that may change an authoritative artifact. Everything else routes up. */
export const CONDUCTOR_WRITE_BACK_PERMITTED = Object.freeze([
  CONDUCTOR_RESOLUTION.REGISTER_PRODUCT_SENTRY,
  CONDUCTOR_RESOLUTION.APPLY_TYPED_GATE,
]);

export function loadSentryRegistry({ root = ROOT } = {}) {
  const abs = path.join(root, SENTRY_REGISTRY_REL);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return null;
  }
}

function registeredProductIds(registry) {
  const list = registry?.products || registry?.registry || [];
  return new Set(
    (Array.isArray(list) ? list : Object.keys(list)).map((p) => String(p?.product_id ?? p?.id ?? p).toLowerCase())
  );
}

/**
 * Produce the registry entry for a product. Returned as a patch rather than
 * written immediately, so a caller (and a test) can inspect the change before any
 * governance file moves — and so this function stays pure enough to reason about.
 */
export function buildSentryRegistration(productId, { purpose = null } = {}) {
  return {
    product_id: productId,
    layer_a: { required: true, gate: 'structural HTTP assertions, fail-closed' },
    layer_b: { required: true, gate: 'real-browser human-sim walkthrough with UX critique' },
    registered_by: 'conductor_resolution_pass',
    registered_reason:
      'SO-002 requires a product-level Sentry authority before anything is presented as done. The product identity was supplied authoritatively; registering it is bookkeeping, not a decision about the product.',
    purpose,
    status: 'registered_gates_not_yet_run',
  };
}

export function resolveConductorRequest(request, { registry = null } = {}) {
  const subject = request?.subject;

  if (request?.defect_id === 'MISSING_PRODUCT_SENTRY_AUTH') {
    const known = registeredProductIds(registry);
    if (subject && known.has(String(subject).toLowerCase())) {
      return {
        request,
        kind: CONDUCTOR_RESOLUTION.APPLY_TYPED_GATE,
        write_back: false,
        detail: `"${subject}" is already registered; the defect was stale.`,
      };
    }
    return {
      request,
      kind: CONDUCTOR_RESOLUTION.REGISTER_PRODUCT_SENTRY,
      write_back: true,
      registry_patch: buildSentryRegistration(subject),
      detail:
        'Registration is mechanical: the product identity is authoritative, and SO-002 says a product-level Sentry gate must exist before anything is called done. Registering does NOT assert the gates passed — status says registered_gates_not_yet_run.',
    };
  }

  if (request?.defect_id === 'OVERLOADED_READY_FLAG') {
    return {
      request,
      kind: CONDUCTOR_RESOLUTION.APPLY_TYPED_GATE,
      write_back: true,
      applies: {
        replaced_flag: 'arc_report.ready_to_execute',
        required_state: GATE_STATE.MANUFACTURING_AUTHORIZED,
      },
      detail:
        'Already resolved architecturally: execution eligibility now reads the typed gate state, and the plan verifier is the only thing that can set MANUFACTURING_AUTHORIZED. Nothing new is decided here — the ratified architecture is applied.',
    };
  }

  return {
    request,
    kind: CONDUCTOR_RESOLUTION.FOUNDER_QUESTION,
    write_back: false,
    reason: `no_conductor_rule_for_defect:${request?.defect_id}`,
    detail: 'No allowlisted Conductor move covers this defect class, so it routes upward rather than being improvised.',
  };
}

/** Same guard shape as the Architect pass: the resolver does not grade itself alone. */
export function auditConductorResolutions(resolutions) {
  const violations = [];
  for (const r of resolutions) {
    if (r.write_back && !CONDUCTOR_WRITE_BACK_PERMITTED.includes(r.kind)) {
      violations.push({ id: 'WRITE_BACK_NOT_PERMITTED', kind: r.kind, subject: r.request?.subject });
    }
    if (r.kind === CONDUCTOR_RESOLUTION.REGISTER_PRODUCT_SENTRY) {
      if (!r.registry_patch?.product_id) {
        violations.push({ id: 'REGISTRATION_WITHOUT_PRODUCT_ID', subject: r.request?.subject });
      }
      // Registering a gate must never imply the gate ran. That conflation is how a
      // registry becomes a claim of completion.
      if (r.registry_patch?.status !== 'registered_gates_not_yet_run') {
        violations.push({ id: 'REGISTRATION_IMPLIES_PASS', subject: r.request?.subject });
      }
    }
    if (r.kind === CONDUCTOR_RESOLUTION.FOUNDER_QUESTION && r.write_back) {
      violations.push({ id: 'QUESTION_MUST_NOT_WRITE_BACK', subject: r.request?.subject });
    }
  }
  return { clean: violations.length === 0, violations };
}

export function runConductorResolution({ requests = [], root = ROOT }) {
  const registry = loadSentryRegistry({ root });
  const resolutions = requests.map((req) => resolveConductorRequest(req, { registry }));
  const audit = auditConductorResolutions(resolutions);
  return {
    resolved_by_conductor: resolutions.filter((r) => r.write_back).length,
    routed_to_founder: resolutions.filter((r) => r.kind === CONDUCTOR_RESOLUTION.FOUNDER_QUESTION).length,
    resolutions,
    allowlist_audit: audit,
    registry_loaded: Boolean(registry),
  };
}

function main() {
  const i = process.argv.indexOf('--defect');
  if (i === -1) {
    console.error('usage: conductor-resolve-requests.mjs --defect <DEFECT_ID> [--subject <name>]');
    process.exit(2);
  }
  const j = process.argv.indexOf('--subject');
  const report = runConductorResolution({
    requests: [{ defect_id: process.argv[i + 1], subject: j > -1 ? process.argv[j + 1] : null }],
  });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith('conductor-resolve-requests.mjs')) {
  main();
}
