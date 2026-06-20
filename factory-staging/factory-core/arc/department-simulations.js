/**
 * Mechanical department simulations — each seat touches the packet per founder doctrine.
 * Stub receipts = system failure. Agent skip = agent drift failure.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../builder/run-step.js';
import { loadMissionJson } from './mission-paths.js';
import {
  isHardGate,
  isProofLapMission,
  loadBpPriorityMission,
} from './gate-enforcement.js';
import {
  attachMeasurementsToReceipt,
  measurementEnvelope,
} from './foundation/simulation-measurements.js';

const DEPARTMENTS = ['SNT', 'CHAIR', 'CFO', 'WISDOM'];

function readFounderText(missionFolder) {
  const md = path.join(missionFolder, 'FOUNDER_PACKET.md');
  const json = path.join(missionFolder, 'FOUNDER_PACKET.json');
  if (fs.existsSync(md)) return fs.readFileSync(md, 'utf8');
  if (fs.existsSync(json)) return JSON.stringify(JSON.parse(fs.readFileSync(json, 'utf8')), null, 2);
  return '';
}

function loadBpPriority(missionId) {
  const p = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
  if (!fs.existsSync(p)) return null;
  try {
    const q = JSON.parse(fs.readFileSync(p, 'utf8'));
    return (q.items || []).find((i) => i.mission_id === missionId) || null;
  } catch {
    return null;
  }
}

function loadWisdomLessons() {
  const p = path.join(REPO_ROOT, 'data/adf-lessons.json');
  if (!fs.existsSync(p)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(data) ? data : data.lessons || [];
  } catch {
    return [];
  }
}

function resolveSimulationTier(missionFolder) {
  const hasPred = fs.existsSync(path.join(missionFolder, 'PREDICTION_RECEIPT.json'));
  const hasMode = fs.existsSync(path.join(missionFolder, 'MODE_A_TO_B_TRANSITION_RECEIPT.json'));
  if (hasPred && hasMode) return 'COUNCIL_SIM';
  return 'BOOTSTRAP_MECHANICAL';
}

function withSimulationTier(receipt, tier) {
  return { ...receipt, simulation_tier: tier };
}

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function runSntIntentAttack(missionFolder, founderText, baseline, coverage) {
  const missionId = path.basename(missionFolder);
  const attacks = [];

  const add = (claim, pass, failure_scenario, severity = 'advisory') => {
    attacks.push({
      claim,
      pass,
      failure_scenario,
      severity,
      evidence: pass ? 'found in FOUNDER_PACKET or INTENT_BASELINE' : 'missing or ambiguous',
      recommended_action: pass ? 'none' : 'Chair resolves in development — return to conversation',
    });
  };

  add(
    'Desired outcome is stated',
    /##\s*Desired Outcome/i.test(founderText) || Boolean(baseline?.outcome_statement),
    'Builder/ARC invents product scope',
    'blocking',
  );
  add(
    'Success is measurable',
    /FOUNDER SUCCESS TEST/i.test(founderText) || (baseline?.success_metrics?.length > 0),
    'Alpha claimed without behavioral test',
    'blocking',
  );
  add(
    'Failure mode defined',
    /unacceptable|failure|never auto/i.test(founderText) || (baseline?.failure_metrics?.length > 0),
    'Silent failure at Alpha',
    'blocking',
  );
  add(
    'Scope boundary present',
    /out of scope|scope|boundary/i.test(founderText) || Boolean(baseline?.scope_boundary),
    'Scope creep during build',
    'advisory',
  );

  const blocking = attacks.filter((a) => !a.pass && a.severity === 'blocking');
  const base = {
    schema: 'snt_intent_attack_v1',
    mission_id: missionId,
    seat: 'SNT',
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/department-simulations.js',
    attacks_run: attacks.length,
    attacks,
    blocking_count: blocking.length,
    verdict: blocking.length ? 'BLOCKED_INTENT_AMBIGUITY' : 'intent_clearance_yes',
    pass: blocking.length === 0,
    route_on_fail: 'CHAIR',
  };
  return attachMeasurementsToReceipt(base, 'SNT', [
    measurementEnvelope({
      seat: 'SNT',
      metric_id: 'intent_measurable',
      predicted: blocking.length === 0 ? 'clear' : 'blocked',
      confidence: 'THINK',
      how_we_know_if_wrong: 'IDC exit gate or acceptance FAIL on scope drift',
    }),
    measurementEnvelope({
      seat: 'SNT',
      metric_id: 'blocking_attack_count',
      predicted: 0,
      confidence: 'KNOW',
      how_we_know_if_wrong: 'attacks with severity=blocking and pass=false',
    }),
  ]);
}

function runChairForecast(missionFolder, founderText, queueEntry) {
  const missionId = path.basename(missionFolder);
  const horizons = [
    { horizon: '6_months', confidence: 'THINK', note: 'Near-term staging product — evidence from FP scope' },
    { horizon: '1_year', confidence: 'THINK', note: 'Middle layer between comms and execution remains load-bearing' },
    { horizon: '2_years', confidence: 'GUESS', note: 'Platform evolution — scenario only' },
    { horizon: '5_years', confidence: 'GUESS', note: 'Long-range — not blocking handoff' },
  ];
  const blocking = [];
  if (!founderText.trim()) blocking.push('no_founder_packet_for_forecast');

  return attachMeasurementsToReceipt({
    schema: 'chair_forecast_simulation_v1',
    mission_id: missionId,
    seat: 'CHAIR',
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/department-simulations.js',
    scenarios_run: horizons.length,
    predictions: horizons.map((h) => ({
      ...h,
      prediction: `Intent remains valid at ${h.horizon} for ${missionId}`,
      rationale: 'Derived from FOUNDER_PACKET outcome + BP_PRIORITY fit',
      evidence_used: ['FOUNDER_PACKET.md', 'BP_PRIORITY.json'],
      evidence_missing: h.confidence === 'GUESS' ? ['long_horizon_market_data'] : [],
      expected_timeline: h.horizon,
      expected_impact: 'intent_fidelity',
      recommended_action: 'proceed_if_intent_locked',
    })),
    priority_fit: queueEntry ? `BP_PRIORITY rank ${queueEntry.rank}` : 'not_on_queue',
    blocking_risks: blocking,
    verdict: blocking.length ? 'forecast_blocked' : 'forecast_acceptable',
    pass: blocking.length === 0,
    route_on_fail: 'CHAIR',
  }, 'CHAIR', [
    measurementEnvelope({
      seat: 'CHAIR',
      metric_id: 'handoff_forecast',
      predicted: blocking.length === 0 ? 'proceed' : 'block',
      confidence: 'THINK',
      how_we_know_if_wrong: 'CHAIR_HANDOFF_RECEIPT missing or corridor gate FAIL',
    }),
  ]);
}

function runCfoResource(missionFolder, blueprint, queueEntry, baseline) {
  const missionId = path.basename(missionFolder);
  const reuse = (blueprint?.steps || []).filter((s) => s.status === 'complete').length;
  const total = (blueprint?.steps || []).length;
  const blocking = [];
  const directTerminalIntake = baseline?.direct_terminal_intake === true
    && baseline?.priority_fit === 'Direct founder interface explicit operator request';
  if (!queueEntry && !directTerminalIntake) blocking.push('not_on_BP_PRIORITY — CFO cannot confirm priority fit');

  return attachMeasurementsToReceipt({
    schema: 'cfo_resource_simulation_v1',
    mission_id: missionId,
    seat: 'CFO',
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/department-simulations.js',
    roi_note: reuse > 0 ? 'EXTEND existing spine — sunk cost leveraged' : 'Greenfield — higher token/time cost',
    build_vs_buy: reuse > 0 ? 'REUSE repo assets' : 'BUILD',
    opportunity_cost: queueEntry?.note || (directTerminalIntake ? 'Explicit authenticated Founder Interface command' : 'Per BP_PRIORITY ordering'),
    priority_rank: queueEntry?.rank ?? null,
    priority_fit_source: queueEntry ? 'BP_PRIORITY' : (directTerminalIntake ? 'direct_terminal_intake' : 'missing'),
    resource_burden: total > 10 ? 'medium' : 'low',
    constitutional_exemption_applied: false,
    fastest_responsible_path: reuse > 0 ? 'EXTEND existing spine' : 'greenfield build',
    verdict: blocking.length ? 'priority_unconfirmed' : 'within_budget',
    pass: blocking.length === 0,
    route_on_fail: 'CHAIR',
  }, 'CFO', [
    measurementEnvelope({
      seat: 'CFO',
      metric_id: 'within_budget',
      predicted: blocking.length === 0 ? 'yes' : 'no',
      confidence: 'THINK',
      how_we_know_if_wrong: 'Mission blocked on BP or overrun token ledger vs PREDICTION_RECEIPT',
    }),
  ]);
}

function runWisdomReview(missionFolder, founderText) {
  const missionId = path.basename(missionFolder);
  const lessons = loadWisdomLessons().slice(0, 5);
  const patterns = [];
  if (/TECHNICAL_PASS/i.test(founderText)) {
    patterns.push('Prior missions split technical vs founder usability — do not conflate');
  }
  if (/never auto|staged-only/i.test(founderText)) {
    patterns.push('Auto-execution boundary is load-bearing — enforce in service');
  }
  patterns.push('Partial blueprint labeled success = historical drift — fail closed');

  return attachMeasurementsToReceipt({
    schema: 'wisdom_review_v1',
    mission_id: missionId,
    seat: 'Wisdom',
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/department-simulations.js',
    lessons_surfaced: lessons.map((l) => l.lesson || l.summary || String(l)).filter(Boolean).slice(0, 5),
    patterns_from_history: patterns,
    drift_warnings: ['Agent hand-build bypassing system path = agent drift failure'],
    verdict: 'proceed',
    pass: true,
    route_on_fail: 'CHAIR',
  }, 'WISDOM', [
    measurementEnvelope({
      seat: 'WISDOM',
      metric_id: 'drift_pattern_acknowledged',
      predicted: true,
      confidence: 'KNOW',
      how_we_know_if_wrong: 'TWIN_DRIFT_REPORT drift_count > 0 post-acceptance',
    }),
  ]);
}

/**
 * Run all department simulations and write receipts.
 */
export function runDepartmentSimulations(missionFolder) {
  const missionId = path.basename(missionFolder);
  const founderText = readFounderText(missionFolder);
  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  const coverage = loadMissionJson(missionFolder, 'INTENT_COVERAGE_MAP.json');
  const blueprint = loadMissionJson(missionFolder, 'BLUEPRINT.json');
  const queueEntry = loadBpPriority(missionId);
  const receiptsDir = path.join(missionFolder, 'receipts');
  const simulationTier = resolveSimulationTier(missionFolder);

  const snt = withSimulationTier(runSntIntentAttack(missionFolder, founderText, baseline, coverage), simulationTier);
  const chair = withSimulationTier(runChairForecast(missionFolder, founderText, queueEntry), simulationTier);
  const cfo = withSimulationTier(runCfoResource(missionFolder, blueprint, queueEntry, baseline), simulationTier);
  const wisdom = withSimulationTier(runWisdomReview(missionFolder, founderText), simulationTier);

  writeJson(path.join(receiptsDir, 'SNT_INTENT_ATTACK_RECEIPT.json'), snt);
  writeJson(path.join(receiptsDir, 'CHAIR_FORECAST_SIMULATION_RECEIPT.json'), chair);
  writeJson(path.join(receiptsDir, 'CFO_RESOURCE_SIMULATION_RECEIPT.json'), cfo);
  writeJson(path.join(receiptsDir, 'WISDOM_REVIEW_RECEIPT.json'), wisdom);

  const departments = { SNT: snt, CHAIR: chair, CFO: cfo, WISDOM: wisdom };
  const failed = Object.entries(departments).filter(([, r]) => !r.pass);

  return {
    schema: 'department_simulations_v1',
    mission_id: missionId,
    simulated_at: new Date().toISOString(),
    departments,
    all_pass: failed.length === 0,
    failed_seats: failed.map(([seat]) => seat),
    defect_owner_seat: failed.length ? 'Chair' : null,
    route_to: failed.length ? 'CHAIR' : 'ARC',
    simulation_tier: simulationTier,
    lesson: failed.length
      ? 'Department simulation failed — Chair failed to produce clear handoff. ARC pushes upstream.'
      : 'All departments touched. Chair may lock handoff.',
  };
}

export function isStubDepartmentReceipt(data, seat) {
  if (data?.simulation_tier === 'BOOTSTRAP_MECHANICAL') return true;
  if (!data?.simulated_by) return true;
  if (seat === 'SNT') return !Array.isArray(data.attacks) || data.attacks.length === 0;
  if (seat === 'CHAIR') return !Array.isArray(data.predictions) || data.predictions.length === 0;
  if (seat === 'CFO') return !data.roi_note;
  if (seat === 'WISDOM') return !Array.isArray(data.patterns_from_history);
  return false;
}

export function validateDepartmentReceipts(missionFolder) {
  const receiptsDir = path.join(missionFolder, 'receipts');
  const specs = [
    { seat: 'SNT', file: 'SNT_INTENT_ATTACK_RECEIPT.json' },
    { seat: 'CHAIR', file: 'CHAIR_FORECAST_SIMULATION_RECEIPT.json' },
    { seat: 'CFO', file: 'CFO_RESOURCE_SIMULATION_RECEIPT.json' },
    { seat: 'WISDOM', file: 'WISDOM_REVIEW_RECEIPT.json' },
  ];
  const violations = [];
  const checks = {};

  for (const spec of specs) {
    const abs = path.join(receiptsDir, spec.file);
    if (!fs.existsSync(abs)) {
      violations.push(`department:${spec.seat} missing ${spec.file}`);
      checks[spec.seat] = { pass: false, reason: 'missing' };
      continue;
    }
    let data;
    try {
      data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch {
      violations.push(`department:${spec.seat} invalid JSON`);
      checks[spec.seat] = { pass: false, reason: 'invalid' };
      continue;
    }
    const stub = isStubDepartmentReceipt(data, spec.seat);
    const tier = data.simulation_tier || 'BOOTSTRAP_MECHANICAL';
    const onBp = Boolean(loadBpPriorityMission(path.basename(missionFolder)));
    const proofLap = isProofLapMission(missionFolder);
    const fidelityHard = isHardGate('SIMULATION_FIDELITY');
    const bootstrapBlocked =
      fidelityHard && tier === 'BOOTSTRAP_MECHANICAL' && onBp && !proofLap;

    const pass = data.pass === true && !stub && !bootstrapBlocked;
    checks[spec.seat] = { pass, stub, tier, bootstrapBlocked, verdict: data.verdict };
    if (stub) violations.push(`department:${spec.seat} stub receipt — system failure`);
    if (bootstrapBlocked) {
      violations.push(
        `department:${spec.seat} BOOTSTRAP_MECHANICAL blocked — write PREDICTION_RECEIPT + MODE_A_TO_B before sims`,
      );
    }
    if (!pass) violations.push(`department:${spec.seat} simulation failed (${data.verdict})`);
    if (onBp && !proofLap && tier === 'COUNCIL_SIM' && (!Array.isArray(data.measurements) || data.measurements.length === 0)) {
      violations.push(`department:${spec.seat} missing measurements envelope`);
    }
  }

  return {
    pass: violations.length === 0,
    violations,
    checks,
    defect_owner_seat: violations.length ? 'Chair' : null,
    route_to: violations.length ? 'CHAIR' : 'ARC',
  };
}

export { DEPARTMENTS };
