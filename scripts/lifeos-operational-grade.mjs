#!/usr/bin/env node
/**
 * LifeOS + TSOS operational readiness score (0–100) — deploy parity, builder, core APIs, public shells.
 *
 * Complements `tsos:doctor` and `tsos:tokens` (token **savings** % is a different axis than **reachability**).
 *
 * Env: `PUBLIC_BASE_URL` or `BUILDER_BASE_URL` + `COMMAND_CENTER_KEY` (or aliases). Loads `.env.local`.
 *
 * Writes: `data/lifeos-operational-grade-last-run.json` + appends `data/lifeos-operational-grade-log.jsonl`
 * Exit: 0 if `score >= TSOS_MIN_OPERATIONAL_SCORE` (default 90) and all **critical** checks pass; 1 otherwise.
 * Optional: `TSOS_ENFORCE_OPERATIONAL_GRADE=0` to print only (exit 0 unless critical fail).
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import "dotenv/config";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  "http://127.0.0.1:3000"
).replace(/\/$/, "");

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  "";

const minScore = Math.min(100, Math.max(0, parseInt(process.env.TSOS_MIN_OPERATIONAL_SCORE || "90", 10) || 90));
const enforce = process.env.TSOS_ENFORCE_OPERATIONAL_GRADE !== "0";

const authHeaders = key
  ? { "x-command-key": key, accept: "application/json" }
  : { accept: "application/json" };

function readRepoPolicyRevision() {
  const p = path.join(ROOT, "routes", "lifeos-council-builder-routes.js");
  try {
    const t = fs.readFileSync(p, "utf8");
    const m = t.match(/BUILDER_CODEGEN_POLICY_REVISION\s*=\s*['"]([^'"]+)['"]/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: authHeaders });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _parseError: true, raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, json, text };
}

function writeReceipt(payload) {
  const dir = path.join(ROOT, "data");
  const last = path.join(dir, "lifeos-operational-grade-last-run.json");
  const log = path.join(dir, "lifeos-operational-grade-log.jsonl");
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(last, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    fs.appendFileSync(log, `${JSON.stringify({ ts: new Date().toISOString(), ...payload })}\n`, "utf8");
  } catch (e) {
    console.warn("[operational-grade] could not write receipt:", e?.message || e);
  }
}

async function main() {
  if (!key) {
    console.error("lifeos-operational-grade: missing COMMAND_CENTER_KEY (or alias) — many checks need auth.\n");
    process.exit(1);
  }

  const repoPolicy = readRepoPolicyRevision();
  /** @type {{ id: string, weight: number, critical: boolean, pass: boolean, detail: string }[]} */
  const results = [];

  const add = (id, weight, critical, pass, detail) => {
    results.push({ id, weight, critical, pass, detail: String(detail).slice(0, 400) });
  };

  // 1) healthz
  {
    const r = await fetch(`${base}/healthz`);
    const pass = r.ok;
    add("healthz", 10, true, pass, `HTTP ${r.status}`);
  }

  // 2) builder ready + policy parity
  {
    const { status, json } = await fetchJson(`${base}/api/v1/lifeos/builder/ready`);
    const live =
      json?.codegen?.policy_revision ||
      json?.builder?.codegen_policy_revision ||
      null;
    const pass = status === 200 && json?.ok === true && live && repoPolicy && live === repoPolicy;
    add(
      "builder_ready_policy_parity",
      20,
      true,
      pass,
      pass
        ? `policy_revision=${live} (matches repo)`
        : `status=${status} live=${live} repo=${repoPolicy} (deploy drift if live≠repo)`,
    );
  }

  // 3) domains
  {
    const { status, json } = await fetchJson(`${base}/api/v1/lifeos/builder/domains`);
    const n = Array.isArray(json?.domains) ? json.domains.length : 0;
    const pass = status === 200 && json?.ok === true && n > 0;
    add("builder_domains", 15, true, pass, `HTTP ${status} domains=${n}`);
  }

  // 4) gaps (reachable — gap **volume** is advisory)
  {
    const { status, json } = await fetchJson(`${base}/api/v1/lifeos/builder/gaps?limit=20`);
    const pass = status === 200 && json?.ok !== false;
    const bucket = json?.buckets || json?.summary || "";
    add("builder_gaps", 10, false, pass, pass ? `reachable (${typeof bucket === "object" ? "ok" : "json"})` : `HTTP ${status}`);
  }

  // 5) system builder-health
  {
    const { status, json } = await fetchJson(`${base}/api/v1/system/builder-health`);
    const pass = status === 200 && (json?.ok === true || json?.status);
    add("system_builder_health", 10, false, pass, `HTTP ${status}`);
  }

  // 6) ambient nudge (DB + calendar path)
  {
    const { status, json } = await fetchJson(`${base}/api/v1/lifeos/ambient/nudge?user=adam`);
    const pass = status === 200 && json?.ok === true;
    add("ambient_nudge", 15, false, pass, pass ? "ambient API OK" : `HTTP ${status}`);
  }

  // 7) Public overlays (shell acceptance — no auth)
  {
    const r = await fetch(`${base}/overlay/lifeos-dashboard.html`);
    const pass = r.ok && (await r.text()).length > 500;
    add("overlay_dashboard_html", 10, false, pass, `HTTP ${r.status} bytes_ok=${pass}`);
  }
  {
    const r = await fetch(`${base}/overlay/lifeos-app.html`);
    const pass = r.ok && (await r.text()).length > 500;
    add("overlay_lifeos_app_html", 10, false, pass, `HTTP ${r.status} bytes_ok=${pass}`);
  }

  let score = 0;
  let criticalFail = false;
  for (const x of results) {
    if (x.pass) score += x.weight;
    if (x.critical && !x.pass) criticalFail = true;
  }
  score = Math.round(Math.min(100, score));

  const payload = {
    schema_version: "lifeos_operational_grade_v1",
    finished_at: new Date().toISOString(),
    base,
    score,
    min_score_config: minScore,
    enforce,
    critical_fail: criticalFail,
    checks: results,
    repo_policy_revision: repoPolicy,
    hint: criticalFail
      ? "Fix deploy drift (Railway image vs main), builder routes, or keys — see docs/ops/BUILDER_PRODUCTION_FIX.md"
      : score < minScore
        ? "Raise score: fix failing non-critical checks (ambient, overlays, gaps reachability)."
        : "Operational readiness aligned with Amendment 21 LifeOS P1 execution path.",
  };

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(" LifeOS operational grade (deploy + builder + shells)");
  console.log("════════════════════════════════════════════════════════════════\n");
  console.log(JSON.stringify(payload, null, 2));
  console.log(`\nScore: ${score}/100 (minimum ${minScore})`);

  writeReceipt(payload);

  if (criticalFail) {
    console.error("\n[FAIL] Critical check failed — exit 1.");
    process.exit(1);
  }
  if (enforce && score < minScore) {
    console.error(`\n[FAIL] Score ${score} < ${minScore} — set TSOS_MIN_OPERATIONAL_SCORE or fix checks.`);
    process.exit(1);
  }
  console.log("\n[OK] Operational grade passed.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
