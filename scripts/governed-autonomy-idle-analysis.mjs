#!/usr/bin/env node
/**
 * SYNOPSIS: Idle-period analysis for governed overnight autonomy — no useless cycles.
 * Idle-period analysis for governed overnight autonomy — no useless cycles.
 * Inspects telemetry gaps, NOT_WIRED, bottlenecks, deploy drift, wasted repairs.
 * Writes honest JSONL only; no fake metrics.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import 'dotenv/config';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });

const ROOT = process.cwd();
const ANALYSIS_LOG = path.join(ROOT, 'data', 'governed-autonomy-idle-analysis.jsonl');

const base = (
  process.env.PUBLIC_BASE_URL ||
  process.env.BUILDER_BASE_URL ||
  'https://robust-magic-production.up.railway.app'
).replace(/\/+$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY;

async function appendAnalysis(event, payload = {}) {
  await fs.mkdir(path.dirname(ANALYSIS_LOG), { recursive: true });
  const line = `${JSON.stringify({ ts: new Date().toISOString(), event, ...payload })}\n`;
  await fs.appendFile(ANALYSIS_LOG, line, 'utf8');
  return line.trim();
}

async function api(method, apiPath, body) {
  const headers = { 'x-command-key': key, 'Content-Type': 'application/json' };
  const res = await fetch(`${base}${apiPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }
  return { status: res.status, body: parsed };
}

function classifyIdleReason(readiness = {}) {
  const blockers = readiness.blockers || [];
  const codes = blockers.map((b) => b.code);
  if (codes.includes('RAILWAY_STALE_DEPLOY')) return 'deploy_stabilization_pending';
  if (readiness.proof_freshness_overall === 'STALE') return 'proof_stale_needs_repair';
  if ((readiness.repair_queue_open ?? 0) > 0) return 'repair_queue_open';
  if (
    readiness.proof_freshness_overall === 'CURRENT' &&
    (readiness.repair_queue_open ?? 0) === 0 &&
    (readiness.system_authorized_actions || []).length === 0
  ) {
    return 'healthy_idle_no_authorized_work';
  }
  return 'unknown_idle';
}

/**
 * Run read-only idle analysis — returns structured report for orchestrator.
 */
export async function runIdleAutonomyAnalysis({ batchNo = 0, triggeredBy = 'idle-analysis' } = {}) {
  if (!key) return { ok: false, reason: 'no_command_key' };

  const t0 = Date.now();
  const [ready, eff, hooks, deploy, builderReady] = await Promise.all([
    api('GET', '/api/v1/lifeos/command-center/supervised-autonomy/readiness'),
    api('GET', '/api/v1/lifeos/autonomous-telemetry/efficiency?since_hours=12'),
    api('GET', '/api/v1/lifeos/command-center/self-repair/prevention/hooks'),
    api('POST', '/api/v1/lifeos/command-center/self-repair/deploy-check', { dry_run: true }),
    api('GET', '/api/v1/lifeos/builder/ready'),
  ]);

  const r = ready.body || {};
  const idleReason = classifyIdleReason(r);
  const deploySha = builderReady.body?.codegen?.deploy_commit_sha || r.deployed_sha;
  const githubSha = r.github_main_sha;
  const deployDrift = Boolean(deploySha && githubSha && deploySha.slice(0, 12) !== githubSha.slice(0, 12));

  const notWired = eff.body?.not_wired || {};
  const byTask = eff.body?.by_task_type || [];

  const wastedTasks = byTask.filter(
    (row) =>
      row.successes === 0 &&
      row.count >= 2 &&
      ['verification.proof_freshness', 'self_repair.executor_dry_run', 'self_repair.dry_run'].includes(
        row.task_type,
      ),
  );

  const duplicateInstrumentation = [];
  if (byTask.some((x) => x.task_type === 'self_repair.executor_dry_run') &&
      byTask.some((x) => x.task_type === 'self_repair.dry_run')) {
    duplicateInstrumentation.push('self_repair.executor_dry_run vs self_repair.dry_run');
  }
  if (byTask.some((x) => x.task_type === 'prevention_hook.deploy_check') &&
      byTask.some((x) => x.task_type === 'prevention_hook.deploy_drift')) {
    duplicateInstrumentation.push('prevention_hook.deploy_check vs prevention_hook.deploy_drift');
  }

  const missingMeasurements = Object.entries(notWired).map(([k, v]) => ({ field: k, note: v }));

  const telemetryGaps = [];
  if (!eff.body?.event_count) telemetryGaps.push('no_telemetry_rows_in_window');
  if (eff.body?.metrics?.average_successful_build_latency_ms == null) {
    telemetryGaps.push('build_latency_ms_not_populated_on_success');
  }
  if (eff.body?.metrics?.pb_violation_attempts_prevented == null) {
    telemetryGaps.push('pb_violation_counter_not_wired');
  }
  if (eff.body?.metrics?.context_growth_rate == null) {
    telemetryGaps.push('context_size_bytes_not_captured');
  }

  const recommendations = [...(eff.body?.recommendations || [])];
  if (deployDrift) {
    recommendations.unshift({
      type: 'deploy_stabilization',
      message: `Railway deploy ${deploySha?.slice(0, 12)} behind github ${githubSha?.slice(0, 12)} — skip session cycles until stable`,
      evidence: 'RAILWAY_STALE_DEPLOY blocker',
    });
  }
  if (wastedTasks.length) {
    recommendations.push({
      type: 'wasted_verification',
      message: `${wastedTasks.length} task type(s) with 0 successes across repeated cycles — likely measurement bug or idle-state false fail`,
      evidence: wastedTasks.map((w) => w.task_type).join(', '),
    });
  }
  if (idleReason === 'healthy_idle_no_authorized_work') {
    recommendations.push({
      type: 'idle_posture',
      message: 'Proof CURRENT, repair queue empty — run analysis-only batches; skip full session until authorized work exists',
      evidence: 'can_continue_under_approved_pb false with empty system_authorized_actions',
    });
  }

  const report = {
    ok: true,
    batch_no: batchNo,
    triggered_by: triggeredBy,
    idle_reason: idleReason,
    wall_ms: Date.now() - t0,
    deploy: {
      railway_sha: deploySha,
      github_sha: githubSha,
      drift: deployDrift,
      deploy_check_action: deploy.body?.action,
    },
    readiness: {
      proof: r.proof_freshness_overall,
      ready: r.ready_for_supervised,
      repair_queue: r.repair_queue_open,
      blockers: (r.blockers || []).map((b) => b.code),
      system_authorized: (r.system_authorized_actions || []).length,
    },
    throughput: {
      event_count: eff.body?.event_count || 0,
      avg_useful_work_score: eff.body?.metrics?.avg_useful_work_score,
      token_estimate_sum: eff.body?.metrics?.total_token_estimate_sum,
      repair_success_pct: eff.body?.metrics?.repair_success_pct,
      avg_cycle_duration_ms: eff.body?.metrics?.avg_cycle_duration_ms,
    },
    bottlenecks: eff.body?.bottlenecks || [],
    wasted_tasks: wastedTasks,
    duplicate_instrumentation: duplicateInstrumentation,
    missing_measurements: missingMeasurements,
    telemetry_gaps: telemetryGaps,
    prevention_hooks: {
      wired: hooks.body?.wired_count || 0,
      candidates: hooks.body?.candidate_count || 0,
    },
    recommendations,
    skip_session_recommended:
      deployDrift ||
      idleReason === 'healthy_idle_no_authorized_work' ||
      idleReason === 'deploy_stabilization_pending',
  };

  await appendAnalysis('idle_analysis', report);
  return report;
}

const isMain = process.argv[1]?.endsWith('governed-autonomy-idle-analysis.mjs');
if (isMain) {
  runIdleAutonomyAnalysis({ triggeredBy: 'cli' })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
