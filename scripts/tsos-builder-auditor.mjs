#!/usr/bin/env node
/**
 * SYNOPSIS: Sentinel — TSOS Builder Auditor
 * Sentinel — TSOS Builder Auditor
 *
 * The fourth agent. Not a builder. An accountability officer.
 *
 * Responsibilities:
 *   - Grades each worker (Nova, Atlas, Forge) every cycle on:
 *       product_ratio   — % of committed tasks that are product code vs specs/docs
 *       success_rate    — % of cycles that produced at least one commit
 *       staleness       — time since last successful cycle
 *   - Detects problems: spec contamination, stuck cursors, F-grade workers
 *   - Writes structured grades to data/tsos-auditor-grades.json (read by morning report)
 *   - Logs recommendations to data/tsos-auditor-recommendations.jsonl
 *   - Runs on its own interval (default 30min), independently of the builders
 *
 * Grade scale (per worker):
 *   A  product_ratio >= 0.7 AND success_rate >= 0.6 AND not stale
 *   B  product_ratio >= 0.5 AND success_rate >= 0.5
 *   C  product_ratio >= 0.3 OR success_rate >= 0.5
 *   D  product_ratio < 0.3 AND success_rate < 0.5
 *   F  stale > threshold OR no data at all
 *
 * Usage:
 *   node scripts/tsos-builder-auditor.mjs            # runs once
 *   node scripts/tsos-builder-auditor.mjs --daemon   # runs on interval until SIGINT
 *   npm run tsos:auditor                             # alias for --daemon
 *   npm run tsos:auditor:once                        # alias for single run
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */

import { promises as fs } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "config", "tsos-autonomy-lanes.json");

const DAEMON_MODE = process.argv.includes("--daemon");
const ONCE = !DAEMON_MODE || process.argv.includes("--once");

const intervalArgIdx = process.argv.indexOf("--interval-min");
const INTERVAL_MIN = Math.max(
  5,
  Number(intervalArgIdx >= 0 ? process.argv[intervalArgIdx + 1] : process.env.TSOS_AUDITOR_INTERVAL_MIN || 30) || 30,
);
const GRADE_WINDOW_H = Number(process.env.TSOS_AUDITOR_GRADE_WINDOW_H || 4);
const STALE_THRESHOLD_H = Number(process.env.TSOS_AUDITOR_STALE_THRESHOLD_H || 2);

function slugifyLane(value) {
  return String(value || "default")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function readJsonQuiet(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function appendJsonl(filePath, obj) {
  try {
    await fs.appendFile(filePath, JSON.stringify(obj) + "\n", "utf8");
  } catch {}
}

function ageHours(isoString) {
  if (!isoString) return null;
  const ms = Date.parse(isoString);
  if (!Number.isFinite(ms)) return null;
  return (Date.now() - ms) / 3_600_000;
}

function isProductFile(targetFile) {
  if (!targetFile) return false;
  const ext = targetFile.split(".").pop().toLowerCase();
  return ["js", "mjs", "html", "css", "ts", "tsx"].includes(ext);
}

function isSpecFile(targetFile) {
  if (!targetFile) return false;
  return targetFile.endsWith(".md");
}

async function readRecentLogLines(logFile, windowH) {
  const sinceMs = Date.now() - windowH * 3_600_000;
  try {
    const raw = await fs.readFile(logFile, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const results = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.ts && Date.parse(obj.ts) >= sinceMs) results.push(obj);
      } catch {}
    }
    return results;
  } catch {
    return [];
  }
}

function deriveQueueLogPath(worker) {
  if (worker.lane_name === "LIFEOS_DASHBOARD_BUILDER_QUEUE") {
    return path.join(ROOT, "data", "builder-continuous-queue-log.jsonl");
  }
  return path.join(ROOT, "data", `builder-continuous-queue-log.${slugifyLane(worker.lane_name || worker.id)}.jsonl`);
}

function computeMetrics(daemonLogLines, queueLogLines, queueTasks, cursorIdx) {
  const successfulCycles = daemonLogLines.filter((l) => l.event === "cycle_ok");
  const failedCycles = daemonLogLines.filter((l) => l.event === "cycle_failed");
  const taskOk = queueLogLines.filter((l) => l.event === "task_ok");
  const taskFail = queueLogLines.filter((l) =>
    l.event === "task_fail" || l.event === "task_error" || l.event === "html_in_markdown_gate",
  );

  let productCommits = 0;
  let specCommits = 0;
  let totalCommits = 0;

  for (const row of taskOk) {
    totalCommits += 1;
    const tf = row.target_file || null;
    if (tf) {
      if (isProductFile(tf)) productCommits += 1;
      else if (isSpecFile(tf)) specCommits += 1;
      else specCommits += 1;
    }
  }

  const totalCycles = successfulCycles.length + failedCycles.length;
  const successRate = totalCycles > 0 ? successfulCycles.length / totalCycles : 0;
  const productRatio =
    productCommits + specCommits > 0 ? productCommits / (productCommits + specCommits) : null;

  // When daemon cycle_ok count is 0, derive proxy metrics from queue task_ok events so
  // a worker that committed real code doesn't get auto-graded F just because the daemon
  // wrapper never emitted cycle_ok (e.g. Nova when supervise phase hit HTTP 413).
  const proxyCycles = successfulCycles.length === 0 ? taskOk.length : 0;
  const proxySuccessRate =
    proxyCycles > 0
      ? taskOk.length / Math.max(taskOk.length + taskFail.length, 1)
      : 0;

  // Most recent queue task_ok timestamp — used by auditWorker as staleness fallback.
  const sortedTaskOk = taskOk.slice().sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  const lastTaskOkAt = sortedTaskOk[0]?.ts ?? null;

  const remaining = queueTasks.slice(cursorIdx);
  const remainingProductTasks = remaining.filter((t) => isProductFile(t.target_file));
  const remainingSpecTasks = remaining.filter((t) => isSpecFile(t.target_file));
  const queueProductRatio =
    remaining.length > 0 ? remainingProductTasks.length / remaining.length : null;

  const nextTask = remaining[0] ?? null;
  const nextTaskIsSpec = nextTask ? isSpecFile(nextTask.target_file) : false;

  return {
    cycles: successfulCycles.length,
    proxyCycles,
    proxySuccessRate: Math.round(proxySuccessRate * 100) / 100,
    lastTaskOkAt,
    failures: failedCycles.length,
    taskFailures: taskFail.length,
    totalCommits,
    productCommits,
    specCommits,
    successRate: Math.round(successRate * 100) / 100,
    productRatio: productRatio !== null ? Math.round(productRatio * 100) / 100 : null,
    queueRemaining: remaining.length,
    queueTotal: queueTasks.length,
    queueProductRatio: queueProductRatio !== null ? Math.round(queueProductRatio * 100) / 100 : null,
    nextTaskId: nextTask?.id ?? null,
    nextTaskFile: nextTask?.target_file ?? null,
    nextTaskIsSpec,
  };
}

function gradeWorker(metrics, staleHours, targetProductRatio, targetSuccessRate) {
  // Stale gate: prefer daemon staleness; fall back to most recent queue task_ok if daemon
  // lastSuccessAt was null (e.g. daemon wrapper fails due to HTTP 413 but queue produces commits).
  const effectiveStaleHours =
    staleHours !== null
      ? staleHours
      : metrics.lastTaskOkAt
        ? (Date.now() - Date.parse(metrics.lastTaskOkAt)) / 3_600_000
        : null;
  if (effectiveStaleHours === null || effectiveStaleHours > STALE_THRESHOLD_H) return "F";

  // Zero-cycle gate: only F if NEITHER daemon cycles NOR proxy queue commits exist.
  if (metrics.cycles === 0 && (metrics.proxyCycles ?? 0) === 0) return "F";

  const pr = metrics.productRatio ?? 0;
  // Blend daemon success rate with queue-derived proxy rate — take the better signal.
  const sr = Math.max(metrics.successRate, metrics.proxySuccessRate ?? 0);
  if (pr >= 0.7 && sr >= 0.6) return "A";
  if (pr >= 0.5 && sr >= 0.5) return "B";
  if (pr >= 0.3 || sr >= 0.5) return "C";
  return "D";
}

function buildRecommendation(worker, grade, metrics, staleHours) {
  const recs = [];
  if (grade === "F" && (staleHours === null || staleHours > STALE_THRESHOLD_H)) {
    recs.push(`STALE: ${worker.name} has not committed in ${staleHours !== null ? Math.round(staleHours * 10) / 10 + "h" : "unknown time"}. Check daemon is running: npm run lifeos:builder:daemon:${worker.id === "nova" ? "" : worker.id === "atlas" ? "tc" : "site-builder"}`);
  }
  if (metrics.queueProductRatio !== null && metrics.queueProductRatio < 0.4 && metrics.queueRemaining > 0) {
    recs.push(`LOW_PRODUCT_RATIO: ${worker.name}'s queue is ${Math.round(metrics.queueProductRatio * 100)}% product code. Queue needs product code tasks. Next task is ${metrics.nextTaskIsSpec ? "a SPEC (⚠️)" : "product code"}.`);
  }
  if ((grade === "D" || grade === "F") && metrics.queueRemaining > 0) {
    recs.push(`INTERVENTION: ${worker.name} grade ${grade} — review queue JSON and ensure product code tasks are at cursor position. Current: ${metrics.queueRemaining} remaining, ${metrics.nextTaskFile || "none"} next.`);
  }
  if ((metrics.failures > metrics.cycles * 0.5 && metrics.cycles > 2) || metrics.taskFailures > 0) {
    recs.push(`HIGH_FAILURE: ${worker.name} has ${metrics.failures} failed cycles and ${metrics.taskFailures} failed tasks in the audit window. Check builder logs: data/${worker.log_file?.split("/").pop()}`);
  }
  return recs;
}

/**
 * Adversarial syntax truth:
 * 1. Prefer the builder's own post-commit static receipt for the last JS target.
 * 2. Fallback to current-file node --check only if that receipt is missing.
 *
 * This avoids false F grades when a queue target names a file that was intentionally
 * created elsewhere or later moved, while still catching real broken commits.
 */
async function checkLastCommittedFileSyntax(queueLogLines) {
  const reversed = [...queueLogLines].reverse();
  const postCommit = reversed.find(
    (l) => l.event === "post_commit_static" && typeof l.target_file === "string" && /\.(js|mjs|cjs)$/.test(l.target_file),
  );
  if (postCommit) {
    return {
      ok: Boolean(postCommit.ok),
      file: postCommit.target_file,
      source: "post_commit_static",
      error: postCommit.ok ? null : String(postCommit.stderr || "post_commit_static failed").slice(0, 500),
    };
  }

  const jsCommit = reversed.find(
    (l) => l.event === "task_ok" && typeof l.target_file === "string" && /\.(js|mjs|cjs)$/.test(l.target_file),
  );
  if (!jsCommit) return { ok: true, skipped: true, reason: "no_js_commits_in_window" };

  const target = jsCommit.target_file;
  const absPath = path.join(ROOT, target);
  try {
    await fs.access(absPath);
  } catch {
    return {
      ok: true,
      skipped: true,
      reason: "target_file_missing_in_current_checkout",
      file: target,
      source: "fallback_missing_file",
    };
  }

  try {
    execSync(`node --check "${absPath}"`, { stdio: "pipe" });
    return { ok: true, file: target, source: "fallback_node_check" };
  } catch (err) {
    const stderr = String(err.stderr || err.message || "").slice(0, 500);
    return { ok: false, file: target, error: stderr, source: "fallback_node_check" };
  }
}

/**
 * Quarantine detection: scans 24h of task_fail events per worker.
 * Tasks failing 2+ times are written to data/quarantined-tasks.json so the queue runner skips them.
 *
 * Respects data/quarantine-cleared-tasks.json — a supervisor override list. Any task_id+lane
 * in that file is never re-quarantined and is purged from the quarantine file on each audit run.
 * This prevents transient 413/Council-call failures from permanently blocking queue progress.
 */
async function detectAndWriteQuarantinedTasks(workers) {
  const quarantinePath = path.join(ROOT, "data", "quarantined-tasks.json");
  const clearedPath = path.join(ROOT, "data", "quarantine-cleared-tasks.json");
  const repairQueuePath = path.join(ROOT, "data", "tsos-repair-queue.json");
  const now = new Date().toISOString();

  // Load supervisor-cleared exemptions — never re-quarantine these tasks.
  const clearedKeys = new Set();
  try {
    const clearedRaw = await fs.readFile(clearedPath, "utf8");
    const clearedList = JSON.parse(clearedRaw);
    if (Array.isArray(clearedList)) {
      for (const e of clearedList) {
        if (e.worker_id && e.task_id) clearedKeys.add(`${e.worker_id}:${e.task_id}`);
        if (e.lane && e.task_id) clearedKeys.add(`${e.lane}:${e.task_id}`);
      }
    }
  } catch {}

  let existing = [];
  try {
    const raw = await fs.readFile(quarantinePath, "utf8");
    existing = JSON.parse(raw);
    if (!Array.isArray(existing)) existing = [];
  } catch {}

  // Purge any cleared entries that were re-added by self-quarantine since the last audit.
  const purgeBefore = existing.length;
  existing = existing.filter(
    (e) =>
      !clearedKeys.has(`${e.worker_id}:${e.task_id}`) && !clearedKeys.has(`${e.lane}:${e.task_id}`),
  );
  const purgedCount = purgeBefore - existing.length;

  const existingKeys = new Set(existing.map((e) => `${e.worker_id}:${e.task_id}`));
  const newEntries = [];
  const repairQueue = [];

  for (const worker of workers) {
    const queue = await readJsonQuiet(path.join(ROOT, worker.tasks_file), { tasks: [] });
    const tasks = Array.isArray(queue?.tasks) ? queue.tasks : [];
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const queueLog = deriveQueueLogPath(worker);
    const lines24h = await readRecentLogLines(queueLog, 24);
    const failsByTask = {};
    for (const line of lines24h) {
      if (line.event === "task_fail" || line.event === "html_in_markdown_gate") {
        const taskId = line.id;
        if (!taskId) continue;
        if (!failsByTask[taskId]) failsByTask[taskId] = { count: 0, last_error: null };
        failsByTask[taskId].count += 1;
        const errMsg = line.json?.syntax_error || line.json?.error || null;
        if (errMsg) failsByTask[taskId].last_error = String(errMsg).slice(0, 300);
      }
    }
    for (const [taskId, info] of Object.entries(failsByTask)) {
      const isCleared =
        clearedKeys.has(`${worker.id}:${taskId}`) || clearedKeys.has(`${worker.lane_name}:${taskId}`);
      if (info.count >= 2 && !existingKeys.has(`${worker.id}:${taskId}`) && !isCleared) {
        newEntries.push({
          task_id: taskId,
          worker_id: worker.id,
          worker_name: worker.name,
          lane: worker.lane_name,
          quarantined_at: now,
          failure_count: info.count,
          last_error: info.last_error,
        });
        existingKeys.add(`${worker.id}:${taskId}`);
      }
      if (info.count >= 2) {
        const task = taskById.get(taskId) || null;
        repairQueue.push({
          task_id: taskId,
          worker_id: worker.id,
          worker_name: worker.name,
          lane: worker.lane_name,
          target_file: task?.target_file || null,
          requested_model: task?.model || null,
          failure_count_24h: info.count,
          last_error: info.last_error,
          recommended_action: inferRepairAction(task, info.last_error),
          queued_at: now,
        });
      }
    }
  }

  await fs.mkdir(path.join(ROOT, "data"), { recursive: true });
  if (newEntries.length > 0 || purgedCount > 0) {
    await fs.writeFile(quarantinePath, JSON.stringify([...existing, ...newEntries], null, 2), "utf8");
    if (newEntries.length > 0) {
      console.log(`[Sentinel] Quarantined ${newEntries.length} new task(s): ${newEntries.map((e) => e.task_id).join(", ")}`);
    }
    if (purgedCount > 0) {
      console.log(`[Sentinel] Purged ${purgedCount} cleared task(s) from quarantine.`);
    }
  }

  await fs.mkdir(path.join(ROOT, "data"), { recursive: true });
  await fs.writeFile(repairQueuePath, JSON.stringify({
    generated_at: now,
    total: repairQueue.length,
    tasks: repairQueue,
  }, null, 2), "utf8");

  return { total: existing.length + newEntries.length, new_count: newEntries.length };
}

function inferRepairAction(task, lastError) {
  const text = String(lastError || "").toLowerCase();
  if (text.includes("truncated")) {
    return "split_html_or_raise_output_budget";
  }
  if (text.includes("commit failed")) {
    return "retry_after_git_head_refresh";
  }
  if (text.includes("syntax")) {
    return "tighten_js_output_contract";
  }
  if ((task?.target_file || "").endsWith(".md")) {
    return "rewrite_spec_for_clarity";
  }
  return "builder_repair_review";
}

async function auditWorker(worker) {
  const [state, cursorData, queue] = await Promise.all([
    readJsonQuiet(path.join(ROOT, worker.state_file)),
    readJsonQuiet(path.join(ROOT, worker.cursor_file)),
    readJsonQuiet(path.join(ROOT, worker.tasks_file)),
  ]);

  const [daemonLogLines, queueLogLines] = await Promise.all([
    readRecentLogLines(path.join(ROOT, worker.log_file), GRADE_WINDOW_H),
    readRecentLogLines(deriveQueueLogPath(worker), GRADE_WINDOW_H),
  ]);

  // Daemon lastSuccessAt → staleness. When null (daemon never succeeded), gradeWorker
  // will fall back to metrics.lastTaskOkAt (most recent queue task_ok).
  const lastSuccessAt = state?.lastSuccessAt ?? null;
  const staleHours = ageHours(lastSuccessAt);

  const queueTasks = queue?.tasks ?? [];
  const cursorIdx = cursorData?.nextStartIndex ?? cursorData?.cursor ?? 0;

  const metrics = computeMetrics(daemonLogLines, queueLogLines, queueTasks, cursorIdx);

  let grade = gradeWorker(
    metrics,
    staleHours,
    worker.performance_target?.product_ratio_min ?? 0.4,
    worker.performance_target?.success_rate_min ?? 0.5,
  );

  const recommendations = buildRecommendation(worker, grade, metrics, staleHours);

  // Adversarial syntax check — cycle count means nothing if committed code is broken.
  const syntaxCheck = await checkLastCommittedFileSyntax(queueLogLines);
  let syntaxOverride = null;
  if (!syntaxCheck.skipped && !syntaxCheck.ok) {
    syntaxOverride = { file: syntaxCheck.file, error: syntaxCheck.error };
    grade = "F";
    recommendations.push(
      `SYNTAX_FAIL: Last committed JS file ${syntaxCheck.file} fails node --check. ` +
      `Error: ${syntaxCheck.error?.slice(0, 200)}. Grade overridden to F regardless of cycle count.`,
    );
  }

  return {
    worker_id: worker.id,
    worker_name: worker.name,
    role: worker.role,
    grade,
    grade_rationale: {
      product_ratio: metrics.productRatio,
      success_rate: metrics.successRate,
      proxy_cycles: metrics.proxyCycles,
      proxy_success_rate: metrics.proxySuccessRate,
      stale_hours: staleHours !== null ? Math.round(staleHours * 10) / 10 : null,
      last_task_ok_at: metrics.lastTaskOkAt,
      target_product_ratio: worker.performance_target?.product_ratio_min,
      target_success_rate: worker.performance_target?.success_rate_min,
      syntax_override: syntaxOverride,
    },
    metrics,
    last_success_at: lastSuccessAt,
    recommendations,
    graded_at: new Date().toISOString(),
  };
}

async function runAudit() {
  const config = await readJsonQuiet(CONFIG_PATH);
  if (!config) {
    console.error("[Sentinel] Cannot read config/tsos-autonomy-lanes.json");
    return null;
  }

  const workers = config.workers ?? [];
  if (!workers.length) {
    console.error("[Sentinel] No workers found in config — check 'workers' array in tsos-autonomy-lanes.json");
    return null;
  }

  const grades = await Promise.all(workers.map(auditWorker));
  const now = new Date().toISOString();

  // Quarantine detection — runs after all workers graded so we have 24h log access.
  const quarantineResult = await detectAndWriteQuarantinedTasks(workers).catch((err) => {
    console.warn("[Sentinel] Quarantine detection failed:", err.message);
    return null;
  });

  const gradeFile = config.auditor?.grade_file ?? "data/tsos-auditor-grades.json";
  const recFile = config.auditor?.recommendations_file ?? "data/tsos-auditor-recommendations.jsonl";
  const logFile = config.auditor?.log_file ?? "data/tsos-auditor-log.jsonl";

  const allRecs = grades.flatMap((g) => g.recommendations);
  const summary = {
    audited_at: now,
    workers: grades.map((g) => ({
      id: g.worker_id,
      name: g.worker_name,
      grade: g.grade,
      product_ratio: g.metrics.productRatio,
      success_rate: g.metrics.successRate,
      stale_hours: g.grade_rationale.stale_hours,
      queue_product_ratio: g.metrics.queueProductRatio,
      recommendations_count: g.recommendations.length,
      syntax_override: g.grade_rationale.syntax_override ?? null,
    })),
    total_recommendations: allRecs.length,
    intervention_needed: grades.filter((g) => g.grade === "D" || g.grade === "F").map((g) => g.worker_name),
    quarantined_tasks_total: quarantineResult?.total ?? 0,
    quarantined_tasks_new: quarantineResult?.new_count ?? 0,
    overall_health: grades.every((g) => g.grade === "A" || g.grade === "B")
      ? "HEALTHY"
      : grades.some((g) => g.grade === "F")
      ? "CRITICAL"
      : "DEGRADED",
  };

  await fs.mkdir(path.join(ROOT, "data"), { recursive: true });
  await fs.writeFile(path.join(ROOT, gradeFile), JSON.stringify({ summary, grades }, null, 2), "utf8");

  if (allRecs.length > 0) {
    for (const rec of allRecs) {
      await appendJsonl(path.join(ROOT, recFile), {
        ts: now,
        recommendation: rec,
        workers: grades.map((g) => g.worker_name),
      });
    }
  }

  await appendJsonl(path.join(ROOT, logFile), {
    ts: now,
    event: "audit_cycle",
    summary: summary,
    quarantine: quarantineResult,
  });

  return summary;
}

function printSummary(summary) {
  if (!summary) return;
  const gradeIcon = { A: "🟢", B: "🟡", C: "🟠", D: "🔴", F: "⛔" };
  const health = summary.overall_health;
  const healthIcon = health === "HEALTHY" ? "✅" : health === "CRITICAL" ? "⛔" : "⚠️ ";

  console.log("\n══════════════════════════════════════════════════════");
  console.log("  SENTINEL AUDIT REPORT                               ");
  console.log(`  ${new Date().toISOString()}                         `);
  console.log(`  Overall: ${healthIcon} ${health}                    `);
  console.log("══════════════════════════════════════════════════════");

  for (const w of summary.workers) {
    const icon = gradeIcon[w.grade] ?? "❓";
    const pr = w.product_ratio !== null ? `${Math.round(w.product_ratio * 100)}% product` : "no data";
    const qpr = w.queue_product_ratio !== null ? `, queue=${Math.round(w.queue_product_ratio * 100)}%` : "";
    const stale = w.stale_hours !== null ? ` (${w.stale_hours}h ago)` : " (never)";
    console.log(`\n  ${icon} ${w.name} [${w.grade}]${stale}`);
    console.log(`     ${pr}${qpr} | success rate: ${Math.round((w.success_rate ?? 0) * 100)}%`);
    if (w.recommendations_count > 0) {
      console.log(`     ⚠️  ${w.recommendations_count} recommendation(s) logged`);
    }
  }

  if (summary.intervention_needed.length > 0) {
    console.log(`\n  ⛔ INTERVENTION NEEDED: ${summary.intervention_needed.join(", ")}`);
    console.log("     Check data/tsos-auditor-recommendations.jsonl for details.");
  }

  console.log("\n══════════════════════════════════════════════════════\n");
}

async function main() {
  if (DAEMON_MODE && !ONCE) {
    console.log(`[Sentinel] Starting in daemon mode — interval ${INTERVAL_MIN}min. SIGINT to stop.`);
    process.on("SIGINT", () => {
      console.log("[Sentinel] Stopping.");
      process.exit(0);
    });
    while (true) {
      const summary = await runAudit();
      printSummary(summary);
      await sleep(INTERVAL_MIN * 60_000);
    }
  } else {
    const summary = await runAudit();
    printSummary(summary);
  }
}

main().catch((e) => {
  console.error("[Sentinel] Fatal:", e.message);
  process.exit(1);
});
