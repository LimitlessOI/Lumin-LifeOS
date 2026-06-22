/**
 * SYNOPSIS: Founder chat → foundation pipeline (Point B / mission execute).
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './repo-root.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { loadFactoryArcModules } from './factory-arc-loader.js';

export function extractMissionIdFromText(text = '') {
  const t = String(text);
  const explicit = t.match(/\b(PRODUCT-[A-Z0-9-]+)\b/);
  if (explicit) return explicit[1];
  const missionLine = t.match(/Mission:\s*`?(PRODUCT-[A-Z0-9-]+)`?/i);
  if (missionLine) return missionLine[1];
  return loadPointBTarget()?.mission_id || null;
}

export function isMissionPipelineIntent(text = '') {
  const t = String(text);
  if (/\bPRODUCT-[A-Z0-9-]+-\d+\b/.test(t)) return true;
  if (/Point B|POINT_B_TARGET|LifeRE Alpha|foundation:pipeline|builderos:foundation/i.test(t)) return true;
  if (/FOUNDER SUCCESS TEST/i.test(t) && /Point A|Operating rules|machine path/i.test(t)) return true;
  if (/never[- ]stop|obstacle.*lesson|stopping is failure/i.test(t) && /lifere|alpha|mission/i.test(t)) return true;
  return false;
}

export async function runFoundationPipelineForFounder(missionId, { maxAttempts = 32, force = true, dryRun = false } = {}) {
  const started = Date.now();
  let runFoundationPipelineLoop;
  try {
    ({ runFoundationPipelineLoop } = await loadFactoryArcModules());
  } catch (err) {
    return {
      ok: false,
      point_b_reached: false,
      pass_fail: 'FAIL',
      command_truth: 'NO_COMMAND_RAN',
      receipt_truth: 'FACTORY_STAGING_UNAVAILABLE',
      execution_path: 'foundation_pipeline_loop',
      mission_id: missionId,
      first_blocker: `factory-staging not available: ${err.message}`,
      human_summary: `FAIL: foundation pipeline unavailable — ${err.message}`,
      latency_ms: Date.now() - started,
    };
  }

  const result = runFoundationPipelineLoop(missionId, {
    force,
    dryRun,
    maxAttempts,
    cookingSliceSize: maxAttempts,
  });
  const loop = result.loopReceipt || {};
  const pointB = result.pointB || {};
  const target = loadPointBTarget();
  const missionFolder = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId);
  const receiptPaths = [
    'receipts/FOUNDATION_LOOP_RECEIPT.json',
    'receipts/OBSTACLE_LESSON_LEDGER.json',
    'receipts/FOUNDATION_PIPELINE_REPORT.json',
  ].filter((rel) => fs.existsSync(path.join(missionFolder, rel)));

  const obstacleCount = loop.obstacles?.length || 0;
  const pointBReached = Boolean(result.point_b_reached);

  let human_summary;
  if (pointBReached) {
    human_summary = `Point B reached — ${target?.label || 'LifeRE Alpha'}. Acceptance and founder success test satisfied.`;
  } else {
    human_summary = [
      `COMMAND_RAN: foundation pipeline toward ${target?.label || 'Point B'}.`,
      `Mission ${missionId}: ${loop.total_attempts || 0} attempts, ${obstacleCount} obstacles recorded (lessons + route adjustments).`,
      'Not at Point B yet — this is FAIL until LifeRE Alpha founder success test PASS.',
      pointB.lesson || loop.stoppage?.lesson || 'See OBSTACLE_LESSON_LEDGER.json for fix steps.',
    ].join(' ');
  }

  return {
    ok: pointBReached,
    point_b_reached: pointBReached,
    pass_fail: pointBReached ? 'PASS' : 'FAIL',
    command_truth: 'COMMAND_RAN',
    receipt_truth: pointBReached ? 'POINT_B_REACHED' : 'OBSTACLE_NOT_POINT_B',
    execution_path: 'foundation_pipeline_loop',
    mission_id: missionId,
    command_executed: `npm run builderos:foundation:pipeline -- ${missionId}`,
    exit_code: pointBReached ? 0 : 1,
    total_attempts: loop.total_attempts || 0,
    obstacle_count: obstacleCount,
    first_blocker: pointBReached ? null : (pointB.lesson || 'Not at Point B (LifeRE Alpha)'),
    receipt_paths: receiptPaths.map((r) => `builderos-reboot/MISSIONS/${missionId}/${r}`),
    phases: loop.phases,
    latency_ms: Date.now() - started,
    human_summary,
    loop_receipt: loop,
    point_b: pointB,
  };
}
