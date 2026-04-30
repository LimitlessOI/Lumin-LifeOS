#!/usr/bin/env node
/**
 * One-shot builder pipeline check for Conductor sessions (North Star §2.11a — TSOS).
 *
 * Runs in order (all steps execute even if an earlier step fails — full picture):
 *   1) council-builder-preflight — exit 0/1/2 per that script
 *   2) lifeos-builder-supervisor --probe-only — same path the daemon uses for cheap HTTP proof
 *   3) tsos-doctor — graded readiness + next command hint
 *   4) token-efficiency scorecard (free-tier remaining %, daily savings %, 7d trend)
 *   5) Print local data/builder-daemon-state.json summary if present (24/7 operator runner)
 *
 * Env: same as `docs/BUILDER_OPERATOR_ENV.md` (PUBLIC_BASE_URL + command key aliases).
 * Loads dotenv + .env.local like preflight.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import "dotenv/config";
import dotenv from "dotenv";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

function runStep(title, args) {
  console.log(`\n${"=".repeat(64)}\n${title}\n${"=".repeat(64)}\n`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  return typeof r.status === "number" ? r.status : 1;
}

function printDaemonState() {
  console.log(`\n${"=".repeat(64)}\n[5/5] Local daemon receipts (if present)\n${"=".repeat(64)}\n`);
  const statePath = path.join(ROOT, "data", "builder-daemon-state.json");
  if (!existsSync(statePath)) {
    console.log(
      "No data/builder-daemon-state.json — daemon not writing here yet (OK on CI-only shells).\n" +
        "For 24/7 receipts: pm2 on an always-on host — see docs/BUILDER_24_7_ALPHA_CHECKLIST.md"
    );
    return;
  }
  try {
    const st = JSON.parse(readFileSync(statePath, "utf8"));
    const summary = {
      status: st.status,
      cyclesOk: st.cyclesOk,
      cyclesFailed: st.cyclesFailed,
      lastSuccessAt: st.lastSuccessAt,
      lastFailureAt: st.lastFailureAt,
      lastError: st.lastError ? String(st.lastError).slice(0, 500) : null,
    };
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      "\nHTTP mirror (same disk as server process): GET /api/v1/system/builder-health?log_lines=20 — docs/SYSTEM_CAPABILITIES.md B6"
    );
  } catch (e) {
    console.log("Could not read daemon state:", e instanceof Error ? e.message : e);
  }
}

function main() {
  console.log("Builder operator suite — LifeOS platform under TSOS discipline (North Star §2.11a)\n");
  console.log(
    "Revenue chain note: ClientCare → TC → API savings lanes are orthogonal; this suite proves **builder + deploy** readiness so system-authored work can ship. See docs/SYSTEM_CAPABILITIES.md matrix."
  );

  const preflightScript = path.join(ROOT, "scripts", "council-builder-preflight.mjs");
  const supervisorScript = path.join(ROOT, "scripts", "lifeos-builder-supervisor.mjs");
  const doctorScript = path.join(ROOT, "scripts", "tsos-doctor.mjs");
  const tokenEfficiencyScript = path.join(ROOT, "scripts", "tsos-token-efficiency.mjs");

  const c1 = runStep("[1/5] npm run builder:preflight (logic)", [preflightScript]);
  const c2 = runStep("[2/5] Supervisor probe — same daemon supervise leg (HTTP only)", [supervisorScript, "--probe-only"]);
  const c3 = runStep("[3/5] npm run tsos:doctor — graded probes + weaknesses", [doctorScript]);
  const c4 = runStep("[4/5] npm run tsos:tokens — free-tier remaining + savings trend", [tokenEfficiencyScript]);

  printDaemonState();

  /** First failing step wins exit code for automation; doctor uses 1 when score < 80. */
  const code = c1 !== 0 ? c1 : c2 !== 0 ? c2 : c3 !== 0 ? c3 : c4;
  console.log(`\n---\nComposite exit ${code} — preflight=${c1} probe=${c2} doctor=${c3} tokens=${c4}`);
  console.log(
    "Next when green: npm run lifeos:builder:orchestrate (or POST /build). When not: docs/ENV_DIAGNOSIS_PROTOCOL.md + docs/ops/BUILDER_PRODUCTION_FIX.md for 404 /domains.\n"
  );

  process.exit(code);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
