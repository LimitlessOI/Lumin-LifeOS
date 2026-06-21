/**
 * SYNOPSIS: Loop escalation — signature-weighted attempt tracking + strategy change enforcement.
 * Loop escalation — signature-weighted attempt tracking + strategy change enforcement.
 * @ssot builderos-reboot/SNT_LOOP_ESCALATION_DOCTRINE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO_ROOT, missionDir, loadJson } from './mission-lib.mjs';

export const STATE_FILENAME = 'LOOP_ESCALATION_STATE.json';
export const RESULT_FILENAME = 'LOOP_ESCALATION_RESULT.json';
export const PACKET_FILENAME = 'FAILURE_PATTERN_PACKET.json';

const CONTRACT_REL = 'builderos-reboot/LOOP_ESCALATION_CONTRACT.json';

const STRATEGY = Object.freeze({
  BUILDER_PROSE: 'builder_prose_pass',
  BUILDER_BUILD: 'builder_build_same_spec',
  MECHANICAL_V27: 'mechanical_template_v27_runner',
  BPB_RETURN: 'bpb_spec_fix',
  COUNCIL: 'council_multi_hat_escalation',
  RECOVERY_PROTOCOL: 'autonomous_recovery_protocol',
});

/** Recovery steps after strategy forbidden — never terminal halt. */
export const RECOVERY_STEPS = [
  'council_escalation',
  'bpb_repair',
  'alternative_strategy_retry',
  'sentry_verify',
  'deliver_or_UNSOLVED',
];

export function loadContract() {
  return loadJson(CONTRACT_REL);
}

export function statePath(missionId) {
  return path.join(missionDir(missionId), STATE_FILENAME);
}

export function resultPath(missionId) {
  return path.join(missionDir(missionId), RESULT_FILENAME);
}

export function packetPath(missionId) {
  return path.join(missionDir(missionId), PACKET_FILENAME);
}

export function signatureHash(parts) {
  const raw = Array.isArray(parts) ? parts.join('|') : String(parts);
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

export function loadState(missionId) {
  const p = statePath(missionId);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return {
    mission_id: missionId,
    attempts: [],
    signature_counts: {},
    last_strategy: null,
    seeded: false,
  };
}

export function saveState(missionId, state) {
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(statePath(missionId), `${JSON.stringify(state, null, 2)}\n`);
}

export function attemptWeight(failureClass, contract) {
  if (failureClass === 'governance_block') {
    return contract.governance_block_weight ?? 0.5;
  }
  return 1;
}

export function recordAttempt(state, attempt, contract = loadContract()) {
  const entry = {
    attempt_id: state.attempts.length + 1,
    recorded_at: attempt.recorded_at || new Date().toISOString(),
    failure_class: attempt.failure_class,
    failure_signature: attempt.failure_signature,
    strategy: attempt.strategy || STRATEGY.BUILDER_BUILD,
    detail: attempt.detail || '',
    weight: attemptWeight(attempt.failure_class, contract),
  };
  state.attempts.push(entry);
  state.signature_counts[entry.failure_signature] =
    (state.signature_counts[entry.failure_signature] || 0) + entry.weight;
  state.last_strategy = entry.strategy;
  return entry;
}

export function thresholdsForClass(contract, failureClass) {
  return contract.class_overrides?.[failureClass] || contract.default_ladder_same_signature;
}

export function dominantFailure(state, currentSignal = null) {
  const classWeights = {};
  const classLast = {};

  for (const a of state.attempts) {
    const w = a.weight ?? 1;
    classWeights[a.failure_class] = (classWeights[a.failure_class] || 0) + w;
    classLast[a.failure_class] = a;
  }

  if (currentSignal?.failure_class) {
    classWeights[currentSignal.failure_class] =
      (classWeights[currentSignal.failure_class] || 0) + 1;
    classLast[currentSignal.failure_class] = currentSignal;
  }

  let bestClass = null;
  let bestW = 0;
  for (const [cls, w] of Object.entries(classWeights)) {
    if (w > bestW) {
      bestW = w;
      bestClass = cls;
    }
  }

  if (!bestClass) return currentSignal;

  const domAttempt = classLast[bestClass] || currentSignal;
  return {
    failure_class: bestClass,
    failure_signature: domAttempt?.failure_signature || signatureHash([bestClass, 'aggregate']),
    weighted: bestW,
  };
}

export function computeEscalationLevel(state, contract, currentSignal = null) {
  const dom = dominantFailure(state, currentSignal);
  if (!dom) {
    return { level: 'none', weighted_repeat: 0, failure_class: null, failure_signature: null };
  }

  const sigWeighted = state.signature_counts[dom.failure_signature] || 0;
  const classWeighted = dom.weighted ?? 0;
  const strategyWeighted = state.attempts
    .filter((a) => a.strategy === state.last_strategy)
    .reduce((s, a) => s + (a.weight ?? 1), 0);

  const weighted = Math.max(sigWeighted, classWeighted, strategyWeighted);
  const t = thresholdsForClass(contract, dom.failure_class);

  let level = 'none';
  if (weighted >= t.hard_stop) level = 'hard_stop';
  else if (weighted >= t.escalate) level = 'escalate';
  else if (weighted >= t.notice) level = 'notice';

  return {
    level,
    weighted_repeat: weighted,
    failure_class: dom.failure_class,
    failure_signature: dom.failure_signature,
    thresholds: t,
  };
}

export function requiredNextStrategy(escalationLevel, failureClass, lastStrategy) {
  if (escalationLevel === 'hard_stop') {
    return {
      strategy: STRATEGY.RECOVERY_PROTOCOL,
      reason:
        'Strategy forbidden — begin autonomous recovery protocol (NOT terminal stop). See AUTONOMOUS-RECOVERY-0001.',
      forbidden: [STRATEGY.BUILDER_BUILD, STRATEGY.BUILDER_PROSE, lastStrategy].filter(Boolean),
      recovery_steps: RECOVERY_STEPS,
      first_recovery_action: STRATEGY.MECHANICAL_V27,
    };
  }
  if (escalationLevel === 'escalate') {
    if (failureClass === 'evidence_gap' || failureClass === 'same_signature_repeat') {
      return {
        strategy: STRATEGY.MECHANICAL_V27,
        reason: 'Copy v27 mechanical runner pattern — not another builder prose/build on same spec',
        forbidden: [STRATEGY.BUILDER_BUILD, STRATEGY.BUILDER_PROSE],
        template_ref:
          'builderos-reboot/MISSIONS/FACTORY-DELIBERATION-V27-0001/CONTENT/run-deliberation-sentry.mjs',
      };
    }
    if (failureClass === 'fake_green_attempt') {
      return {
        strategy: STRATEGY.MECHANICAL_V27,
        reason: 'Fake-green history — mechanical receipt only',
        forbidden: [STRATEGY.BUILDER_PROSE, STRATEGY.BUILDER_BUILD],
      };
    }
    return {
      strategy: STRATEGY.COUNCIL,
      reason: 'Multi-hat Council escalation with failure packet',
      forbidden: [lastStrategy],
    };
  }
  if (escalationLevel === 'notice') {
    return {
      strategy: lastStrategy || STRATEGY.BUILDER_BUILD,
      reason: 'Pattern failure detected — change approach before next attempt',
      forbidden: [],
    };
  }
  return { strategy: lastStrategy, reason: 'No escalation', forbidden: [] };
}

export function buildFailurePacket(missionId, state, context, escalation) {
  const dom = dominantFailure(state, context.currentSignal);
  const tier1 = context.tier1 || {};
  const artifacts = context.artifacts || {};

  return {
    schema: 'failure_pattern_packet_v1',
    generated_at: new Date().toISOString(),
    mission_id: missionId,
    escalation_level: escalation.level,
    attempts_tried: state.attempts.map((a) => ({
      id: a.attempt_id,
      class: a.failure_class,
      signature: a.failure_signature,
      strategy: a.strategy,
      detail: a.detail,
    })),
    failures: state.attempts.filter((a) => a.failure_class !== 'governance_block').slice(-5),
    failure_signature: dom?.failure_signature,
    failure_class: dom?.failure_class,
    repeated_signature_weight: escalation.weighted_repeat,
    files_touched: artifacts.files_touched || [],
    tests_failing: tier1.missing_summary || [],
    missing_evidence: [
      ...(tier1.tier1?.missing_fields || []),
      ...(artifacts.SENTRY_CHECK_RESULT ? [] : ['SENTRY_CHECK_RESULT.json']),
      ...(artifacts.MISSION_TELEMETRY_RECEIPT ? [] : ['MISSION_TELEMETRY_RECEIPT.json']),
    ],
    suspected_root_cause:
      context.currentSignal?.suspected_root_cause ||
      'Builder council truncates mission-pack JS/markdown; mechanical runner required',
    decision_blocked: context.currentSignal?.decision_blocked || 'Produce trustworthy SENTRY_CHECK_RESULT.json',
    required_strategy_change: requiredNextStrategy(
      escalation.level,
      dom?.failure_class,
      state.last_strategy,
    ),
    council_hats: loadContract().default_escalation_hats,
    route:
      escalation.level === 'hard_stop'
        ? 'RECOVERY_PROTOCOL_START'
        : escalation.level === 'escalate'
          ? 'COUNCIL_ESCALATION'
          : 'COUNCIL_ESCALATION',
    recovery_protocol:
      escalation.level === 'hard_stop'
        ? {
            active: true,
            mission_ref: 'AUTONOMOUS-RECOVERY-0001',
            steps: RECOVERY_STEPS,
            terminal_stop_forbidden: true,
          }
        : null,
    council_command:
      'npm run lifeos:gate-change-run -- --preset maturity --pain "$(cat FAILURE_PATTERN_PACKET.json)"',
  };
}

/** Derive live failure signal from mission artifacts (observe — no double-count on same signature). */
export function deriveCurrentSignal(missionId, { tier1, artifacts = {} } = {}) {
  const dir = missionDir(missionId);
  const signals = [];

  if (tier1?.verdict === 'TIER1_FAIL') {
    signals.push({
      failure_class: 'evidence_gap',
      failure_signature: signatureHash(['evidence_gap', 'tier1_receipt_missing']),
      strategy: STRATEGY.BUILDER_BUILD,
      detail: 'Tier 1 receipt incomplete',
    });
  }

  const auditMd = path.join(dir, 'SENTRY_BP_AUDIT_REPORT.md');
  if (artifacts.SENTRY_BP_AUDIT_REPORT && fs.existsSync(auditMd)) {
    const lines = fs.readFileSync(auditMd, 'utf8').split('\n').length;
    if (lines < 20) {
      signals.push({
        failure_class: 'fake_green_attempt',
        failure_signature: signatureHash(['fake_green', 'truncated_audit_md', String(lines)]),
        strategy: STRATEGY.BUILDER_PROSE,
        detail: `Truncated audit markdown (~${lines} lines)`,
      });
    }
  }

  const runner = path.join(dir, 'CONTENT/run-sentry-bp-audit.mjs');
  if (fs.existsSync(runner)) {
    const lines = fs.readFileSync(runner, 'utf8').split('\n').length;
    if (lines < 30) {
      signals.push({
        failure_class: 'fake_green_attempt',
        failure_signature: signatureHash(['fake_green', 'stub_runner', String(lines)]),
        strategy: STRATEGY.BUILDER_BUILD,
        detail: `Stub runner (~${lines} lines)`,
      });
    }
  }

  if (artifacts.PROBE_pollution) {
    signals.push({
      failure_class: 'authority_violation',
      failure_signature: signatureHash(['authority', 'probe_txt_pollution']),
      strategy: STRATEGY.BUILDER_BUILD,
      detail: 'PROBE.txt pollution in mission folder',
    });
  }

  if (!artifacts.SENTRY_CHECK_RESULT && !artifacts.SENTRY_BP_AUDIT_REPORT) {
    signals.push({
      failure_class: 'evidence_gap',
      failure_signature: signatureHash(['evidence_gap', 'sentry_check_missing']),
      strategy: STRATEGY.BUILDER_BUILD,
      detail: 'SENTRY_CHECK_RESULT.json missing',
      suspected_root_cause: 'No mechanical audit runner committed',
      decision_blocked: 'Mechanical runner + JSON receipt',
    });
  }

  return signals[0] || null;
}

export function maybeIngestSignal(state, signal, contract) {
  if (!signal) return { ingested: false };
  const exists = state.attempts.some(
    (a) => a.failure_signature === signal.failure_signature && a.detail === signal.detail,
  );
  if (exists) return { ingested: false, reason: 'duplicate_signature' };
  recordAttempt(state, signal, contract);
  return { ingested: true };
}

export function seedKnownAttempts(missionId) {
  const state = loadState(missionId);
  if (state.seeded || state.attempts.length > 0) return state;

  const contract = loadContract();
  const seed = [
    {
      failure_class: 'fake_green_attempt',
      failure_signature: signatureHash(['fake_green', 'truncated_audit_md', '9']),
      strategy: STRATEGY.BUILDER_PROSE,
      detail: 'Attempt 1–2: truncated SENTRY_BP_AUDIT_REPORT.md prose PASS',
    },
    {
      failure_class: 'fake_green_attempt',
      failure_signature: signatureHash(['fake_green', 'stub_runner', '4']),
      strategy: STRATEGY.BUILDER_BUILD,
      detail: 'Attempt 3: 4-line run-sentry-bp-audit.mjs stub',
    },
    {
      failure_class: 'governance_block',
      failure_signature: signatureHash(['governance', 'invalid_imports']),
      strategy: STRATEGY.BUILDER_BUILD,
      detail: 'Attempt 4: governance blocked wrong imports',
    },
    {
      failure_class: 'governance_block',
      failure_signature: signatureHash(['governance', 'async_wrong_paths_hallucinated_ids']),
      strategy: STRATEGY.BUILDER_BUILD,
      detail: 'Attempt 5: invalid async, wrong MISSION_DIR, hallucinated probe IDs',
    },
  ];

  for (const s of seed) recordAttempt(state, s, contract);
  state.seeded = true;
  state.seeded_at = new Date().toISOString();
  state.seed_note = 'Historical attempts 1–5 from observation log (pre-enforcement)';
  saveState(missionId, state);
  return state;
}

export async function maybeQueueCouncil(packet, { auto = process.env.LOOP_ESCALATION_AUTO_COUNCIL === '1' } = {}) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || '';
  if (!auto || !base || !key) {
    return { queued: false, reason: 'LOOP_ESCALATION_AUTO_COUNCIL not set or missing API env' };
  }
  try {
    const res = await fetch(`${base}/api/v1/lifeos/gate-change/run-preset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-command-key': key },
      body: JSON.stringify({
        preset: 'maturity',
        pain: JSON.stringify(packet).slice(0, 4000),
      }),
    });
    const json = await res.json().catch(() => ({}));
    return { queued: res.ok, status: res.status, body: json };
  } catch (err) {
    return { queued: false, error: err.message };
  }
}

export function writeFounderAlert(missionId, result, council) {
  const recoveryWired = council?.queued === true;
  const alert = {
    schema: 'founder_alert_v1',
    generated_at: new Date().toISOString(),
    severity: 'P0',
    mission_id: missionId,
    reason: 'AUTONOMOUS_RECOVERY_PATH_INCOMPLETE',
    summary:
      'Strategy forbidden but recovery protocol not fully autonomous — founder attention required. System must not silent-stop.',
    escalation_level: result.escalation_level,
    recovery_protocol_active: Boolean(result.recovery_protocol?.active),
    council_auto_queued: recoveryWired,
    required_actions: [
      'Review FAILURE_PATTERN_PACKET.json',
      'Unblock recovery: Council OR mechanical v27 runner OR factory-local path',
      'Complete BP audit artifact or produce UNSOLVED receipt with evidence',
    ],
    scorecard_ref: 'SNT_MISSION_SCORECARD.json',
    mission_outcome: 'FAIL',
  };
  const p = path.join(missionDir(missionId), 'FOUNDER_ALERT.json');
  fs.writeFileSync(p, `${JSON.stringify(alert, null, 2)}\n`);
  return alert;
}

export async function runLoopEscalation(missionId, context = {}) {
  const contract = loadContract();
  let state = seedKnownAttempts(missionId);

  const currentSignal = deriveCurrentSignal(missionId, context);
  const ingest = maybeIngestSignal(state, currentSignal, contract);
  if (ingest.ingested) saveState(missionId, state);

  const escalation = computeEscalationLevel(state, contract, currentSignal);
  const next = requiredNextStrategy(escalation.level, escalation.failure_class, state.last_strategy);

  const sameAgentBlocked = escalation.level === 'escalate' || escalation.level === 'hard_stop';
  const recoveryActive = escalation.level === 'hard_stop';
  const result = {
    schema: 'loop_escalation_result_v2',
    generated_at: new Date().toISOString(),
    mission_id: missionId,
    attempt_count: state.attempts.length,
    failure_class: escalation.failure_class,
    failure_signature: escalation.failure_signature,
    repeated_signature_weight: escalation.weighted_repeat,
    last_strategy: state.last_strategy,
    escalation_level: escalation.level,
    escalation_thresholds: escalation.thresholds,
    required_next_strategy: next,
    same_agent_loop_blocked: sameAgentBlocked,
    recovery_protocol_active: recoveryActive,
    system_terminal_stop: false,
    mission_outcome: 'FAIL',
    route_target:
      escalation.level === 'hard_stop'
        ? 'RECOVERY_PROTOCOL_START'
        : escalation.level === 'escalate'
          ? 'COUNCIL_ESCALATION'
          : null,
    recovery_protocol:
      escalation.level === 'hard_stop'
        ? {
            active: true,
            mission_ref: 'AUTONOMOUS-RECOVERY-0001',
            steps: RECOVERY_STEPS,
            terminal_stop_forbidden: true,
          }
        : null,
    signal_ingested_this_run: ingest.ingested,
    current_signal: currentSignal,
    verdict_framing:
      escalation.level === 'none'
        ? 'Loop active — below escalation threshold'
        : escalation.level === 'notice'
          ? 'Pattern failure detected — change strategy before next attempt'
          : escalation.level === 'escalate'
            ? 'Escalation — same strategy forbidden; recovery path required'
            : 'Strategy forbidden — recovery protocol must start (NOT terminal stop)',
  };

  fs.writeFileSync(resultPath(missionId), `${JSON.stringify(result, null, 2)}\n`);

  let council = { queued: false };
  if (sameAgentBlocked) {
    const packet = buildFailurePacket(missionId, state, { ...context, currentSignal }, escalation);
    fs.writeFileSync(packetPath(missionId), `${JSON.stringify(packet, null, 2)}\n`);
    result.failure_packet_written = PACKET_FILENAME;
    council = await maybeQueueCouncil(packet);
    result.council_queue = council;
    if (recoveryActive && !council.queued) {
      result.founder_alert = writeFounderAlert(missionId, result, council);
      result.founder_alert_written = 'FOUNDER_ALERT.json';
    }
  }

  fs.writeFileSync(resultPath(missionId), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
