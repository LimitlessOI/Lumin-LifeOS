#!/usr/bin/env node
/**
 * SYNOPSIS: Operator dashboard — one JSON aggregate for "is the system okay?" (no UI).
 * Operator dashboard — one JSON aggregate for "is the system okay?" (no UI).
 * Writes `data/operator-dashboard.json` (gitignored). Schema: `docs/OPERATOR_DASHBOARD_JSON.md`.
 *
 * Usage: `npm run operator:dashboard`
 *
 * @ssot docs/OPERATOR_DASHBOARD_JSON.md
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildRuntimeRealitySnapshot } from "./generate-runtime-reality-snapshot.mjs";
import { getGitOriginAlignment } from "./lib/git-origin-alignment.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "operator-dashboard.json");

function isMainModule() {
  const a = process.argv[1];
  if (!a) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(a)).href;
  } catch {
    return false;
  }
}

function readJson(rel) {
  const p = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
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

function lanePidPath(lane) {
  const slug = slugifyLane(lane.lane_name || lane.id);
  if (isDefaultBuilderLane(lane)) return path.join(ROOT, "data", "tsos-runtime-builder-lifeos.pid");
  if (slug.includes("tc-service")) return path.join(ROOT, "data", "tsos-runtime-builder-tc.pid");
  if (slug.includes("site-builder") || slug.includes("autonomous")) {
    return path.join(ROOT, "data", "tsos-runtime-builder-site-builder.pid");
  }
  return path.join(ROOT, "data", `tsos-runtime-builder-${slug}.pid`);
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

function readPidFile(absPath) {
  try {
    const raw = fs.readFileSync(absPath, "utf8").trim().split(/\s+/)[0];
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function gitDirtyCount() {
  try {
    const out = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" });
    const lines = out.split("\n").filter((l) => l.trim().length > 0);
    return lines.length;
  } catch {
    return null;
  }
}

function readLastJsonlLine(rel) {
  const p = path.join(ROOT, rel);
  try {
    const buf = fs.readFileSync(p, "utf8").trim();
    if (!buf) return null;
    const lines = buf.split("\n").filter(Boolean);
    const last = lines[lines.length - 1];
    return JSON.parse(last);
  } catch {
    return null;
  }
}

function classifyComplianceSteps(compliance) {
  const advisory_failures = [];
  const fail_closed_failures = [];
  const steps = Array.isArray(compliance?.steps) ? compliance.steps : [];
  for (const s of steps) {
    if (s.ok) continue;
    const row = { id: s.id, script: s.script, exitCode: s.exitCode, critical: s.critical === true };
    if (s.critical) fail_closed_failures.push({ ...row, source: "compliance_officer" });
    else advisory_failures.push({ ...row, source: "compliance_officer" });
  }
  return {
    advisory_failures,
    fail_closed_failures,
    steps_summary: steps.map((s) => ({
      id: s.id,
      ok: s.ok,
      critical: s.critical,
      exitCode: s.exitCode,
    })),
  };
}

function overseerFailureBuckets(summary) {
  const advisory_failures = (summary?.failing_advisory_checks || []).map((id) => ({ id, source: "overseer" }));
  const fail_closed_failures = (summary?.failing_required_checks || []).map((id) => ({ id, source: "overseer" }));
  const degraded_failures = (summary?.degraded_lanes || []).map((id) => ({
    id: `lane:${id}`,
    source: "overseer",
    note: "lane not healthy",
  }));
  return { advisory_failures, degraded_failures, fail_closed_failures };
}

function mergeFailureRows(a, b, key = "id") {
  const seen = new Set();
  const out = [];
  for (const row of [...a, ...b]) {
    const k = `${row.source || ""}:${row[key] || row.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

function lastFailedFromQueueLastRun(lastRun) {
  const slice = Array.isArray(lastRun?.per_task_slice) ? lastRun.per_task_slice : [];
  const bad = slice.filter((t) => t.ok === false);
  if (!bad.length) return null;
  const t = bad[bad.length - 1];
  return { task_id: t.id || null, ok: t.ok, lane: lastRun?.lane || null, finished_at: lastRun?.finished_at || null };
}

function pickLastQuarantined(quarantine) {
  const arr = Array.isArray(quarantine) ? quarantine : [];
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => String(b.quarantined_at || "").localeCompare(String(a.quarantined_at || "")));
  const q = sorted[0];
  return {
    task_id: q.task_id,
    lane: q.lane,
    worker_id: q.worker_id,
    failure_count: q.failure_count,
    quarantined_at: q.quarantined_at,
    last_error_preview: String(q.last_error || "").slice(0, 240),
  };
}

function computeNextHumanAction(ctx) {
  const { align, compliance, dirtyCount, failClosed, behind } = ctx;
  if (behind) {
    return "Git: local `main` is behind `origin/main` — run `git pull --ff-only origin main` (or merge) when worktree is clean; then re-run `npm run compliance-officer`.";
  }
  if (failClosed.length) {
    const ids = failClosed.map((f) => f.id || f.check || "?").slice(0, 6).join(", ");
    return `Fix fail-closed gate(s): ${ids} — see \`data/tsos-compliance-officer-last-run.json\` steps or overseer \`failing_required_checks\`; re-run \`npm run compliance-officer\`.`;
  }
  if (compliance?.exit_fail === true) {
    return "Compliance officer reported exit_fail — open `data/tsos-compliance-officer-last-run.json`, fix first failing critical step, re-run.";
  }
  const q = ctx.last_quarantined;
  if (q?.task_id) {
    return `Triage quarantined task \`${q.task_id}\` (${q.lane || "unknown lane"}) — see \`data/quarantined-tasks.json\` and builder logs.`;
  }
  if (dirtyCount > 0) {
    return `Working tree has ${dirtyCount} dirty path(s) — commit or stash before claiming audited PASS for this tree.`;
  }
  if (ctx.overseer_summary?.overall_status === "degraded_warn") {
    return "Overseer: degraded_warn — review advisory overseer failures and unhealthy lanes; optional: run `npm run tsos:doctor` with Railway keys when diagnosing deploy.";
  }
  return "No mandatory human action from dashboard heuristics — keep routine `npm run compliance-officer` + `npm run operator:dashboard` rhythm.";
}

export async function buildOperatorDashboard() {
  const align = getGitOriginAlignment(ROOT);
  let reality;
  try {
    // Fresh runtime truth wins over previously-written snapshot files.
    reality = await buildRuntimeRealitySnapshot();
  } catch {
    reality = readJson("data/runtime-reality-snapshot.json");
  }
  if (!reality) reality = await buildRuntimeRealitySnapshot();

  const dirtyCount = gitDirtyCount() ?? 0;
  const behind = align.behindOriginMain === true;
  let syncStatus = "UNKNOWN";
  if (behind) syncStatus = "behind_origin_main";
  else if (align.skipReason === "not_on_main") syncStatus = "skip_not_main";
  else if (align.skipReason === "no_origin_main_ref") syncStatus = "skip_no_origin_main";
  else if (align.branch === "main" && align.remoteHead) syncStatus = "aligned";

  const compliance = readJson("data/tsos-compliance-officer-last-run.json");
  const cClass = classifyComplianceSteps(compliance);

  const overseerSummary = readJson("data/tsos-overseer-summary.json");
  const overseerState = readJson("data/tsos-overseer-state.json");
  const oClass = overseerFailureBuckets(overseerSummary);

  const fail_closed = mergeFailureRows(cClass.fail_closed_failures, oClass.fail_closed_failures);
  const degraded = [...oClass.degraded_failures];
  const advisory = mergeFailureRows(cClass.advisory_failures, oClass.advisory_failures);

  const quarantine = readJson("data/quarantined-tasks.json");
  const lastQuarantined = pickLastQuarantined(quarantine);

  let config = { lanes: [] };
  try {
    config = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "tsos-autonomy-lanes.json"), "utf8"));
  } catch {
    /* ignore */
  }

  const builderLanes = (config.lanes || []).filter((l) => l.type === "builder");
  const queues = [];
  let lastFailedFromSlice = null;
  for (const lane of builderLanes) {
    const absLast = laneLastRunPath(lane);
    const lr = readJson(path.relative(ROOT, absLast));
    const st = readJson(path.relative(ROOT, laneStatePath(lane)));
    const lf = lastFailedFromQueueLastRun(lr);
    if (lf && (!lastFailedFromSlice || (lr?.finished_at || "") > (lastFailedFromSlice.finished_at || ""))) {
      lastFailedFromSlice = { ...lf, queue_file: path.relative(ROOT, absLast) };
    }
    queues.push({
      lane_id: lane.id,
      lane_name: lane.lane_name,
      last_run_relative: path.relative(ROOT, absLast),
      ok: lr?.ok,
      runner_exit_code: lr?.runner_exit_code,
      finished_at: lr?.finished_at || null,
      idle_slice: lr?.idle_slice ?? null,
      build_commits: lr?.build_commits ?? null,
      last_failed_task_in_slice: lf,
      daemon_state_status: st?.status || null,
      daemon_last_success_at: st?.lastSuccessAt || null,
    });
  }

  const overseerPidPath = path.join(ROOT, "data", "tsos-runtime-overseer.pid");
  const overseerPid = readPidFile(overseerPidPath);
  const daemons = {
    overseer: {
      pid_file_relative: "data/tsos-runtime-overseer.pid",
      pid: overseerPid,
      pid_alive: overseerPid ? isProcessAlive(overseerPid) : false,
      state_status: overseerState?.status || null,
      cycle_no: overseerState?.cycleNo ?? overseerSummary?.cycle_no ?? null,
      last_success_at: overseerState?.lastSuccessAt || null,
    },
    builders: builderLanes.map((lane) => {
      const pidPath = lanePidPath(lane);
      const pid = readPidFile(pidPath);
      return {
        lane_id: lane.id,
        lane_name: lane.lane_name,
        pid_file_relative: path.relative(ROOT, pidPath),
        pid,
        pid_alive: pid ? isProcessAlive(pid) : false,
        state_relative: path.relative(ROOT, laneStatePath(lane)),
        state_status: readJson(path.relative(ROOT, laneStatePath(lane)))?.status || null,
      };
    }),
  };

  const tokenLine = readLastJsonlLine("data/token-efficiency-log.jsonl");
  const token_status = tokenLine
    ? {
        ts: tokenLine.ts || null,
        efficiency_grade: tokenLine.efficiency?.grade || null,
        efficiency_score: tokenLine.efficiency?.score ?? null,
        source: "data/token-efficiency-log.jsonl",
      }
    : { ts: null, efficiency_grade: "UNKNOWN", efficiency_score: null, source: "UNKNOWN" };

  const doctor = readJson("data/tsos-doctor-last-run.json");
  const operational = readJson("data/lifeos-operational-grade-last-run.json");

  const next_required_human_action = computeNextHumanAction({
    align,
    compliance,
    dirtyCount,
    failClosed: fail_closed,
    behind,
    last_quarantined: lastQuarantined,
    overseer_summary: overseerSummary,
  });

  const dashboard = {
    schema_version: "operator_dashboard_v1",
    generated_at: new Date().toISOString(),
    DASHBOARD_STATE_ID: `od-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 10)}`,
    repo: {
      sync_status: syncStatus,
      branch: align.branch,
      head_sha: align.head,
      origin_main_sha: align.remoteHead || "UNKNOWN",
      behind_origin_main: align.behindOriginMain,
      skip_reason: align.skipReason,
      dirty_file_count: dirtyCount,
    },
    runtime_reality_pointer: {
      SYSTEM_STATE_ID: reality.SYSTEM_STATE_ID || "UNKNOWN",
      COMMIT_SHA: reality.COMMIT_SHA || align.head,
      SSOT_VERSION: reality.SSOT_VERSION || "UNKNOWN",
      DRIFT_SEVERITY_HINT: reality.DRIFT_SEVERITY_HINT || "UNKNOWN",
    },
    deploy: {
      deploy_version: reality.DEPLOY_VERSION || {},
      deploy_commit_sha: reality.DEPLOY_VERSION?.deploy_commit_sha || "UNKNOWN",
      policy_revision: reality.DEPLOY_VERSION?.policy_revision || "UNKNOWN",
    },
    compliance_officer: compliance
      ? {
          finished_at: compliance.finished_at,
          exit_fail: compliance.exit_fail,
          local_critical_fail: compliance.local_critical_fail,
          remote_critical_fail: compliance.remote_critical_fail,
          steps_summary: cClass.steps_summary,
        }
      : "UNKNOWN",
    overseer: overseerSummary
      ? {
          ts: overseerSummary.ts,
          cycle_no: overseerSummary.cycle_no,
          overall_status: overseerSummary.overall_status,
          failing_checks: overseerSummary.failing_checks || [],
          failing_required_checks: overseerSummary.failing_required_checks || [],
          failing_advisory_checks: overseerSummary.failing_advisory_checks || [],
          degraded_lanes: overseerSummary.degraded_lanes || [],
        }
      : "UNKNOWN",
    daemons,
    queues,
    last_failed_task: lastFailedFromSlice || lastQuarantined || null,
    quarantine: {
      count: Array.isArray(quarantine) ? quarantine.length : 0,
      newest: lastQuarantined,
    },
    failures_by_class: {
      fail_closed,
      degraded,
      advisory,
    },
    token_status,
    probes: {
      tsos_doctor_last_run: doctor,
      lifeos_operational_grade_last_run: operational,
    },
    next_required_human_action,
    epistemic: {
      UNKNOWN_ALLOWED: true,
      note: "Dashboard is observability only; does not auto-fix. FSAR / Temporal Adversary is backlog until dashboard + strict CI are stable.",
    },
  };

  return dashboard;
}

export async function writeOperatorDashboard() {
  const dash = await buildOperatorDashboard();
  const dir = path.dirname(OUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(dash, null, 2)}\n`, "utf8");
  return dash;
}

async function main() {
  const dash = await writeOperatorDashboard();
  const fc = dash.failures_by_class.fail_closed.length;
  const adv = dash.failures_by_class.advisory.length;
  console.log(
    `[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=WROTE | operator-dashboard | ${OUT} | repo=${dash.repo.sync_status} | fail_closed=${fc} | advisory=${adv}`,
  );
}

if (isMainModule()) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
