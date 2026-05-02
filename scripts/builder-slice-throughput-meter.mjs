#!/usr/bin/env node
/**
 * Builder slice throughput meter — ETA to MVP corridor + variance vs baseline.
 *
 * Inputs:
 * - `data/builder-continuous-queue-log.jsonl` — `task_ok` / `task_fail` rows with **`build_wall_ms`** (emitter: lifeos-builder-continuous-queue.mjs).
 * - `data/builder-continuous-queue-last-run.json` — optional **`per_task_slice`** for latest batch drill-down.
 * - `docs/projects/LIFEOS_MVP_THROUGHPUT_SCOPE.json` — which queue rows count as MVP (before tail regen ids).
 * - Cursor: `data/builder-continuous-queue-cursor.<lane>.json`.
 *
 * Output: stdout report + optional `data/builder-throughput-meter-last-run.json` (--write-receipt).
 *
 * Framing: slower slices are **data** (bigger targets, retries, infra) — use alongside **`GET …/builder/gaps`** for system defects vs load.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const LOG_PATH = path.join(ROOT, "data/builder-continuous-queue-log.jsonl");
const LAST_RUN_PATH = path.join(ROOT, "data/builder-continuous-queue-last-run.json");
const SCOPE_DEFAULT = path.join(ROOT, "docs/projects/LIFEOS_MVP_THROUGHPUT_SCOPE.json");
const RECEIPT_PATH = path.join(ROOT, "data/builder-throughput-meter-last-run.json");

const BASELINE_N = Math.max(3, parseInt(process.env.BUILDER_METER_BASELINE_N || "10", 10) || 10);
const ROLLING_N = Math.max(2, parseInt(process.env.BUILDER_METER_ROLLING_N || "5", 10) || 5);
const REGRESS_RATIO = Number(process.env.BUILDER_METER_REGRESS_RATIO || "1.12");
const IMPROVE_RATIO = Number(process.env.BUILDER_METER_IMPROVE_RATIO || "0.88");

function mean(a) {
  if (!a.length) return null;
  return a.reduce((s, x) => s + x, 0) / a.length;
}

function fmtMs(ms) {
  if (ms == null || Number.isNaN(ms)) return "n/a";
  if (ms < 1200) return `${Math.round(ms)} ms`;
  return `${(ms / 60000).toFixed(2)} min`;
}

function slugifyLane(value) {
  return String(value || "default")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

async function readJsonQuiet(p, fallback = null) {
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return fallback;
  }
}

/** Parse JSONL — ordered events with per-slice wall time (post-telemetry upgrade). */
async function loadSliceEvents(logPath, maxLines = 80000, profileFilter = "") {
  const events = [];
  let raw = "";
  try {
    raw = await readFile(logPath, "utf8");
  } catch {
    return events;
  }
  const tail = raw.split("\n").slice(-maxLines);
  const profileNeedle = typeof profileFilter === "string" ? profileFilter.trim() : "";
  for (const line of tail) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    const ev = o.event;
    if (!["task_ok", "task_fail", "task_error"].includes(ev)) continue;
    if (profileNeedle && String(o.slice_profile || "") !== profileNeedle) continue;
    const ms = Number(o.build_wall_ms);
    if (!Number.isFinite(ms) || ms < 0) continue;
    events.push({
      ts: o.ts || null,
      event: ev,
      id: o.id || null,
      ok: ev === "task_ok",
      build_wall_ms: ms,
      slice_profile: o.slice_profile || null,
    });
  }
  return events;
}

async function main() {
  const writeReceipt = process.argv.includes("--write-receipt");
  const profileIdx = process.argv.indexOf("--profile");
  const profileArg = profileIdx >= 0 ? process.argv[profileIdx + 1] || "" : "";

  const scopePath = process.argv.includes("--scope")
    ? process.argv[process.argv.indexOf("--scope") + 1]
    : SCOPE_DEFAULT;

  const scope = await readJsonQuiet(scopePath, {});
  const tasksRel = scope.tasks_file || "docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json";
  const tailId = scope.mvp_exclusive_tail_task_id || "dashboard-shell-audit";
  const laneSlug =
    typeof scope.lane_slug === "string" && scope.lane_slug.trim()
      ? slugifyLane(scope.lane_slug)
      : slugifyLane(path.basename(tasksRel, ".json"));

  const tasksPath = path.join(ROOT, tasksRel);
  const queue = await readJsonQuiet(tasksPath, { tasks: [] });
  const tasks = queue.tasks || [];
  const tailIdx = tasks.findIndex((t) => t.id === tailId);
  const mvpCount = tailIdx >= 0 ? tailIdx : tasks.length;

  const cursorPath = path.join(ROOT, "data", `builder-continuous-queue-cursor.${slugifyLane(laneSlug)}.json`);
  const cursor = await readJsonQuiet(cursorPath, { nextStartIndex: 0 });
  const nextIdx = Math.min(Math.max(0, Number(cursor.nextStartIndex) || 0), tasks.length);
  const mvpRemaining = Math.max(0, Math.min(mvpCount, mvpCount - nextIdx));

  const lastRun = await readJsonQuiet(LAST_RUN_PATH, null);

  const events = await loadSliceEvents(LOG_PATH, 80000, profileArg);
  const okMs = events.filter((e) => e.ok).map((e) => e.build_wall_ms);
  const failN = events.filter((e) => !e.ok).length;
  const recentOk = okMs.slice(-BASELINE_N * 3);
  const baselineSlice = okMs.slice(0, BASELINE_N);
  const rollingSlice = okMs.slice(-ROLLING_N);

  const baselineAvg = mean(baselineSlice);
  const rollingAvg = mean(rollingSlice);

  let trend = "insufficient_data";
  if (baselineAvg != null && rollingAvg != null && okMs.length >= BASELINE_N + ROLLING_N) {
    if (rollingAvg > baselineAvg * REGRESS_RATIO) trend = "slower_than_baseline";
    else if (rollingAvg < baselineAvg * IMPROVE_RATIO) trend = "faster_than_baseline";
    else trend = "flat_vs_baseline";
  }

  const paceMs = rollingAvg ?? baselineAvg ?? lastRun?.build_ms_per_commit_avg ?? null;
  const etaMs = paceMs != null && mvpRemaining > 0 ? paceMs * mvpRemaining : null;

  const recentWindow = events.slice(-40);
  const recentFailRate = recentWindow.length ? recentWindow.filter((e) => !e.ok).length / recentWindow.length : 0;
  let loopSignal = "no_recent_failures";
  if (recentWindow.length >= 8 && recentFailRate > 0.25) loopSignal = "elevated_fail_rate_recent_window";
  if (lastRun?.idle_slice === true) loopSignal = "last_run_idle_slice";

  const report = {
    generated_at: new Date().toISOString(),
    scope_file: path.relative(ROOT, scopePath),
    tasks_file: tasksRel,
    mvp_slice_count: mvpCount,
    mvp_remaining_after_cursor: mvpRemaining,
    cursor_next_index: nextIdx,
    cursor_path_relative: path.relative(ROOT, cursorPath),
    tail_task_id: tailId,
    ok_samples_in_log: okMs.length,
    fail_samples_in_log: failN,
    baseline_n: BASELINE_N,
    rolling_n: ROLLING_N,
    baseline_avg_ms: baselineAvg != null ? Math.round(baselineAvg) : null,
    rolling_avg_ms: rollingAvg != null ? Math.round(rollingAvg) : null,
    pace_used_ms_for_eta: paceMs != null ? Math.round(paceMs) : null,
    eta_to_mvp_ms: etaMs != null ? Math.round(etaMs) : null,
    trend_vs_baseline: trend,
    recent_fail_share: Number(recentFailRate.toFixed(3)),
    loop_signal: loopSignal,
    last_run_build_ms_per_commit_avg: lastRun?.build_ms_per_commit_avg ?? null,
    last_run_per_task_slice: lastRun?.per_task_slice ?? null,
  };

  const profileLine =
    profileArg ? `║ slice_profile filter: ${profileArg} (like-with-like only)` : "║ slice_profile filter: none (mixed workloads)";
  const lines = [
    "\n╔ Builder slice throughput (MVP corridor) ═══════════════════════╗",
    profileLine,
    `║ Scope: MVP = first ${mvpCount} task(s) in ${tasksRel}`,
    `║        (exclusive tail starts at "${tailId}")`,
    `║ Cursor: nextStartIndex=${nextIdx} → MVP slices remaining ≈ ${mvpRemaining}`,
    "╠═════════════════════════════════════════════════════════════════╣",
    `║ Log: ${path.relative(ROOT, LOG_PATH)}`,
    `║ OK samples with build_wall_ms: ${okMs.length}`,
    `║ Fail/error samples (with timing): ${failN}`,
    "╠═════════════════════════════════════════════════════════════════╣",
    `║ Baseline avg (${Math.min(okMs.length, BASELINE_N)} earliest OK): ${fmtMs(baselineAvg)}`,
    `║ Rolling avg (last ${ROLLING_N} OK):              ${fmtMs(rollingAvg)}`,
    `║ Pace used for ETA (rolling fallback baseline fallback last-run): ${fmtMs(paceMs)}`,
    `║ ETA (${mvpRemaining} MVP slices × pace): ${etaMs != null ? fmtMs(etaMs) + ` (~${(etaMs / 3600000).toFixed(2)} h)` : "n/a"}`,
    `║ Trend vs baseline: ${trend}`,
    `║ Recent-window fail share (${recentWindow.length} events): ${(recentFailRate * 100).toFixed(1)}%`,
    `║ Signal: ${loopSignal}`,
    "╚═════════════════════════════════════════════════════════════════╝",
    "",
    "Interpretation:",
    "- Slower rolling avg can mean heavier targets, stricter verifier, retries, deploy cold starts — correlate with gaps + target_file size.",
    "- Elevated fail rate → fix platform (routes, verifiers, env) per GAP-FILL receipts; not “try harder” in IDE only.",
    "- Contrary data is success: it tells you what to fix before the skyscraper gets tall.",
    "",
  ];

  process.stdout.write(lines.join("\n"));

  if (writeReceipt) {
    await writeFile(RECEIPT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8").catch(() => {});
    process.stdout.write(`Wrote ${path.relative(ROOT, RECEIPT_PATH)}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
