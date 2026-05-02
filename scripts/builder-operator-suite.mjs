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
 *   6) lifeos-operational-grade — deploy parity, builder, ambient, public overlays (0–100 score)
 *
 * After each leg, prints a **deterministic** 1–10 self-grade (exit code + JSON receipts — not an LLM).
 * Composite receipt: `data/tsos-builder-suite-last-run.json`.
 * **Per-leg excellence:** prints whether **every** leg is 10/10 (independent axes — not one average).
 * Optional fail-closed: `TSOS_ENFORCE_ALL_LEGS_10=1` → exit **3** if any leg &lt; 10 (when base composite exit would be 0).
 *
 * Env: same as `docs/BUILDER_OPERATOR_ENV.md` (PUBLIC_BASE_URL + command key aliases).
 * Loads dotenv + .env.local like preflight.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import "dotenv/config";
import dotenv from "dotenv";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  averageGrade10,
  daemonObservabilityGrade,
  doctorGradeFromReceipt,
  gradeFromExitSimple,
  operationalGradeFromReceipt,
  printStepSelfGrade,
  tokenEfficiencyGradeFromLog,
} from "./tsos-suite-self-grade.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

const enforceAllLegs10 = process.env.TSOS_ENFORCE_ALL_LEGS_10 === "1";

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
  console.log(`\n${"=".repeat(64)}\n[5/6] Local daemon receipts (if present)\n${"=".repeat(64)}\n`);
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

function writeSuiteReceipt(payload) {
  const dir = path.join(ROOT, "data");
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "tsos-builder-suite-last-run.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch (e) {
    console.warn("[tsos:builder] could not write suite receipt:", e?.message || e);
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

  const operationalScript = path.join(ROOT, "scripts", "lifeos-operational-grade.mjs");

  /** @type {{ id: string, exit: number | null, grade10: number, basis: string }[]} */
  const stepRows = [];

  const c1 = runStep("[1/6] npm run builder:preflight (logic)", [preflightScript]);
  const g1 = gradeFromExitSimple(c1);
  printStepSelfGrade("[1/6] preflight", g1);
  stepRows.push({ id: "preflight", exit: c1, ...g1 });

  const c2 = runStep("[2/6] Supervisor probe — same daemon supervise leg (HTTP only)", [supervisorScript, "--probe-only"]);
  const g2 = gradeFromExitSimple(c2);
  printStepSelfGrade("[2/6] supervisor_probe", g2);
  stepRows.push({ id: "supervisor_probe", exit: c2, ...g2 });

  const c3 = runStep("[3/6] npm run tsos:doctor — graded probes + weaknesses", [doctorScript]);
  const g3 = doctorGradeFromReceipt(ROOT) ?? gradeFromExitSimple(c3);
  printStepSelfGrade("[3/6] tsos_doctor", g3);
  stepRows.push({ id: "tsos_doctor", exit: c3, ...g3 });

  const c4 = runStep("[4/6] npm run tsos:tokens — free-tier remaining + savings trend", [tokenEfficiencyScript]);
  const g4 = c4 === 0 ? tokenEfficiencyGradeFromLog(ROOT) ?? gradeFromExitSimple(0) : gradeFromExitSimple(c4);
  printStepSelfGrade("[4/6] token_efficiency", g4);
  stepRows.push({ id: "token_efficiency", exit: c4, ...g4 });

  printDaemonState();
  const daemonPath = path.join(ROOT, "data", "builder-daemon-state.json");
  const g5 = daemonObservabilityGrade(daemonPath, ROOT);
  printStepSelfGrade("[5/6] daemon_observability", g5);
  stepRows.push({ id: "daemon_observability", exit: null, ...g5 });

  const c5 = runStep("[6/6] Operational grade — LifeOS surfaces + deploy parity (see TSOS_MIN_OPERATIONAL_SCORE)", [
    operationalScript,
  ]);
  const g6 = c5 === 0 ? operationalGradeFromReceipt(ROOT) ?? gradeFromExitSimple(0) : gradeFromExitSimple(c5);
  printStepSelfGrade("[6/6] operational_grade", g6);
  stepRows.push({ id: "operational_grade", exit: c5, ...g6 });

  const grades = stepRows.map((r) => r.grade10);
  const composite = averageGrade10(grades);
  let lowest = stepRows[0];
  for (const r of stepRows) {
    if (r.grade10 < lowest.grade10) lowest = r;
  }

  const allLegsAt10 = stepRows.every((r) => r.grade10 === 10);
  const legsBelow10 = stepRows.filter((r) => r.grade10 < 10).map((r) => ({ id: r.id, grade10: r.grade10, basis: r.basis }));

  console.log(`\n${"=".repeat(64)}`);
  console.log("INDEPENDENT LEG EXCELLENCE (each axis must earn its own 10 — no shortcutting via averages)");
  console.log(`${"=".repeat(64)}`);
  console.log(`ALL SIX LEGS AT 10/10: ${allLegsAt10 ? "YES" : "NO"}`);
  if (!allLegsAt10 && legsBelow10.length) {
    console.log("Legs below 10/10 (fix each until YES — build on each fix; docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md):");
    for (const L of legsBelow10) {
      console.log(`  • ${L.id} → ${L.grade10}/10 (${L.basis})`);
    }
  }
  if (enforceAllLegs10) {
    console.log("TSOS_ENFORCE_ALL_LEGS_10=1 — fail-closed if any leg < 10/10 (exit 3 when base run is otherwise green).");
  }
  console.log(`${"=".repeat(64)}`);
  console.log(`Suite composite (informational average): ${composite ?? "?"}/10`);
  console.log("(Deterministic: exit codes + JSON receipts under data/ — not an LLM.)");
  console.log(`Weakest leg: ${lowest.id} → ${lowest.grade10}/10 (${lowest.basis})`);
  console.log(
    "Compound rule: ship durable fixes per leg — token savings (step 4) vs deploy reachability (step 6) are different axes."
  );
  console.log("Receipt: data/tsos-builder-suite-last-run.json\n");

  /** First failing step wins exit code for automation; doctor uses 1 when score < 80; operational-grade uses 1 on critical fail or score. */
  let code = c1 !== 0 ? c1 : c2 !== 0 ? c2 : c3 !== 0 ? c3 : c4 !== 0 ? c4 : c5 !== 0 ? c5 : 0;

  if (enforceAllLegs10 && !allLegsAt10 && code === 0) {
    code = 3;
    console.error("\n[FAIL] Per-leg excellence gate: not all legs at 10/10 — set TSOS_ENFORCE_ALL_LEGS_10=0 to observe only.\n");
  }

  writeSuiteReceipt({
    schema_version: "tsos_builder_suite_last_run_v2",
    finished_at: new Date().toISOString(),
    all_legs_grade10: allLegsAt10,
    legs_below_grade10: legsBelow10,
    enforce_all_legs_10: enforceAllLegs10,
    composite_grade10: composite,
    lowest_leg: { id: lowest.id, grade10: lowest.grade10, basis: lowest.basis },
    steps: stepRows,
    exits: {
      preflight: c1,
      supervisor_probe: c2,
      tsos_doctor: c3,
      token_efficiency: c4,
      operational_grade: c5,
    },
    composite_exit: code,
    note:
      "Each leg is an independent axis toward 10/10. Composite average is secondary. TSOS_ENFORCE_ALL_LEGS_10=1 fails closed (exit 3) when any leg < 10 and base exit was 0.",
  });

  console.log(`---\nComposite exit ${code} — preflight=${c1} probe=${c2} doctor=${c3} tokens=${c4} operational=${c5}`);
  console.log(
    "Next when green: npm run lifeos:builder:orchestrate (or POST /build). When not: docs/ENV_DIAGNOSIS_PROTOCOL.md + docs/ops/BUILDER_PRODUCTION_FIX.md for 404 /domains. Operational score: data/lifeos-operational-grade-last-run.json\n"
  );

  process.exit(code);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
