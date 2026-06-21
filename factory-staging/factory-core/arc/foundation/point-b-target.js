/**
 * Canonical Point B — LifeRE Alpha.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../../builder/run-step.js';
import { resolveMissionFolder, loadMissionJson } from '../mission-paths.js';
import { evaluatePointBGate } from '../point-b-gate.js';

const TARGET_PATH = path.join(REPO_ROOT, 'builderos-reboot/POINT_B_TARGET.json');

export function loadPointBTarget() {
  if (!fs.existsSync(TARGET_PATH)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(TARGET_PATH, 'utf8'));
    return data?.target || null;
  } catch {
    return null;
  }
}

export function resolvePointBMissionId(missionIdOrPath) {
  const target = loadPointBTarget();
  if (!target?.mission_id) return path.basename(resolveMissionFolder(missionIdOrPath) || missionIdOrPath || '');
  return target.mission_id;
}

export function ensurePointBMissionFolder() {
  const target = loadPointBTarget();
  if (!target?.mission_id) return { ok: false, error: 'no_point_b_target' };

  const folder = path.join(REPO_ROOT, target.mission_folder || `builderos-reboot/MISSIONS/${target.mission_id}`);
  fs.mkdirSync(folder, { recursive: true });
  fs.mkdirSync(path.join(folder, 'receipts'), { recursive: true });

  const founderPath = path.join(folder, 'FOUNDER_PACKET.md');
  if (!fs.existsSync(founderPath)) {
    fs.writeFileSync(founderPath, `# ${target.mission_id} — ${target.label}

## Problem
LifeRE OS v1 must reach Alpha — a founder-usable daily command center for real estate agents. Stopping on pipeline gates without reaching Point B is failure.

## Desired Outcome
${target.point_b}

## FOUNDER SUCCESS TEST
${target.founder_success_test}

## Scope
LifeRE light operational copilot: daily command center, top-3 priorities, nightly debrief, compliance guardrails. Extend production spine — no parallel stack.

## Acceptance
${target.acceptance_command}

## Unacceptable
TECHNICAL_PASS without founder usability; pipeline stop on obstacle without lesson + route adjustment.
`);
  }

  return { ok: true, folder, mission_id: target.mission_id };
}

export function runAcceptanceCommand(command) {
  if (!command) return { ok: false, skipped: true, reason: 'no_acceptance_command' };
  const r = spawnSync(command, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: true,
    timeout: 300_000,
  });
  return {
    ok: r.status === 0,
    exit: r.status,
    stdout: String(r.stdout || '').slice(-2000),
    stderr: String(r.stderr || '').slice(-2000),
  };
}

export function evaluatePointBTargetReached(missionFolder) {
  const target = loadPointBTarget();
  const missionId = path.basename(missionFolder);
  if (!target) {
    return { ok: false, point_b_label: null, reason: 'point_b_target_missing' };
  }

  if (missionId !== target.mission_id) {
    return {
      ok: false,
      point_b_label: target.label,
      reason: 'wrong_mission',
      expected_mission_id: target.mission_id,
      actual_mission_id: missionId,
    };
  }

  const blueprint = loadMissionJson(missionFolder, 'BLUEPRINT.json');
  const gate = evaluatePointBGate(missionFolder, { blueprint });
  const acceptance = runAcceptanceCommand(target.acceptance_command);
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const technicalPass = String(objective?.verdict || '').toUpperCase() === 'TECHNICAL_PASS'
    || acceptance.ok;

  const alphaReached = gate.alpha_reached || (
    technicalPass && acceptance.ok
  );

  return {
    ok: alphaReached,
    point_b_label: target.label,
    point_b: target.point_b,
    founder_success_test: target.founder_success_test,
    gate,
    acceptance,
    objective_verdict: objective?.verdict || null,
    alpha_reached: alphaReached,
    lesson: alphaReached
      ? 'Point B reached — LifeRE Alpha'
      : 'Not at Point B yet — obstacle recorded; loop continues',
  };
}
