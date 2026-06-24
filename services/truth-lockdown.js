/**
 * SYNOPSIS: Supreme fail-closed truth gate — no founder reply leaves without receipt-backed claims.
 * Results are the scoreboard. FAIL is as valuable as PASS when it carries lessons.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import {
  detectCounselTheater,
  scrubCounselTheater,
} from './chair-direct-connection-truth.js';
import { enforceChairTruthExit } from './chair-truth-gate.js';
import { enforceDirectConnectionTruth } from './chair-direct-connection-truth.js';

export const TRUTH_LOCKDOWN_VERSION = 'truth_lockdown_v1';

const FALSE_SUCCESS_WHEN_FAIL = [
  /\b(successfully|completed|all done|all set|you're all set|task complete)\b/i,
  /\b(has been (shipped|deployed|committed|executed|completed))\b/i,
  /\b(i('ve| have)? (shipped|deployed|committed|finished|completed|fixed))\b/i,
  /\b(alpha (is )?reached|point b (is )?reached|founder success test satisfied)\b/i,
  /\b(no (blockers|issues)|everything (looks|is) good|ready for production)\b/i,
  /\b(live (now|on production)|now (open|live|running))\b/i,
];

const FALSE_PASS_WHOLE = [
  /^✅\s*done\b/i,
  /^completed\b/i,
  /^successfully\b/i,
];

const EXECUTE_CLAIM_WITHOUT_COMMAND = [
  /\b(i (ran|executed|triggered|started|dispatched))\b/i,
  /\b(the command (ran|executed|completed))\b/i,
  /\b(build (is )?(running|complete|done))\b/i,
  /\b(changes (are|have been) (live|deployed|applied))\b/i,
];

function textBlob(truth = {}) {
  return [
    truth.human_summary,
    truth.human_summary_technical,
    truth.done_synopsis,
    truth.next_synopsis,
  ].filter(Boolean).join('\n');
}

function scrubField(text, commandTruth, passFail) {
  let out = String(text || '');
  if (!out.trim()) return '';

  if (out.includes('[removed —')) {
    return out.replace(/\s{2,}/g, ' ').trim();
  }

  const lines = out.split('\n');
  const protectedLine = (line) => {
    const trimmed = line.trimStart();
    return trimmed.startsWith('💬 Counsel only')
      || trimmed.startsWith('✅ Done · Command:')
      || trimmed.startsWith('⏳ Build attempted')
      || trimmed.startsWith('To execute:')
      || trimmed.startsWith('✅ DONE')
      || trimmed.startsWith('❌ NOT DONE')
      || trimmed.startsWith('⏳ RUNNING')
      || trimmed.startsWith('🔍 CLARIFY')
      || trimmed.startsWith('ℹ️')
      || trimmed.startsWith('NEXT')
      || trimmed.startsWith('Why:')
      || trimmed.startsWith('── Technical ──')
      || /^•\s/.test(trimmed);
  };

  out = lines.map((line) => {
    if (protectedLine(line)) return line;
    let scrubbed = scrubCounselTheater(line, commandTruth);
    if (passFail === 'FAIL') {
      for (const re of FALSE_SUCCESS_WHEN_FAIL) {
        if (re.test(scrubbed)) {
          scrubbed = scrubbed.replace(re, '[removed — FAIL receipt; claim not proven]');
        }
      }
    }
    if (commandTruth === 'NO_COMMAND_RAN') {
      for (const re of EXECUTE_CLAIM_WITHOUT_COMMAND) {
        if (re.test(scrubbed)) {
          scrubbed = scrubbed.replace(re, '[removed — no command ran]');
        }
      }
    }
    return scrubbed;
  }).join('\n');

  return out.replace(/\s{2,}/g, ' ').trim();
}

function detectFalseSuccessOnFail(text = '') {
  const t = String(text || '').trim();
  if (!t) return { violation: false, hits: [] };
  const hits = [];
  for (const re of FALSE_PASS_WHOLE) {
    if (re.test(t)) hits.push(re.source);
  }
  for (const re of FALSE_SUCCESS_WHEN_FAIL) {
    if (re.test(t)) hits.push(t.slice(0, 80));
  }
  return { violation: hits.length > 0, hits: [...new Set(hits)] };
}

function detectExecuteClaimWithoutCommand(text = '', commandTruth = '') {
  if (commandTruth !== 'NO_COMMAND_RAN') return { violation: false, hits: [] };
  const hits = EXECUTE_CLAIM_WITHOUT_COMMAND.filter((re) => re.test(text)).map((re) => re.source);
  return { violation: hits.length > 0, hits };
}

function hasShipProof(truth = {}) {
  return Boolean(truth.sha || truth.commit_sha)
    || truth.committed === true
    || truth.receipt_truth === 'COMMIT_SHA_PRESENT'
    || truth.command_truth === 'COMMAND_RAN'
    || truth.command_truth === 'COMMITTED'
    || truth.command_truth === 'BUILD_ATTEMPTED'
    || truth.async === true
    || truth.pass_fail === 'RUNNING'
    || truth.pass_fail === 'CLARIFY'
    || truth.pass_fail === 'NO_COMMAND_RAN';
}

function ensureFailCarriesLesson(truth = {}) {
  const out = { ...truth };
  if (out.pass_fail !== 'FAIL') return out;

  const receipt = { ...(out.execution_receipt || {}) };
  if (!receipt.lesson && !out.autopsy?.lessons?.length) {
    receipt.lesson = out.first_blocker
      ? `FAIL signal: ${String(out.first_blocker).slice(0, 200)} — read blocker, apply fix path, retry. No judgment; results are the scoreboard.`
      : 'FAIL is a valid result — nothing shipped. Read receipt fields and fix path before retry.';
    out.lockdown_lesson_injected = true;
  }
  if (!receipt.fix && out.autopsy?.fix_steps?.length) {
    receipt.fix = out.autopsy.fix_steps[0];
  }
  if (!out.first_blocker && out.truth_gate_violation) {
    out.first_blocker = `Truth lockdown: ${out.truth_gate_violation}`;
  }
  out.execution_receipt = receipt;
  return out;
}

function reconcileMetadata(truth = {}, channel = '') {
  const out = { ...truth };
  const commandTruth = out.command_truth || 'NO_COMMAND_RAN';

  if (out.pass_fail === 'PASS' && commandTruth === 'NO_COMMAND_RAN') {
    out.pass_fail = 'FAIL';
    out.ok = false;
    out.truth_gate_violation = out.truth_gate_violation || 'PASS_WITHOUT_COMMAND';
    out.first_blocker = out.first_blocker || 'PASS illegal when command_truth is NO_COMMAND_RAN';
  }

  if (out.pass_fail === 'PASS' && !hasShipProof(out)) {
    const counselChannels = ['counsel', 'lumin', 'chair', 'life_admin', 'display', 'intent_clarify'];
    if (!counselChannels.includes(channel) && out.execution_kind !== 'NO_COMMAND') {
      out.pass_fail = 'FAIL';
      out.ok = false;
      out.truth_gate_violation = out.truth_gate_violation || 'PASS_WITHOUT_PROOF';
      out.first_blocker = out.first_blocker || 'PASS requires command proof, commit SHA, or RUNNING async job';
    }
  }

  if (out.ok === true && out.pass_fail === 'FAIL') {
    out.ok = false;
    out.truth_gate_violation = out.truth_gate_violation || 'OK_FLAG_CONTRADICTS_FAIL';
  }

  if (out.pass_fail === 'FAIL' && /completed|done|shipped|successfully/i.test(out.done_synopsis || '')) {
    out.done_synopsis = `${(out.action || channel || 'request').replace(/_/g, ' ')} did not pass — see blocker and lessons.`;
    out.truth_gate_violation = out.truth_gate_violation || 'FAIL_SYNOPSIS_THEATER';
  }

  return out;
}

function scrubAllProse(truth = {}) {
  const out = { ...truth };
  const commandTruth = out.command_truth || 'NO_COMMAND_RAN';
  const passFail = out.pass_fail || 'UNKNOWN';
  const blob = textBlob(out);

  const theater = detectCounselTheater(blob, commandTruth);
  const falseSuccess = passFail === 'FAIL' ? detectFalseSuccessOnFail(blob) : { violation: false, hits: [] };
  const execClaim = detectExecuteClaimWithoutCommand(blob, commandTruth);

  if (theater.violation || falseSuccess.violation || execClaim.violation) {
    out.theater_blocked = true;
    out.theater_hits = [
      ...(out.theater_hits || []),
      ...theater.hits,
      ...falseSuccess.hits,
      ...execClaim.hits,
    ].slice(0, 12);
    out.truth_gate_violation = out.truth_gate_violation
      || (theater.violation ? 'COUNSEL_THEATER_BLOCKED' : falseSuccess.violation ? 'FALSE_SUCCESS_ON_FAIL' : 'EXECUTE_CLAIM_WITHOUT_COMMAND');
  }

  if (out.human_summary_technical != null) {
    out.human_summary_technical = scrubField(out.human_summary_technical, commandTruth, passFail);
  }
  if (out.human_summary != null) {
    out.human_summary = scrubField(out.human_summary, commandTruth, passFail);
  }
  if (out.done_synopsis != null) {
    out.done_synopsis = scrubField(out.done_synopsis, commandTruth, passFail);
  }

  if (theater.violation && commandTruth === 'NO_COMMAND_RAN' && !out.human_summary_technical?.trim()) {
    out.human_summary_technical = 'Counsel only — no command ran. Theater claims were blocked.';
  }

  return out;
}

/**
 * Mandatory final gate — every founder-facing truth object must pass through here.
 */
export function enforceTruthLockdown(truth = {}, channel = '') {
  let out = { ...truth, truth_lockdown: TRUTH_LOCKDOWN_VERSION };
  out.chair_channel = out.chair_channel || channel;

  out = enforceChairTruthExit(out, channel);
  out = enforceDirectConnectionTruth(out);
  out = reconcileMetadata(out, channel);
  out = scrubAllProse(out);
  out = ensureFailCarriesLesson(out);

  out.truth_lockdown_applied = true;
  out.results_are_scoreboard = true;
  return out;
}

/**
 * Hard assert for tests — throws if lockdown would still allow deception.
 */
export function assertTruthLockdownCompliance(truth = {}, channel = '') {
  const locked = enforceTruthLockdown(truth, channel);
  const blob = textBlob(locked);
  const commandTruth = locked.command_truth || 'NO_COMMAND_RAN';

  if (locked.pass_fail === 'PASS' && commandTruth === 'NO_COMMAND_RAN') {
    throw new Error('Lockdown leak: PASS with NO_COMMAND_RAN');
  }
  const theater = detectCounselTheater(blob, commandTruth);
  if (theater.violation && commandTruth === 'NO_COMMAND_RAN') {
    throw new Error(`Lockdown leak: theater in prose: ${theater.hits[0]}`);
  }
  if (locked.pass_fail === 'FAIL' && !locked.execution_receipt?.lesson && !locked.autopsy?.lessons?.length) {
    throw new Error('Lockdown leak: FAIL without lesson');
  }

  const execChannels = ['build_async', 'build_terminal', 'blueprint_execute', 'execute'];
  if (locked.pass_fail === 'PASS' && execChannels.includes(channel)) {
    const hasSha = Boolean(locked.sha || locked.commit_sha)
      || locked.committed === true
      || locked.async === true
      || locked.receipt_truth === 'COMMIT_SHA_PRESENT';
    if (!hasSha) {
      throw new Error('Lockdown leak: PASS on execute channel without ship proof');
    }
  }

  return locked;
}
