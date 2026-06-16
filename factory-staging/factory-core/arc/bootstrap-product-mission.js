/**
 * Bootstrap BP_PRIORITY product missions for system path A→B.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../builder/run-step.js';
import { resolveMissionFolder, loadMissionJson, missionRel } from './mission-paths.js';
import { evaluateHandoffGate } from './point-b-gate.js';
import { runDepartmentSimulations } from './department-simulations.js';

import { buildFullCoverageMap, writeCoverageMap, readFounderText } from './foundation/coverage-map.js';

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function readText(absPath) {
  if (!fs.existsSync(absPath)) return '';
  return fs.readFileSync(absPath, 'utf8');
}

function section(text, heading) {
  const re = new RegExp(`##+\\s*${heading}[\\s\\S]*?(?=\\n##|$)`, 'i');
  const m = text.match(re);
  return m ? m[0].replace(/^##[^\n]*\n?/, '').trim() : '';
}

function loadBpPriorityEntry(missionId) {
  const p = path.join(REPO_ROOT, 'builderos-reboot/BP_PRIORITY.json');
  if (!fs.existsSync(p)) return null;
  try {
    const q = JSON.parse(fs.readFileSync(p, 'utf8'));
    return (q.items || []).find((i) => i.mission_id === missionId) || null;
  } catch {
    return null;
  }
}

function buildRoadmap(missionId, blueprint) {
  const phaseIds = [...new Set((blueprint?.steps || []).map((s) => s.phase_id).filter(Boolean))].sort();
  const complete = blueprint?.blueprint_status === 'complete';
  const phases = phaseIds.map((pid) => ({
    phase_id: pid,
    name: `Phase ${pid}`,
    status: 'BUILDER_READY',
    intent: `Blueprint steps tagged ${pid}`,
    builder_outcome: complete ? 'Steps marked complete in legacy blueprint — ARC re-hosts as write_file_exact' : 'Builder executes frozen byte contracts',
    alpha_signal: pid === 'P5' ? 'Acceptance command PASS + founder usability' : `Phase ${pid} artifacts exist`,
  }));

  if (!phaseIds.includes('P4')) {
    phases.push({
      phase_id: 'P4',
      name: 'Builder Execution',
      status: complete ? 'BUILDER_READY' : 'FUTURE',
      intent: 'System Builder executes ARC-emitted write_file_exact steps',
    });
  }
  if (!phaseIds.includes('P5')) {
    phases.push({
      phase_id: 'P5',
      name: 'Alpha Acceptance',
      status: complete ? 'BUILDER_READY' : 'FUTURE',
      intent: 'Acceptance command + founder usability verdict',
    });
  }

  return {
    schema: 'blueprint_roadmap_v1',
    mission_id: missionId,
    roadmap_id: `${missionId}-ROADMAP`,
    status: 'ARC_HANDOFF',
    updated_at: new Date().toISOString().slice(0, 10),
    intent_source: 'FOUNDER_PACKET.md + existing BLUEPRINT.json',
    boundary_note: 'Product mission on BP_PRIORITY queue — not meta proof lap',
    full_map_note: 'A→Z for this product scope; P4/P5 BUILDER_READY when blueprint complete',
    phases,
    primary_metric: 'founder_usability_pass',
  };
}

function buildAssetReuse(missionId, blueprint) {
  const targets = (blueprint?.steps || [])
    .map((s) => s.target_file)
    .filter(Boolean);
  const unique = [...new Set(targets)];
  return {
    schema: 'asset_reuse_decision_v1',
    mission_id: missionId,
    arc_decision_status: 'CONFIRMED',
    surveyed_at: new Date().toISOString().slice(0, 10),
    wisdom_lessons: ['Reuse production spine files already built — ARC hosts byte contracts'],
    cfo_recommendation: 'EXTEND existing repo assets; no greenfield parallel stack',
    assets_reviewed: unique,
    decisions: unique.map((asset) => ({
      asset,
      decision: 'REUSE',
      reason: 'Existing implementation snapshotted into CONTENT for system Builder path',
    })),
    arc_decision: 'REUSE repo truth; mechanical ARC host compiler emits write_file_exact blueprint',
  };
}

function buildBaseline(missionId, founderText, queueEntry) {
  const problem = section(founderText, 'Problem');
  const outcome = section(founderText, 'Desired Outcome') || section(founderText, 'FOUNDER SUCCESS TEST');
  return {
    schema: 'intent_baseline_v1',
    intent_id: missionId,
    mission_id: missionId,
    tier: 1,
    status: 'HANDOFF_READY',
    created_at: new Date().toISOString().slice(0, 10),
    amendment_pack: 'docs/constitution/AMENDMENT_PACK_V2.0A.md',
    proof_lap_only: false,
    outcome_statement: outcome.slice(0, 500) || queueEntry?.note || '',
    user: 'Adam (founder)',
    pain: problem.slice(0, 400) || '',
    value: outcome.slice(0, 400) || '',
    success_metrics: [section(founderText, 'FOUNDER SUCCESS TEST').slice(0, 300) || 'Acceptance command PASS'],
    failure_metrics: ['TECHNICAL_PASS without founder_usability_pass', 'Auto-execution without Adam approval'],
    constraints: ['BP_PRIORITY queue authority', 'BuilderOS system path only — no agent hand-build'],
    scope_boundary: section(founderText, 'Scope') || 'Per FOUNDER_PACKET.md',
    unacceptable_result: 'Partial blueprint labeled Alpha; bypass of staging/approval gates',
    ownership: 'ARC emits machine twin; Builder executes; Adam owns founder usability verdict',
    priority_fit: queueEntry ? `BP_PRIORITY rank ${queueEntry.rank}` : 'BP_PRIORITY product',
    point_model: {
      A: 'Vision — Adam provides FP in development stage',
      B: 'Chair locks handoff — corridor protected; Adam done until Alpha',
      C: 'Alpha — Adam evaluates outcome only',
    },
  };
}

function writeChairHandoffReceipt(missionFolder, missionId) {
  const abs = path.join(missionFolder, 'CHAIR_HANDOFF_RECEIPT.json');
  if (fs.existsSync(abs)) return;
  writeJson(abs, {
    schema: 'chair_handoff_receipt_v1',
    mission_id: missionId,
    handoff_at: new Date().toISOString(),
    from_stage: 'development',
    to_stage: 'protected_corridor',
    locked_by: 'Chair',
    note: 'Use run-development-pipeline.mjs --lock-handoff after department sims pass.',
    _invalid_if_no_department_sims: true,
  });
}

export function bootstrapPreArcReceipts(missionFolder, { blueprint } = {}) {
  return runDepartmentSimulations(missionFolder);
}

/**
 * Bootstrap intake artifacts for a BP_PRIORITY product mission.
 */
export function bootstrapProductMission(missionIdOrPath, { force = false } = {}) {
  const missionFolder = resolveMissionFolder(missionIdOrPath);
  if (!missionFolder) {
    return { ok: false, error: 'mission_not_found' };
  }

  const missionId = path.basename(missionFolder);
  const founderPath = path.join(missionFolder, 'FOUNDER_PACKET.md');
  if (!fs.existsSync(founderPath)) {
    return { ok: false, error: 'missing FOUNDER_PACKET.md' };
  }

  const blueprint = loadMissionJson(missionFolder, 'BLUEPRINT.json');
  if (!blueprint?.steps?.length) {
    return { ok: false, error: 'missing or empty BLUEPRINT.json' };
  }

  const founderText = readText(founderPath);
  const queueEntry = loadBpPriorityEntry(missionId);
  const written = [];
  const baseline = buildBaseline(missionId, founderText, queueEntry);
  const coverage = buildFullCoverageMap(missionId, founderText, baseline, queueEntry);

  const artifacts = [
    ['INTENT_BASELINE.json', baseline],
    ['INTENT_COVERAGE_MAP.json', coverage],
    ['ASSET_REUSE_DECISION.json', buildAssetReuse(missionId, blueprint)],
    ['BLUEPRINT_ROADMAP.json', buildRoadmap(missionId, blueprint)],
  ];

  for (const [name, data] of artifacts) {
    const abs = path.join(missionFolder, name);
    if (!force && fs.existsSync(abs)) continue;
    writeJson(abs, data);
    written.push(name);
  }

  bootstrapPreArcReceipts(missionFolder, { blueprint });

  const assemble = path.join(REPO_ROOT, 'scripts/assemble-pre-arc-packet.mjs');
  if (fs.existsSync(assemble)) {
    spawnSync(process.execPath, [assemble, missionRel(missionFolder)], { cwd: REPO_ROOT, stdio: 'pipe' });
    written.push('PRE_ARC_INPUT_PACKET.json');
  }

  const corridor = evaluateHandoffGate(missionFolder);
  writeJson(path.join(missionFolder, 'receipts/CORRIDOR_ENTERED_GATE_REPORT.json'), corridor);

  return {
    ok: true,
    mission_id: missionId,
    mission_folder: missionRel(missionFolder),
    written,
    corridor,
    next: `npm run builderos:system-path -- ${missionId}`,
  };
}
