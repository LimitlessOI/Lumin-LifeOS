#!/usr/bin/env node
/**
 * SYNOPSIS: Single Source Runtime Reality — machine snapshot for agents, daemons, and audits.
 * Single Source Runtime Reality — machine snapshot for agents, daemons, and audits.
 * Writes `data/runtime-reality-snapshot.json` (gitignored). Extend fields only with SSOT:
 * `docs/RUNTIME_REALITY_SNAPSHOT.md`.
 *
 * Usage: `npm run runtime:reality-snapshot`
 * Optional: `RUNTIME_SNAPSHOT_FETCH_DEPLOY=1` + `PUBLIC_BASE_URL` + command key → fills deploy hints from `/ready`.
 *
 * @ssot docs/RUNTIME_REALITY_SNAPSHOT.md
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getGitOriginAlignment } from "./lib/git-origin-alignment.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "runtime-reality-snapshot.json");

function isMainModule() {
  const a = process.argv[1];
  if (!a) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(a)).href;
  } catch {
    return false;
  }
}

function sha256File(p) {
  try {
    const buf = fs.readFileSync(p);
    return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
  } catch {
    return "UNKNOWN";
  }
}

function sha256Concat(paths) {
  const h = crypto.createHash("sha256");
  for (const rel of paths) {
    const p = path.join(ROOT, rel);
    try {
      h.update(rel);
      h.update("\0");
      h.update(fs.readFileSync(p));
      h.update("\n");
    } catch {
      h.update(rel);
      h.update("\0MISSING\n");
    }
  }
  return h.digest("hex").slice(0, 16);
}

function latestMigrationBasename() {
  const dir = path.join(ROOT, "db", "migrations");
  try {
    const names = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    return names.length ? names[names.length - 1] : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

function readJsonSafe(rel) {
  const p = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function constSnapshotId(commitSha) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  const tail = commitSha ? commitSha.slice(0, 7) : "unknown";
  return `${d}Z-${tail}`;
}

async function fetchDeployHints() {
  if (!/^1|true|yes$/i.test(String(process.env.RUNTIME_SNAPSHOT_FETCH_DEPLOY || "").trim())) {
    return { deploy_probe: "skipped_env", policy_revision: "UNKNOWN", ready_ok: null };
  }
  const base =
    (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || "").replace(/\/$/, "");
  const key =
    process.env.COMMAND_CENTER_KEY ||
    process.env.COMMAND_KEY ||
    process.env.LIFEOS_KEY ||
    process.env.API_KEY ||
    "";
  if (!base || !key) {
    return { deploy_probe: "skipped_missing_url_or_key", policy_revision: "UNKNOWN", ready_ok: null };
  }
  try {
    const u = new URL("/api/v1/lifeos/builder/ready", base.endsWith("/") ? base : `${base}/`);
    const r = await fetch(u, {
      headers: { "x-command-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    const codegen = j?.codegen || j?.builder?.codegen || {};
    return {
      deploy_probe: "ok",
      ready_http: r.status,
      ready_ok: r.ok,
      policy_revision: codegen.policy_revision != null ? String(codegen.policy_revision) : "UNKNOWN",
      deploy_commit_sha: codegen.deploy_commit_sha || j?.deploy_commit_sha || "UNKNOWN",
    };
  } catch (e) {
    return {
      deploy_probe: "error",
      ready_ok: false,
      policy_revision: "UNKNOWN",
      error: String(e?.message || e).slice(0, 200),
    };
  }
}

export async function buildRuntimeRealitySnapshot() {
  const pkg = readJsonSafe("package.json") || {};
  const align = getGitOriginAlignment(ROOT);

  const nssotPaths = ["docs/constitution/NORTH_STAR_SSOT.md", "docs/SSOT_COMPANION.md"];
  const ssot_version = sha256Concat(nssotPaths);

  const codebook = sha256File(path.join(ROOT, "config", "codebook-v1.js"));

  const queuePaths = [
    "data/builder-continuous-queue-last-run.json",
    "data/builder-continuous-queue-last-run.site-builder-autonomous-queue.json",
    "data/builder-continuous-queue-last-run.tc-service-builder-queue.json",
  ];
  let queue_version = "UNKNOWN";
  for (const q of queuePaths) {
    const h = sha256File(path.join(ROOT, q));
    if (h !== "UNKNOWN") {
      queue_version = `${path.basename(q)}:${h}`;
      break;
    }
  }

  const compliance = readJsonSafe("data/tsos-compliance-officer-last-run.json");
  const deploy = await fetchDeployHints();

  const commitSha = align.head;
  const systemStateId = `rr-${new Date().toISOString()}-${crypto.randomBytes(3).toString("hex")}`;

  let driftSeverityHint = "INFO";
  if (align.behindOriginMain === true || compliance?.exit_fail === true) {
    driftSeverityHint = "FAIL_CLOSED";
  } else if (align.skipReason) {
    driftSeverityHint = "WARNING";
  }

  const snapshot = {
    schema_version: "runtime_reality_v1",
    generated_at: new Date().toISOString(),
    SYSTEM_STATE_ID: systemStateId,
    CONST_SNAPSHOT: constSnapshotId(commitSha),
    COMMIT_SHA: commitSha,
    BRANCH: align.branch,
    ORIGIN_MAIN_SHA: align.remoteHead || "UNKNOWN",
    GIT_SYNC: {
      behind_origin_main: align.behindOriginMain,
      skip_reason: align.skipReason,
    },
    SSOT_VERSION: ssot_version,
    DICT_VERSION: codebook,
    SCHEMA_VERSION: latestMigrationBasename(),
    PACKAGE_VERSION: pkg.version || "UNKNOWN",
    DEPLOY_VERSION: deploy,
    QUEUE_VERSION: queue_version,
    COMPLIANCE_LAST: compliance
      ? {
          finished_at: compliance.finished_at || "UNKNOWN",
          exit_fail: compliance.exit_fail ?? "UNKNOWN",
        }
      : "UNKNOWN",
    DRIFT_SEVERITY_HINT: driftSeverityHint,
    epistemic: {
      UNKNOWN_ALLOWED: true,
      note: "Fields may be UNKNOWN until probes succeed; never invent deploy parity.",
    },
  };

  return snapshot;
}

/** Build + write default `data/runtime-reality-snapshot.json` (used by CLI and compliance officer). */
export async function writeRuntimeRealitySnapshot() {
  const snap = await buildRuntimeRealitySnapshot();
  const dir = path.dirname(OUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(snap, null, 2)}\n`, "utf8");
  return snap;
}

async function main() {
  const snap = await writeRuntimeRealitySnapshot();
  const sev = snap.DRIFT_SEVERITY_HINT;
  console.log(
    `[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=PROBE | runtime-reality-snapshot | ${OUT} | DRIFT_SEVERITY_HINT=${sev} | COMMIT_SHA=${snap.COMMIT_SHA.slice(0, 7)}`,
  );
}

if (isMainModule()) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
