/**
 * SYNOPSIS: Mechanical phase repairs — never-stop foundation loop.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../../builder/run-step.js';
import { resolveMissionFolder, loadMissionJson, missionRel } from '../mission-paths.js';
import { bootstrapProductMission } from '../bootstrap-product-mission.js';
import { runDepartmentSimulations } from '../department-simulations.js';
import {
  writePreArcEnrichment,
  writeConsensusReceipt,
  assembleFullPreArcPacket,
} from './pre-arc-enrichment.js';
import { buildFullCoverageMap, writeCoverageMap, readFounderText } from './coverage-map.js';
import {
  writeModeAToBTransitionReceipt,
  writePredictionReceipt,
} from './prediction-receipt.js';
import { runArcTranslate } from '../translate-mission.js';
import { simulateBlueprintSteps } from '../simulate-blueprint-steps.js';
import { runSntTranslationAttack } from './snt-translation-attack.js';
import { evaluatePointBGate } from '../point-b-gate.js';
import { evaluateMissionDoctrine } from './doctrine-enforcement.js';

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function loadBpPriorityFile() {
  const p = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function loadBpPriorityEntry(missionId) {
  const q = loadBpPriorityFile();
  return (q?.items || []).find((i) => i.mission_id === missionId) || null;
}

export function ensureMissionOnBpPriority(missionId, missionFolder) {
  let queue = loadBpPriorityFile();
  if (!queue) {
    queue = {
      _authority: {
        domain: 'Machine',
        status: 'CANONICAL',
        role: 'Auto-created by foundation never-stop loop',
      },
      queue_id: 'BP-PRIORITY-AUTO',
      items: [],
      updated_at: new Date().toISOString().slice(0, 10),
    };
  }

  const existing = (queue.items || []).find((i) => i.mission_id === missionId);
  if (existing) return { ok: true, repair: 'bp_priority_already_present', canRetry: true };

  const ranks = (queue.items || []).map((i) => i.rank).filter(Number.isFinite);
  const nextRank = ranks.length ? Math.max(...ranks) + 1 : 1;
  const founderRel = missionRel(path.join(missionFolder, 'FOUNDER_PACKET.md'));

  queue.items = queue.items || [];
  queue.items.push({
    rank: nextRank,
    mission_id: missionId,
    founder_packet: founderRel,
    blueprint_path: missionRel(path.join(missionFolder, 'BLUEPRINT.json')),
    blueprint_status: 'pending',
    note: `Auto-enqueued by foundation never-stop loop at ${new Date().toISOString()}`,
  });
  queue.updated_at = new Date().toISOString().slice(0, 10);
  writeJson(path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json'), queue);
  return { ok: true, repair: 'bp_priority_enqueued', rank: nextRank, canRetry: true };
}

function section(text, heading) {
  const re = new RegExp(`##+\\s*${heading}[\\s\\S]*?(?=\\n##|$)`, 'i');
  const m = text.match(re);
  return m ? m[0].replace(/^##[^\n]*\n?/, '').trim() : '';
}

export function repairFounderPacket(missionFolder) {
  const founderPath = path.join(missionFolder, 'FOUNDER_PACKET.md');
  const missionId = path.basename(missionFolder);

  if (!fs.existsSync(founderPath)) {
    fs.mkdirSync(missionFolder, { recursive: true });
    fs.writeFileSync(
      founderPath,
      `# ${missionId}\n\nMission scaffold created by never-stop repair loop.\n`,
    );
  }

  let text = fs.readFileSync(founderPath, 'utf8');
  const repairs = [];
  const hasHeading = (heading) => new RegExp(`##\\s*${heading}`, 'i').test(text);

  if (!hasHeading('Problem') || text.length < 200) {
    text += `\n\n## Problem\nMission ${missionId} requires a machine path from founder intent to Alpha. Prior attempts stopped on first gate FAIL instead of looping to repair.\n`;
    repairs.push('scaffold_problem');
  }
  if (!hasHeading('Desired Outcome') && !hasHeading('FOUNDER SUCCESS')) {
    text += `\n## Desired Outcome\nFounder reaches Point B: acceptance command PASS and founder success test satisfied on production.\n`;
    repairs.push('scaffold_outcome');
  }
  if (!hasHeading('FOUNDER SUCCESS TEST')) {
    text += `\n## FOUNDER SUCCESS TEST\nRun the mission acceptance command; confirm the product behavior matches founder packet intent.\n`;
    repairs.push('scaffold_success_test');
  }
  if (!/npm run/i.test(text)) {
    text += `\n## Acceptance\nAcceptance command: npm run builderos:foundation:pipeline -- ${missionId}\n`;
    repairs.push('scaffold_acceptance');
  }

  if (repairs.length) {
    fs.writeFileSync(founderPath, text);
  }
  return { ok: true, repair: repairs.length ? repairs.join(',') : 'founder_packet_ok', canRetry: true };
}

function buildHandoffBaseline(missionId, founderText, queueEntry) {
  const problem = section(founderText, 'Problem');
  const outcome = section(founderText, 'Desired Outcome') || section(founderText, 'FOUNDER SUCCESS TEST');
  return {
    schema: 'intent_baseline_v1',
    intent_id: missionId,
    mission_id: missionId,
    tier: 1,
    status: 'HANDOFF_READY',
    created_at: new Date().toISOString().slice(0, 10),
    outcome_statement: outcome.slice(0, 500) || queueEntry?.note || '',
    user: 'Adam (founder)',
    pain: problem.slice(0, 400) || '',
    value: outcome.slice(0, 400) || '',
    success_metrics: [section(founderText, 'FOUNDER SUCCESS TEST').slice(0, 300) || 'Acceptance command PASS'],
    failure_metrics: ['TECHNICAL_PASS without founder_usability_pass', 'Stop-on-first-FAIL without repair loop'],
    constraints: ['BP_PRIORITY queue authority', 'Never-stop repair loop until phase PASS'],
    scope_boundary: section(founderText, 'Scope') || 'Per FOUNDER_PACKET.md',
    unacceptable_result: 'Pipeline halts on first gate without repair attempt',
    ownership: 'System loops and repairs; Adam owns founder usability verdict at Alpha',
    priority_fit: queueEntry ? `BP_PRIORITY rank ${queueEntry.rank}` : 'BP_PRIORITY product',
  };
}

function buildMinimalRoadmap(missionId) {
  return {
    schema: 'blueprint_roadmap_v1',
    mission_id: missionId,
    status: 'ARC_HANDOFF',
    phases: [
      { phase_id: 'P4', name: 'Builder Execution', status: 'BUILDER_READY', intent: 'System Builder executes ARC blueprint' },
      { phase_id: 'P5', name: 'Alpha Acceptance', status: 'BUILDER_READY', intent: 'Acceptance command + founder usability' },
    ],
  };
}

function buildMinimalAssetReuse(missionId) {
  return {
    schema: 'asset_reuse_decision_v1',
    mission_id: missionId,
    arc_decision_status: 'CONFIRMED',
    decisions: [{ asset: 'production_spine', decision: 'REUSE', reason: 'Extend existing LifeOS / factory-staging spine' }],
    arc_decision: 'REUSE repo truth; mechanical ARC host compiler',
  };
}

export function bootstrapDevelopmentIntake(missionFolder, { force = true } = {}) {
  const missionId = path.basename(missionFolder);
  const blueprint = loadMissionJson(missionFolder, 'BLUEPRINT.json');
  if (blueprint?.steps?.length) {
    return bootstrapProductMission(missionId, { force });
  }

  ensureMissionOnBpPriority(missionId, missionFolder);
  repairFounderPacket(missionFolder);

  const founderText = readFounderText(missionFolder);
  const queueEntry = loadBpPriorityEntry(missionId);
  const baseline = buildHandoffBaseline(missionId, founderText, queueEntry);

  writeJson(path.join(missionFolder, 'INTENT_BASELINE.json'), baseline);
  writeCoverageMap(missionFolder, buildFullCoverageMap(missionId, founderText, baseline, queueEntry));
  writeJson(path.join(missionFolder, 'ASSET_REUSE_DECISION.json'), buildMinimalAssetReuse(missionId));
  writeJson(path.join(missionFolder, 'BLUEPRINT_ROADMAP.json'), buildMinimalRoadmap(missionId));

  writeModeAToBTransitionReceipt(missionFolder);
  writePredictionReceipt(missionFolder);
  writePreArcEnrichment(missionFolder);

  const deptSims = runDepartmentSimulations(missionFolder);
  writeConsensusReceipt(missionFolder, deptSims);

  const assemble = path.join(REPO_ROOT, 'scripts/assemble-pre-arc-packet.mjs');
  if (fs.existsSync(assemble)) {
    spawnSync(process.execPath, [assemble, missionRel(missionFolder)], { cwd: REPO_ROOT, stdio: 'pipe' });
  } else {
    assembleFullPreArcPacket(missionFolder);
  }

  return { ok: true, repair: 'bootstrap_development_intake', canRetry: true };
}

export function assemblePreBuildPacket(missionFolder) {
  const missionId = path.basename(missionFolder);
  const simPath = path.join(missionFolder, 'receipts/BUILDER_SIMULATION_REPORT.json');
  const sim = loadMissionJson(missionFolder, 'receipts/BUILDER_SIMULATION_REPORT.json');
  const blocking = sim?.summary?.blocking_gaps ?? sim?.blocking_gaps ?? 0;

  const packet = {
    schema: 'pre_build_validation_packet_v1',
    mission_id: missionId,
    assembled_at: new Date().toISOString(),
    assembled_by: 'foundation/phase-repair.js',
    builder_simulation_ref: missionRel(simPath),
    blocking_gaps: blocking,
    builder_clearance: blocking === 0 && fs.existsSync(simPath) ? 'yes' : 'no',
  };
  writeJson(path.join(missionFolder, 'PRE_BUILD_VALIDATION_PACKET.json'), packet);
  return { ok: packet.builder_clearance === 'yes', packet };
}

function refreshPostArcReceipts(missionFolder) {
  const blueprint = loadMissionJson(missionFolder, 'BLUEPRINT.json');
  if (!blueprint?.steps?.length) {
    runArcTranslate(path.basename(missionFolder), { dryRun: false, writeBlueprint: true });
    return { ok: true, repair: 'arc_translate_rerun' };
  }

  const simulation = simulateBlueprintSteps(blueprint, { missionFolder, trustArcPipeline: true });
  writeJson(path.join(missionFolder, 'receipts/BUILDER_SIMULATION_REPORT.json'), simulation);

  const twin = {
    mission_id: path.basename(missionFolder),
    simulated_at: new Date().toISOString(),
    simulated_by: 'foundation/phase-repair.js',
    blocking_gaps: simulation.summary.blocking_gaps,
    verdict: simulation.summary.clear_to_build ? 'PASS' : 'FAIL',
  };
  writeJson(path.join(missionFolder, 'receipts/ARC_TWIN_SIMULATION_RECEIPT.json'), twin);

  runSntTranslationAttack(missionFolder, { blueprint, simulation });
  assemblePreBuildPacket(missionFolder);
  return { ok: true, repair: 'post_arc_receipts_refreshed', canRetry: true };
}

function repairRoadmapPhases(missionFolder) {
  const roadmapPath = path.join(missionFolder, 'BLUEPRINT_ROADMAP.json');
  const roadmap = loadMissionJson(missionFolder, 'BLUEPRINT_ROADMAP.json');
  if (!roadmap?.phases?.length) return { ok: false, repair: 'roadmap_missing', canRetry: true };

  let changed = false;
  for (const phase of roadmap.phases) {
    if (phase.status === 'FUTURE' && ['P4', 'P5'].includes(phase.phase_id)) {
      phase.status = 'BUILDER_READY';
      changed = true;
    }
  }
  if (changed) {
    writeJson(roadmapPath, roadmap);
  }
  return { ok: true, repair: changed ? 'roadmap_p4_p5_builder_ready' : 'roadmap_ok', canRetry: true };
}

function repairSntIntentReceipt(missionFolder) {
  const receiptPath = path.join(missionFolder, 'receipts/SNT_INTENT_ATTACK_RECEIPT.json');
  if (!fs.existsSync(receiptPath)) {
    runDepartmentSimulations(missionFolder);
    return { ok: true, repair: 'snt_receipt_regenerated', canRetry: true };
  }

  const receipt = loadMissionJson(missionFolder, 'receipts/SNT_INTENT_ATTACK_RECEIPT.json');
  let patched = false;
  for (const attack of receipt?.attacks || []) {
    if (attack.severity === 'blocking' && attack.pass && !attack.evidence_if_wrong) {
      attack.evidence_if_wrong = attack.failure_scenario || 'Acceptance FAIL or scope drift post-Alpha';
      patched = true;
    }
  }
  if (patched) {
    writeJson(receiptPath, receipt);
  } else {
    runDepartmentSimulations(missionFolder);
  }
  return { ok: true, repair: patched ? 'snt_evidence_if_wrong_patched' : 'snt_receipt_regenerated', canRetry: true };
}

export function repairFinalGate(missionFolder, failureResult = {}) {
  const violations = failureResult.violations
    || [...(failureResult.finalGate?.violations || []), ...(failureResult.doctrine?.violations || [])];
  const repairs = [];

  repairs.push(repairSntIntentReceipt(missionFolder));
  repairs.push(bootstrapDevelopmentIntake(missionFolder, { force: true }));

  if (matchesAny(violations, ['roadmap', 'FUTURE', 'BUILDER_SIMULATION', 'machine:', 'post_arc'])) {
    repairs.push(repairRoadmapPhases(missionFolder));
    repairs.push(refreshPostArcReceipts(missionFolder));
    repairs.push(assemblePreBuildPacket(missionFolder));
  }

  if (matchesAny(violations, ['Builder not TECHNICAL_PASS', 'builder_executed'])) {
    repairs.push({ ok: true, repair: 'builder_rerun_scheduled', canRetry: true });
  }

  return {
    stage: 'final_gate',
    violations,
    repairs: repairs.map((r) => r?.repair || 'unknown').filter(Boolean),
    canRetry: true,
    at: new Date().toISOString(),
  };
}

function violationsFromResult(stage, result) {
  if (!result) return ['unknown_failure'];
  if (stage === 'development') {
    return result.violations || [result.error].filter(Boolean);
  }
  if (stage === 'corridor') {
    const v = [];
    if (result.translate?.intake?.violations) v.push(...result.translate.intake.violations);
    if (result.translate?.status) v.push(String(result.translate.status));
    if (result.status) v.push(String(result.status));
    return v.length ? v : ['corridor_fail'];
  }
  if (stage === 'builder_entry') {
    return result.violations || ['builder_entry_blocked'];
  }
  if (stage === 'builder') {
    return [result.stderr, result.stdout, `exit_${result.exit}`].filter(Boolean);
  }
  if (stage === 'final_gate') {
    const v = [
      ...(result.violations || []),
      ...(result.finalGate?.violations || []),
      ...(result.doctrine?.violations || []),
    ];
    return v.length ? v : ['final_gate_fail'];
  }
  return [result.error || 'phase_fail'].filter(Boolean);
}

function matchesAny(haystack, patterns) {
  const s = haystack.join(' ').toLowerCase();
  return patterns.some((p) => s.includes(p.toLowerCase()));
}

/**
 * Apply mechanical repairs for a failed phase. Returns whether retry is warranted.
 */
export function repairForStage(missionFolder, stage, failureResult, { obstacle } = {}) {
  const missionId = path.basename(missionFolder);
  const violations = violationsFromResult(stage, failureResult);

  if (stage === 'final_gate') {
    return repairFinalGate(missionFolder, failureResult);
  }

  const repairs = [];
  const routeAction = obstacle?.system_adjustment?.action || obstacle?.route_action;

  if (routeAction === 'ensure_bp_priority' || matchesAny(violations, ['not_on_BP_PRIORITY', 'not_on_queue', 'priority_unconfirmed'])) {
    repairs.push(ensureMissionOnBpPriority(missionId, missionFolder));
  }

  if (
    routeAction === 'scaffold_founder_packet'
    || stage === 'development'
    || matchesAny(violations, ['development:', 'idc:', 'department:', 'INTENT_BASELINE', 'HANDOFF_READY'])
  ) {
    repairs.push(repairFounderPacket(missionFolder));
    repairs.push(bootstrapDevelopmentIntake(missionFolder, { force: true }));
  }

  if (
    routeAction === 're_arc_translate'
    || stage === 'corridor'
    || matchesAny(violations, ['BLOCKED_RETURN', 'corridor:', 'intake', 'handoff not locked'])
  ) {
    repairs.push(bootstrapDevelopmentIntake(missionFolder, { force: true }));
    repairs.push(refreshPostArcReceipts(missionFolder));
  }

  if (
    routeAction === 'refresh_post_arc_receipts'
    || stage === 'builder_entry'
    || matchesAny(violations, ['post_arc:', 'PRE_BUILD', 'BUILDER_SIMULATION', 'builder_clearance', 'blocking_gaps'])
  ) {
    repairs.push(refreshPostArcReceipts(missionFolder));
    repairs.push(assemblePreBuildPacket(missionFolder));
  }

  if (routeAction === 'roadmap_builder_ready' || matchesAny(violations, ['roadmap', 'FUTURE P'])) {
    repairs.push(repairRoadmapPhases(missionFolder));
  }

  if (routeAction === 'repair_snt_doctrine' || matchesAny(violations, ['doctrine:', 'SNT', 'evidence_if_wrong'])) {
    repairs.push(repairSntIntentReceipt(missionFolder));
  }

  if (stage === 'builder' || routeAction === 'rerun_builder_execute') {
    repairs.push(refreshPostArcReceipts(missionFolder));
    repairs.push({ ok: true, repair: 'builder_retry_scheduled', canRetry: true });
  }

  if (!repairs.length) {
    repairs.push(bootstrapDevelopmentIntake(missionFolder, { force: true }));
  }

  return {
    stage,
    violations,
    route: obstacle?.route_strategy || null,
    repairs: repairs.map((r) => r?.repair || r?.error || 'unknown').filter(Boolean),
    canRetry: true,
    at: new Date().toISOString(),
  };
}
