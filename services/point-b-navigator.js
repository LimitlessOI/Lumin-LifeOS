/**
 * SYNOPSIS: Point B navigator — reads POINT_B_TARGET.json and returns next gate action.
 * SYNOPSIS: Point B navigator — subroutine of Lumin Chair (orchestrated via lumin-chair-orchestrator.js).
 * WIRED: Lumin Chair point_b channel + GET point-b/status + lifeos-app strip
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadPointBTarget } from './point-b-target-lite.js';
import { loadFactoryArcModules } from './factory-arc-loader.js';
import { runFoundationPipelineForFounder } from './lifeos-mission-pipeline-executor.js';
import { researchObstacleBlocker } from './obstacle-web-research.js';
import { evaluateMissionFpV2GateSync } from './founder-packet-v2-unified-gate.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXECUTE_MISSION = path.join(REPO_ROOT, 'builderos-reboot/scripts/execute-mission.mjs');

function loadJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return fallback;
  }
}

function missionFolder(missionId, target) {
  const rel = target?.mission_folder || `builderos-reboot/MISSIONS/${missionId}`;
  return path.join(REPO_ROOT, rel);
}

function lastObstacle(folder) {
  const ledger = loadJson(path.join(folder, 'receipts/OBSTACLE_LESSON_LEDGER.json'), { obstacles: [] });
  const obstacles = ledger.obstacles || [];
  return obstacles.length ? obstacles[obstacles.length - 1] : null;
}

function estimateProgress({ gate, hasBlueprint, builderEntryPass, builderRunPass, acceptanceOk }) {
  if (gate.alpha_reached) return 100;
  if (gate.machine_path_complete) return 90;
  if (builderRunPass) return 75;
  if (hasBlueprint && builderEntryPass) return 55;
  if (gate.corridor?.pass) return 40;
  if (gate.handoff?.pass) return 25;
  return 10;
}

export function shouldRouteToPointBNavigator(text = '', {
  shouldDisplayOnly = false,
  isBuild = false,
  explicitExecute = false,
  isMissionIntent = false,
} = {}) {
  if (shouldDisplayOnly || isBuild || explicitExecute || isMissionIntent) return false;
  const t = String(text || '');
  if (isPureCounselQuestion(t)) return false;
  return true;
}

export function isPureCounselQuestion(text = '') {
  const t = String(text || '').trim();
  if (!/\?\s*$/.test(t)) return false;
  if (/\b(status|keep going|point b|continue|progress|execute|build|fix|change|lifere|mission)\b/i.test(t)) {
    return false;
  }
  return true;
}

export function isPointBStatusIntent(text = '') {
  return /\b(status|keep going|continue|point b|progress|what('s| is) next|advance|autopilot|never[- ]stop)\b/i.test(String(text || ''));
}

export function isPointBExecuteIntent(text = '') {
  return /\b(keep going|continue building|continue toward|advance|autopilot|never[- ]stop|run execute mission|execute mission|build the next|do the next)\b/i
    .test(String(text || ''));
}

export async function evaluatePointBNavigator({ callAI, includeWebResearch = true, skipAcceptance = false } = {}) {
  let factory;
  try {
    factory = await loadFactoryArcModules();
  } catch (err) {
    const target = loadPointBTarget();
    return {
      ok: false,
      label: target?.label || null,
      mission_id: target?.mission_id || null,
      phase: 'factory_unavailable',
      next_action: 'founder_stop',
      blocker: `factory-staging not available: ${err.message}`,
      progress_pct: 0,
      founder_success_test: target?.founder_success_test || null,
    };
  }

  const {
    evaluatePointBTargetReached,
    evaluatePointBGate,
    evaluateBuilderEntryGate,
    founderStopActive,
    loadMissionJson,
  } = factory;

  const stop = founderStopActive();
  const target = loadPointBTarget();
  if (!target?.mission_id) {
    return {
      ok: false,
      label: null,
      mission_id: null,
      phase: 'misconfigured',
      next_action: 'founder_stop',
      blocker: 'POINT_B_TARGET.json missing mission_id',
      progress_pct: 0,
      founder_success_test: null,
    };
  }

  if (stop.active) {
    return {
      ok: false,
      label: target.label,
      mission_id: target.mission_id,
      phase: 'founder_stop',
      next_action: 'founder_stop',
      blocker: `FOUNDER_STOP active (${stop.path})`,
      progress_pct: 0,
      founder_success_test: target.founder_success_test,
      founder_stop: stop,
    };
  }

  const folder = missionFolder(target.mission_id, target);
  const blueprintPath = path.join(folder, 'BLUEPRINT.json');
  const hasBlueprint = fs.existsSync(blueprintPath);
  const blueprint = hasBlueprint ? loadMissionJson(folder, 'BLUEPRINT.json') : null;
  const gate = evaluatePointBGate(folder, { blueprint: blueprint || {} });
  const builderEntry = evaluateBuilderEntryGate(folder);
  const reached = skipAcceptance
    ? { ok: false, alpha_reached: false, acceptance: { ok: false, skipped: true, reason: 'skip_acceptance_http' } }
    : evaluatePointBTargetReached(folder);
  const obstacle = lastObstacle(folder);
  const builderRun = loadJson(path.join(folder, 'BUILDER_RUN_RECEIPT.json'));
  const builderRunPass = ['PASS', 'TECHNICAL_PASS', 'INFRA_PASS'].includes(String(builderRun?.verdict || ''));

  let next_action = 'run_development';
  let blocker = gate.violations?.[0] || obstacle?.violations?.[0] || null;

  if (reached.alpha_reached || gate.alpha_reached) {
    next_action = 'point_b_reached';
    blocker = null;
  } else if (gate.machine_path_complete) {
    next_action = 'founder_usability_check';
    blocker = 'Machine path complete — founder usability YES/NO required at Alpha';
  } else if (hasBlueprint && builderEntry.pass) {
    next_action = builderRunPass ? 'run_acceptance' : 'run_execute_mission';
  } else if (hasBlueprint && !builderEntry.pass) {
    next_action = 'run_development';
    blocker = builderEntry.violations?.[0] || blocker;
  } else if (gate.corridor?.pass && !hasBlueprint) {
    next_action = 'compile_blueprint';
    blocker = blocker || 'BLUEPRINT.json missing — compile from Point B success test';
  } else if (!gate.corridor?.pass) {
    next_action = 'run_development';
    blocker = gate.handoff?.violations?.[0] || blocker;
  }

  const progress_pct = estimateProgress({
    gate,
    hasBlueprint,
    builderEntryPass: builderEntry.pass,
    builderRunPass,
    acceptanceOk: reached.acceptance?.ok,
  });

  let web_research = null;
  if (includeWebResearch && blocker && next_action !== 'point_b_reached') {
    web_research = await researchObstacleBlocker({
      phase: obstacle?.phase || gate.status,
      violations: gate.violations || obstacle?.violations || [blocker],
      mission_id: target.mission_id,
      kind: obstacle?.kind || 'navigator',
    }, { callAI });
  }

  return {
    ok: next_action === 'point_b_reached',
    label: target.label,
    mission_id: target.mission_id,
    point_b: target.point_b,
    phase: gate.status,
    gate_status: gate.status,
    next_action,
    next_script: nextActionScript(next_action, target.mission_id),
    blocker,
    progress_pct,
    founder_success_test: target.founder_success_test,
    acceptance_command: target.acceptance_command,
    has_blueprint: hasBlueprint,
    builder_entry_pass: builderEntry.pass,
    machine_path_complete: gate.machine_path_complete,
    alpha_reached: gate.alpha_reached,
    last_obstacle: obstacle,
    web_research,
  };
}

function nextActionScript(next_action, missionId) {
  switch (next_action) {
    case 'run_development':
      return `foundation pipeline → ${missionId}`;
    case 'compile_blueprint':
      return `ensure BLUEPRINT.json for ${missionId}`;
    case 'run_execute_mission':
      return `node builderos-reboot/scripts/execute-mission.mjs ${missionId}`;
    case 'run_acceptance':
      return 'npm run lifeos:lifere-os:v1-acceptance';
    case 'founder_usability_check':
      return 'founder opens lifeos-app LifeRE path — usability verdict';
    case 'point_b_reached':
      return null;
    case 'founder_stop':
      return null;
    default:
      return null;
  }
}

export function formatPointBStatusSummary(status) {
  if (!status) return 'Point B status unavailable.';
  const pct = status.progress_pct ?? 0;
  const lines = [
    `Point B: ${status.label || 'LifeRE Alpha'} (${pct}%)`,
    `Mission: ${status.mission_id}`,
    `Phase: ${status.phase}`,
    `Next: ${status.next_action}${status.next_script ? ` — ${status.next_script}` : ''}`,
  ];
  if (status.blocker) lines.push(`Blocker: ${status.blocker}`);
  if (status.web_research?.fix_hints?.length) {
    lines.push(`Research hint: ${status.web_research.fix_hints[0].slice(0, 240)}`);
  }
  if (status.next_action === 'point_b_reached') {
    lines.push('✅ Point B reached — LifeRE Alpha');
  }
  return lines.join('\n');
}

function spawnDetached(command, args, { cwd = REPO_ROOT } = {}) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return { spawned: true, pid: child.pid };
}

export async function runPointBNextAction(status, { asyncSpawn = true, callAI } = {}) {
  const missionId = status?.mission_id;
  if (!missionId || !status?.next_action) {
    return { ok: false, skipped: true, reason: 'no_action' };
  }

  switch (status.next_action) {
    case 'founder_stop':
    case 'point_b_reached':
    case 'founder_usability_check':
      return { ok: true, skipped: true, reason: status.next_action };

    case 'run_development':
    case 'compile_blueprint': {
      if (asyncSpawn) {
        setImmediate(() => {
          runFoundationPipelineForFounder(missionId, { force: true, maxAttempts: 32 }).catch(() => {});
        });
        return { ok: true, async: true, action: status.next_action, execution_path: 'foundation_pipeline_loop' };
      }
      const dev = await runFoundationPipelineForFounder(missionId, { force: true, maxAttempts: 32 });
      return { ok: dev.ok, async: false, action: status.next_action, result: dev };
    }

    case 'run_execute_mission': {
      const target = loadPointBTarget();
      const folder = missionFolder(missionId, target);
      const missionGate = evaluateMissionFpV2GateSync(folder);
      if (!missionGate.pass) {
        return {
          ok: false,
          async: false,
          action: status.next_action,
          reason: 'BLOCKED_FOUNDER_PACKET_V2',
          violations: missionGate.violations,
          idc_exit: missionGate.idc_exit,
          builder_entry: missionGate.builder_entry,
        };
      }
      if (asyncSpawn) {
        spawnDetached(process.execPath, [EXECUTE_MISSION, missionId]);
        return { ok: true, async: true, action: status.next_action, execution_path: 'execute_mission' };
      }
      return { ok: false, async: false, reason: 'sync_execute_not_implemented' };
    }

    case 'run_acceptance': {
      if (asyncSpawn) {
        spawnDetached('npm', ['run', 'lifeos:lifere-os:v1-acceptance'], { cwd: REPO_ROOT });
        return { ok: true, async: true, action: status.next_action, execution_path: 'acceptance' };
      }
      return { ok: false, async: false, reason: 'sync_acceptance_not_implemented' };
    }

    default:
      return { ok: false, skipped: true, reason: 'unknown_action' };
  }
}

export async function handlePointBFounderMessage(text, opts = {}) {
  const status = await evaluatePointBNavigator({ ...opts, skipAcceptance: true });
  const autoRun = opts.autoRun !== false && isPointBExecuteIntent(text);
  const run = autoRun ? await runPointBNextAction(status, opts) : { skipped: true, reason: 'counsel_only' };
  const human_summary = formatPointBStatusSummary(status);
  return {
    ok: status.ok,
    pass_fail: status.ok ? 'PASS' : (run.async ? 'RUNNING' : 'NO_COMMAND_RAN'),
    command_truth: run.async || run.result ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
    action: 'point_b_navigator',
    execution_path: run.execution_path || 'point_b_status',
    point_b: status,
    run,
    human_summary,
    receipt_paths: status.last_obstacle
      ? [`builderos-reboot/MISSIONS/${status.mission_id}/receipts/OBSTACLE_LESSON_LEDGER.json`]
      : [],
  };
}
