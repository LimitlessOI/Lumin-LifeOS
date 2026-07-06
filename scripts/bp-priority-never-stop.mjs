#!/usr/bin/env node
/**
 * SYNOPSIS: Never-stop BP_PRIORITY runner — retries FAIL until TECHNICAL_PASS or founder_stop.
 * Never-stop BP_PRIORITY runner — retries FAIL until TECHNICAL_PASS or founder_stop.
 * @ssot builderos-reboot/BP_PRIORITY.json
 * @ssot docs/products/AUTHORITY_BOUNDARIES.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  getActiveBuilderMission,
  getFounderGatedMissions,
} from '../services/builder-mission-selection.js';
import { runFoundationPipelineLoop } from '../factory-staging/factory-core/arc/run-foundation.js';
import { founderStopActive } from '../factory-staging/factory-core/arc/gate-enforcement.js';
import { loadPointBTarget } from '../factory-staging/factory-core/arc/foundation/point-b-target.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_PATH = path.join(ROOT, 'builderos-reboot/BP_PRIORITY.json');
const LOG_PATH = path.join(ROOT, 'data/bp-priority-never-stop-log.jsonl');

const once = process.argv.includes('--once');
const sleepMs = Number(process.argv.find((a) => a.startsWith('--sleep-ms='))?.split('=')[1] || 60_000);
const neverStop = process.env.BUILDEROS_NEVER_STOP === '1'
  || process.env.NEVER_STOP_PRODUCTS === '1'
  || process.env.BUILDEROS_AUTOPILOT === '1';

function log(row) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
}

function loadQueue() {
  return JSON.parse(fs.readFileSync(BP_PATH, 'utf8'));
}

function builderMission(items) {
  const pointB = loadPointBTarget();
  return getActiveBuilderMission(items || [], { pointBTarget: pointB });
}

function tryRedeploy() {
  const r = spawnSync('npm', ['run', 'system:railway:redeploy'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 720_000,
    shell: true,
  });
  return { ok: r.status === 0, status: r.status, stderr: String(r.stderr || '').slice(0, 300) };
}

function runPreBuildGate() {
  const r = spawnSync('npm', ['run', 'builderos:pre-build-gate', '--', '--allow-stale'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
  });
  return { ok: r.status === 0, status: r.status, stdout: String(r.stdout || '').slice(0, 500) };
}

/**
 * Commit repair artifacts from a foundation loop run to GitHub.
 * The repair loop writes JSON files to the filesystem but they're wiped on Railway restart.
 * This function detects files that differ from git HEAD and commits them via the GitHub API,
 * giving repairs persistence across restarts.
 */
async function commitRepairArtifacts(missionFolder) {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return { skipped: true, reason: 'no_github_credentials' };

  const [owner, repoName] = repo.split('/');
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';

  const CRITICAL_REPAIR_FILES = [
    'ASSET_REUSE_DECISION.json',
    'INTENT_BASELINE.json',
    'BLUEPRINT_ROADMAP.json',
    'INTENT_COVERAGE_MAP.json',
    'MODE_A_TO_B_TRANSITION_RECEIPT.json',
    'PREDICTION_RECEIPT.json',
    'PRE_ARC_INPUT_PACKET.json',
  ];

  const committed = [];
  const skipped = [];

  for (const fileName of CRITICAL_REPAIR_FILES) {
    const fullPath = path.join(missionFolder, fileName);
    if (!fs.existsSync(fullPath)) continue;

    const diskContent = fs.readFileSync(fullPath, 'utf8');
    const gitCheck = spawnSync('git', ['show', `HEAD:${path.relative(ROOT, fullPath).replace(/\\/g, '/')}`], {
      cwd: ROOT, encoding: 'utf8',
    });

    if (gitCheck.status === 0 && gitCheck.stdout === diskContent) {
      skipped.push(fileName);
      continue;
    }

    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    try {
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}?ref=${branch}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });

      let sha;
      if (getRes.status === 200) {
        const existing = await getRes.json();
        sha = existing.sha;
      }

      const body = {
        message: `[system-build] repair-artifact: ${path.basename(missionFolder)}/${fileName}\n\nINTENT DRIFT: none\n\nAuto-committed by repair loop — file was repaired during foundation pipeline\nbut not in git. Persisting to survive Railway restart.`,
        content: Buffer.from(diskContent, 'utf8').toString('base64'),
        branch,
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (putRes.ok) {
        committed.push(relPath);
      } else {
        const err = await putRes.text();
        log({ event: 'repair_commit_error', file: relPath, status: putRes.status, error: err.slice(0, 200) });
      }
    } catch (err) {
      log({ event: 'repair_commit_exception', file: relPath, error: String(err.message || err).slice(0, 200) });
    }
  }

  return { committed, skipped };
}

async function runCycle() {
  const stop = founderStopActive();
  if (stop.active && !neverStop) {
    log({ event: 'founder_stop', path: stop.path });
    return { halt: true, reason: 'founder_stop' };
  }
  if (stop.active && neverStop) {
    log({ event: 'founder_stop_ignored', path: stop.path, mode: 'never_stop' });
  }

  const gate = runPreBuildGate();
  if (!gate.ok) {
    log({ event: 'pre_build_gate_fail', status: gate.status, detail: gate.stdout });
    return { halt: false, reason: 'pre_build_gate_fail' };
  }

  const queue = loadQueue();
  const items = queue.items || [];
  const mission = builderMission(items);
  if (!mission) {
    // No builder-actionable work. Distinguish "truly done" from
    // "only a founder usability verdict is left" so we never loop the
    // builder on a human-gated mission (the attempt-N rebuild waste).
    const founderGated = getFounderGatedMissions(items, { pointBTarget: loadPointBTarget() });
    if (founderGated.length) {
      log({
        event: 'awaiting_founder_confirmation',
        never_stop: neverStop,
        missions: founderGated.map((m) => m.mission_id),
      });
      return { halt: !neverStop, reason: 'awaiting_founder_confirmation' };
    }
    log({ event: 'queue_complete', never_stop: neverStop });
    if (neverStop) {
      return { halt: false, reason: 'queue_complete_expansion' };
    }
    return { halt: true, reason: 'queue_complete' };
  }

  log({ event: 'cycle_start', mission_id: mission.mission_id, rank: mission.rank, verdict: mission.verdict, point_b: loadPointBTarget()?.label });

  const missionFolder = path.join(ROOT, 'builderos-reboot/MISSIONS', mission.mission_id);

  while (true) {
    if (founderStopActive().active && !neverStop) {
      log({ event: 'founder_stop' });
      return { halt: true, reason: 'founder_stop' };
    }

    const last = runFoundationPipelineLoop(mission.mission_id, { force: true, maxAttempts: 64, cookingSliceSize: 32 });
    log({
      event: 'foundation_run',
      mission_id: mission.mission_id,
      ok: last.ok,
      point_b_reached: last.point_b_reached,
      total_attempts: last.loopReceipt?.total_attempts,
      obstacles: last.loopReceipt?.obstacles?.length,
    });

    if (!last.ok && last.loopReceipt?.repairs?.length) {
      const commitResult = await commitRepairArtifacts(missionFolder);
      log({ event: 'repair_artifact_commit', mission_id: mission.mission_id, ...commitResult });
    }

    if (last.ok && last.point_b_reached) {
      return { halt: false, defect: false, mission_id: mission.mission_id, last, point_b: true };
    }

    if (last.founder_stop && !neverStop) {
      return { halt: true, reason: 'founder_stop' };
    }

    spawnSync('sleep', [String(Math.ceil(sleepMs / 1000))], { cwd: ROOT });
  }
}

if (once) {
  (async () => {
    const result = await runCycle();
    if ((result.reason === 'queue_complete_expansion' || result.reason === 'awaiting_founder_confirmation') && neverStop) {
      const { runProductExpansionCycle } = await import('../services/never-stop-product-factory.js');
      const exp = await runProductExpansionCycle({ logger: console });
      process.exit(exp.ok !== false ? 0 : 1);
    }
    process.exit(result.defect ? 1 : 0);
  })();
} else {
  console.log('BP priority never-stop runner — continuous until token exhaustion when NEVER_STOP enabled');
  (async () => {
    while (true) {
      const result = await runCycle();
      if (result.halt && !neverStop) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.defect ? 1 : 0);
      }
      if (result.halt && neverStop) {
        log({ event: 'halt_bypassed', reason: result.reason });
      }
      if (result.defect && !neverStop) {
        console.error(JSON.stringify(result, null, 2));
        process.exit(1);
      }
      if (result.reason === 'queue_complete_expansion' || result.reason === 'awaiting_founder_confirmation') {
        const { runProductExpansionCycle } = await import('../services/never-stop-product-factory.js');
        await runProductExpansionCycle({ logger: console });
      }
      if (result.reason === 'queue_complete_expansion'
        || result.reason === 'awaiting_founder_confirmation'
        || result.reason === 'pre_build_gate_fail') {
        spawnSync('sleep', [String(Math.ceil(sleepMs / 1000))], { cwd: ROOT });
      }
    }
  })();
}
