#!/usr/bin/env node
/**
 * SYNOPSIS: Operator runtime status — human-readable "heart monitor" (read-only).
 * Operator runtime status — human-readable "heart monitor" (read-only).
 * Reads `data/runtime-reality-snapshot.json` plus receipts listed in `docs/OPERATOR_DASHBOARD_JSON.md`.
 * Reuses in-memory `buildOperatorDashboard()` for queue/daemon/next-action (no JSON write).
 *
 * Usage:
 *   npm run operator:status
 *   npm run operator:status -- --html   # writes data/operator-runtime-status.html (gitignored)
 *
 * Receipt: appends one JSONL line to `data/operator-status-log.jsonl`.
 *
 * @ssot docs/OPERATOR_DASHBOARD_JSON.md
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildOperatorDashboard } from "./generate-operator-dashboard-json.mjs";
import { buildRuntimeRealitySnapshot } from "./generate-runtime-reality-snapshot.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOG_JSONL = path.join(ROOT, "data", "operator-status-log.jsonl");
const HTML_OUT = path.join(ROOT, "data", "operator-runtime-status.html");
const SNAPSHOT_STALE_SEC = Number(process.env.OPERATOR_STATUS_SNAPSHOT_STALE_SEC || 300);

function isMainModule() {
  const a = process.argv[1];
  if (!a) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(a)).href;
  } catch {
    return false;
  }
}

function readJsonRel(rel) {
  const p = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function shaShort(s) {
  if (!s || s === "UNKNOWN") return String(s || "UNKNOWN");
  return String(s).length > 12 ? `${String(s).slice(0, 12)}…` : String(s);
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appendReceipt(payload) {
  const dir = path.dirname(LOG_JSONL);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_JSONL, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (e) {
    console.warn("[operator:status] could not append receipt:", e?.message || e);
  }
}

function trunc(s, n = 4000) {
  const t = String(s);
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function parseIsoMs(value) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : null;
}

function equalOrUnknown(a, b) {
  const av = a ?? "UNKNOWN";
  const bv = b ?? "UNKNOWN";
  return av === bv;
}

export function evaluateSnapshotFreshness({ diskSnapshot, freshSnapshot, staleSec = SNAPSHOT_STALE_SEC }) {
  if (!freshSnapshot) {
    return {
      status: "FAIL_CLOSED",
      reasons: ["fresh_snapshot_missing"],
      ageSec: null,
      conflictingFields: [],
    };
  }

  if (!diskSnapshot) {
    return {
      status: "STALE",
      reasons: ["snapshot_missing_on_disk"],
      ageSec: null,
      conflictingFields: [],
    };
  }

  const diskMs = parseIsoMs(diskSnapshot.generated_at);
  const ageSec = diskMs === null ? null : Math.max(0, Math.round((Date.now() - diskMs) / 1000));
  const conflictingFields = [];
  const checks = [
    ["COMMIT_SHA", diskSnapshot.COMMIT_SHA, freshSnapshot.COMMIT_SHA],
    ["ORIGIN_MAIN_SHA", diskSnapshot.ORIGIN_MAIN_SHA, freshSnapshot.ORIGIN_MAIN_SHA],
    ["behind_origin_main", diskSnapshot?.GIT_SYNC?.behind_origin_main, freshSnapshot?.GIT_SYNC?.behind_origin_main],
    ["skip_reason", diskSnapshot?.GIT_SYNC?.skip_reason, freshSnapshot?.GIT_SYNC?.skip_reason],
    ["DRIFT_SEVERITY_HINT", diskSnapshot.DRIFT_SEVERITY_HINT, freshSnapshot.DRIFT_SEVERITY_HINT],
  ];
  for (const [field, diskValue, freshValue] of checks) {
    if (!equalOrUnknown(diskValue, freshValue)) conflictingFields.push(field);
  }

  const reasons = [];
  if (ageSec === null) reasons.push("snapshot_generated_at_invalid");
  else if (ageSec > staleSec) reasons.push(`snapshot_older_than_${staleSec}s`);
  if (conflictingFields.length > 0) reasons.push(`snapshot_conflicts:${conflictingFields.join(",")}`);

  let status = "FRESH";
  if ((freshSnapshot?.GIT_SYNC?.behind_origin_main === true) || freshSnapshot?.DRIFT_SEVERITY_HINT === "FAIL_CLOSED") {
    status = "FAIL_CLOSED";
  } else if (reasons.length > 0) {
    status = "STALE";
  }

  return { status, reasons, ageSec, conflictingFields };
}

function formatText({ snap, dash, snapPath, snapDiskState, snapFromDisk }) {
  const g = snap?.GIT_SYNC || {};
  const align =
    g.behind_origin_main === true
      ? "BEHIND origin/main (fail-closed for automation)"
      : g.skip_reason
        ? `SKIP (${g.skip_reason})`
        : snap?.BRANCH === "main" && snap?.ORIGIN_MAIN_SHA && snap?.COMMIT_SHA === snap?.ORIGIN_MAIN_SHA
          ? "aligned (main = origin/main)"
          : snap?.COMMIT_SHA && snap?.ORIGIN_MAIN_SHA
            ? `main vs origin: ${shaShort(snap.COMMIT_SHA)} vs ${shaShort(snap.ORIGIN_MAIN_SHA)}`
            : "UNKNOWN";

  const cl = snap?.COMPLIANCE_LAST;
  const complianceLine =
    cl && typeof cl === "object"
      ? `exit_fail=${cl.exit_fail} finished_at=${cl.finished_at || "?"}`
      : String(cl || "UNKNOWN");

  const lines = [];
  lines.push("");
  lines.push("══════════════════════════════════════════════════════════════");
  lines.push("  Operator runtime status (read-only heart monitor)");
  lines.push("══════════════════════════════════════════════════════════════");
  lines.push(
    `  Snapshot file: ${snapPath}${
      snapFromDisk
        ? " (read from disk)"
        : " — not on disk; in-memory rebuild (run `npm run runtime:reality-snapshot` or compliance to persist)"
    }`,
  );
  lines.push(
    `  Snapshot freshness     ${snapDiskState?.status ?? "UNKNOWN"}${
      snapDiskState?.ageSec != null ? ` age=${snapDiskState.ageSec}s` : ""
    }${
      snapDiskState?.reasons?.length ? ` reasons=${snapDiskState.reasons.join(";")}` : ""
    }`,
  );
  lines.push("");
  lines.push("  Runtime reality (authoritative row)");
  lines.push(`    SYSTEM_STATE_ID     ${snap?.SYSTEM_STATE_ID ?? "UNKNOWN"}`);
  lines.push(`    COMMIT_SHA          ${shaShort(snap?.COMMIT_SHA)}`);
  lines.push(`    BRANCH              ${snap?.BRANCH ?? "UNKNOWN"}`);
  lines.push(`    ORIGIN_MAIN_SHA     ${shaShort(snap?.ORIGIN_MAIN_SHA)}`);
  lines.push(`    Origin alignment    ${align}`);
  lines.push(`    SSOT_VERSION        ${shaShort(snap?.SSOT_VERSION)}`);
  lines.push(`    DICT_VERSION        ${shaShort(snap?.DICT_VERSION)}`);
  lines.push(`    SCHEMA_VERSION      ${snap?.SCHEMA_VERSION ?? "UNKNOWN"}`);
  lines.push(`    PACKAGE_VERSION     ${snap?.PACKAGE_VERSION ?? "UNKNOWN"}`);
  lines.push(`    DRIFT_SEVERITY_HINT ${snap?.DRIFT_SEVERITY_HINT ?? "UNKNOWN"}`);
  lines.push(`    COMPLIANCE_LAST     ${complianceLine}`);
  lines.push(`    QUEUE_VERSION       ${String(snap?.QUEUE_VERSION || "UNKNOWN").slice(0, 72)}`);
  lines.push(`    DEPLOY_VERSION      ${JSON.stringify(snap?.DEPLOY_VERSION || {}).slice(0, 160)}`);
  lines.push(`    CONST_SNAPSHOT      ${snap?.CONST_SNAPSHOT ?? "UNKNOWN"}`);
  lines.push("");
  lines.push("  Default builder daemon (data/builder-daemon-state.json)");
  const bd = readJsonRel("data/builder-daemon-state.json");
  lines.push(
    bd
      ? `    status=${bd.status ?? "?"} lastSuccessAt=${bd.lastSuccessAt ?? "?"}`
      : "    (file missing)",
  );
  lines.push("");
  lines.push("  Default queue last run (data/builder-continuous-queue-last-run.json)");
  const qr = readJsonRel("data/builder-continuous-queue-last-run.json");
  lines.push(
    qr
      ? `    ok=${qr.ok} runner_exit_code=${qr.runner_exit_code} finished_at=${qr.finished_at ?? "?"} lane=${qr.lane ?? "?"}`
      : "    (file missing)",
  );
  lines.push("");
  lines.push("  Aggregated (from operator dashboard logic — read-only, no dashboard JSON write)");
  lines.push(`    dirty_file_count      ${dash?.repo?.dirty_file_count ?? "?"}`);
  lines.push(`    overseer overall      ${dash?.overseer === "UNKNOWN" ? "UNKNOWN" : dash?.overseer?.overall_status ?? "?"}`);
  lines.push(`    fail_closed (n)       ${dash?.failures_by_class?.fail_closed?.length ?? 0}`);
  lines.push(
    `    last_failed_task      ${
      dash?.last_failed_task ? JSON.stringify(dash.last_failed_task).slice(0, 200) : "none"
    }`,
  );
  lines.push("");
  lines.push("  Next required human action");
  lines.push(`    ${dash?.next_required_human_action ?? "UNKNOWN"}`);
  lines.push("");
  lines.push("══════════════════════════════════════════════════════════════");
  lines.push("");
  return lines.join("\n");
}

function writeHtml({ snap, dash, snapPath }) {
  const g = snap?.GIT_SYNC || {};
  const align =
    g.behind_origin_main === true
      ? "BEHIND origin/main"
      : g.skip_reason
        ? `SKIP: ${esc(g.skip_reason)}`
        : "see COMMIT vs ORIGIN";

  const rows = [
    ["SYSTEM_STATE_ID", snap?.SYSTEM_STATE_ID ?? "UNKNOWN"],
    ["COMMIT_SHA", snap?.COMMIT_SHA ?? "UNKNOWN"],
    ["BRANCH", snap?.BRANCH ?? "UNKNOWN"],
    ["ORIGIN_MAIN_SHA", snap?.ORIGIN_MAIN_SHA ?? "UNKNOWN"],
    ["Origin alignment", align],
    ["SSOT_VERSION", snap?.SSOT_VERSION ?? "UNKNOWN"],
    ["DICT_VERSION", snap?.DICT_VERSION ?? "UNKNOWN"],
    ["SCHEMA_VERSION", snap?.SCHEMA_VERSION ?? "UNKNOWN"],
    ["DRIFT_SEVERITY_HINT", snap?.DRIFT_SEVERITY_HINT ?? "UNKNOWN"],
    ["COMPLIANCE_LAST", esc(JSON.stringify(snap?.COMPLIANCE_LAST ?? "UNKNOWN"))],
    ["QUEUE_VERSION (snap)", String(snap?.QUEUE_VERSION || "UNKNOWN").slice(0, 96)],
    [
      "builder-daemon-state.json",
      trunc(esc(JSON.stringify(readJsonRel("data/builder-daemon-state.json") || "MISSING"))),
    ],
    [
      "builder-continuous-queue-last-run.json",
      trunc(esc(JSON.stringify(readJsonRel("data/builder-continuous-queue-last-run.json") || "MISSING"))),
    ],
    ["dirty_file_count", String(dash?.repo?.dirty_file_count ?? "?")],
    [
      "overseer overall",
      dash?.overseer === "UNKNOWN" ? "UNKNOWN" : esc(dash?.overseer?.overall_status ?? "?"),
    ],
    ["fail_closed count", String(dash?.failures_by_class?.fail_closed?.length ?? 0)],
    ["last_failed_task", trunc(esc(JSON.stringify(dash?.last_failed_task || null)), 8000)],
    ["next_required_human_action", esc(dash?.next_required_human_action ?? "UNKNOWN")],
  ];

  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:left;padding:6px 10px;border:1px solid #ccc">${esc(k)}</th><td style="padding:6px 10px;border:1px solid #ccc;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all">${v}</td></tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta http-equiv="Cache-Control" content="no-store"/>
  <title>Operator runtime status</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 16px; background: #fafafa; color: #111; }
    h1 { font-size: 1.1rem; }
    p.note { color: #444; font-size: 0.9rem; max-width: 56rem; }
    table { border-collapse: collapse; background: #fff; max-width: 56rem; }
  </style>
</head>
<body>
  <h1>Operator runtime status (read-only)</h1>
  <p class="note">Generated locally. Sources: <code>${esc(snapPath)}</code>, compliance/daemon/queue receipts, in-memory dashboard aggregation (no write to operator-dashboard.json). Not product UI.</p>
  <p class="note">Snapshot path on disk: <code>${esc(snapPath)}</code></p>
  <table>${tr}</table>
</body>
</html>\n`;

  const dir = path.dirname(HTML_OUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(HTML_OUT, html, "utf8");
}

export async function printOperatorRuntimeStatus(options = {}) {
  const wantHtml = options.html === true || process.argv.includes("--html");
  const snapRel = "data/runtime-reality-snapshot.json";
  const diskSnap = readJsonRel(snapRel);
  const snapFromDisk = Boolean(diskSnap);
  const snap = await buildRuntimeRealitySnapshot();
  const snapDiskState = evaluateSnapshotFreshness({ diskSnapshot: diskSnap, freshSnapshot: snap });
  const dash = await buildOperatorDashboard();

  const text = formatText({ snap, dash, snapPath: snapRel, snapFromDisk, snapDiskState });
  process.stdout.write(text);

  if (wantHtml) {
    writeHtml({ snap, dash, snapPath: snapRel });
    process.stdout.write(`\nWrote ${path.relative(ROOT, HTML_OUT)} (open locally in browser)\n`);
  }

  const effectiveDrift =
    snapDiskState.status === "FAIL_CLOSED"
      ? "FAIL_CLOSED"
      : snapDiskState.status === "STALE"
        ? "STALE"
        : snap?.DRIFT_SEVERITY_HINT ?? "?";
  const machine = `[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=PROBE | operator:status | DRIFT=${effectiveDrift} | COMMIT=${shaShort(snap?.COMMIT_SHA)} | fail_closed=${dash?.failures_by_class?.fail_closed?.length ?? 0}`;
  console.log(machine);

  appendReceipt({
    ts: new Date().toISOString(),
    event: "operator_status",
    drift: snap?.DRIFT_SEVERITY_HINT,
    commit: snap?.COMMIT_SHA,
    system_state_id: snap?.SYSTEM_STATE_ID,
    fail_closed_n: dash?.failures_by_class?.fail_closed?.length ?? 0,
    snap_from_disk: snapFromDisk,
    snapshot_disk_status: snapDiskState.status,
    snapshot_disk_reasons: snapDiskState.reasons,
    html: wantHtml,
  });

  return { snap, dash, machine, snapDiskState };
}

async function main() {
  await printOperatorRuntimeStatus({ html: process.argv.includes("--html") });
}

if (isMainModule()) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
