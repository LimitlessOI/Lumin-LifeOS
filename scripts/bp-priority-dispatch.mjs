#!/usr/bin/env node
/**
 * SYNOPSIS: Continuous BP dispatcher that executes handoff-ready blueprints directly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleepMs = Number(process.argv.find((a) => a.startsWith('--sleep-ms='))?.split('=')[1] || 60_000);
const pointBPath = path.join(ROOT, 'builderos-reboot', 'POINT_B_TARGET.json');

function sleep(ms) { spawnSync('sleep', [String(Math.max(1, Math.ceil(ms / 1000)))], { cwd: ROOT }); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function currentMissionId() { return readJson(pointBPath)?.mission_id || null; }
function blueprintFor(missionId) { return readJson(path.join(ROOT, 'builderos-reboot', 'MISSIONS', missionId, 'BLUEPRINT.json')); }
function isHandoff(bp) { const status = String(bp?.blueprint_status || bp?.status || '').toLowerCase(); const authority = String(bp?.authority || '').toUpperCase(); return status === 'handoff_ready' && ['BPB', 'ARCHITECT'].includes(authority) && Array.isArray(bp?.steps) && bp.steps.length > 0 && bp.steps.every((s) => s.action_type === 'author_then_write'); }
function stepSatisfied(step) { const target = path.join(ROOT, String(step.target_file || '')); if (!fs.existsSync(target)) return false; const content = fs.readFileSync(target, 'utf8'); return (step.assertion_spec?.file_contains || []).every((needle) => content.includes(String(needle))); }
function run(cmd, args = []) { return spawnSync(cmd, args, { cwd: ROOT, env: process.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }

console.log(JSON.stringify({ event: 'bp_dispatch_started', at: new Date().toISOString() }));
while (true) {
  const missionId = currentMissionId();
  const bp = missionId ? blueprintFor(missionId) : null;

  if (missionId && isHandoff(bp)) {
    const incomplete = bp.steps.filter((step) => !stepSatisfied(step));
    if (incomplete.length) {
      const r = run(process.execPath, [path.join(ROOT, 'scripts', 'execute-handoff-blueprint.mjs'), missionId]);
      console.log(JSON.stringify({ event: 'handoff_factory_cycle', mission_id: missionId, exit_code: r.status, stdout_tail: String(r.stdout || '').slice(-1200), stderr_tail: String(r.stderr || '').slice(-1200), remaining_before_run: incomplete.map((s) => s.step_id) }));
      sleep(sleepMs);
      continue;
    }

    const acceptance = String(bp.acceptance_command || '').trim();
    if (acceptance) {
      const r = spawnSync(acceptance, { cwd: ROOT, env: process.env, shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      console.log(JSON.stringify({ event: 'handoff_acceptance_probe', mission_id: missionId, exit_code: r.status, stdout_tail: String(r.stdout || '').slice(-1200), stderr_tail: String(r.stderr || '').slice(-1200) }));
    } else {
      console.log(JSON.stringify({ event: 'handoff_blueprint_exhausted', mission_id: missionId, status: 'BLUEPRINT_EXHAUSTED', note: 'All authored targets satisfied but no acceptance command exists.' }));
    }
    sleep(sleepMs);
    continue;
  }

  const legacy = run(process.execPath, [path.join(ROOT, 'scripts', 'bp-priority-never-stop.mjs'), '--once']);
  console.log(JSON.stringify({ event: 'legacy_bp_cycle', mission_id: missionId, exit_code: legacy.status, stdout_tail: String(legacy.stdout || '').slice(-1200), stderr_tail: String(legacy.stderr || '').slice(-1200) }));
  sleep(sleepMs);
}
