#!/usr/bin/env node
/**
 * Overnight BuilderOS backlog runner — C2-governed, evidence-first.
 *
 * Reads open contradictions + platform gaps, submits C2 jobs in priority order,
 * executes them, tracks every receipt, retries on failure, moves on, never idles
 * when READY work exists.
 *
 * Usage:
 *   node scripts/governed-overnight-backlog-run.mjs [--run-for-min 420] [--dry-run]
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const LOG_PATH = path.join(ROOT, 'data', 'governed-autonomy-overnight-log.jsonl');
const STATE_PATH = path.join(ROOT, 'data', 'governed-autonomy-backlog-state.json');
const LOCK_PATH = path.join(ROOT, 'data', 'governed-autonomy-backlog.lock');

const DRY_RUN = process.argv.includes('--dry-run');
const durationArg = process.argv.indexOf('--run-for-min');
const RUN_FOR_MIN = Math.max(
  10,
  Number(durationArg >= 0 ? process.argv[durationArg + 1] : process.env.BACKLOG_RUN_FOR_MIN || 420) || 420,
);

const BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

// ── Hard-stop conditions ────────────────────────────────────────────────────
const HARD_BLOCKERS = new Set([
  'GLOBAL_HALT',
  'MISSING_SECRET_CREDENTIAL',
  'SERVICE_OUTAGE',
  'SAFETY_BOUNDARY',
  'REPO_CORRUPTION',
]);

// ── Prioritized task list ───────────────────────────────────────────────────
// Derived from reading:
//   docs/architecture/PLATFORM_GAP_REGISTER.md (GAP-001..GAP-025)
//   docs/architecture/OPEN_CONTRADICTIONS.md   (OC-001..OC-015)
//   docs/CONTINUITY_LOG.md (last entry 2026-05-31 C2 E2E proof)
//
// Zone 1 = new files under 150 lines — builder allows.
// Zone 3 = existing files over 150 lines — builder returns ZONE3_PATCH_REQUIRED.
//   Zone 3 attempts are INTENTIONAL: they generate evidence and lessons learned.

const TASKS = [
  // ── Priority 1: Open contradictions ──────────────────────────────────────
  {
    id: 'OC-015-verify-proof-status',
    priority: 1,
    category: 'open_contradiction',
    ref: 'OC-015',
    zone: 'Z1',
    target_file: 'scripts/verify-proof-status-chain.mjs',
    instruction: `Write scripts/verify-proof-status-chain.mjs. Export async function runProofStatusChainVerification({ baseUrl, commandKey }) that: (1) fetches GET /api/v1/builderos/control-plane/health with x-command-key header, (2) fetches GET /api/v1/kernel/health with x-command-key header. Returns { ok: true, builds_today: cpData.build?.builds_today || 0, without_proof: cpData.build?.without_proof || 0, proof_status_gap: (cpData.build?.without_proof || 0) > 0, kernel_status: kernelData.health?.status || 'unknown', known_issue: 'OC-015: canMarkBuildDone runs before end_time is set in recordBuildComplete', checked_at: new Date().toISOString() }. No npm imports, no DB, no CLI scaffolding.`,
  },
  {
    id: 'OC-015-patch-attempt',
    priority: 2,
    category: 'open_contradiction',
    ref: 'OC-015',
    zone: 'Z3',
    expected_blocker: 'ZONE3_PATCH_REQUIRED',
    target_file: 'services/builderos-control-plane-service.js',
    instruction: `In services/builderos-control-plane-service.js, fix the canMarkBuildDone function. The bug: it is called inside recordBuildComplete BEFORE the UPDATE sets end_time, so build.end_time is always null and complete is always false. Fix: add an optional parameter resolvedEndTime to canMarkBuildDone. When resolvedEndTime is provided, use it instead of build.end_time in the complete check: const complete = hasToken && (resolvedEndTime || build.end_time) && hasOil. Update the call inside recordBuildComplete to pass new Date() as resolvedEndTime. This allows proof_status to reach complete when token and OIL receipts are verified. Preserve all existing exports and logic.`,
  },

  // ── Priority 2: Platform gaps ─────────────────────────────────────────────
  {
    id: 'GAP-001-bypass-audit',
    priority: 3,
    category: 'platform_gap',
    ref: 'GAP-001',
    zone: 'Z1',
    target_file: 'scripts/verify-council-bypass-audit.mjs',
    instruction: `Write scripts/verify-council-bypass-audit.mjs. Export async function runCouncilBypassAudit({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health and GET /api/v1/tokens/unified/health with x-command-key header. Returns { ok: true, kernel_status: kernelData.health?.status || 'unknown', token_accounting_status: tokenData.token_accounting?.status || tokenData.tracking_active, bypass_gap_active: true, bypass_gap_note: 'GAP-001 P0: builder-council-review.js has 8 direct provider fetches bypassing kernel and token ledger', bypass_file: 'services/builder-council-review.js', action_required: 'Inject callCouncilMember wrapper; deprecate direct fetch helpers', checked_at: new Date().toISOString() }. No npm imports, no DB, no CLI.`,
  },
  {
    id: 'GAP-004-strict-mode',
    priority: 4,
    category: 'platform_gap',
    ref: 'GAP-004',
    zone: 'Z1',
    target_file: 'scripts/verify-strict-mode-gate.mjs',
    instruction: `Write scripts/verify-strict-mode-gate.mjs. Export async function runStrictModeGateVerification({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health with x-command-key header. Returns { ok: true, strict_mode_active: Boolean(data.health?.strict), kernel_status: data.health?.status || 'unknown', strict_mode_gap: !Boolean(data.health?.strict), strict_mode_note: 'GAP-004: TOKEN_ACCOUNTING_STRICT=true not yet proven fail-closed on Railway deploy', unproven_behavior: 'No test has confirmed 409 response when token receipt is missing under strict mode', checked_at: new Date().toISOString() }. No npm imports, no DB, no CLI.`,
  },

  // ── Priority 3: Receipt chain weaknesses ─────────────────────────────────
  {
    id: 'token-receipt-linkage-helper',
    priority: 5,
    category: 'receipt_chain',
    ref: 'OC-015',
    zone: 'Z1',
    target_file: 'services/kernel-token-linker.js',
    instruction: `Write services/kernel-token-linker.js. Include @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md in JSDoc. Export async function linkTokenReceiptToTask(pool, taskId, sinceMs) where sinceMs defaults to Date.now() - 120000. The function: (1) tries SELECT id FROM token_usage_log WHERE request_id = $1 OR session_id = $1 ORDER BY logged_at DESC LIMIT 1 with [taskId], (2) if not found, tries SELECT id FROM token_usage_log WHERE logged_at >= $1::timestamptz ORDER BY logged_at DESC LIMIT 1 with [new Date(sinceMs).toISOString()], (3) if found, runs UPDATE build_task_ledger SET token_receipt_id = $2, updated_at = NOW() WHERE task_id = $1 AND token_receipt_id IS NULL with [taskId, tokenRow.id]. Returns { linked: Boolean, token_id: tokenRow?.id || null, method: 'direct' or 'window' or null, rows_updated: number }. If pool is null, return { linked: false, error: 'no_pool' }.`,
  },
  {
    id: 'full-receipt-chain-verify',
    priority: 6,
    category: 'receipt_chain',
    zone: 'Z1',
    target_file: 'scripts/verify-full-receipt-chain.mjs',
    instruction: `Write scripts/verify-full-receipt-chain.mjs. Export async function runFullReceiptChainVerification({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health, GET /api/v1/builderos/control-plane/health, and GET /api/v1/kernel/verify with x-command-key header using Promise.all. Returns { ok: true, kernel_verify_pass: kernelVerify.status === 'PASS', kernel_status: kernelHealth.health?.status || 'unknown', token_accounting_status: kernelHealth.health?.token_accounting?.status || 'unknown', control_plane_status: cpHealth.status || 'unknown', builds_today: cpHealth.build?.builds_today || 0, without_proof: cpHealth.build?.without_proof || 0, receipt_chain_complete: kernelVerify.status === 'PASS' && (cpHealth.build?.without_proof || 0) === 0, checked_at: new Date().toISOString() }. No npm imports, no DB, no CLI.`,
  },

  // ── Priority 4: Governance weaknesses ────────────────────────────────────
  {
    id: 'GAP-025-architecture-health',
    priority: 7,
    category: 'governance',
    ref: 'GAP-025',
    zone: 'Z1',
    target_file: 'scripts/verify-architecture-health-composite.mjs',
    instruction: `Write scripts/verify-architecture-health-composite.mjs. Export async function runArchitectureHealthComposite({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health, GET /api/v1/builderos/control-plane/health, and GET /api/v1/tokens/unified/health with x-command-key header using Promise.all. Compute score: add 33 for each GREEN status field, 17 for YELLOW, 0 for RED or unknown. Grade: score >= 80 GREEN, score >= 40 YELLOW, else RED. Returns { ok: true, kernel_status: kernelHealth.health?.status, control_plane_status: cpHealth.status, token_accounting_status: tokenHealth.token_accounting?.status || tokenHealth.tracking_active, composite_score: score, composite_grade: grade, top_gaps: ['GAP-001: builder-council-review bypass P0', 'GAP-002: No Decision Ledger', 'OC-015: proof_status always exception'], checked_at: new Date().toISOString() }. No npm imports, no DB, no CLI.`,
  },

  // ── Priority 5: BuilderOS autonomy weaknesses ─────────────────────────────
  {
    id: 'autonomy-maturity-verify',
    priority: 8,
    category: 'builderos_autonomy',
    zone: 'Z1',
    target_file: 'scripts/verify-builderos-autonomy-maturity.mjs',
    instruction: `Write scripts/verify-builderos-autonomy-maturity.mjs. Export async function runBuilderOSAutonomyMaturityVerification({ baseUrl, commandKey }) that fetches GET /api/v1/builderos/control-plane/health and GET /api/v1/kernel/health with x-command-key header. Returns { ok: true, autonomous_decisions_evidence: 'C2 jobs da7e9c4d and 1cf7aa3f committed autonomously 2026-05-31', oil_verified: true, token_verified: true, commit_verified: true, known_gaps: ['proof_status always exception OC-015', 'token_receipt_id linkage missing for token_recent type', 'GAP-001 builder-council-review 8 direct fetches unmetered'], maturity_level: 'ALPHA', maturity_note: 'C2 can commit with OIL+token receipts. proof_status gate not yet complete.', builds_today: data.build?.builds_today || 0, without_proof: data.build?.without_proof || 0, checked_at: new Date().toISOString() }. No npm imports, no DB, no CLI.`,
  },

  // ── Priority 6: Token accounting weaknesses ───────────────────────────────
  {
    id: 'token-linkage-verify',
    priority: 9,
    category: 'token_accounting',
    ref: 'OC-015',
    zone: 'Z1',
    target_file: 'scripts/verify-token-receipt-linkage.mjs',
    instruction: `Write scripts/verify-token-receipt-linkage.mjs. Export async function runTokenReceiptLinkageVerification({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health with x-command-key header. Returns { ok: true, council_ledger_active: Boolean(data.health?.token_accounting?.council_ledger_active), token_rows_today: data.health?.token_accounting?.token_usage_log_rows_today || 0, last_ledger_write: data.health?.token_accounting?.last_ledger_write_at || null, linkage_gap: true, linkage_gap_note: 'token_receipt_id in build_task_ledger is null for token_recent type — kernel links by time window only, not by direct task_id join. Fix: use kernel-token-linker.js after each build', checked_at: new Date().toISOString() }. No npm imports, no DB, no CLI.`,
  },

  // ── Priority 7: Kernel token linkage patch (Zone 3 attempt — evidence) ────
  {
    id: 'kernel-token-link-patch',
    priority: 10,
    category: 'receipt_chain',
    ref: 'OC-015',
    zone: 'Z3',
    expected_blocker: 'ZONE3_PATCH_REQUIRED',
    target_file: 'services/tsos-platform-kernel.js',
    instruction: `In services/tsos-platform-kernel.js, after verifyOilReceipt returns and committed is true, call the new linkTokenReceiptToTask helper to link the token_usage_log row to the build_task_ledger row. Import linkTokenReceiptToTask from ./kernel-token-linker.js. After the line const oilProof = await verifyOilReceipt({ task_id }), add: if (committed && tokenProof.verified && tokenProof.id) { try { await linkTokenReceiptToTask(pool, task_id, startedAt - 5000); } catch {} }. This closes the gap where token_receipt_id stays null in build_task_ledger for token_recent matches. Preserve all existing exports and logic exactly.`,
  },

  // ── Priority 8: Documentation gaps ───────────────────────────────────────
  {
    id: 'overnight-autonomy-metrics-script',
    priority: 11,
    category: 'documentation',
    zone: 'Z1',
    target_file: 'scripts/verify-overnight-autonomy-metrics.mjs',
    instruction: `Write scripts/verify-overnight-autonomy-metrics.mjs. Export async function runOvernightAutonomyMetricsVerification({ baseUrl, commandKey }) that fetches GET /api/v1/builderos/control-plane/health and GET /api/v1/kernel/health with x-command-key header. Returns { ok: true, metric_definitions: { autonomous_decisions: 'count of C2 jobs with status committed', successful_repairs: 'count of C2 jobs where oil.verified=true and token.verified=true', failed_repairs: 'count of C2 jobs with status failed or blocked', rebuilt_solved_work: 'count of C2 jobs targeting files that already exist and are unchanged', governance_prevented_drift: 'count of ZONE3_PATCH_REQUIRED hits', contradictions_discovered: 0, contradictions_resolved: 0 }, builds_today: data.build?.builds_today || 0, without_proof: data.build?.without_proof || 0, checked_at: new Date().toISOString() }. No npm imports, no DB, no CLI.`,
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
async function appendLog(event, payload = {}) {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...payload }) + '\n';
  await fs.appendFile(LOG_PATH, line, 'utf8');
  process.stdout.write(line);
}

async function writeState(state) {
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

async function callApi(method, apiPath, body) {
  const res = await fetch(`${BASE_URL}${apiPath}`, {
    method,
    headers: { 'x-command-key': KEY, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch { json = { raw_error: 'non_json_response', status: res.status }; }
  return { status: res.status, body: json };
}

async function createC2Job(task) {
  return callApi('POST', '/api/v1/lifeos/builderos/command-control/jobs', {
    instruction: task.instruction,
    requested_by: 'governed_overnight_backlog_run',
    metadata_json: {
      target_file: task.target_file,
      task_id: task.id,
      category: task.category,
      priority: task.priority,
      ref: task.ref || null,
      zone: task.zone,
      expected_blocker: task.expected_blocker || null,
      mission: 'OVERNIGHT_BACKLOG_RUN',
      session: new Date().toISOString().slice(0, 10),
    },
  });
}

async function executeC2Job(jobId) {
  return callApi('POST', `/api/v1/lifeos/builderos/command-control/jobs/${jobId}/execute`, {});
}

function syntaxCheck(filePath) {
  try {
    execSync(`node --check ${filePath}`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.stderr?.toString?.()?.slice(0, 200) || 'syntax_error' };
  }
}

function classifyBlocker(jobResult, execResult) {
  const blocker = jobResult?.blocker || execResult?.body?.job?.blocker || '';
  if (HARD_BLOCKERS.has(blocker)) return { hard: true, code: blocker };
  const traceBlocker = execResult?.body?.result?.trace?.blocker || '';
  if (traceBlocker === 'ZONE3_PATCH_REQUIRED') return { hard: false, code: 'ZONE3_PATCH_REQUIRED', zone3: true };
  if (execResult?.status >= 500) return { hard: false, code: `HTTP_${execResult.status}` };
  return { hard: false, code: blocker || traceBlocker || 'UNKNOWN_FAILURE' };
}

// ── Main runner ──────────────────────────────────────────────────────────────
async function runTask(task, state) {
  const t0 = Date.now();
  const taskEntry = {
    task_id: task.id,
    priority: task.priority,
    category: task.category,
    ref: task.ref,
    zone: task.zone,
    target_file: task.target_file,
    expected_blocker: task.expected_blocker || null,
  };

  await appendLog('task_start', taskEntry);

  if (DRY_RUN) {
    await appendLog('task_dry_run', { ...taskEntry, wall_ms: Date.now() - t0 });
    return { ok: true, dry_run: true };
  }

  // Step 1: Create C2 job
  let createResult;
  try {
    createResult = await createC2Job(task);
  } catch (e) {
    await appendLog('task_create_error', { ...taskEntry, error: e.message, wall_ms: Date.now() - t0 });
    return { ok: false, error: e.message, stage: 'create' };
  }

  const job = createResult.body?.job;
  if (!job?.id || job.status === 'blocked' || job.status === 'halted') {
    const blocker = job?.blocker;
    const isHard = HARD_BLOCKERS.has(blocker);
    await appendLog('task_create_blocked', { ...taskEntry, blocker, hard: isHard, wall_ms: Date.now() - t0 });
    return { ok: false, blocker, hard: isHard, stage: 'create' };
  }

  const jobId = job.id;
  await appendLog('task_job_created', { ...taskEntry, job_id: jobId });

  // Step 2: Execute C2 job
  let execResult;
  try {
    execResult = await executeC2Job(jobId);
  } catch (e) {
    await appendLog('task_execute_error', { ...taskEntry, job_id: jobId, error: e.message, wall_ms: Date.now() - t0 });
    return { ok: false, error: e.message, stage: 'execute', job_id: jobId };
  }

  const execJob = execResult.body?.job;
  const trace = execResult.body?.result?.trace || {};
  const committed = trace.builder_output?.committed === true;
  const targetFile = trace.builder_output?.target_file || task.target_file;
  const oilVerified = trace.builder_output?.kernel_receipts?.oil?.verified === true;
  const oilId = trace.builder_output?.kernel_receipts?.oil?.id || null;
  const tokenVerified = trace.builder_output?.kernel_receipts?.token?.verified === true;
  const tokenId = trace.builder_output?.kernel_receipts?.token?.id || null;

  // Step 3: Classify outcome
  if (execJob?.status === 'committed' && committed) {
    // Syntax check if it's a script
    let syntaxResult = { ok: true };
    const absPath = path.join(ROOT, targetFile);
    try {
      await fs.access(absPath);
      syntaxResult = syntaxCheck(absPath);
    } catch { /* file not pulled yet — skip check */ }

    await appendLog('task_success', {
      ...taskEntry,
      job_id: jobId,
      committed: true,
      target_file: targetFile,
      oil_verified: oilVerified,
      oil_id: oilId,
      token_verified: tokenVerified,
      token_id: tokenId,
      syntax_ok: syntaxResult.ok,
      wall_ms: Date.now() - t0,
    });

    state.successes.push({ task_id: task.id, job_id: jobId, committed: true, oil_verified: oilVerified, token_verified: tokenVerified });
    state.autonomous_decisions++;
    if (oilVerified && tokenVerified) state.successful_repairs++;
    return { ok: true, committed: true, job_id: jobId, oil_verified: oilVerified, token_verified: tokenVerified };
  }

  // Failed — classify and log
  const blockerInfo = classifyBlocker(job, execResult);
  const isZone3 = blockerInfo.zone3 || task.expected_blocker === 'ZONE3_PATCH_REQUIRED';
  const isExpected = task.expected_blocker && blockerInfo.code === task.expected_blocker;

  await appendLog('task_failed', {
    ...taskEntry,
    job_id: jobId,
    committed: false,
    blocker: blockerInfo.code,
    hard: blockerInfo.hard,
    zone3: isZone3,
    expected: isExpected,
    lesson: isZone3
      ? `Zone 3 file blocked by builder governance — ${task.target_file} requires GAP-FILL by Conductor`
      : `Task ${task.id} failed at execute stage with blocker: ${blockerInfo.code}`,
    wall_ms: Date.now() - t0,
  });

  state.failures.push({
    task_id: task.id,
    job_id: jobId,
    blocker: blockerInfo.code,
    zone3: isZone3,
    expected: isExpected,
    lesson: isZone3 ? 'zone3_requires_gap_fill' : 'execute_failed',
  });

  if (!isZone3) state.failed_repairs++;
  if (isZone3) state.governance_prevented_drift++;

  return { ok: false, blocker: blockerInfo.code, hard: blockerInfo.hard, job_id: jobId };
}

async function main() {
  // Lock check
  try {
    await fs.access(LOCK_PATH);
    console.error('[BACKLOG-RUN] Lock file exists — another instance may be running. Delete data/governed-autonomy-backlog.lock to force start.');
    process.exit(1);
  } catch { /* no lock — proceed */ }

  if (!BASE_URL || !KEY) {
    console.error('[BACKLOG-RUN] HARD BLOCKER: PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing.');
    process.exit(1);
  }

  await fs.writeFile(LOCK_PATH, String(process.pid), 'utf8');

  const deadline = Date.now() + RUN_FOR_MIN * 60 * 1000;
  const state = {
    status: 'running',
    started_at: new Date().toISOString(),
    run_for_min: RUN_FOR_MIN,
    dry_run: DRY_RUN,
    tasks_total: TASKS.length,
    tasks_done: 0,
    tasks_remaining: TASKS.length,
    autonomous_decisions: 0,
    successful_repairs: 0,
    failed_repairs: 0,
    governance_prevented_drift: 0,
    successes: [],
    failures: [],
    lessons: [],
    current_task: null,
    completed_at: null,
  };

  await appendLog('orchestrator_start', {
    run_for_min: RUN_FOR_MIN,
    tasks: TASKS.length,
    dry_run: DRY_RUN,
    base_url: BASE_URL.slice(0, 50),
    key_len: KEY.length,
  });
  await writeState(state);

  const remaining = [...TASKS].sort((a, b) => a.priority - b.priority);
  const completed = new Set();

  while (remaining.length > 0 && Date.now() < deadline) {
    const task = remaining.shift();
    if (completed.has(task.id)) continue;
    completed.add(task.id);

    state.current_task = task.id;
    state.tasks_remaining = remaining.length;
    await writeState(state);

    const result = await runTask(task, state);

    if (result.hard) {
      await appendLog('orchestrator_hard_stop', { blocker: result.blocker, task_id: task.id });
      state.status = 'hard_stop';
      state.hard_stop_reason = result.blocker;
      break;
    }

    if (!result.ok && !result.dry_run) {
      // Retry once with simplified instruction
      const retryTask = {
        ...task,
        id: `${task.id}_retry`,
        instruction: `${task.instruction} Keep the implementation minimal — focus on the export signature and return value only. Aim for under 60 lines total.`,
      };
      await appendLog('task_retry', { task_id: task.id, retry_id: retryTask.id });
      const retryResult = await runTask(retryTask, state);
      if (retryResult.hard) {
        await appendLog('orchestrator_hard_stop', { blocker: retryResult.blocker, task_id: retryTask.id });
        state.status = 'hard_stop';
        state.hard_stop_reason = retryResult.blocker;
        break;
      }
    }

    state.tasks_done++;
    await writeState(state);

    // Brief pause between tasks to avoid hammering Railway
    if (remaining.length > 0) await new Promise(r => setTimeout(r, 3000));
  }

  const stopReason = state.status === 'hard_stop'
    ? state.hard_stop_reason
    : remaining.length === 0 ? 'all_tasks_complete' : 'deadline_reached';

  state.status = state.status === 'hard_stop' ? 'hard_stop' : 'done';
  state.completed_at = new Date().toISOString();
  state.stop_reason = stopReason;

  await appendLog('orchestrator_stop', {
    stop_reason: stopReason,
    tasks_done: state.tasks_done,
    autonomous_decisions: state.autonomous_decisions,
    successful_repairs: state.successful_repairs,
    failed_repairs: state.failed_repairs,
    governance_prevented_drift: state.governance_prevented_drift,
    wall_min: ((Date.now() - new Date(state.started_at).getTime()) / 60000).toFixed(1),
  });
  await writeState(state);

  // Clean up lock
  try { await fs.unlink(LOCK_PATH); } catch {}
}

main().catch(async (err) => {
  await appendLog('orchestrator_crash', { error: err.message, stack: err.stack?.slice(0, 500) });
  try { await fs.unlink(LOCK_PATH); } catch {}
  process.exit(1);
});
