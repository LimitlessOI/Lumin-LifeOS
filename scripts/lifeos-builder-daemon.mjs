#!/usr/bin/env node
/**
 * Self-healing supervised builder daemon — continuous 24/7 autonomous improvement loop (default: no wall-clock stop).
 *
 * Each cycle tightens supervision and advances the autonomous JSON **`/build`** queue; failures back off and retry.
 * Operational language: **autonomous continuous queue** (`npm run lifeos:builder:queue`). Filename `lifeos-builder-overnight.mjs`
 * is a legacy artifact only — behaviour is designed for non-stop supervised building, not “nights only.”
 *
 * On every cycle:
 *   1) supervised probe or full smoke
 *   2) autonomous JSON queue runner (same binary as **`lifeos:builder:queue`**)
 *   3) heartbeat / memory receipts where configured
 *   4) interval sleep and repeat forever (or bounded `--run-for-min` if set)
 *
 * Usage:
 *   npm run lifeos:builder:daemon
 *   npm run lifeos:builder:daemon -- --once
 *   npm run lifeos:builder:daemon -- --interval-min 20 --queue-max 2
 *   npm run lifeos:builder:daemon -- --run-for-min 420   # bounded soak slice (releases lock)
 *   BUILDER_DAEMON_RUN_FOR_MIN=420 npm run lifeos:builder:daemon
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import "dotenv/config";

import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const STATE_PATH = path.join(DATA_DIR, "builder-daemon-state.json");
const LOG_PATH = path.join(DATA_DIR, "builder-daemon-log.jsonl");
const LOCK_PATH = path.join(DATA_DIR, "builder-daemon.lock");
const OVERNIGHT_LAST_RUN_PATH = path.join(DATA_DIR, "builder-overnight-last-run.json");
const MEMORY_BASE = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  ""
).replace(/\/$/, "");
const MEMORY_KEY =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  "";

const ONCE = process.argv.includes("--once");
const argIntervalIdx = process.argv.indexOf("--interval-min");
const argQueueMaxIdx = process.argv.indexOf("--queue-max");
const argOvernightIdx = process.argv.indexOf("--overnight-max"); // legacy CLI alias (--queue-max preferred)
const intervalMin = Number(
  argIntervalIdx >= 0 ? process.argv[argIntervalIdx + 1] : process.env.BUILDER_DAEMON_INTERVAL_MIN || "30",
);
/** Autonomous **`/build`** tasks per daemon cycle; env `BUILDER_QUEUE_MAX` (legacy `OVERNIGHT_MAX`). */
const overnightMax = Number(
  argQueueMaxIdx >= 0
    ? process.argv[argQueueMaxIdx + 1]
    : argOvernightIdx >= 0
      ? process.argv[argOvernightIdx + 1]
      : process.env.BUILDER_QUEUE_MAX || process.env.OVERNIGHT_MAX || "2",
);

const argRunForIdx = process.argv.indexOf("--run-for-min");
const runForMinParsed = Number(
  argRunForIdx >= 0
    ? process.argv[argRunForIdx + 1]
    : process.env.BUILDER_DAEMON_RUN_FOR_MIN || "0",
);
/** Wall-clock session cap — 0 = infinite continuous 24/7 (production default intent). */
const runForMin =
  Number.isFinite(runForMinParsed) && runForMinParsed > 0 ? Math.floor(runForMinParsed) : 0;
const runDeadlineMs = runForMin > 0 ? Date.now() + runForMin * 60 * 1000 : null;
const failSleepMin = Number(process.env.BUILDER_DAEMON_FAIL_SLEEP_MIN || "5");
const overnightPauseThreshold = Math.max(0, Number(process.env.BUILDER_DAEMON_QUEUE_PAUSE_THRESHOLD || "3"));
const overnightPauseMin = Math.max(1, Number(process.env.BUILDER_DAEMON_QUEUE_PAUSE_MIN || "120"));
const superviseModel = process.env.BUILDER_SUPERVISE_MODEL || "gemini_flash";
/** full = doc+JS smoke (/build council); probe = GET /ready + /domains only (default — huge token saver). none = skip autonomous queue step only */
const superviseMode = (process.env.BUILDER_DAEMON_SUPERVISE_MODE || "probe").toLowerCase();
const superviseFullEvery = Math.max(0, Number(process.env.BUILDER_DAEMON_FULL_EVERY || "6"));
const queueLane = process.env.BUILDER_TASK_LANE || "";
/** When true, each supervise leg passes `--consequence-lens` (stdout premortem / unintended-consequences reminder — no extra council spend). */
const consequenceLens = /^1|true|yes$/i.test(
  String(process.env.BUILDER_DAEMON_CONSEQUENCE_LENS || "").trim(),
);

/** Narrated for operators in `docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md` (NSSOT §2.6 + Am.39 Evidence Ladder). */
const TRUTH_BRIDGE = "docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md";

function reliabilityCue(overrides = {}) {
  return {
    bridge: TRUTH_BRIDGE,
    ...overrides,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFailureSignature(phase, reason = "") {
  const text = String(reason || "").replace(/\s+/g, " ").trim();
  const http = text.match(/HTTP\s+(\d{3})/i);
  if (http) return `${phase}:http_${http[1]}`;
  if (/Council call failed/i.test(text)) return `${phase}:council_call_failed`;
  if (/Missing COMMAND/i.test(text)) return `${phase}:missing_command_key`;
  return `${phase}:${text.slice(0, 140) || "unknown"}`;
}

async function ensureDataDir() {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
}

async function readOvernightLastRun() {
  try {
    const raw = await fsPromises.readFile(OVERNIGHT_LAST_RUN_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Small receipt for `overnight_result` JSONL (**stable analytics key**) — denotes autonomous continuous queue phase (`data/builder-overnight-last-run.json`). */
function pickOvernightThroughputReceipt(row) {
  if (!row || typeof row !== "object") return null;
  return {
    idle_slice: Boolean(row.idle_slice),
    build_commits: Number(row.build_commits || 0),
    build_attempts: Number(row.build_attempts || 0),
    build_wall_ms_sum: Number(row.build_wall_ms_sum || 0),
    runner_wall_ms: Number(row.runner_wall_ms || 0),
  };
}

async function appendLog(event, payload = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...payload,
  });
  await fsPromises.appendFile(LOG_PATH, `${line}\n`, "utf8").catch(() => {});
  console.log(line);
}

async function writeState(next) {
  const current = await readState();
  const merged = {
    ...current,
    ...next,
    updatedAt: new Date().toISOString(),
  };
  await fsPromises.writeFile(STATE_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
}

async function readState() {
  try {
    const raw = await fsPromises.readFile(STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      status: "init",
      cyclesTotal: 0,
      cyclesOk: 0,
      cyclesFailed: 0,
      lastError: null,
      lastSuccessAt: null,
      lastFailureAt: null,
    };
  }
}

async function commandStdout(command, args) {
  const { stdout } = await execFileAsync(command, args, {
    cwd: ROOT,
    env: process.env,
    shell: false,
  });
  return stdout || "";
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-command-key": MEMORY_KEY,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function sendCycleMemoryReceipt({
  cycleNo,
  ok,
  phase = "cycle",
  reason = "",
  queuePaused = false,
  pausedUntil = null,
  failureSignature = null,
}) {
  if (!MEMORY_BASE || !MEMORY_KEY) {
    return { skipped: true, reason: "missing_memory_base_or_key" };
  }

  const agentId = "lifeos-builder-daemon";
  const taskType = "builder.daemon.cycle";
  const outcome = ok ? (queuePaused ? "partial" : "correct") : "incorrect";
  const notes = [
    `cycle=${cycleNo}`,
    `phase=${phase}`,
    `ok=${ok}`,
    queuePaused ? `queuePaused=true` : null,
    pausedUntil ? `pausedUntil=${pausedUntil}` : null,
    failureSignature ? `signature=${failureSignature}` : null,
    reason ? `reason=${String(reason).replace(/\s+/g, " ").slice(0, 1200)}` : null,
  ].filter(Boolean).join(" | ").slice(0, 1900);

  const performance = await postJson(`${MEMORY_BASE}/api/v1/memory/agents/performance`, {
    agentId,
    taskType,
    outcome,
    notes,
  });

  let violation = null;
  if (!ok || queuePaused) {
    violation = await postJson(`${MEMORY_BASE}/api/v1/memory/agents/violations`, {
      agentId,
      taskType,
      violationType: queuePaused ? "queue_circuit_breaker_opened" : "daemon_cycle_failed",
      severity: queuePaused ? "high" : "medium",
      details: notes,
      evidenceText: `cycle=${cycleNo} phase=${phase} signature=${failureSignature || "n/a"}`.slice(0, 1900),
      detectedBy: "builder_daemon",
      sourceRoute: "scripts/lifeos-builder-daemon",
      autoAction: "none",
      asked: `run cycle ${cycleNo}`,
      delivered: ok ? "queue paused after repeated failure" : `${phase} failed`,
    });
  }

  return {
    skipped: false,
    performanceStatus: performance.status,
    performanceOk: performance.ok,
    violationStatus: violation?.status || null,
    violationOk: violation?.ok || null,
  };
}

async function runNodeScript(scriptPath, args = []) {
  const startedAt = Date.now();
  try {
    const stdout = await commandStdout(process.execPath, [scriptPath, ...args]);
    return {
      ok: true,
      exitCode: 0,
      elapsedMs: Date.now() - startedAt,
      stdout: stdout.slice(0, 4000),
      stderr: "",
    };
  } catch (error) {
    return {
      ok: false,
      exitCode: typeof error.code === "number" ? error.code : 1,
      elapsedMs: Date.now() - startedAt,
      stdout: (error.stdout || "").toString().slice(0, 4000),
      stderr: (error.stderr || error.message || "").toString().slice(0, 4000),
    };
  }
}

function isProcessAlive(pid) {
  if (pid == null || pid === "") return false;
  const n = typeof pid === "number" ? pid : Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch (err) {
    if (err && err.code === "ESRCH") return false;
    return true;
  }
}

async function acquireLock() {
  await ensureDataDir();
  if (fs.existsSync(LOCK_PATH)) {
    const raw = await fsPromises.readFile(LOCK_PATH, "utf8").catch(() => "");
    let lock = {};
    try {
      lock = raw ? JSON.parse(raw) : {};
    } catch {
      lock = {};
    }
    const existingPid = lock.pid;
    if (existingPid != null && isProcessAlive(existingPid)) {
      throw new Error(`builder daemon already running (pid=${existingPid})`);
    }
    await appendLog("lock_stale_removed", {
      stalePid: existingPid,
      reason: existingPid == null ? "unparseable_or_missing_pid" : "process_not_alive",
    }).catch(() => {});
    await fsPromises.unlink(LOCK_PATH).catch(() => {});
  }
  const lock = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
  };
  await fsPromises.writeFile(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

async function releaseLock() {
  await fsPromises.unlink(LOCK_PATH).catch(() => {});
}

async function deadlineExceeded(cycleNo, sessionThroughput) {
  if (!runDeadlineMs || Date.now() < runDeadlineMs) return false;
  const st = sessionThroughput;
  const wallMin =
    st?.wallStartedMs != null ? Math.round(((Date.now() - st.wallStartedMs) / 60000) * 100) / 100 : null;
  await appendLog("daemon_run_limit_reached", {
    runForMin,
    cycleNo,
    deadlineIso: new Date(runDeadlineMs).toISOString(),
    KNOW_session_wall_clock_min: wallMin,
    KNOW_session_build_commits_total: st?.buildCommitsTotal ?? null,
    KNOW_session_idle_queue_slices: st?.overnightIdleSlices ?? null,
    KNOW_session_overnight_idle_slices_legacy_alias: st?.overnightIdleSlices ?? null,
    KNOW_session_build_wall_ms_total: st?.buildWallMsTotal ?? null,
    THINK_load_factor:
      wallMin != null && st?.buildWallMsTotal != null && wallMin > 0
        ? `approx ${Math.round((st.buildWallMsTotal / (wallMin * 60000)) * 100)}% of wall minutes spent inside /build HTTP waits (not supervise/sleep)`
        : null,
    reliability_cues: reliabilityCue({
      event: "daemon_run_limit_reached",
      KNOW: "operator_bounded_session_wall_clock_elapsed_clean_exit_scheduled",
    }),
  }).catch(() => {});
  return true;
}

async function runCycle(cycleNo, sessionThroughput) {
  const previousState = await readState();
  const shouldForceFull =
    superviseMode === "probe" &&
    (
      cycleNo === 1 ||
      previousState.status === "degraded" ||
      (superviseFullEvery > 0 && cycleNo - Number(previousState.lastFullSuperviseCycle || 0) >= superviseFullEvery)
    );
  const effectiveSuperviseMode =
    superviseMode === "probe" ? (shouldForceFull ? "full" : "probe") : superviseMode;

  await appendLog("cycle_start", {
    cycleNo,
    superviseMode: effectiveSuperviseMode,
    superviseModeConfigured: superviseMode,
    superviseModel,
    superviseFullEvery,
    overnightMax,
    consequenceLens,
    queueLane: queueLane || null,
    reliability_cues: reliabilityCue({
      event: "cycle_start",
      claim_scope_hint:
        effectiveSuperviseMode === "probe"
          ? "KNOW:http_ready_domains_if_supervisor_probe_succeeds;not_product_quality"
          : "know_depth_depends_on_mode_see_BRIDGE",
    }),
  });

  await writeState({
    status: "running",
    currentCycle: cycleNo,
    currentPhase: "supervise",
  });

  const superviseLensArgs = consequenceLens ? ["--consequence-lens"] : [];
  let supervise;
  if (effectiveSuperviseMode === "none") {
    supervise = { ok: true, exitCode: 0, elapsedMs: 0, stderr: "", stdout: "(supervise skipped)" };
  } else if (effectiveSuperviseMode === "full") {
    supervise = await runNodeScript(path.join(ROOT, "scripts", "lifeos-builder-supervisor.mjs"), [
      "--model",
      superviseModel,
      ...superviseLensArgs,
    ]);
  } else {
    supervise = await runNodeScript(path.join(ROOT, "scripts", "lifeos-builder-supervisor.mjs"), [
      "--probe-only",
      ...superviseLensArgs,
    ]);
  }
  await appendLog("supervise_result", {
    cycleNo,
    ok: supervise.ok,
    exitCode: supervise.exitCode,
    elapsedMs: supervise.elapsedMs,
    stderr: supervise.stderr,
    reliability_cues: reliabilityCue({
      event: "supervise_result",
      superviseMode: effectiveSuperviseMode,
      KNOW_if_ok:
        effectiveSuperviseMode === "probe"
          ? "GET_/ready_and_/domains_probe_path_succeeded_this_cycle"
          : "supervisor_script_exit_superviseMode_see_BRIDGE",
      not_KNOW_if_ok: "council_quality_or_deploy_parity_without_further_checks",
    }),
  });

  if (!supervise.ok) {
    return {
      ok: false,
      phase: "supervise",
      reason: supervise.stderr || "supervise failed",
    };
  }

  await writeState({
    status: "running",
    currentCycle: cycleNo,
    currentPhase: "overnight",
    lastSuperviseMode: effectiveSuperviseMode,
    ...(effectiveSuperviseMode === "full" ? { lastFullSuperviseCycle: cycleNo } : {}),
  });

  const pausedUntilMs = previousState.overnightPausedUntil ? Date.parse(previousState.overnightPausedUntil) : NaN;
  const queuePaused = Number.isFinite(pausedUntilMs) && pausedUntilMs > Date.now();
  if (queuePaused) {
    await appendLog("overnight_paused", {
      cycleNo,
      pausedUntil: previousState.overnightPausedUntil,
      pauseReason: previousState.overnightPauseReason || null,
      failureSignature: previousState.lastFailureSignature || null,
      failureStreak: Number(previousState.failureSignatureStreak || 0),
      reliability_cues: reliabilityCue({
        event: "overnight_paused",
        KNOW: "queue_skipped_due_to_circuit_breaker_state",
        not_KNOW: "queue_health_without_retry_after_pause",
      }),
    });
    return {
      ok: true,
      queuePaused: true,
      pausedUntil: previousState.overnightPausedUntil,
      pauseReason: previousState.overnightPauseReason || null,
    };
  }

  const overnight = await runNodeScript(path.join(ROOT, "scripts", "lifeos-builder-overnight.mjs"), [
    "--max",
    String(overnightMax),
  ]);
  const overnightLastRunFull = await readOvernightLastRun();
  const throughputPick = pickOvernightThroughputReceipt(overnightLastRunFull);
  if (sessionThroughput && throughputPick) {
    sessionThroughput.buildCommitsTotal += throughputPick.build_commits;
    sessionThroughput.buildWallMsTotal += throughputPick.build_wall_ms_sum;
    if (throughputPick.idle_slice) {
      sessionThroughput.overnightIdleSlices += 1;
      await appendLog("daemon_bounded_session_idle_slice", {
        cycleNo,
        runForMin,
        overnightMax,
        KNOW: "builder-overnight-last-run.json reports idle_slice (no Railway /build spend this daemon cycle)",
        operator_remedy: [
          "Extend docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_TASKS.json (SSOT backlog)",
          "Or reset data/builder-overnight-cursor.*.json for a deliberate full re-pass",
          "Bounded runs default BUILDER_QUEUE_CURSOR_WRAP=1 (legacy OVERNIGHT_CURSOR_WRAP); export =0 only if recycle is forbidden",
        ],
        reliability_cues: reliabilityCue({ event: "daemon_bounded_session_idle_slice" }),
      }).catch(() => {});
    }
  }
  await appendLog("overnight_result", {
    continuous_model: "24x7_autonomous_queue_phase",
    cycleNo,
    ok: overnight.ok,
    exitCode: overnight.exitCode,
    elapsedMs: overnight.elapsedMs,
    stderr: overnight.stderr,
    overnightThroughput: throughputPick,
    overnightLastRunRelative: "data/builder-overnight-last-run.json",
    reliability_cues: reliabilityCue({
      event: "queue_result",
      KNOW_if_ok: "queue_runner_script_exit_zero_may_include_overnight_idle",
      idle_zero_build_spend: "still_KNOW_runner_exited_clean",
      not_KNOW: "committed_artifact_truth_without_git_or_builder_audit",
    }),
  });

  if (!overnight.ok) {
    return {
      ok: false,
      phase: "overnight",
      reason: overnight.stderr || "overnight failed",
    };
  }

  return { ok: true };
}

async function main() {
  await acquireLock();
  process.on("SIGINT", async () => {
    await appendLog("signal", { type: "SIGINT" });
    await releaseLock();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await appendLog("signal", { type: "SIGTERM" });
    await releaseLock();
    process.exit(0);
  });

  if (
    process.env.OVERNIGHT_USE_CURSOR === undefined &&
    process.env.BUILDER_QUEUE_USE_CURSOR === undefined
  ) {
    process.env.OVERNIGHT_USE_CURSOR = "1";
  }
  // Bounded wall-clock sessions: recycle lane cursor when unspecified — avoids instant-idle slices.
  if (
    runForMin > 0 &&
    process.env.BUILDER_QUEUE_CURSOR_WRAP === undefined &&
    process.env.OVERNIGHT_CURSOR_WRAP === undefined
  ) {
    process.env.BUILDER_QUEUE_CURSOR_WRAP = "1";
  }

  const sessionThroughput =
    runForMin > 0
      ? {
          wallStartedMs: Date.now(),
          buildCommitsTotal: 0,
          overnightIdleSlices: 0,
          buildWallMsTotal: 0,
        }
      : null;

  await appendLog("daemon_start", {
    continuous_model: "supervised_daemon_24x7_autonomous_queue",
    nomenclature_note:
      "Prefer operator language ‘continuous autonomous queue’ — JSONL keys may still contain legacy ‘overnight’ tokens for analytics continuity.",
    mode: "24_7",
    once: ONCE,
    intervalMin,
    failSleepMin,
    queuePauseThreshold: overnightPauseThreshold,
    queuePauseMin: overnightPauseMin,
    queueMaxPerCycle: overnightMax,
    superviseMode,
    superviseFullEvery,
    queueLane: queueLane || null,
    queueUseCursor: process.env.BUILDER_QUEUE_USE_CURSOR ?? process.env.OVERNIGHT_USE_CURSOR,
    OVERNIGHT_USE_CURSOR_legacy: process.env.OVERNIGHT_USE_CURSOR,
    queueCursorWrap: process.env.BUILDER_QUEUE_CURSOR_WRAP ?? process.env.OVERNIGHT_CURSOR_WRAP,
    OVERNIGHT_CURSOR_WRAP_legacy: process.env.OVERNIGHT_CURSOR_WRAP,
    BUILDER_DAEMON_CONSEQUENCE_LENS: consequenceLens,
    runForMin: runForMin || null,
    runDeadlineIso: runDeadlineMs ? new Date(runDeadlineMs).toISOString() : null,
    baseUrl:
      process.env.BUILDER_BASE_URL || process.env.PUBLIC_BASE_URL || process.env.LUMIN_SMOKE_BASE_URL || "http://127.0.0.1:3000",
    reliability_cues: reliabilityCue({
      event: "daemon_start",
      ssot_truth_channel:
        "operator_logs_must_classify_claims_NORTH_STAR§2.6_facts_use_AMENDMENT_39_evidence_ladder_see_BRIDGE",
      memory_posture_from_now:
        "platform_facts_epistemic_facts_via_AM39_chat_memory_AM02_not_interchangeable",
    }),
  });

  let cycleNo = (await readState()).cyclesTotal || 0;

  while (true) {
    cycleNo += 1;
    const startedAt = Date.now();
    const result = await runCycle(cycleNo, sessionThroughput);
    const state = await readState();

    if (result.ok) {
      await writeState({
        status: result.queuePaused ? "queue_paused" : "healthy",
        cyclesTotal: (state.cyclesTotal || 0) + 1,
        cyclesOk: (state.cyclesOk || 0) + 1,
        cyclesQueuePaused: result.queuePaused
          ? Number(state.cyclesQueuePaused || 0) + 1
          : Number(state.cyclesQueuePaused || 0),
        lastSuccessAt: new Date().toISOString(),
        lastError: result.queuePaused ? state.lastError || null : null,
        currentPhase: null,
        ...(result.queuePaused ? {} : {
          lastFailureSignature: null,
          failureSignatureStreak: 0,
          overnightPausedUntil: null,
          overnightPauseReason: null,
          queuePauseTriggeredAt: null,
        }),
      });
      await appendLog("cycle_ok", {
        cycleNo,
        elapsedMs: Date.now() - startedAt,
        queuePaused: Boolean(result.queuePaused),
        pausedUntil: result.queuePaused ? result.pausedUntil : null,
        reliability_cues: reliabilityCue({
          event: "cycle_ok",
          superviseMode,
          token_stewardship:
            superviseMode === "probe"
              ? "KNOW: supervise used HTTP probe only (no council doc/JS smokes this cycle) — conserves builder tokens"
              : "THINK: full supervise burned council smokes — spend only when regression depth worth it; see Am.21 epistemic 9",
          KNOW: "both_supervise_and_queue_scripts_exit_0_this_cycle_verifiable_via_jsonl_and_exit_codes",
          THINK_extended_stability_only_with_history: true,
          not_KNOW_without_more: "production_user_ready_feature_correctness_deploy_drift_audience_alpha",
          evidence_ladder_hint:
            superviseMode === "probe"
              ? "operational_ping_receipt_grade_for_touching_http_not_full_regression"
              : "deepest_run_full_smoke_documents_in_BRIDGE",
        }),
      });
      const memoryReceipt = await sendCycleMemoryReceipt({
        cycleNo,
        ok: true,
        phase: result.queuePaused ? "overnight_paused" : "cycle",
        queuePaused: Boolean(result.queuePaused),
        pausedUntil: result.queuePaused ? result.pausedUntil : null,
        reason: result.queuePaused ? result.pauseReason || "" : "",
      }).catch((error) => ({ skipped: false, error: error.message }));
      await appendLog("cycle_memory_receipt", {
        cycleNo,
        ok: true,
        memoryReceipt,
      });
      if (ONCE) break;
      if (await deadlineExceeded(cycleNo, sessionThroughput)) break;
      await sleep(Math.max(1, intervalMin) * 60 * 1000);
      continue;
    }

    const failureSignature = normalizeFailureSignature(result.phase, result.reason);
    const failureSignatureStreak =
      state.lastFailureSignature === failureSignature
        ? Number(state.failureSignatureStreak || 0) + 1
        : 1;
    const shouldPauseQueue =
      result.phase === "overnight" &&
      overnightPauseThreshold > 0 &&
      failureSignatureStreak >= overnightPauseThreshold;
    const pauseUntil = shouldPauseQueue
      ? new Date(Date.now() + overnightPauseMin * 60 * 1000).toISOString()
      : null;

    await writeState({
      status: shouldPauseQueue ? "queue_paused" : "degraded",
      cyclesTotal: (state.cyclesTotal || 0) + 1,
      cyclesFailed: (state.cyclesFailed || 0) + 1,
      lastFailureAt: new Date().toISOString(),
      lastError: `${result.phase}: ${result.reason}`.slice(0, 2000),
      currentPhase: null,
      lastFailureSignature: failureSignature,
      failureSignatureStreak,
      overnightPausedUntil: pauseUntil,
      overnightPauseReason: shouldPauseQueue ? failureSignature : null,
      queuePauseTriggeredAt: shouldPauseQueue ? new Date().toISOString() : null,
    });
    if (shouldPauseQueue) {
      await appendLog("queue_pause_opened", {
        cycleNo,
        phase: result.phase,
        reason: result.reason,
        failureSignature,
        failureSignatureStreak,
        pausedUntil: pauseUntil,
        reliability_cues: reliabilityCue({
          event: "queue_pause_opened",
          KNOW: "daemon_circuit_breaker_opened_after_repeated_same_failure",
          not_KNOW: "root_cause_resolved_without_operator_or_platform_change",
        }),
      });
    }
    await appendLog("cycle_failed", {
      cycleNo,
      phase: result.phase,
      reason: result.reason,
      failureSignature,
      failureSignatureStreak,
      queuePaused: shouldPauseQueue,
      pausedUntil: pauseUntil,
      elapsedMs: Date.now() - startedAt,
      reliability_cues: reliabilityCue({
        event: "cycle_failed",
        phase_failed: result.phase,
        KNOWN_truth: "at_least_one_step_failed_stderr_or_exitCode_in_prior_lines",
        state_file: "data/builder-daemon-state.json_status_degraded",
        memory_engine_link:
          "optional_future_POST_fact_evidence_exception_event_AMENDMENT_39_must_not_claim_green",
      }),
    });
    const memoryReceipt = await sendCycleMemoryReceipt({
      cycleNo,
      ok: false,
      phase: result.phase,
      reason: result.reason,
      queuePaused: shouldPauseQueue,
      pausedUntil: pauseUntil,
      failureSignature,
    }).catch((error) => ({ skipped: false, error: error.message }));
    await appendLog("cycle_memory_receipt", {
      cycleNo,
      ok: false,
      memoryReceipt,
    });
    if (ONCE) break;
    if (await deadlineExceeded(cycleNo, sessionThroughput)) break;
    await sleep(Math.max(1, failSleepMin) * 60 * 1000);
  }

  await appendLog("daemon_stop");
  await releaseLock();
}

main().catch(async (error) => {
  await appendLog("daemon_crash", { error: error.message });
  await releaseLock();
  process.exit(1);
});
