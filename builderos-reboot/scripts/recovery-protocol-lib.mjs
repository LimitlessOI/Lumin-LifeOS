/**
 * SYNOPSIS: Autonomous recovery protocol — strategy forbidden → recover, never terminal stop.
 * Autonomous recovery protocol — strategy forbidden → recover, never terminal stop.
 * @ssot builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001/FOUNDER_PACKET.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, missionDir, loadJson } from './mission-lib.mjs';
import {
  resultPath as loopResultPath,
  packetPath,
  maybeQueueCouncil,
  RECOVERY_STEPS,
} from './loop-escalation-lib.mjs';
import { installMechanicalRegressionHarness } from './mechanical-regression-harness-install.mjs';

export const RECOVERY_RESULT_FILENAME = 'RECOVERY_PROTOCOL_RESULT.json';
export const UNSOLVED_FILENAME = 'UNSOLVED_RECEIPT.json';
export const RECOVERY_STATE_FILENAME = 'RECOVERY_STATE.json';

const BP_AUDIT_TEMPLATE = path.join(REPO_ROOT, 'builderos-reboot/scripts/templates/mechanical-sentry-bp-audit.mjs');
const MAX_STRATEGY_CYCLES = 3;

function loadRecoveryState(objectiveId) {
  const p = path.join(missionDir(objectiveId), RECOVERY_STATE_FILENAME);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return { objective_id: objectiveId, strategies_attempted: [], cycles: 0 };
}

function saveRecoveryState(objectiveId, state) {
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(
    path.join(missionDir(objectiveId), RECOVERY_STATE_FILENAME),
    `${JSON.stringify(state, null, 2)}\n`,
  );
}

function installBpAuditRunner(objectiveId) {
  const dest = path.join(missionDir(objectiveId), 'CONTENT/run-sentry-bp-audit.mjs');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(BP_AUDIT_TEMPLATE, dest);
  return dest;
}

function runBpAudit(objectiveId) {
  const runner = installBpAuditRunner(objectiveId);
  const r = spawnSync(process.execPath, [runner], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, OBJECTIVE_ID: objectiveId },
  });
  const receiptPath = path.join(missionDir(objectiveId), 'SENTRY_CHECK_RESULT.json');
  let receipt = null;
  if (fs.existsSync(receiptPath)) {
    receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  }
  return {
    ok: r.status === 0,
    exit_code: r.status,
    runner,
    receipt,
    stdout: (r.stdout || '').slice(-800),
    stderr: (r.stderr || '').slice(-400),
  };
}

function runBpbMechanicalFix(objectiveId) {
  const r = spawnSync(process.execPath, ['builderos-reboot/scripts/bpb-mechanical-probe-coverage.mjs', objectiveId], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { ok: r.status === 0, stdout: (r.stdout || '').slice(-400), stderr: (r.stderr || '').slice(-200) };
}

async function runCouncilEscalation(objectiveId) {
  const packetFile = packetPath(objectiveId);
  if (!fs.existsSync(packetFile)) {
    return { attempted: false, reason: 'no failure packet' };
  }
  const packet = JSON.parse(fs.readFileSync(packetFile, 'utf8'));
  const auto =
    process.env.RECOVERY_AUTO_COUNCIL === '1' ||
    process.env.LOOP_ESCALATION_AUTO_COUNCIL === '1';
  const http = await maybeQueueCouncil(packet, { auto });
  if (http.queued) return { attempted: true, route: 'gate-change-http', ...http };

  const local = spawnSync(
    process.execPath,
    ['scripts/council-gate-change-run.mjs', '--list-presets'],
    { cwd: REPO_ROOT, encoding: 'utf8', env: process.env },
  );
  return {
    attempted: true,
    route: 'council_local_dry',
    http,
    local_presets_ok: local.status === 0,
    note: auto ? 'Council HTTP failed — recorded for BPB/mechanical retry' : 'Set RECOVERY_AUTO_COUNCIL=1 for live Council POST',
  };
}

function runFactoryLocalHarness(objectiveId) {
  const installed = installMechanicalRegressionHarness(objectiveId);
  const r = spawnSync(process.execPath, ['scripts/deliberation-sentry-regression-harness.mjs', '--layer=local'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const receiptPath = path.join(missionDir(objectiveId), 'REGRESSION_RUN_RESULT.json');
  let receipt = null;
  if (fs.existsSync(receiptPath)) {
    receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  }
  return {
    ok: r.status === 0,
    exit_code: r.status,
    installed,
    receipt,
    stdout: (r.stdout || '').slice(-600),
    stderr: (r.stderr || '').slice(-300),
  };
}

function runMissionAcceptance(objectiveId) {
  const r = spawnSync(
    process.execPath,
    ['builderos-reboot/scripts/run-mission-acceptance.mjs', objectiveId],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  return {
    ok: r.status === 0,
    exit_code: r.status,
    stdout: (r.stdout || '').slice(-800),
    stderr: (r.stderr || '').slice(-400),
  };
}

function tryBuilderRetry(objectiveId) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || '';
  if (!base || !key) {
    return { attempted: false, reason: 'missing PUBLIC_BASE_URL or COMMAND_CENTER_KEY' };
  }
  const body = JSON.stringify({
    domain: 'lifeos',
    task: 'Recovery retry — mechanical harness H01',
    spec: `Execute blueprint step H01 for ${objectiveId} using mechanical_template_v27. Do not repeat failed builder_build_same_spec.`,
    target_file: 'scripts/deliberation-sentry-regression-harness.mjs',
    commit_message: `[recovery] ${objectiveId} H01 harness retry`,
  });
  const r = spawnSync(
    'curl',
    ['-sS', '-X', 'POST', `${base}/api/v1/lifeos/builder/build`, '-H', 'content-type: application/json', '-H', `x-command-key: ${key}`, '-d', body],
    { encoding: 'utf8' },
  );
  let json = {};
  try {
    json = JSON.parse(r.stdout || '{}');
  } catch {
    json = { raw: (r.stdout || '').slice(0, 300) };
  }
  return { attempted: true, ok: json.ok === true && json.committed === true, body: json };
}

export function isObjectiveComplete(objectiveId) {
  const acceptance = runMissionAcceptance(objectiveId);
  if (acceptance.ok) return { complete: true, via: 'mission_acceptance' };
  const regressionReceipt = path.join(missionDir(objectiveId), 'REGRESSION_RUN_RESULT.json');
  if (fs.existsSync(regressionReceipt)) {
    const receipt = JSON.parse(fs.readFileSync(regressionReceipt, 'utf8'));
    if (receipt.pass === true) {
      const acc2 = runMissionAcceptance(objectiveId);
      if (acc2.ok) return { complete: true, via: 'regression_receipt_and_acceptance' };
    }
  }
  return { complete: false };
}

export function writeUnsolvedReceipt(objectiveId, { steps, strategies_attempted, blockers }) {
  const receipt = {
    schema: 'unsolved_receipt_v1',
    generated_at: new Date().toISOString(),
    mission_id: 'AUTONOMOUS-RECOVERY-0001',
    objective_id: objectiveId,
    resolution: 'UNSOLVED_HONEST',
    system_terminal_stop: false,
    strategies_attempted,
    recovery_steps: RECOVERY_STEPS,
    blockers,
    steps,
    founder_alert_required: true,
    note: 'All approved recovery strategies attempted — founder alert emitted; not a silent stop',
  };
  fs.writeFileSync(path.join(missionDir(objectiveId), UNSOLVED_FILENAME), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

export function writeFounderAlert(objectiveId, result) {
  const alert = {
    schema: 'founder_alert_v1',
    generated_at: new Date().toISOString(),
    severity: 'P0',
    mission_id: objectiveId,
    recovery_mission: 'AUTONOMOUS-RECOVERY-0001',
    reason: result.resolution === 'UNSOLVED_HONEST' ? 'RECOVERY_EXHAUSTED_UNSOLVED' : 'RECOVERY_IN_PROGRESS',
    summary: result.objective_framing || 'Autonomous recovery protocol active — no silent stop',
    strategies_attempted: result.strategies_attempted || [],
    unsolved_ref: result.unsolved_written || null,
    required_actions: [
      'Review FAILURE_PATTERN_PACKET.json and RECOVERY_PROTOCOL_RESULT.json',
      'If UNSOLVED_RECEIPT.json present — decide fork or unblocked strategy',
      'Do not treat governance PASS as mission PASS',
    ],
    system_terminal_stop: false,
  };
  fs.writeFileSync(path.join(missionDir(objectiveId), 'FOUNDER_ALERT.json'), `${JSON.stringify(alert, null, 2)}\n`);
  return alert;
}

export async function runRecoveryProtocol(objectiveId, { writeResult = true, maxCycles = MAX_STRATEGY_CYCLES } = {}) {
  const loopResult = fs.existsSync(loopResultPath(objectiveId))
    ? JSON.parse(fs.readFileSync(loopResultPath(objectiveId), 'utf8'))
    : null;

  const state = loadRecoveryState(objectiveId);
  const steps = [];
  const strategiesAttempted = [...state.strategies_attempted];

  const completeEarly = isObjectiveComplete(objectiveId);
  if (completeEarly.complete) {
    const result = {
      schema: 'recovery_protocol_result_v2',
      generated_at: new Date().toISOString(),
      objective_id: objectiveId,
      recovery_protocol_active: true,
      system_terminal_stop: false,
      resolution: 'OBJECTIVE_COMPLETE',
      objective_score: 'PASS',
      complete_via: completeEarly.via,
      steps: [{ step: 'precheck', note: 'Objective already complete' }],
      strategies_attempted: strategiesAttempted,
      loop_escalation_level: loopResult?.escalation_level ?? null,
    };
    if (writeResult) {
      fs.writeFileSync(path.join(missionDir(objectiveId), RECOVERY_RESULT_FILENAME), `${JSON.stringify(result, null, 2)}\n`);
    }
    return result;
  }

  steps.push({ step: 'failure_packet', note: 'FAILURE_PATTERN_PACKET.json from loop escalation' });

  const council = await runCouncilEscalation(objectiveId);
  steps.push({ step: 'council_escalation', strategy: 'council_multi_hat', ...council });
  if (!strategiesAttempted.includes('council_multi_hat')) strategiesAttempted.push('council_multi_hat');

  steps.push({ step: 'install_mechanical_bp_audit', strategy: 'mechanical_template_v27' });
  let audit = runBpAudit(objectiveId);
  steps.push({ step: 'run_bp_audit', verdict: audit.receipt?.verdict, exit_code: audit.exit_code });

  if (audit.receipt?.verdict === 'BP_AUDIT_FAIL' && audit.receipt.blockers?.includes('P0-1')) {
    const fix = runBpbMechanicalFix(objectiveId);
    steps.push({ step: 'bpb_repair', strategy: 'bpb_spec_repair', ...fix });
    if (!strategiesAttempted.includes('bpb_spec_repair')) strategiesAttempted.push('bpb_spec_repair');
    audit = runBpAudit(objectiveId);
    steps.push({ step: 'run_bp_audit_retry', verdict: audit.receipt?.verdict, exit_code: audit.exit_code });
  } else if (audit.receipt?.verdict === 'BP_AUDIT_FAIL') {
    steps.push({
      step: 'bpb_return',
      strategy: 'bpb_spec_repair',
      blockers: audit.receipt.blockers,
      note: 'Blueprint blockers remain — BPB repair required',
    });
    if (!strategiesAttempted.includes('bpb_spec_repair')) strategiesAttempted.push('bpb_spec_repair');
  }

  if (audit.receipt?.verdict === 'BP_AUDIT_PASS') {
    const harness = runFactoryLocalHarness(objectiveId);
    steps.push({ step: 'factory_local_runner', strategy: 'factory_local_runner', ...harness });
    if (!strategiesAttempted.includes('factory_local_runner')) strategiesAttempted.push('factory_local_runner');

    const acceptance = runMissionAcceptance(objectiveId);
    steps.push({ step: 'sentry_verify', strategy: 'mission_acceptance', ...acceptance });

    if (acceptance.ok) {
      state.cycles += 1;
      saveRecoveryState(objectiveId, { ...state, strategies_attempted: strategiesAttempted, cycles: state.cycles });
      const result = {
        schema: 'recovery_protocol_result_v2',
        generated_at: new Date().toISOString(),
        objective_id: objectiveId,
        recovery_protocol_active: true,
        system_terminal_stop: false,
        resolution: 'OBJECTIVE_COMPLETE',
        objective_score: 'PASS',
        bp_audit_pass: true,
        blueprint_executed: true,
        objective_framing: 'Recovery protocol completed objective — acceptance passed without founder rescue',
        steps,
        strategies_attempted: strategiesAttempted,
        next_route: 'DELIVER',
        bp_audit: audit,
        council,
        loop_escalation_level: loopResult?.escalation_level ?? null,
      };
      if (writeResult) {
        fs.writeFileSync(path.join(missionDir(objectiveId), RECOVERY_RESULT_FILENAME), `${JSON.stringify(result, null, 2)}\n`);
      }
      return result;
    }

    for (let cycle = state.cycles; cycle < maxCycles; cycle++) {
      const builder = tryBuilderRetry(objectiveId);
      steps.push({ step: 'alternative_strategy_retry', strategy: 'builder_build_recovery', cycle, ...builder });
      if (!strategiesAttempted.includes('builder_build_recovery')) strategiesAttempted.push('builder_build_recovery');
      if (builder.ok) {
        const retryAcceptance = runMissionAcceptance(objectiveId);
        steps.push({ step: 'sentry_verify_retry', ...retryAcceptance });
        if (retryAcceptance.ok) {
          state.cycles = cycle + 1;
          saveRecoveryState(objectiveId, { ...state, strategies_attempted: strategiesAttempted, cycles: state.cycles });
          const result = {
            schema: 'recovery_protocol_result_v2',
            generated_at: new Date().toISOString(),
            objective_id: objectiveId,
            recovery_protocol_active: true,
            system_terminal_stop: false,
            resolution: 'OBJECTIVE_COMPLETE',
            objective_score: 'PASS',
            objective_framing: 'Builder recovery retry succeeded',
            steps,
            strategies_attempted: strategiesAttempted,
            council,
            loop_escalation_level: loopResult?.escalation_level ?? null,
          };
          if (writeResult) {
            fs.writeFileSync(path.join(missionDir(objectiveId), RECOVERY_RESULT_FILENAME), `${JSON.stringify(result, null, 2)}\n`);
          }
          return result;
        }
      }
    }
  }

  state.cycles += 1;
  saveRecoveryState(objectiveId, { ...state, strategies_attempted: strategiesAttempted, cycles: state.cycles });

  const blockers = [];
  if (audit.receipt?.verdict !== 'BP_AUDIT_PASS') blockers.push(`bp_audit:${audit.receipt?.verdict || 'missing'}`);
  else blockers.push('mission_acceptance_failed_after_harness');

  const unsolved = writeUnsolvedReceipt(objectiveId, { steps, strategies_attempted: strategiesAttempted, blockers });
  const founderAlert = writeFounderAlert(objectiveId, {
    resolution: 'UNSOLVED_HONEST',
    strategies_attempted: strategiesAttempted,
    objective_framing: 'Recovery exhausted approved strategies — UNSOLVED receipt + founder alert (not silent stop)',
    unsolved_written: UNSOLVED_FILENAME,
  });

  const result = {
    schema: 'recovery_protocol_result_v2',
    generated_at: new Date().toISOString(),
    objective_id: objectiveId,
    recovery_protocol_active: true,
    system_terminal_stop: false,
    resolution: 'UNSOLVED_HONEST',
    objective_score: 'UNSOLVED',
    bp_audit_pass: audit.receipt?.verdict === 'BP_AUDIT_PASS',
    blueprint_executed: strategiesAttempted.includes('factory_local_runner'),
    objective_framing:
      'Recovery protocol ran to completion — UNSOLVED receipt + founder alert; no terminal silent stop',
    steps,
    strategies_attempted: strategiesAttempted,
    next_route: 'FOUNDER_ALERT',
    unsolved_written: UNSOLVED_FILENAME,
    founder_alert_written: 'FOUNDER_ALERT.json',
    unsolved,
    founder_alert: founderAlert,
    bp_audit: audit,
    council,
    loop_escalation_level: loopResult?.escalation_level ?? null,
  };

  if (writeResult) {
    fs.writeFileSync(path.join(missionDir(objectiveId), RECOVERY_RESULT_FILENAME), `${JSON.stringify(result, null, 2)}\n`);
  }

  return result;
}
