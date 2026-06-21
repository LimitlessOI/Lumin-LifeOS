/**
 * SYNOPSIS: Tier 1 telemetry validation — shared library.
 * Tier 1 telemetry validation — shared library.
 * @ssot builderos-reboot/SNT_TELEMETRY_DOCTRINE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, missionDir, loadJson } from './mission-lib.mjs';

export const RECEIPT_FILENAME = 'MISSION_TELEMETRY_RECEIPT.json';
export const CHECK_RESULT_FILENAME = 'TIER1_CHECK_RESULT.json';

const CONTRACT_REL = 'builderos-reboot/ALPHA_MISSION_TELEMETRY_CONTRACT.json';

/** Phases that require Tier 1 before exit (each phase boundary re-checks). */
export const ENFORCED_STATUSES = new Set([
  'bp_phase_fail',
  'sentry_bp_audit',
  'bp_audit',
  'in_progress',
  'ready',
  'cdr',
  'regression_run',
  'debug',
  'blocked',
]);

/** Complete missions are grandfathered unless --strict-all. */
export const COMPLETE_STATUSES = new Set(['complete', 'done', 'archived']);

export function loadContract() {
  return loadJson(CONTRACT_REL);
}

export function tier1FieldList(contract = loadContract()) {
  return contract?.tiers?.tier_1_mandatory?.fields ?? [];
}

export function receiptPath(missionId) {
  return path.join(missionDir(missionId), RECEIPT_FILENAME);
}

export function checkResultPath(missionId) {
  return path.join(missionDir(missionId), CHECK_RESULT_FILENAME);
}

function isPresent(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

export function validateTier1Receipt(receipt, contract = loadContract()) {
  const fields = tier1FieldList(contract);
  const missing = [];
  const present = [];

  for (const field of fields) {
    const val = receipt?.[field];
    if (isPresent(val)) present.push(field);
    else missing.push(field);
  }

  return {
    pass: missing.length === 0,
    missing_fields: missing,
    present_fields: present,
    field_count: fields.length,
  };
}

export function validateNineQuestions(receipt, contract = loadContract()) {
  const required = (contract?.nine_questions ?? []).map((q) => q.id);
  const answers = receipt?.nine_questions ?? receipt?.answers ?? {};
  const missing = [];

  for (const id of required) {
    const val = answers[id] ?? answers[id.toLowerCase()] ?? receipt?.[`nine_q_${id.toLowerCase()}`];
    if (!isPresent(val)) missing.push(id);
  }

  return {
    pass: missing.length === 0,
    missing_questions: missing,
    required_count: required.length,
  };
}

function gitSha(cwd = REPO_ROOT) {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function gitDeploymentHint() {
  const r = spawnSync('git', ['rev-parse', 'origin/main'], { cwd: REPO_ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Best-effort partial receipt from mission artifacts (never passes Tier 1 alone). */
export function synthesizePartialReceipt(missionId) {
  const dir = missionDir(missionId);
  const partial = { mission_id: missionId, synthesized_at: new Date().toISOString(), partial: true };

  const fpPath = path.join(dir, 'FOUNDER_PACKET.json');
  if (fs.existsSync(fpPath)) {
    const fp = JSON.parse(fs.readFileSync(fpPath, 'utf8'));
    partial.actor = partial.actor ?? 'mission_pack';
    partial.nine_questions = partial.nine_questions ?? {};
    partial.nine_questions.Q1 = fp.scope?.join('; ') ?? fp.mission_id;
  }

  const bpPath = path.join(dir, 'BLUEPRINT.json');
  if (fs.existsSync(bpPath)) {
    const bp = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
    partial.blueprint_version = bp.blueprint_version ?? bp.version ?? bp.frozen_at ?? null;
    partial.files_changed = (bp.steps ?? []).map((s) => s.target_file).filter(Boolean);
  }

  partial.commit_sha = gitSha();
  partial.deployment_sha = gitDeploymentHint();

  for (const name of ['SENTRY_CHECK_RESULT.json', 'SENTRY_BP_AUDIT_REPORT.md']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      if (name.endsWith('.json')) {
        const j = JSON.parse(fs.readFileSync(p, 'utf8'));
        partial.sentry_verdict = j.verdict ?? j.qualitative_verdict ?? null;
        partial.tests_passed = (j.checks ?? []).filter((c) => c.pass).map((c) => c.id);
        partial.tests_failed = (j.checks ?? []).filter((c) => !c.pass).map((c) => c.id);
      } else {
        partial.sentry_verdict = partial.sentry_verdict ?? 'prose_report_only_unverified';
      }
    }
  }

  const sentryVerdictPath = path.join(dir, 'SNT_BP_PHASE_VERDICT.json');
  if (fs.existsSync(sentryVerdictPath)) {
    const v = JSON.parse(fs.readFileSync(sentryVerdictPath, 'utf8'));
    partial.acceptance_status = v.verdict ?? null;
    partial.sentry_verdict = partial.sentry_verdict ?? v.verdict;
  }

  return partial;
}

/**
 * Phase gate — Tier 1 must pass to exit current phase / debugging loop.
 * Honest BP_AUDIT_FAIL with full Tier 1 receipt still counts as PASS for gate (routes to BPB).
 */
export function evaluatePhaseGate({ missionId, missionStatus, receipt, tier1, nineQ, sentryResult }) {
  const status = missionStatus ?? 'unknown';
  const inLoop = ENFORCED_STATUSES.has(status);
  const sentryVerdict = receipt?.sentry_verdict ?? sentryResult?.verdict ?? null;
  const honestFailWithReceipt =
    tier1.pass &&
    nineQ.pass &&
    (sentryVerdict === 'BP_AUDIT_FAIL' || sentryVerdict === 'SENTRY_MECHANICAL_FAIL') &&
    Boolean(sentryResult?.checks?.length);

  const canAdvance =
    tier1.pass &&
    nineQ.pass &&
    (sentryVerdict === 'BP_AUDIT_PASS' ||
      sentryVerdict === 'SENTRY_MISSION_PASS' ||
      sentryVerdict === 'SENTRY_MECHANICAL_PASS' ||
      honestFailWithReceipt);

  let loop_target = null;
  if (inLoop && !canAdvance) {
    if (!tier1.pass || !nineQ.pass) loop_target = 'TIER1_RECEIPT_LOOP';
    else if (!sentryResult) loop_target = 'SENTRY_MECHANICAL_LOOP';
    else if (sentryVerdict?.includes('FAIL')) loop_target = 'BPB_RETURN';
    else loop_target = 'DEBUG_LOOP';
  }

  return {
    mission_id: missionId,
    phase_status: status,
    in_enforced_phase: inLoop,
    tier1_pass: tier1.pass,
    nine_questions_pass: nineQ.pass,
    can_advance_phase: canAdvance,
    loop_until_tier1: inLoop && !tier1.pass,
    loop_target,
    honest_fail_routes_bpb: honestFailWithReceipt,
    verdict_framing: tier1.pass
      ? canAdvance
        ? 'exit_criteria_satisfied_or_honest_fail'
        : 'evidence_gap_sentry_receipt'
      : 'evidence_gap_tier1_receipt',
  };
}

export function runTier1Check(missionId, { writeResult = true } = {}) {
  const contract = loadContract();
  const receiptPath_ = receiptPath(missionId);
  let receipt = null;
  let receiptSource = 'missing';

  if (fs.existsSync(receiptPath_)) {
    receipt = JSON.parse(fs.readFileSync(receiptPath_, 'utf8'));
    receiptSource = RECEIPT_FILENAME;
  } else {
    receipt = synthesizePartialReceipt(missionId);
    receiptSource = 'synthesized_partial';
  }

  const tier1 = validateTier1Receipt(receipt, contract);
  const nineQ = validateNineQuestions(receipt, contract);

  let sentryResult = null;
  const sentryPath = path.join(missionDir(missionId), 'SENTRY_CHECK_RESULT.json');
  if (fs.existsSync(sentryPath)) {
    sentryResult = JSON.parse(fs.readFileSync(sentryPath, 'utf8'));
  }

  const queue = loadJson('builderos-reboot/MISSION_QUEUE.json');
  const mission = (queue.missions ?? []).find((m) => m.mission_id === missionId);
  const phaseGate = evaluatePhaseGate({
    missionId,
    missionStatus: mission?.status,
    receipt,
    tier1,
    nineQ,
    sentryResult,
  });

  const pass = tier1.pass && nineQ.pass;
  const result = {
    schema: 'tier1_check_result_v1',
    generated_at: new Date().toISOString(),
    mission_id: missionId,
    verdict: pass ? 'TIER1_PASS' : 'TIER1_FAIL',
    verdict_framing: pass
      ? 'Tier 1 beams present — phase may proceed if SENTRY receipt also satisfied'
      : 'Exit criteria not yet satisfied — Tier 1 receipt incomplete',
    receipt_source: receiptSource,
    tier1,
    nine_questions: nineQ,
    phase_gate: phaseGate,
    missing_summary: [...tier1.missing_fields, ...nineQ.missing_questions.map((q) => `nine_q:${q}`)],
    doctrine_ref: contract.doctrine_ref,
    standing_principle: 'FAIL is feedback, not defeat. Incomplete Tier 1 loops until beams are present.',
  };

  if (writeResult) {
    fs.writeFileSync(checkResultPath(missionId), `${JSON.stringify(result, null, 2)}\n`);
  }

  return result;
}
