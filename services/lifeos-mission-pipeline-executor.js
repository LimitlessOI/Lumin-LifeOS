/**
 * SYNOPSIS: Founder chat → foundation pipeline (Point B / mission execute).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
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

export function readMissionObjectiveVerdict(missionId) {
  const p = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId, 'OBJECTIVE_VERDICT.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function isMissionPipelineIntent(text = '') {
  const t = String(text);
  if (/^\s*build\b/i.test(t)) return false;
  if (/\bPRODUCT-[A-Z0-9-]+-\d+\b/.test(t)) return true;
  if (/Point B|POINT_B_TARGET|LifeRE Alpha|foundation:pipeline|builderos:foundation/i.test(t)) return true;
  if (/\b(continue|keep going|advance|move)\b.*\b(point b|lifere alpha|alpha)\b/i.test(t)) return true;
  if (/\bnext required step\b/i.test(t) && /\b(point b|lifere|alpha|mission)\b/i.test(t)) return true;
  if (/\breceipt scan only\b/i.test(t) && /\b(machine path|point b|lifere|alpha)\b/i.test(t)) return true;
  if (/FOUNDER SUCCESS TEST/i.test(t) && /Point A|Operating rules|machine path/i.test(t)) return true;
  if (/never[- ]stop|obstacle.*lesson|stopping is failure/i.test(t) && /lifere|alpha|mission/i.test(t)) return true;
  return false;
}

export const SOCIALMEDIAOS_INTAKE_SESSION = '3e6105c4-f5e9-4037-bb57-5451acc2ea59';

export function extractIntakeSessionId(text = '') {
  const t = String(text || '');
  const uuid = t.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  if (uuid) return uuid[1];
  if (/\b(social\s*media\s*os|socialmediaos|smos|marketingos)\b/i.test(t)) return SOCIALMEDIAOS_INTAKE_SESSION;
  return null;
}

const KNOWN_PRODUCTS = new Map([
  ['tc service', 'tc-service'], ['tc services', 'tc-service'], ['tc-service', 'tc-service'],
  ['socialmediaos', 'marketingos'], ['social media os', 'marketingos'], ['smos', 'marketingos'], ['marketingos', 'marketingos'],
  ['lifeos', 'lifeos'], ['life os', 'lifeos'],
  ['lifere', 'lifere'], ['life re', 'lifere'],
  ['boldtrail', 'boldtrail'], ['bold trail', 'boldtrail'],
  ['site builder', 'site-builder'], ['site-builder', 'site-builder'],
  ['ai council', 'ai-council'], ['ai-council', 'ai-council'],
  ['memory system', 'memory-system'], ['memory-system', 'memory-system'],
  ['financial revenue', 'financial-revenue'], ['financial-revenue', 'financial-revenue'],
  ['command center', 'command-center'], ['command-center', 'command-center'],
  ['builderos', 'builderos'], ['builder os', 'builderos'],
  ['limitlessos', 'limitlessos'], ['limitless os', 'limitlessos'],
  ['video pipeline', 'video-pipeline'], ['video-pipeline', 'video-pipeline'],
  ['project governance', 'project-governance'], ['project-governance', 'project-governance'],
  ['universal overlay', 'universal-overlay'], ['universal-overlay', 'universal-overlay'],
  ['token accounting', 'token-accounting-os'], ['token-accounting-os', 'token-accounting-os'],
]);

export function extractIntakeProductName(text = '') {
  const t = String(text || '').toLowerCase();
  for (const [pattern, productId] of KNOWN_PRODUCTS) {
    if (t.includes(pattern)) return productId;
  }
  return null;
}

export function isIntakeBlueprintIntent(text = '') {
  const t = String(text || '');
  if (extractIntakeSessionId(t) && /\b(intake|blueprint|a to z|a-to-z|mos-p1|execute|run|build)\b/i.test(t)) return true;
  if (/\b(social\s*media\s*os|socialmediaos|smos)\b/i.test(t) && /\b(blueprint|intake|a to z|a-to-z|build|execute)\b/i.test(t)) return true;
  if (extractIntakeProductName(t) && /\b(blueprint|founder.?packet|intake|product.?home|mission.?pack)\b/i.test(t)
    && /\b(create|generate|make|build|produce|write|draft|start|kick.?off)\b/i.test(t)) return true;
  if (extractIntakeProductName(t) && /\b(blueprint)\b/i.test(t)
    && /\b(run|execute|review|check|arc|sentry|status|validate)\b/i.test(t)) return true;
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
  const machinePathPass = Boolean(result.point_b_reached);
  const objectiveVerdict = readMissionObjectiveVerdict(missionId);
  const founderUsabilityPass = objectiveVerdict?.founder_usability_pass === true;
  const founderPointB = machinePathPass && founderUsabilityPass;
  const latencyMs = Date.now() - started;

  let human_summary;
  if (founderPointB) {
    human_summary = `Point B reached — ${target?.label || 'LifeRE Alpha'}. Founder success test satisfied.`;
  } else if (machinePathPass) {
    human_summary = [
      `COMMAND_RAN: foundation pipeline finished in ${latencyMs}ms (in-process, not deploy proof).`,
      `TECHNICAL PASS only — machine path ran; founder_usability_pass is still false.`,
      `Alpha NOT reached. Open LifeRE in lifeos-app, run the daily command cycle, then confirm usability PASS.`,
      objectiveVerdict?.founder_success_test || 'See OBJECTIVE_VERDICT.json founder_success_test.',
    ].join(' ');
  } else {
    human_summary = [
      `COMMAND_RAN: foundation pipeline toward ${target?.label || 'Point B'}.`,
      `Mission ${missionId}: ${loop.total_attempts || 0} attempts, ${obstacleCount} obstacles recorded (lessons + route adjustments).`,
      'Not at Point B yet — FAIL until machine path + founder usability both PASS.',
      pointB.lesson || loop.stoppage?.lesson || 'See OBSTACLE_LESSON_LEDGER.json for fix steps.',
    ].join(' ');
  }

  return {
    ok: founderPointB,
    point_b_reached: founderPointB,
    machine_path_pass: machinePathPass,
    founder_usability_pass: founderUsabilityPass,
    pass_fail: founderPointB ? 'PASS' : 'FAIL',
    command_truth: 'COMMAND_RAN',
    receipt_truth: founderPointB
      ? 'POINT_B_REACHED'
      : machinePathPass
        ? 'TECHNICAL_ONLY_AWAITING_FOUNDER'
        : 'OBSTACLE_NOT_POINT_B',
    execution_path: 'foundation_pipeline_loop',
    mission_id: missionId,
    command_executed: `npm run builderos:foundation:pipeline -- ${missionId}`,
    exit_code: founderPointB ? 0 : 1,
    total_attempts: loop.total_attempts || 0,
    obstacle_count: obstacleCount,
    first_blocker: founderPointB
      ? null
      : machinePathPass
        ? 'founder_usability_pass is false — your LifeRE usability test is still required'
        : (pointB.lesson || 'Not at Point B (LifeRE Alpha)'),
    receipt_paths: receiptPaths.map((r) => `builderos-reboot/MISSIONS/${missionId}/${r}`),
    phases: loop.phases,
    latency_ms: latencyMs,
    human_summary,
    loop_receipt: loop,
    point_b: pointB,
  };
}
