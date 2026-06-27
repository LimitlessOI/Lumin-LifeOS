/**
 * SYNOPSIS: Founder Packet V2 unified gate — live Chair + IDC + Builder entry on all execute paths.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enforceFounderPacketV2ChairTurn } from './chair-founder-packet-v2-enforcement.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { extractMissionIdFromText } from './lifeos-mission-pipeline-executor.js';
import { assessChairIntentUnderstanding } from './chair-intent-protocol.js';
import { isDirectExecuteOrder } from './founder-intent-clarify.js';
import { loadFactoryArcModules } from './factory-arc-loader.js';
import { evaluateIdcExitGate } from '../factory-staging/factory-core/arc/foundation/idc-exit-gate.js';
import { evaluateBuilderEntryGate } from '../factory-staging/factory-core/arc/foundation/builder-entry-gate.js';
import { runStudioSimulation } from '../factory-staging/factory-core/arc/foundation/studio-simulation.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS_ROOT = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');
const LIVE_DIR = path.join(REPO_ROOT, 'data/chair-live');

const EXECUTE_CHANNELS = new Set([
  'build_async',
  'build_terminal',
  'blueprint_execute',
  'execute',
  'builder_api',
  'terminal_bridge',
]);

function appendJsonl(absPath, row) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.appendFileSync(absPath, `${JSON.stringify(row)}\n`);
}

export function resolveMissionFolder({ missionId = null, cleanedInput = '', pointBTarget = null } = {}) {
  const id = missionId
    || extractMissionIdFromText(String(cleanedInput || ''))
    || pointBTarget?.mission_id
    || pointBTarget?.target?.mission_id;
  if (!id) return { mission_id: null, folder: null };
  const folder = path.join(MISSIONS_ROOT, id);
  return fs.existsSync(folder) ? { mission_id: id, folder } : { mission_id: id, folder: null };
}

export async function assessUnderstandingForGate(cleanedInput = '', expandedTask = cleanedInput) {
  const pointBTarget = loadPointBTarget();
  return assessChairIntentUnderstanding(cleanedInput, {
    expandedTask,
    pointBTarget,
    includeBuild: true,
    includeGovernance: /\b(north star|ssot|amendment|protocol|governance)\b/i.test(cleanedInput),
    includeMissionPipeline: /\b(mission|pipeline|receipt scan)\b/i.test(cleanedInput),
  });
}

/**
 * Full Founder Packet V2 gate: live Chair + mission IDC exit + builder entry.
 */
export async function enforceFounderPacketV2Unified({
  cleanedInput = '',
  understanding = null,
  missionId = null,
  pool = null,
  callAI = null,
  pointBTarget = null,
  confirmIntent = false,
  channel = 'builder_api',
  platformGapFill = false,
} = {}) {
  const gapOk = platformGapFill === true;
  const pointB = pointBTarget || loadPointBTarget();
  const programMissionId = missionId
    || extractMissionIdFromText(String(cleanedInput || ''))
    || pointB?.mission_id
    || pointB?.target?.mission_id
    || null;
  const resolvedUnderstanding = understanding || await assessUnderstandingForGate(cleanedInput);

  const chair = await enforceFounderPacketV2ChairTurn({
    cleanedInput,
    understanding: resolvedUnderstanding,
    pool,
    callAI,
    pointBTarget: pointB,
    confirmIntent,
    channel,
  });

  const violations = [...(chair.violations || [])];
  const isExecute = EXECUTE_CHANNELS.has(channel);
  const { mission_id: resolvedMissionId, folder: missionFolder } = resolveMissionFolder({
    missionId: programMissionId,
    cleanedInput,
    pointBTarget: pointB,
  });

  let idcExit = null;
  let builderEntry = null;
  let preArcBundle = null;

  if (isExecute && missionFolder) {
    const arc = await loadFactoryArcModules();
    idcExit = arc.evaluateIdcExitGate(missionFolder);
    runStudioSimulation(missionFolder);
    builderEntry = arc.evaluateBuilderEntryGate(missionFolder);

    preArcBundle = {
      schema: 'pre_arc_live_bundle_v1',
      mission_id: resolvedMissionId,
      at: new Date().toISOString(),
      idc_exit: idcExit,
      builder_entry: builderEntry,
    };
    fs.mkdirSync(LIVE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(LIVE_DIR, 'PRE_ARC_LIVE_BUNDLE.json'),
      `${JSON.stringify(preArcBundle, null, 2)}\n`,
    );

    if (!idcExit.pass) {
      violations.push(...idcExit.violations.map((v) => `IDC_EXIT:${v}`));
    }
    if (!builderEntry.pass) {
      violations.push(...builderEntry.violations.map((v) => `BUILDER_ENTRY:${v}`));
    }
  } else if (isExecute && !missionFolder && !gapOk) {
    violations.push(
      'MISSION_BOUNDARY — CODE_EXECUTE requires mission_id on active BP mission or platform_gap_fill with reason (Founder Packet V2)',
    );
  } else if (isExecute && gapOk && !confirmIntent) {
    violations.push(
      'PLATFORM_GAP_FILL requires confirm_intent from founder (Founder Packet V2 — no ad-hoc bypass)',
    );
  }

  const missionGatesPass = !isExecute
    || !missionFolder
    || (idcExit?.pass && builderEntry?.pass)
    || gapOk;

  const execute_cleared = chair.execute_cleared && missionGatesPass && violations.length === 0;

  const record = {
    schema: 'fp_v2_unified_gate_v1',
    at: new Date().toISOString(),
    channel,
    mission_id: resolvedMissionId,
    execute_cleared,
    violations,
    chair_pass: chair.pass,
    idc_pass: idcExit?.pass ?? null,
    builder_entry_pass: builderEntry?.pass ?? null,
  };
  appendJsonl(path.join(LIVE_DIR, 'unified-gate.jsonl'), record);

  return {
    pass: execute_cleared || (!isExecute && chair.pass),
    execute_cleared,
    blocker: violations.length ? 'BLOCKED_FOUNDER_PACKET_V2' : null,
    violations,
    chair,
    idc_exit: idcExit,
    builder_entry: builderEntry,
    pre_arc_bundle: preArcBundle,
    mission_id: resolvedMissionId,
    understanding: resolvedUnderstanding,
  };
}

/**
 * Sync mission IDC + builder gate for CLI spawn paths (execute-mission, Point B navigator).
 */
export function evaluateMissionFpV2GateSync(missionFolder) {
  if (!missionFolder || !fs.existsSync(missionFolder)) {
    return {
      pass: false,
      blocker: 'BLOCKED_FOUNDER_PACKET_V2',
      violations: ['MISSION_FOLDER_MISSING'],
      idc_exit: null,
      builder_entry: null,
      pre_arc_bundle: null,
    };
  }

  const missionId = path.basename(missionFolder);
  const idcExit = evaluateIdcExitGate(missionFolder);
  runStudioSimulation(missionFolder);
  const builderEntry = evaluateBuilderEntryGate(missionFolder);
  const violations = [
    ...(idcExit.pass ? [] : idcExit.violations.map((v) => `IDC_EXIT:${v}`)),
    ...(builderEntry.pass ? [] : builderEntry.violations.map((v) => `BUILDER_ENTRY:${v}`)),
  ];

  const preArcBundle = {
    schema: 'pre_arc_live_bundle_v1',
    mission_id: missionId,
    at: new Date().toISOString(),
    idc_exit: idcExit,
    builder_entry: builderEntry,
    source: 'evaluateMissionFpV2GateSync',
  };
  fs.mkdirSync(LIVE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(LIVE_DIR, 'PRE_ARC_LIVE_BUNDLE.json'),
    `${JSON.stringify(preArcBundle, null, 2)}\n`,
  );
  appendJsonl(path.join(LIVE_DIR, 'unified-gate.jsonl'), {
    schema: 'fp_v2_unified_gate_v1',
    at: new Date().toISOString(),
    channel: 'mission_cli',
    mission_id: missionId,
    execute_cleared: violations.length === 0,
    violations,
    idc_pass: idcExit.pass,
    builder_entry_pass: builderEntry.pass,
  });

  return {
    pass: violations.length === 0,
    execute_cleared: violations.length === 0,
    blocker: violations.length ? 'BLOCKED_FOUNDER_PACKET_V2' : null,
    violations,
    idc_exit: idcExit,
    builder_entry: builderEntry,
    pre_arc_bundle: preArcBundle,
    mission_id: missionId,
  };
}

export function formatUnifiedGateBlockSummary(gate = {}) {
  const lines = [
    '⛔ BLOCKED_FOUNDER_PACKET_V2',
    '',
    'Founder Packet V2 end-to-end gate failed. Results are the scoreboard — no bypass.',
  ];
  if (gate.violations?.length) {
    lines.push('', 'Violations:');
    for (const v of gate.violations) lines.push(`• ${v}`);
  }
  if (gate.idc_exit && !gate.idc_exit.pass) {
    lines.push('', `IDC status: ${gate.idc_exit.status}`);
  }
  if (gate.builder_entry && !gate.builder_entry.pass) {
    lines.push('', `Builder entry: ${gate.builder_entry.status}`);
  }
  lines.push('', 'Fix blockers or clarify intent via Lumin Chair — then retry.');
  return lines.join('\n');
}

/**
 * Gate wrapper for direct builder / terminal paths (no full Chair turn context).
 */
export async function enforceBeforeBuilderDispatch({
  task = '',
  missionId = null,
  pool = null,
  callAI = null,
  confirmIntent = false,
  platformGapFill = false,
  platformGapFillReason = '',
  intakeSessionClearance = null,
} = {}) {
  if (intakeSessionClearance?.ok && intakeSessionClearance?.verified_ready) {
    return {
      pass: true,
      execute_cleared: true,
      violations: [],
      intake_session_clearance: intakeSessionClearance,
      channel: 'builder_api',
    };
  }
  const gapOk = platformGapFill && String(platformGapFillReason || '').trim().length >= 40;
  const pointB = loadPointBTarget();
  const programMissionId = missionId
    || extractMissionIdFromText(String(task || ''))
    || pointB?.mission_id
    || pointB?.target?.mission_id
    || null;
  return enforceFounderPacketV2Unified({
    cleanedInput: task,
    missionId: programMissionId,
    pool,
    callAI,
    confirmIntent: confirmIntent || gapOk || isDirectExecuteOrder(task),
    channel: 'builder_api',
    platformGapFill: gapOk,
    pointBTarget: pointB,
  });
}
