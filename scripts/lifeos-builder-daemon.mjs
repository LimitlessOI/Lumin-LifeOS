#!/usr/bin/env node
/**
 * Self-healing builder daemon.
 *
 * Runs forever by default (24/7 operator runner — not time-of-day “overnight”):
 *   1) supervised probe or full smoke
 *   2) autonomous JSON task queue (script name: lifeos-builder-overnight.mjs)
 *   3) heartbeat/status receipts
 *   4) sleep and repeat
 *
 * Usage:
 *   npm run lifeos:builder:daemon
 *   npm run lifeos:builder:daemon -- --once
 *   npm run lifeos:builder:daemon -- --interval-min 20 --overnight-max 2
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

const ONCE = process.argv.includes("--once");
const argIntervalIdx = process.argv.indexOf("--interval-min");
const argOvernightIdx = process.argv.indexOf("--overnight-max");
const intervalMin = Number(
  argIntervalIdx >= 0 ? process.argv[argIntervalIdx + 1] : process.env.BUILDER_DAEMON_INTERVAL_MIN || "30"
);
/** Tasks per cycle from JSON queue; alias `BUILDER_QUEUE_MAX` preferred for 24/7 docs. */
const overnightMax = Number(
  argOvernightIdx >= 0
    ? process.argv[argOvernightIdx + 1]
    : process.env.BUILDER_QUEUE_MAX || process.env.OVERNIGHT_MAX || "2"
);
const failSleepMin = Number(process.env.BUILDER_DAEMON_FAIL_SLEEP_MIN || "5");
const superviseModel = process.env.BUILDER_SUPERVISE_MODEL || "gemini_flash";
/** full = doc+JS smoke (/build council); probe = GET /ready + /domains only (default — huge token saver). none = skip (only overnight). */
const superviseMode = (process.env.BUILDER_DAEMON_SUPERVISE_MODE || "probe").toLowerCase();
const superviseFullEvery = Math.max(0, Number(process.env.BUILDER_DAEMON_FULL_EVERY || "6"));
const queueLane = process.env.BUILDER_TASK_LANE || "";

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

async function ensureDataDir() {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
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

async function runCycle(cycleNo) {
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

  let supervise;
  if (effectiveSuperviseMode === "none") {
    supervise = { ok: true, exitCode: 0, elapsedMs: 0, stderr: "", stdout: "(supervise skipped)" };
  } else if (effectiveSuperviseMode === "full") {
    supervise = await runNodeScript(path.join(ROOT, "scripts", "lifeos-builder-supervisor.mjs"), [
      "--model",
      superviseModel,
    ]);
  } else {
    supervise = await runNodeScript(path.join(ROOT, "scripts", "lifeos-builder-supervisor.mjs"), ["--probe-only"]);
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

  const overnight = await runNodeScript(path.join(ROOT, "scripts", "lifeos-builder-overnight.mjs"), [
    "--max",
    String(overnightMax),
  ]);
  await appendLog("overnight_result", {
    cycleNo,
    ok: overnight.ok,
    exitCode: overnight.exitCode,
    elapsedMs: overnight.elapsedMs,
    stderr: overnight.stderr,
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

  if (process.env.OVERNIGHT_USE_CURSOR === undefined) process.env.OVERNIGHT_USE_CURSOR = "1";

  await appendLog("daemon_start", {
    mode: "24_7",
    once: ONCE,
    intervalMin,
    failSleepMin,
    queueMaxPerCycle: overnightMax,
    superviseMode,
    superviseFullEvery,
    queueLane: queueLane || null,
    overnightUseCursor: process.env.OVERNIGHT_USE_CURSOR,
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
    const result = await runCycle(cycleNo);
    const state = await readState();

    if (result.ok) {
      await writeState({
        status: "healthy",
        cyclesTotal: (state.cyclesTotal || 0) + 1,
        cyclesOk: (state.cyclesOk || 0) + 1,
        lastSuccessAt: new Date().toISOString(),
        lastError: null,
        currentPhase: null,
      });
      await appendLog("cycle_ok", {
        cycleNo,
        elapsedMs: Date.now() - startedAt,
        reliability_cues: reliabilityCue({
          event: "cycle_ok",
          superviseMode,
          KNOW: "both_supervise_and_queue_scripts_exit_0_this_cycle_verifiable_via_jsonl_and_exit_codes",
          THINK_extended_stability_only_with_history: true,
          not_KNOW_without_more: "production_user_ready_feature_correctness_deploy_drift_audience_alpha",
          evidence_ladder_hint:
            superviseMode === "probe"
              ? "operational_ping_receipt_grade_for_touching_http_not_full_regression"
              : "deepest_run_full_smoke_documents_in_BRIDGE",
        }),
      });
      if (ONCE) break;
      await sleep(Math.max(1, intervalMin) * 60 * 1000);
      continue;
    }

    await writeState({
      status: "degraded",
      cyclesTotal: (state.cyclesTotal || 0) + 1,
      cyclesFailed: (state.cyclesFailed || 0) + 1,
      lastFailureAt: new Date().toISOString(),
      lastError: `${result.phase}: ${result.reason}`.slice(0, 2000),
      currentPhase: null,
    });
    await appendLog("cycle_failed", {
      cycleNo,
      phase: result.phase,
      reason: result.reason,
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
    if (ONCE) break;
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
