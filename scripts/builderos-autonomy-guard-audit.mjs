#!/usr/bin/env node
/**
 * BuilderOS-only autonomy execution audit.
 *
 * Maps the real autonomous/system execution paths to useful-work guard evidence,
 * PB governance, success conditions, and stop conditions.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'data', 'builderos-autonomy-guard-audit.json');

const PATHS = [
  {
    path: 'startup/boot-domains.js',
    component: 'boot_lane_intel',
    useful_objective: 'bounded horizon and red-team lane scans with cooldowns',
    success_condition: 'lane findings written without uncontrolled repeat runs',
    stop_condition: 'LANE_INTEL_ENABLED != 1, missing tables, or missing web/search prerequisites',
    fake_progress_indicators: ['running scheduled scans with no cooldown', 'writing reports without real sources'],
    verifier_requirements: ['lane_intel_runs written', 'lane_intel_findings written'],
    rollback_requirements: ['disable LANE_INTEL_ENABLED', 'no persistent model-side state mutation'],
    allowed_autonomy_scope: 'guarded scheduled lane intel only',
  },
  {
    path: 'startup/boot-domains.js',
    component: 'boot_twin_auto_ingest',
    useful_objective: 'convert new conversation messages into governed event intake',
    success_condition: 'new messages ingested into event stream only when work exists',
    stop_condition: 'missing twin_ingest_control or no unclassified messages',
    fake_progress_indicators: ['running with empty message queues', 're-ingesting already classified messages'],
    verifier_requirements: ['conversation_messages count', 'event stream ingest result'],
    rollback_requirements: ['disable scheduler via startup control', 'no direct file mutation'],
    allowed_autonomy_scope: 'guarded ingest only',
  },
  {
    path: 'startup/boot-domains.js',
    component: 'boot_oil_daily_summary',
    useful_objective: 'write one real daily_oil_summary from security receipts',
    success_condition: 'receipt written from real security_receipts rows',
    stop_condition: 'no DB pool or no receipts',
    fake_progress_indicators: ['empty synthetic summaries', 'summary rows without source receipt evidence'],
    verifier_requirements: ['security_receipts count', 'daily_oil_summary receipt'],
    rollback_requirements: ['disable scheduler', 'no data deletion'],
    allowed_autonomy_scope: 'guarded summary generation only',
  },
  {
    path: 'routes/self-repair-executor-routes.js',
    component: 'self_repair_executor',
    useful_objective: 'bounded PB-authorized stale-proof repair',
    success_condition: 'PF chain returns proof CURRENT and queue clears',
    stop_condition: 'outside PB boundary, more than max attempts, or proof unavailable',
    fake_progress_indicators: ['writing success receipts without CURRENT proof', 'retrying beyond ceiling'],
    verifier_requirements: ['proof_freshness CURRENT', 'repair_queue open_count=0', 'self_repair_audit receipt'],
    rollback_requirements: ['halt executor path', 'do not mutate runtime outside bounded actions'],
    allowed_autonomy_scope: 'PF-001/PF-002/PF-003 only',
  },
  {
    path: 'services/builderos-governed-loop-executor.js',
    component: 'governed_loop_executor',
    useful_objective: 'single-job BuilderOS execution through Sentry → PBB → Builder → verifier',
    success_condition: 'job reaches committed only after verifier pass',
    stop_condition: 'Sentry boundary fail, builder failure, verifier fail, or halt state',
    fake_progress_indicators: ['committed-like state before verifier pass', 'retry without bounded plan'],
    verifier_requirements: ['builder verifier pass', 'status committed only after audit chain'],
    rollback_requirements: ['mark job blocked/failed', 'no silent success'],
    allowed_autonomy_scope: 'single explicitly queued job',
  },
  {
    path: 'scripts/lifeos-builder-continuous-queue.mjs',
    component: 'continuous_queue_runner',
    useful_objective: 'process governed Builder queue tasks continuously',
    success_condition: 'queue advances on real tasks with bounded retry and lock awareness',
    stop_condition: 'write lock, pause threshold, branch requirement, or queue exhausted',
    fake_progress_indicators: ['cycling idle with repeated builder calls', 'queue churn without commits'],
    verifier_requirements: ['queue log entries', 'last-run file', 'build receipts'],
    rollback_requirements: ['pause queue', 'write lock active', 'do not force commit path'],
    allowed_autonomy_scope: 'governed queued Builder tasks only',
  },
  {
    path: 'scripts/governed-overnight-autonomy.mjs',
    component: 'governed_overnight',
    useful_objective: 'overnight governed continuation and deploy-drift handling',
    success_condition: 'healthy idle or useful governed work, no fake continuation',
    stop_condition: 'readiness false, proof stale unresolved, or lock/halt condition',
    fake_progress_indicators: ['overnight loops with no queue work', 'marking activity without receipts'],
    verifier_requirements: ['overnight state/log', 'proof freshness', 'readiness'],
    rollback_requirements: ['stop loop cleanly', 'no hidden writes'],
    allowed_autonomy_scope: 'governed overnight orchestration only',
  },
  {
    path: 'services/autonomy-orchestrator.js',
    component: 'legacy_autonomy_orchestrator',
    useful_objective: 'legacy product-level proposal/build orchestration',
    success_condition: 'not applicable in governed runtime',
    stop_condition: 'AUTONOMY_ORCHESTRATOR_ENABLED != true',
    fake_progress_indicators: ['assuming start() is active', 'counting LEGACY_INACTIVE as autonomy coverage'],
    verifier_requirements: ['legacy marker present', 'not started'],
    rollback_requirements: ['keep inactive unless governance review occurs'],
    allowed_autonomy_scope: 'none in governed BuilderOS runtime',
  },
];

function read(path) {
  try {
    return readFileSync(join(ROOT, path), 'utf8');
  } catch {
    return '';
  }
}

function classify(entry, content) {
  const hasUsefulGuard = content.includes('createUsefulWorkGuard(');
  const contractGoverned = content.includes('builderos-useful-work-contracts');
  const pbGoverned =
    content.includes('SYSTEM_AUTHORIZED_UNDER_PB') ||
    content.includes('auditCommandControlJobBoundary(') ||
    content.includes('runSelfRepairExecutor(');
  const envGuarded =
    content.includes('AUTONOMY_ORCHESTRATOR_ENABLED') ||
    content.includes('LEGACY_SCHEDULER_ENABLED') ||
    content.includes('LANE_INTEL_ENABLED');
  const hasScheduler = content.includes('setInterval(') || content.includes('setTimeout(');

  let status = 'UNKNOWN';
  if (hasUsefulGuard) status = 'GUARDED';
  else if (contractGoverned) status = 'CONTRACT_GOVERNED';
  else if (pbGoverned) status = 'PB_GOVERNED';
  else if (envGuarded) status = 'ENV_GUARDED';
  else if (hasScheduler) status = 'UNGUARDED_SCHEDULED';

  return {
    ...entry,
    status,
    evidence: {
      hasUsefulGuard,
      contractGoverned,
      pbGoverned,
      envGuarded,
      hasScheduler,
    },
  };
}

const results = PATHS.map((entry) => classify(entry, read(entry.path)));
const summary = {
  guarded: results.filter((r) => r.status === 'GUARDED').length,
  contract_governed: results.filter((r) => r.status === 'CONTRACT_GOVERNED').length,
  pb_governed: results.filter((r) => r.status === 'PB_GOVERNED').length,
  env_guarded: results.filter((r) => r.status === 'ENV_GUARDED').length,
  unguarded_scheduled: results.filter((r) => r.status === 'UNGUARDED_SCHEDULED').length,
  unknown: results.filter((r) => r.status === 'UNKNOWN').length,
};

const report = {
  generated_at: new Date().toISOString(),
  scope: 'BuilderOS autonomous execution paths only',
  summary,
  paths: results,
};

writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
process.exit(summary.unguarded_scheduled > 0 ? 1 : 0);
