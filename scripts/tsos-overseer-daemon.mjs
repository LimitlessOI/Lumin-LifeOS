#!/usr/bin/env node
/**
 * SYNOPSIS: TSOS overseer daemon — monitors builder lanes, SSOT drift, and evidence health.
 * TSOS overseer daemon — monitors builder lanes, SSOT drift, and evidence health.
 *
 * Purpose:
 * - act as the fourth worker focused on supervision rather than feature building
 * - run repeatable platform checks on an interval
 * - summarize lane health so drift becomes visible quickly
 *
 * This process does not claim to "fix everything automatically".
 * It produces receipts, grades, and red/green status for the portfolio.
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
const CONFIG_PATH = path.join(ROOT, "config", "tsos-autonomy-lanes.json");
const DEFAULT_STATE_PATH = path.join(ROOT, "data", "tsos-overseer-state.json");
const DEFAULT_LOG_PATH = path.join(ROOT, "data", "tsos-overseer-log.jsonl");
const DEFAULT_SUMMARY_PATH = path.join(ROOT, "data", "tsos-overseer-summary.json");
const LOCK_PATH = path.join(ROOT, "data", "tsos-overseer.lock");

const ONCE = process.argv.includes("--once");
const intervalArgIdx = process.argv.indexOf("--interval-min");
const intervalMin = Math.max(
  5,
  Number(intervalArgIdx >= 0 ? process.argv[intervalArgIdx + 1] : process.env.TSOS_OVERSEER_INTERVAL_MIN || 30) || 30,
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugifyLane(value) {
  return String(value || "default")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function isDefaultBuilderLane(lane) {
  return (
    lane?.lane_name === "LIFEOS_DASHBOARD_BUILDER_QUEUE" ||
    lane?.tasks_file === "docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json"
  );
}

function laneStatePath(lane) {
  if (isDefaultBuilderLane(lane)) return path.join(ROOT, "data", "builder-daemon-state.json");
  return path.join(ROOT, "data", `builder-daemon-state.${slugifyLane(lane.lane_name || lane.id)}.json`);
}

function laneLastRunPath(lane) {
  if (isDefaultBuilderLane(lane)) return path.join(ROOT, "data", "builder-continuous-queue-last-run.json");
  return path.join(ROOT, "data", `builder-continuous-queue-last-run.${slugifyLane(lane.lane_name || lane.id)}.json`);
}

async function readJsonQuiet(filePath, fallback = null) {
  try {
    return JSON.parse(await fsPromises.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function ensureDataDir() {
  await fsPromises.mkdir(path.join(ROOT, "data"), { recursive: true });
}

function isProcessAlive(pid) {
  const value = Number(pid);
  if (!Number.isFinite(value) || value <= 0) return false;
  try {
    process.kill(value, 0);
    return true;
  } catch (err) {
    return err?.code !== "ESRCH";
  }
}

async function acquireLock() {
  await ensureDataDir();
  if (fs.existsSync(LOCK_PATH)) {
    const raw = await fsPromises.readFile(LOCK_PATH, "utf8").catch(() => "");
    let prior = {};
    try {
      prior = raw ? JSON.parse(raw) : {};
    } catch {
      prior = {};
    }
    if (prior.pid && isProcessAlive(prior.pid)) {
      throw new Error(`tsos overseer already running (pid=${prior.pid})`);
    }
    await fsPromises.unlink(LOCK_PATH).catch(() => {});
  }
  await fsPromises.writeFile(
    LOCK_PATH,
    `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

async function releaseLock() {
  await fsPromises.unlink(LOCK_PATH).catch(() => {});
}

async function appendLog(logPath, event, payload = {}) {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), event, ...payload })}\n`;
  await fsPromises.appendFile(logPath, line, "utf8").catch(() => {});
  console.log(line.trimEnd());
}

async function writeJson(filePath, value) {
  await fsPromises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadConfig() {
  const raw = await fsPromises.readFile(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

async function runCommand(command, args, timeoutMs = 12 * 60 * 1000) {
  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: ROOT,
      env: process.env,
      timeout: timeoutMs,
      maxBuffer: 6 * 1024 * 1024,
      shell: false,
    });
    return {
      ok: true,
      exitCode: 0,
      elapsedMs: Date.now() - startedAt,
      stdout: String(stdout || "").slice(0, 4000),
      stderr: String(stderr || "").slice(0, 4000),
    };
  } catch (error) {
    return {
      ok: false,
      exitCode: typeof error.code === "number" ? error.code : 1,
      elapsedMs: Date.now() - startedAt,
      stdout: String(error.stdout || "").slice(0, 4000),
      stderr: String(error.stderr || error.message || "").slice(0, 4000),
    };
  }
}

function summarizeLaneHealth(lane, state, lastRun) {
  const rawStatus = state?.status || "missing";
  const status = rawStatus === "running" ? "healthy" : rawStatus;
  const lastSuccessAt = state?.lastSuccessAt || null;
  const buildCommits = Number(lastRun?.build_commits || 0);
  const idleSlice = lastRun?.idle_slice === true;
  return {
    id: lane.id,
    label: lane.label,
    lane_name: lane.lane_name,
    status,
    raw_status: rawStatus,
    last_success_at: lastSuccessAt,
    build_commits: buildCommits,
    idle_slice: idleSlice,
    queue_file: lane.tasks_file || null,
    state_file: path.relative(ROOT, laneStatePath(lane)),
    last_run_file: path.relative(ROOT, laneLastRunPath(lane)),
  };
}

async function readImprovementQueue(config) {
  const queueFile = config?.auditor?.improvement_queue_file;
  if (!queueFile) return null;
  const queue = await readJsonQuiet(path.join(ROOT, queueFile), null);
  const tasks = Array.isArray(queue?.tasks) ? queue.tasks : [];
  return {
    queue_file: queueFile,
    total_tasks: tasks.length,
    next_tasks: tasks.slice(0, 5).map((task) => ({
      id: task.id,
      target_file: task.target_file,
      artifact_type: task.artifact_type || null,
    })),
  };
}

async function readRepairQueue() {
  const repair = await readJsonQuiet(path.join(ROOT, "data", "tsos-repair-queue.json"), null);
  const tasks = Array.isArray(repair?.tasks) ? repair.tasks : [];
  return {
    generated_at: repair?.generated_at || null,
    total_tasks: tasks.length,
    next_tasks: tasks.slice(0, 5).map((task) => ({
      task_id: task.task_id,
      worker_id: task.worker_id,
      target_file: task.target_file,
      recommended_action: task.recommended_action,
    })),
  };
}

async function collectBuilderLaneHealth(lanes) {
  const out = [];
  for (const lane of lanes.filter((entry) => entry.type === "builder")) {
    const state = await readJsonQuiet(laneStatePath(lane), null);
    const lastRun = await readJsonQuiet(laneLastRunPath(lane), null);
    out.push(summarizeLaneHealth(lane, state, lastRun));
  }
  return out;
}

async function main() {
  const config = await loadConfig();
  const overseerLane = config.lanes.find((lane) => lane.id === "overseer") || {};
  const STATE_PATH = path.join(ROOT, overseerLane.state_file || path.relative(ROOT, DEFAULT_STATE_PATH));
  const LOG_PATH = path.join(ROOT, overseerLane.log_file || path.relative(ROOT, DEFAULT_LOG_PATH));
  const SUMMARY_PATH = path.join(ROOT, overseerLane.summary_file || path.relative(ROOT, DEFAULT_SUMMARY_PATH));

  await acquireLock();
  process.on("SIGINT", async () => {
    await appendLog(LOG_PATH, "signal", { type: "SIGINT" });
    await releaseLock();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await appendLog(LOG_PATH, "signal", { type: "SIGTERM" });
    await releaseLock();
    process.exit(0);
  });

  let cycleNo = 0;
  await appendLog(LOG_PATH, "overseer_start", { intervalMin, once: ONCE });

  while (true) {
    cycleNo += 1;
    // severity: "required" → failure makes overallStatus "degraded" and blocks lastSuccessAt.
    //           "advisory" → failure produces "degraded_warn" state but does NOT block lastSuccessAt.
    //           builder_preflight / ssot_validate / evidence_check / zero_drift are advisory
    //           because they depend on external connectivity or env keys that may not be present
    //           in the local shell where the overseer runs. The overseer's health should reflect
    //           the reliability of the core platform checks, not whether Railway is reachable.
    const checks = [
      { id: "builder_preflight", cmd: "npm", args: ["run", "builder:preflight"], severity: "advisory" },
      { id: "tsos_doctor", cmd: "npm", args: ["run", "tsos:doctor"], severity: "required" },
      { id: "ssot_validate", cmd: "npm", args: ["run", "ssot:validate"], severity: "advisory" },
      { id: "evidence_check", cmd: "npm", args: ["run", "evidence:check"], severity: "advisory" },
      { id: "zero_drift", cmd: "npm", args: ["run", "zero-drift:check"], severity: "advisory" },
      { id: "static_supervise", cmd: "npm", args: ["run", "lifeos:supervise:static"], severity: "required" }
    ];

    await appendLog(LOG_PATH, "cycle_start", { cycleNo });
    const startedAt = Date.now();
    const results = [];
    for (const check of checks) {
      const result = await runCommand(check.cmd, check.args);
      results.push({ ...check, ...result });
      await appendLog(LOG_PATH, "check_result", {
        cycleNo,
        check: check.id,
        ok: result.ok,
        exitCode: result.exitCode,
        elapsedMs: result.elapsedMs,
      });
    }

    const lanes = await collectBuilderLaneHealth(config.lanes);
    const improvementQueue = await readImprovementQueue(config);
    const repairQueue = await readRepairQueue();
    const failingChecks = results.filter((row) => !row.ok).map((row) => row.id);
    const failingRequiredChecks = results.filter((row) => !row.ok && row.severity === "required").map((row) => row.id);
    const failingAdvisoryChecks = results.filter((row) => !row.ok && row.severity === "advisory").map((row) => row.id);
    // Lane degradation is observed and reported but does NOT block the overseer's own health status.
    // The overseer's job is to detect degraded lanes — being blocked by them creates a circularity
    // where the overseer is always "degraded" simply because it is doing its job.
    const degradedLanes = lanes.filter((lane) => lane.status && lane.status !== "healthy").map((lane) => lane.id);
    const overallStatus = failingRequiredChecks.length > 0
      ? "degraded"
      : failingAdvisoryChecks.length > 0 || degradedLanes.length > 0
        ? "degraded_warn"
        : "healthy";
    const summary = {
      ts: new Date().toISOString(),
      cycle_no: cycleNo,
      overall_status: overallStatus,
      failing_checks: failingChecks,
      failing_required_checks: failingRequiredChecks,
      failing_advisory_checks: failingAdvisoryChecks,
      degraded_lanes: degradedLanes,
      checks: results.map((row) => ({
        id: row.id,
        ok: row.ok,
        severity: row.severity,
        exitCode: row.exitCode,
        elapsedMs: row.elapsedMs,
      })),
      lanes,
      improvement_queue: improvementQueue,
      repair_queue: repairQueue,
      elapsed_ms: Date.now() - startedAt,
    };

    const prevState = await readJsonQuiet(STATE_PATH, {});
    await writeJson(STATE_PATH, {
      lane: "overseer",
      status: overallStatus,
      cycleNo,
      // lastSuccessAt: set whenever required checks pass (healthy OR degraded_warn).
      // Advisory failures and degraded lanes do not clear lastSuccessAt — observing problems
      // is the overseer's function, not a sign that the overseer itself is broken.
      lastSuccessAt: overallStatus !== "degraded" ? summary.ts : (prevState?.lastSuccessAt ?? null),
      lastFailureAt: overallStatus === "degraded" ? summary.ts : (prevState?.lastFailureAt ?? null),
      updatedAt: summary.ts,
      failingChecks,
      failingRequiredChecks,
      failingAdvisoryChecks,
      degradedLanes,
    });
    await writeJson(SUMMARY_PATH, summary);
    await appendLog(LOG_PATH, "cycle_complete", {
      cycleNo,
      overallStatus,
      failingChecks,
      degradedLanes,
      elapsedMs: summary.elapsed_ms,
    });

    if (ONCE) break;
    await sleep(intervalMin * 60 * 1000);
  }

  await appendLog(LOG_PATH, "overseer_stop", { cycleNo });
  await releaseLock();
}

main().catch(async (error) => {
  try {
    await appendLog(DEFAULT_LOG_PATH, "overseer_crash", { error: error.message });
  } catch {}
  await releaseLock().catch(() => {});
  console.error(error);
  process.exit(1);
});
