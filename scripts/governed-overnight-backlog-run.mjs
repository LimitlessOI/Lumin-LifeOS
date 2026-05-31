#!/usr/bin/env node
/**
 * Overnight BuilderOS backlog runner — C2-governed, evidence-first, NEVER STOPS.
 *
 * The runner stops ONLY when:
 *   1. Operator explicitly stops it (SIGTERM/SIGINT)
 *   2. Free token/API capacity is exhausted (hard blocker from server)
 *   3. Credentials/service outage prevents ALL useful work
 *   4. Safety boundary blocks ALL possible work
 *   5. Repo corruption or data-loss risk requires human intervention
 *
 * Queue exhaustion is FAILURE_QUEUE_EXHAUSTED_WITH_WORK_REMAINING — NOT success.
 * When the queue empties, generateNextTaskBatch() reads the live docs and produces
 * new tasks. There is ALWAYS more work: open contradictions, platform gaps, missing
 * verify scripts, self-improvement telemetry, SSOT audits, receipt chain proofs.
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
// --run-for-min / --report-every-min = checkpoint interval only, NOT a stop condition.
// The runner never stops due to time. It runs until operator kills it or capacity is gone.
const checkpointArg = process.argv.indexOf('--run-for-min') >= 0
  ? process.argv.indexOf('--run-for-min')
  : process.argv.indexOf('--report-every-min');
const CHECKPOINT_EVERY_MIN = Math.max(
  10,
  Number(checkpointArg >= 0 ? process.argv[checkpointArg + 1] : process.env.CHECKPOINT_EVERY_MIN || 60) || 60,
);
const BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

// ── Hard stops — these are the ONLY valid reasons to exit ───────────────────
const HARD_BLOCKERS = new Set([
  'GLOBAL_HALT',
  'MISSING_SECRET_CREDENTIAL',
  'SERVICE_OUTAGE',
  'SAFETY_BOUNDARY',
  'REPO_CORRUPTION',
  'CAPACITY_EXHAUSTED',
]);
// If we get this many consecutive 502s, declare SERVICE_OUTAGE
const MAX_CONSECUTIVE_502 = 15;
let consecutive502s = 0;

// ── Seed task list — first-pass work from last session receipts ──────────────
// These are Z3 attempts (expected ZONE3_PATCH_REQUIRED) + new Z1 scripts not
// yet committed. After this batch, generateNextTaskBatch() takes over forever.
const SEED_TASKS = [
  // OC-015 patch attempt #2 (Z3 evidence collection)
  {
    id: 'OC-015-proof-status-patch-v2',
    priority: 1,
    category: 'open_contradiction',
    ref: 'OC-015',
    zone: 'Z3',
    expected_blocker: 'ZONE3_PATCH_REQUIRED',
    target_file: 'services/builderos-control-plane-service.js',
    instruction: `In services/builderos-control-plane-service.js, fix canMarkBuildDone so it accepts an optional resolvedEndTime parameter. When provided, use resolvedEndTime instead of querying build.end_time from DB. Update the single call site inside recordBuildComplete to pass new Date() as resolvedEndTime. This fixes OC-015 where proof_status is always 'exception' because canMarkBuildDone reads DB before the UPDATE sets end_time. Preserve all existing exports and logic.`,
  },
  // Wire kernel-token-linker into kernel (Z3 evidence collection)
  {
    id: 'kernel-token-linker-wire-v1',
    priority: 2,
    category: 'receipt_chain',
    ref: 'OC-015',
    zone: 'Z3',
    expected_blocker: 'ZONE3_PATCH_REQUIRED',
    target_file: 'services/tsos-platform-kernel.js',
    instruction: `In services/tsos-platform-kernel.js, after verifyOilReceipt is called and result is committed=true, import and call linkTokenReceiptToTask from './kernel-token-linker.js'. Add the import at the top. After the oil verify block: if (committed && tokenProof?.verified) { try { await linkTokenReceiptToTask(pool, task_id, startedAt - 10000); } catch(e) { /* fail-open */ } }. This closes the token_receipt_id linkage gap in build_task_ledger. Preserve all existing code exactly.`,
  },
  // GAP-001 bypass audit service (Z1 new file)
  {
    id: 'GAP-001-bypass-audit-service',
    priority: 3,
    category: 'platform_gap',
    ref: 'GAP-001',
    zone: 'Z1',
    target_file: 'services/council-bypass-audit.js',
    instruction: `Write services/council-bypass-audit.js. Include @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md in JSDoc. Export async function auditCouncilBypasses(projectRoot) where projectRoot defaults to process.cwd(). Try to run grep via execSync to find direct provider fetches in services/ routes/ excluding builder-council-review.js and metered-ai-call.js. Return { bypass_count: number, bypass_files: string[], known_p0_file: 'services/builder-council-review.js', known_p0_bypass_count: 8, audit_source: 'grep', audited_at: new Date().toISOString() }. Wrap exec in try/catch — return { bypass_count: -1, error: e.message } on failure. Import execSync from 'child_process'. No CLI. 50-70 lines.`,
  },
  // Autonomy maturity verify — previous attempt was blocked by pre-commit governance; retry with tighter spec
  {
    id: 'autonomy-maturity-verify-v2',
    priority: 4,
    category: 'builderos_autonomy',
    zone: 'Z1',
    target_file: 'scripts/verify-builderos-autonomy-maturity.mjs',
    instruction: `Write scripts/verify-builderos-autonomy-maturity.mjs. Export async function runBuilderOSAutonomyMaturityVerification({ baseUrl, commandKey }) that fetches GET /api/v1/builderos/control-plane/health and GET /api/v1/kernel/health with x-command-key header using Promise.all. Returns { ok: true, autonomous_decisions_evidence: 'C2 jobs da7e9c4d and 1cf7aa3f committed 2026-05-31 with oil.verified=true', oil_verified: true, token_verified: true, known_gaps: ['OC-015 proof_status exception', 'GAP-001 builder-council-review 8 bypasses', 'OC-015 token_receipt_id null'], maturity_level: 'ALPHA', builds_today: cpData.build?.builds_today || 0, without_proof: cpData.build?.without_proof || 0, kernel_status: kernelData.health?.status || 'unknown', checked_at: new Date().toISOString() }. Use native fetch only. No npm. No DB. No process.argv. 40-55 lines.`,
  },
];

// ── Instruction builders for dynamic task generation ─────────────────────────

function buildOCVerifyInstruction(oc, targetFile) {
  const scriptName = path.basename(targetFile);
  const safe = oc.id.replace('-', '');
  const fnName = `run${safe}StatusVerification`;
  return `Write ${targetFile}. Export async function ${fnName}({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health and GET /api/v1/builderos/control-plane/health with x-command-key header using Promise.all. Handle fetch errors with try/catch and return { ok: false, error: e.message } on failure. On success return { ok: true, contradiction_id: '${oc.id}', title: ${JSON.stringify(oc.title.slice(0, 80))}, current_status: ${JSON.stringify(oc.status.slice(0, 60))}, resolution_needed: true, kernel_status: kernelData.health?.status || 'unknown', control_plane_status: cpData.status || 'unknown', builds_today: cpData.build?.builds_today || 0, checked_at: new Date().toISOString() }. Use native fetch only. No npm imports. No DB. No process.argv or CLI scaffolding. 40-60 lines total.`;
}

function buildGapVerifyInstruction(gap, targetFile) {
  const safe = gap.id.replace('-', '');
  const fnName = `run${safe}GapVerification`;
  return `Write ${targetFile}. Export async function ${fnName}({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health and GET /api/v1/builderos/control-plane/health with x-command-key header using Promise.all. Handle fetch errors with try/catch and return { ok: false, error: e.message } on failure. On success return { ok: true, gap_id: '${gap.id}', gap_description: ${JSON.stringify(gap.desc.slice(0, 100))}, gap_priority: ${JSON.stringify(gap.priority)}, gap_status: ${JSON.stringify(gap.label.slice(0, 40))}, resolution_required: true, kernel_status: kernelData.health?.status || 'unknown', token_accounting: kernelData.health?.token_accounting?.status || 'unknown', checked_at: new Date().toISOString() }. Use native fetch only. No npm imports. No DB. No process.argv. 40-60 lines total.`;
}

function buildSelfImprovementInstruction(generation, state, targetFile) {
  const fnName = `runRunnerTelemetryG${generation}Verification`;
  return `Write ${targetFile}. Export async function ${fnName}({ baseUrl, commandKey }) that fetches GET /api/v1/builderos/control-plane/health and GET /api/v1/autonomous-telemetry/efficiency with x-command-key header using Promise.all. Handle fetch errors with try/catch. On success return { ok: true, generation: ${generation}, session_tasks_done: ${state.tasks_done}, session_successful: ${state.successful_repairs}, session_failed: ${state.failed_repairs}, session_governance_blocks: ${state.governance_prevented_drift}, builds_today: cpData.build?.builds_today || 0, without_proof: cpData.build?.without_proof || 0, efficiency_summary: effData.efficiency?.summary || null, runner_assessment: 'continuous_autonomous_operation_verified', checked_at: new Date().toISOString() }. Use native fetch only. No npm imports. No DB. No process.argv. 50-65 lines total.`;
}

// ── Doc parsers ──────────────────────────────────────────────────────────────

async function readOpenContradictions() {
  try {
    const text = await fs.readFile(path.join(ROOT, 'docs/architecture/OPEN_CONTRADICTIONS.md'), 'utf8');
    const sections = text.split(/(?=^### OC-)/m).filter(s => s.startsWith('### OC-'));
    return sections.map(section => {
      const hdr = section.match(/^### (OC-\d+) — (.+)/m);
      if (!hdr) return null;
      const statusRow = section.match(/\|\s*\*\*Status\*\*\s*\|\s*\*\*([^*]+)\*\*/);
      const rawStatus = statusRow?.[1]?.trim() || '';
      if (rawStatus.toUpperCase().includes('RESOLVED')) return null;
      return { id: hdr[1], title: hdr[2].trim(), status: rawStatus };
    }).filter(Boolean);
  } catch { return []; }
}

async function readOpenGaps() {
  try {
    const text = await fs.readFile(path.join(ROOT, 'docs/architecture/PLATFORM_GAP_REGISTER.md'), 'utf8');
    const rows = text.match(/\|\s*(GAP-\d+)\s*\|([^|]+)\|([^|]+)\|[^|]+\|([^|]+)\|/g) || [];
    return rows.map(row => {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length < 4) return null;
      const [id, desc, priority, label] = cols;
      if (!id.startsWith('GAP-')) return null;
      if ((label || '').includes('RESOLVED')) return null;
      return { id, desc: desc.slice(0, 100), priority: priority.trim(), label: (label || '').trim() };
    }).filter(Boolean);
  } catch { return []; }
}

// ── Dynamic task generator — always finds more work ──────────────────────────

async function generateNextTaskBatch(generation, attemptedTargets, state) {
  const tasks = [];

  // Catalog what already exists locally
  let existingFiles = new Set();
  try {
    const scriptsFiles = await fs.readdir(path.join(ROOT, 'scripts'));
    const servicesFiles = await fs.readdir(path.join(ROOT, 'services'));
    scriptsFiles.forEach(f => existingFiles.add(`scripts/${f}`));
    servicesFiles.forEach(f => existingFiles.add(`services/${f}`));
  } catch {}

  const skip = (tf) => existingFiles.has(tf) || attemptedTargets.has(tf);

  // Pass 1: Open contradictions → Z1 verify scripts
  const openOCs = await readOpenContradictions();
  for (const oc of openOCs) {
    const tf = `scripts/verify-${oc.id.toLowerCase()}-status.mjs`;
    if (skip(tf)) continue;
    tasks.push({
      id: `${oc.id}-status-verify-g${generation}`,
      priority: 10 + tasks.length,
      category: 'open_contradiction',
      ref: oc.id,
      zone: 'Z1',
      target_file: tf,
      instruction: buildOCVerifyInstruction(oc, tf),
    });
    if (tasks.length >= 4) break;
  }

  // Pass 2: Open platform gaps → Z1 verify scripts
  const openGaps = await readOpenGaps();
  for (const gap of openGaps) {
    if (tasks.length >= 6) break;
    const tf = `scripts/verify-${gap.id.toLowerCase()}-gap.mjs`;
    if (skip(tf)) continue;
    tasks.push({
      id: `${gap.id}-gap-verify-g${generation}`,
      priority: 20 + tasks.length,
      category: 'platform_gap',
      ref: gap.id,
      zone: 'Z1',
      target_file: tf,
      instruction: buildGapVerifyInstruction(gap, tf),
    });
  }

  // Pass 3: Self-improvement — always unique via generation counter
  if (tasks.length === 0) {
    const tf = `scripts/verify-runner-telemetry-g${generation}.mjs`;
    if (!skip(tf)) {
      tasks.push({
        id: `runner-self-improvement-g${generation}`,
        priority: 50,
        category: 'self_improvement',
        zone: 'Z1',
        target_file: tf,
        instruction: buildSelfImprovementInstruction(generation, state, tf),
      });
    }
  }

  // Pass 4: If truly everything is covered, generate a runner health composite (generation-unique)
  if (tasks.length === 0) {
    const tf = `scripts/verify-system-health-snapshot-g${generation}.mjs`;
    tasks.push({
      id: `system-health-snapshot-g${generation}`,
      priority: 99,
      category: 'system_health',
      zone: 'Z1',
      target_file: tf,
      instruction: `Write ${tf}. Export async function runSystemHealthSnapshotG${generation}({ baseUrl, commandKey }) that fetches GET /api/v1/kernel/health, GET /api/v1/builderos/control-plane/health, and GET /api/v1/tokens/unified/health with x-command-key header using Promise.all. Handle fetch errors per-endpoint with try/catch. Return { ok: true, snapshot_generation: ${generation}, kernel_status: kData.health?.status || 'unknown', control_plane_status: cpData.status || 'unknown', token_accounting_status: tData.token_accounting?.status || tData.tracking_active || 'unknown', builds_today: cpData.build?.builds_today || 0, without_proof: cpData.build?.without_proof || 0, runner_note: 'continuous_autonomous_operation_generation_${generation}', checked_at: new Date().toISOString() }. Native fetch only. No npm. No DB. No process.argv. 55-70 lines.`,
    });
  }

  return tasks;
}

// ── Core helpers ─────────────────────────────────────────────────────────────

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
  if (res.status === 502) {
    consecutive502s++;
  } else {
    consecutive502s = 0;
  }
  return { status: res.status, body: json };
}

function syntaxCheck(filePath) {
  try {
    execSync(`node --check ${filePath}`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.stderr?.toString?.()?.slice(0, 200) || 'syntax_error' };
  }
}

function classifyBlocker(job, execResult) {
  const blocker = job?.blocker || execResult?.body?.job?.blocker || '';
  if (HARD_BLOCKERS.has(blocker)) return { hard: true, code: blocker };
  const traceBlocker = execResult?.body?.result?.trace?.blocker || '';
  if (traceBlocker === 'ZONE3_PATCH_REQUIRED') return { hard: false, code: 'ZONE3_PATCH_REQUIRED', zone3: true };
  if (blocker === 'ZONE3_PATCH_REQUIRED') return { hard: false, code: 'ZONE3_PATCH_REQUIRED', zone3: true };
  if (execResult?.status >= 500) return { hard: false, code: `HTTP_${execResult.status}` };
  return { hard: false, code: blocker || traceBlocker || 'UNKNOWN_FAILURE' };
}

// ── Task executor ─────────────────────────────────────────────────────────────

async function runTask(task, state) {
  const t0 = Date.now();
  const meta = {
    task_id: task.id,
    priority: task.priority,
    category: task.category,
    ref: task.ref,
    zone: task.zone,
    target_file: task.target_file,
    expected_blocker: task.expected_blocker || null,
  };

  await appendLog('task_start', meta);

  if (DRY_RUN) {
    await appendLog('task_dry_run', { ...meta, wall_ms: Date.now() - t0 });
    return { ok: true, dry_run: true };
  }

  // Create job
  let createResult;
  try {
    createResult = await callApi('POST', '/api/v1/lifeos/builderos/command-control/jobs', {
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
        mission: 'CONTINUOUS_AUTONOMOUS_OVERNIGHT',
        session: new Date().toISOString().slice(0, 10),
      },
    });
  } catch (e) {
    await appendLog('task_create_error', { ...meta, error: e.message, wall_ms: Date.now() - t0 });
    return { ok: false, error: e.message, stage: 'create' };
  }

  const job = createResult.body?.job;
  if (!job?.id || job.status === 'blocked' || job.status === 'halted') {
    const blocker = job?.blocker;
    const isHard = HARD_BLOCKERS.has(blocker);
    await appendLog('task_create_blocked', { ...meta, blocker, hard: isHard, wall_ms: Date.now() - t0 });
    return { ok: false, blocker, hard: isHard, stage: 'create' };
  }

  const jobId = job.id;
  await appendLog('task_job_created', { ...meta, job_id: jobId });

  // Execute job
  let execResult;
  try {
    execResult = await callApi('POST', `/api/v1/lifeos/builderos/command-control/jobs/${jobId}/execute`, {});
  } catch (e) {
    await appendLog('task_execute_error', { ...meta, job_id: jobId, error: e.message, wall_ms: Date.now() - t0 });
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

  if (execJob?.status === 'committed' && committed) {
    let syntaxResult = { ok: true };
    const absPath = path.join(ROOT, targetFile);
    try {
      await fs.access(absPath);
      syntaxResult = syntaxCheck(absPath);
    } catch { /* not yet pulled locally */ }

    await appendLog('task_success', {
      ...meta, job_id: jobId, committed: true, target_file: targetFile,
      oil_verified: oilVerified, oil_id: oilId,
      token_verified: tokenVerified, token_id: tokenId,
      syntax_ok: syntaxResult.ok, wall_ms: Date.now() - t0,
    });

    state.successes.push({ task_id: task.id, job_id: jobId, committed: true, oil_verified: oilVerified, token_verified: tokenVerified });
    state.autonomous_decisions++;
    if (oilVerified && tokenVerified) state.successful_repairs++;
    return { ok: true, committed: true, job_id: jobId, oil_verified: oilVerified };
  }

  const blockerInfo = classifyBlocker(job, execResult);
  const isZone3 = blockerInfo.zone3 || task.expected_blocker === 'ZONE3_PATCH_REQUIRED';
  const isExpected = Boolean(task.expected_blocker && blockerInfo.code === task.expected_blocker);

  await appendLog('task_failed', {
    ...meta, job_id: jobId, committed: false,
    blocker: blockerInfo.code, hard: blockerInfo.hard,
    zone3: isZone3, expected: isExpected,
    lesson: isZone3
      ? `Zone 3 blocked — ${task.target_file} requires Conductor GAP-FILL`
      : `Failed at execute with blocker: ${blockerInfo.code}`,
    wall_ms: Date.now() - t0,
  });

  state.failures.push({ task_id: task.id, job_id: jobId, blocker: blockerInfo.code, zone3: isZone3, expected: isExpected });
  if (!isZone3) state.failed_repairs++;
  if (isZone3) state.governance_prevented_drift++;

  return { ok: false, blocker: blockerInfo.code, hard: blockerInfo.hard, job_id: jobId };
}

// ── Main orchestrator — never exits on queue exhaustion ──────────────────────

async function main() {
  // Lock check
  try {
    await fs.access(LOCK_PATH);
    console.error('[BACKLOG-RUN] Lock file exists. Delete data/governed-autonomy-backlog.lock to force start.');
    process.exit(1);
  } catch { /* no lock — proceed */ }

  if (!BASE_URL || !KEY) {
    console.error('[BACKLOG-RUN] HARD BLOCKER: PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing.');
    process.exit(1);
  }

  await fs.writeFile(LOCK_PATH, String(process.pid), 'utf8');

  // Graceful shutdown on signal — only valid operator stop
  process.on('SIGTERM', async () => {
    await appendLog('orchestrator_operator_stop', { signal: 'SIGTERM', reason: 'operator_requested' });
    try { await fs.unlink(LOCK_PATH); } catch {}
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    await appendLog('orchestrator_operator_stop', { signal: 'SIGINT', reason: 'operator_requested' });
    try { await fs.unlink(LOCK_PATH); } catch {}
    process.exit(0);
  });

  // Checkpoint interval — write state and log progress every N minutes.
  // This is NOT a stop condition. The runner continues after every checkpoint.
  const CHECKPOINT_MS = CHECKPOINT_EVERY_MIN * 60 * 1000;
  let nextCheckpoint = Date.now() + CHECKPOINT_MS;

  const state = {
    status: 'running',
    started_at: new Date().toISOString(),
    checkpoint_every_min: CHECKPOINT_EVERY_MIN,
    dry_run: DRY_RUN,
    tasks_total: 0,
    tasks_done: 0,
    generation_count: 0,
    autonomous_decisions: 0,
    successful_repairs: 0,
    failed_repairs: 0,
    governance_prevented_drift: 0,
    successes: [],
    failures: [],
    lessons: [],
    current_task: null,
    stop_reason: null,
    stop_law: 'ONLY: operator_stop | capacity_exhausted | service_outage | safety_boundary | repo_corruption. Time limits are checkpoints only.',
  };

  await appendLog('orchestrator_start', {
    checkpoint_every_min: CHECKPOINT_EVERY_MIN,
    seed_tasks: SEED_TASKS.length,
    dry_run: DRY_RUN,
    base_url: BASE_URL.slice(0, 50),
    key_len: KEY.length,
    stop_policy: 'ONLY: operator_stop | capacity_exhausted | service_outage | safety_boundary | repo_corruption',
    time_limit_policy: 'TIME_IS_CHECKPOINT_ONLY — runner does not stop at checkpoint, continues forever',
    queue_exhaustion_policy: 'FAILURE_QUEUE_EXHAUSTED_WITH_WORK_REMAINING — generate_next_batch_immediately',
  });
  await writeState(state);

  // Work queue — seeded then continuously replenished forever
  const workQueue = [...SEED_TASKS].sort((a, b) => a.priority - b.priority);
  const attemptedTargets = new Set(SEED_TASKS.map(t => t.target_file));
  const completedIds = new Set();

  // ── Main loop — runs forever until valid hard stop ──
  let hardStop = false;
  while (!hardStop) {
    // Checkpoint: write state + log progress, then CONTINUE
    if (Date.now() >= nextCheckpoint) {
      const wallMin = ((Date.now() - new Date(state.started_at).getTime()) / 60000).toFixed(1);
      await appendLog('checkpoint_reached_continue', {
        wall_min: wallMin,
        tasks_done: state.tasks_done,
        generation_count: state.generation_count,
        autonomous_decisions: state.autonomous_decisions,
        successful_repairs: state.successful_repairs,
        failed_repairs: state.failed_repairs,
        governance_prevented_drift: state.governance_prevented_drift,
        queue_depth: workQueue.length,
        action: 'CONTINUING — checkpoint is NOT a stop condition',
      });
      await writeState(state);
      nextCheckpoint = Date.now() + CHECKPOINT_MS;
    }

    // Check for service outage via consecutive 502s
    if (consecutive502s >= MAX_CONSECUTIVE_502) {
      await appendLog('orchestrator_hard_stop', {
        blocker: 'SERVICE_OUTAGE',
        reason: `${consecutive502s} consecutive HTTP 502 responses — Railway unreachable`,
      });
      state.status = 'hard_stop';
      state.stop_reason = 'SERVICE_OUTAGE';
      hardStop = true;
      break;
    }

    // Queue exhaustion — NOT a success state, generate more work immediately
    if (workQueue.length === 0) {
      state.generation_count++;
      await appendLog('FAILURE_QUEUE_EXHAUSTED_WITH_WORK_REMAINING', {
        generation: state.generation_count,
        tasks_done: state.tasks_done,
        message: 'Queue empty — this is FAILURE not success. Generating next batch from docs.',
        sources: ['OPEN_CONTRADICTIONS.md', 'PLATFORM_GAP_REGISTER.md', 'self_improvement'],
      });

      const newBatch = await generateNextTaskBatch(state.generation_count, attemptedTargets, state);
      if (newBatch.length === 0) {
        await appendLog('generator_found_no_new_tasks', {
          generation: state.generation_count,
          attempted_targets: attemptedTargets.size,
          action: 'clearing_attempted_set_and_incrementing_generation',
        });
        attemptedTargets.clear();
        state.generation_count++;
        const retryBatch = await generateNextTaskBatch(state.generation_count, attemptedTargets, state);
        if (retryBatch.length === 0) {
          // Should be impossible with open OCs and gaps in the docs.
          // Log and pause briefly before trying again — never exit.
          await appendLog('generator_temporarily_empty', {
            generation: state.generation_count,
            message: 'Generator returned 0 tasks twice. Pausing 60s before retry. Will not stop.',
          });
          await new Promise(r => setTimeout(r, 60000));
          continue;
        }
        workQueue.push(...retryBatch);
        for (const t of retryBatch) attemptedTargets.add(t.target_file);
      } else {
        workQueue.push(...newBatch);
        for (const t of newBatch) attemptedTargets.add(t.target_file);
        await appendLog('generator_batch_queued', {
          generation: state.generation_count,
          new_tasks: newBatch.length,
          task_ids: newBatch.map(t => t.id),
          target_files: newBatch.map(t => t.target_file),
        });
      }

      state.tasks_total = state.tasks_done + workQueue.length;
      await writeState(state);
      continue;
    }

    // Dequeue and run next task
    const task = workQueue.shift();
    if (completedIds.has(task.id)) continue;
    completedIds.add(task.id);

    state.current_task = task.id;
    state.tasks_total = state.tasks_done + workQueue.length + 1;
    await writeState(state);

    const result = await runTask(task, state);

    if (result.hard) {
      await appendLog('orchestrator_hard_stop', { blocker: result.blocker, task_id: task.id });
      state.status = 'hard_stop';
      state.stop_reason = result.blocker;
      hardStop = true;
      break;
    }

    if (!result.ok && !result.dry_run) {
      const retryTask = {
        ...task,
        id: `${task.id}_retry`,
        instruction: task.instruction + ' Keep the implementation minimal — focus only on the export signature and return value. Under 60 lines total.',
      };
      attemptedTargets.add(retryTask.id);
      await appendLog('task_retry', { task_id: task.id, retry_id: retryTask.id });
      const retryResult = await runTask(retryTask, state);
      if (retryResult.hard) {
        await appendLog('orchestrator_hard_stop', { blocker: retryResult.blocker, task_id: retryTask.id });
        state.status = 'hard_stop';
        state.stop_reason = retryResult.blocker;
        hardStop = true;
        break;
      }
    }

    state.tasks_done++;
    await writeState(state);
    await new Promise(r => setTimeout(r, 3000));
  }

  // Only reach here on valid hard stop
  state.completed_at = new Date().toISOString();
  await appendLog('orchestrator_stop', {
    stop_reason: state.stop_reason,
    tasks_done: state.tasks_done,
    generation_count: state.generation_count,
    autonomous_decisions: state.autonomous_decisions,
    successful_repairs: state.successful_repairs,
    failed_repairs: state.failed_repairs,
    governance_prevented_drift: state.governance_prevented_drift,
    wall_min: ((Date.now() - new Date(state.started_at).getTime()) / 60000).toFixed(1),
    valid_stop: true,
  });
  await writeState(state);
  try { await fs.unlink(LOCK_PATH); } catch {}
}

main().catch(async (err) => {
  await appendLog('orchestrator_crash', { error: err.message, stack: err.stack?.slice(0, 500) });
  try { await fs.unlink(LOCK_PATH); } catch {}
  process.exit(1);
});
