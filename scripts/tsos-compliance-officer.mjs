#!/usr/bin/env node
/**
 * SYNOPSIS: Platform Compliance Officer — deterministic “sheriff” pass across **TokenSaverOS + all amendment lanes**
 * Platform Compliance Officer — deterministic “sheriff” pass across **TokenSaverOS + all amendment lanes**
 * (North Star §2.13.2, §2.6, §2.10). Chains repo-wide mechanical gates: tests, SSOT/amendment alignment,
 * overlays, handoff, drift hints, manifest readiness; optional remote deploy probes. **No LLM** (Zero-Waste safe).
 *
 * Does **not** replace: multi-model council (**§2.12**), Human Guardian (**Article III**), or product semantics in
 * each `AMENDMENT_*` — only **verifiable** discipline (receipts, tags, CI-shaped checks).
 *
 * Machine channel: summary lines follow `docs/TSOS_SYSTEM_LANGUAGE.md`.
 *
 * Usage:
 *   npm run compliance-officer
 *   npm run tsos:compliance-officer -- --deep    # + amendment compaction dry-run (warn-only)
 *   npm run tsos:compliance-officer -- --remote # + preflight, doctor, tokens, operational grade
 *   npm run tsos:compliance-officer -- --remote --strict
 *
 * Env:
 *   Remote tier: `PUBLIC_BASE_URL`, `COMMAND_CENTER_KEY` (see `docs/BUILDER_OPERATOR_ENV.md`).
 *   `TSOS_COMPLIANCE_REMOTE=1` same as `--remote`.
 *   `COMPLIANCE_DEEP=1` same as `--deep`.
 *   `TSOS_COMPLIANCE_SKIP_REPO_SYNC=1` — skip **`npm run repo:sync-check`** (airgap / intentional detached HEAD).
 *   Default remote observe: `TSOS_ENFORCE_OPERATIONAL_GRADE=0`, `TSOS_ENFORCE_TOKEN_GRADE=0` unless already set.
 *
 * Writes: `data/tsos-compliance-officer-last-run.json` — then **`data/runtime-reality-snapshot.json`** + **`data/operator-dashboard.json`** (gitignored) via **`writeRuntimeRealitySnapshot()`** / **`writeOperatorDashboard()`** (`docs/RUNTIME_REALITY_SNAPSHOT.md`, `docs/OPERATOR_DASHBOARD_JSON.md`).
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import "dotenv/config";
import dotenv from "dotenv";
import { execFile } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { writeOperatorDashboard } from "./generate-operator-dashboard-json.mjs";
import { writeRuntimeRealitySnapshot } from "./generate-runtime-reality-snapshot.mjs";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

/** @param {{ id: string, critical?: boolean, tier?: 'local'|'remote' }} meta */
async function runNpmScript(scriptName, meta) {
  const critical = meta.critical !== false;
  const tier = meta.tier || "local";
  try {
    const { stdout, stderr } = await execFileAsync(npmCmd, ["run", scriptName], {
      cwd: ROOT,
      env: process.env,
      maxBuffer: 12 * 1024 * 1024,
    });
    return {
      id: meta.id,
      tier,
      script: scriptName,
      ok: true,
      critical,
      exitCode: 0,
      tailOut: String(stdout || "").slice(-1200),
      tailErr: String(stderr || "").slice(-600),
    };
  } catch (e) {
    const code = e?.code ?? 1;
    return {
      id: meta.id,
      tier,
      script: scriptName,
      ok: false,
      critical,
      exitCode: typeof code === "number" ? code : 1,
      tailOut: String(e?.stdout || "").slice(-1200),
      tailErr: String(e?.stderr || e?.message || "").slice(-600),
    };
  }
}

function writeReceipt(payload) {
  const dir = path.join(ROOT, "data");
  const last = path.join(dir, "tsos-compliance-officer-last-run.json");
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Enrich each step with a human-readable severity label so stored receipts
    // are self-explanatory: agents and humans can distinguish critical vs advisory
    // failures without needing to know the internal exit_fail logic.
    const enriched = {
      ...payload,
      steps: (payload.steps || []).map((s) => ({
        ...s,
        severity: s.critical ? "critical" : "advisory",
      })),
    };
    fs.writeFileSync(last, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");
  } catch (e) {
    console.warn("[tsos-compliance-officer] could not write receipt:", e?.message || e);
  }
}

function parseArgs(argv) {
  const remote = argv.includes("--remote") || process.env.TSOS_COMPLIANCE_REMOTE === "1";
  const strictRemote = argv.includes("--strict") || argv.includes("--strict-remote");
  const deep =
    argv.includes("--deep") ||
    process.env.COMPLIANCE_DEEP === "1" ||
    process.env.PLATFORM_COMPLIANCE_DEEP === "1";
  return { remote, strictRemote, deep };
}

/**
 * Walk the repo and collect .js files that are part of the main Express server.
 * Skips: node_modules, .git, old orphaned directories, git worktrees, builder backups,
 * and any subdirectory that has its own package.json (separate sub-project).
 * Returns absolute paths.
 */
function collectJsFiles(dir, results = [], depth = 0) {
  // Top-level directories that are never part of the main server
  const topLevelSkip = new Set([
    "node_modules", ".git",
    "frontend", "backend", "src",       // orphaned early-dev dirs
    ".worktrees", "backups", ".quarantine", // builder artifacts
    "apps",                              // CLI sub-app with own package.json
  ]);
  let entries;
  try { entries = readdirSync(dir); } catch { return results; }

  // If a non-root directory has its own package.json, it's a sub-project — skip it
  if (depth > 0 && entries.includes("package.json")) return results;

  for (const name of entries) {
    if (depth === 0 && topLevelSkip.has(name)) continue;
    const full = path.join(dir, name);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      collectJsFiles(full, results, depth + 1);
    } else if (name.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Run `node --check` on all repo JS files in parallel (concurrency 8).
 * This is what catches builder-truncated files before they reach Railway.
 * Replaces `verify:ci` which is too slow (includes evidence recording).
 */
async function checkAllJsSyntax() {
  const files = collectJsFiles(ROOT);
  const CONCURRENCY = 8;
  const errors = [];

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (f) => {
      try {
        await execFileAsync(process.execPath, ["--check", f], { cwd: ROOT });
      } catch (e) {
        const rel = path.relative(ROOT, f);
        const msg = String(e?.stderr || e?.message || "").split("\n").slice(0, 3).join(" ");
        errors.push(`${rel}: ${msg}`);
      }
    }));
  }

  const ok = errors.length === 0;
  return {
    id: "syntax_check_all_js",
    tier: "local",
    script: `(inline node --check × ${files.length} files)`,
    ok,
    critical: true,
    exitCode: ok ? 0 : 1,
    tailOut: ok ? `All ${files.length} JS files parse clean` : errors.slice(0, 5).join("\n"),
    tailErr: ok ? "" : `${errors.length} syntax error(s) — fix before pushing to Railway`,
  };
}

/** Read builder auditor grades and surface as a warn-only step */
async function checkBuilderAuditorHealth() {
  const gradesPath = path.join(ROOT, "data", "tsos-auditor-grades.json");
  const logPath = path.join(ROOT, "data", "tsos-auditor-log.jsonl");
  let ok = true;
  let note = "";

  try {
    const grades = JSON.parse(fs.readFileSync(gradesPath, "utf8"));
    const workerList = Array.isArray(grades) ? grades : Object.values(grades);
    const failing = workerList.filter((w) => w.grade && /^[DF]$/.test(w.grade));
    if (failing.length) {
      ok = false;
      note = `Builder workers at grade D/F: ${failing.map((w) => `${w.name || w.id}=${w.grade}`).join(", ")}`;
    } else {
      note = `Builder workers: ${workerList.map((w) => `${w.name || w.id}=${w.grade ?? "?"}`).join(", ")}`;
    }
  } catch {
    // No grades file yet — check if log exists at all
    if (fs.existsSync(logPath)) {
      note = "tsos-auditor-grades.json unreadable but log exists — run tsos:builder to refresh";
    } else {
      note = "No builder auditor data yet (tsos-auditor-grades.json missing)";
    }
  }

  return {
    id: "builder_auditor_health",
    tier: "local",
    script: "(inline — data/tsos-auditor-grades.json)",
    ok,
    critical: false,
    exitCode: ok ? 0 : 1,
    tailOut: note,
    tailErr: "",
  };
}

async function main() {
  const { remote, strictRemote, deep } = parseArgs(process.argv.slice(2));

  const key =
    process.env.COMMAND_CENTER_KEY ||
    process.env.COMMAND_KEY ||
    process.env.LIFEOS_KEY ||
    process.env.API_KEY ||
    "";

  const baseUrl = process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || "";

  /** @type {Awaited<ReturnType<typeof runNpmScript>>[]} */
  const steps = [];

  console.log("Platform Compliance Officer — local deterministic gates (all lanes / amendments)\n");

  // Single commit graph vs origin/main — prevents audits on a stale laptop mirror (Amendment 36 / OPERATIONAL_REALITY_SYNC).
  if (!/^1|true|yes$/i.test(String(process.env.TSOS_COMPLIANCE_SKIP_REPO_SYNC || "").trim())) {
    steps.push(await runNpmScript("repo:sync-check", { id: "repo_sync_check", tier: "local" }));
  }

  // Full JS syntax check — catches truncated builder commits before they reach Railway.
  // Inline (not verify:ci) to avoid the slow evidence-recording side effect.
  // This is the check that would have prevented the 2026-05-09 crash loop.
  steps.push(await checkAllJsSyntax());

  steps.push(await runNpmScript("test", { id: "npm_test", tier: "local" }));
  steps.push(await runNpmScript("ssot:validate", { id: "ssot_validate", tier: "local" }));
  steps.push(await runNpmScript("handoff:self-test", { id: "handoff_self_test", tier: "local" }));
  steps.push(await runNpmScript("evidence:check", { id: "evidence_check", tier: "local", critical: false }));
  steps.push(await runNpmScript("lifeos:supervise:static", { id: "supervise_static", tier: "local" }));
  steps.push(await runNpmScript("check:overlay", { id: "check_overlay", tier: "local" }));
  steps.push(await runNpmScript("lifeos:verify:ui-map", { id: "dashboard_ui_map", tier: "local" }));
  steps.push(await runNpmScript("zero-drift:check", { id: "zero_drift_check", tier: "local", critical: false }));
  steps.push(await runNpmScript("readiness:check", { id: "readiness_check", tier: "local", critical: false }));

  // Builder auditor health — surface recent worker grades from the autonomous builder daemon.
  // Warn-only: a low grade doesn't block a deploy but tells the operator the builder is degrading.
  steps.push(await checkBuilderAuditorHealth());

  if (deep) {
    console.log("\n--- Deep tier (SSOT hygiene — warn-only) ---\n");
    steps.push(await runNpmScript("ssot:compact:dryrun", { id: "ssot_compact_dryrun", tier: "local", critical: false }));
  }

  if (remote) {
    console.log("\n--- Remote tier (deploy truth — observe unless --strict) ---\n");
    if (!key || !baseUrl) {
      console.warn(
        "[TSOS-MACHINE] THINK: STATE=BLOCKED VERB=PROBE | remote tier skipped — missing COMMAND_CENTER_KEY or PUBLIC_BASE_URL/BUILDER_BASE_URL | NEXT=export per docs/BUILDER_OPERATOR_ENV.md then rerun --remote\n"
      );
    } else {
      if (!process.env.TSOS_ENFORCE_OPERATIONAL_GRADE) process.env.TSOS_ENFORCE_OPERATIONAL_GRADE = "0";
      if (!process.env.TSOS_ENFORCE_TOKEN_GRADE) process.env.TSOS_ENFORCE_TOKEN_GRADE = "0";

      const rc = strictRemote;
      steps.push(await runNpmScript("builder:preflight", { id: "builder_preflight", tier: "remote", critical: true }));
      steps.push(await runNpmScript("tsos:doctor", { id: "tsos_doctor", tier: "remote", critical: rc }));
      steps.push(await runNpmScript("tsos:tokens", { id: "tsos_tokens", tier: "remote", critical: rc }));
      steps.push(await runNpmScript("lifeos:operational-grade", { id: "lifeos_operational_grade", tier: "remote", critical: rc }));

      for (const s of steps.filter((x) => x.tier === "remote")) {
        const label = s.ok ? "OK" : "FAIL";
        console.log(`  [${label}] ${s.script} (fail-closed=${s.critical})`);
      }
    }
  }

  const localSteps = steps.filter((s) => s.tier === "local");
  const remoteSteps = steps.filter((s) => s.tier === "remote");

  const localCriticalFail = localSteps.some((s) => s.critical && !s.ok);
  const localSoftFail = localSteps.some((s) => !s.ok && !s.critical);

  const remoteCriticalFail = remoteSteps.some((s) => s.critical && !s.ok);
  const remoteAnyFail = remoteSteps.some((s) => !s.ok);

  const exitFail =
    localCriticalFail ||
    remoteCriticalFail ||
    (strictRemote && remoteSteps.length > 0 && remoteAnyFail);

  const payload = {
    schema_version: "tsos_compliance_officer_v2",
    finished_at: new Date().toISOString(),
    scope: "platform_all_amendments_lanes",
    deep_requested: deep,
    remote_requested: remote,
    strict_remote: strictRemote,
    local_critical_fail: localCriticalFail,
    remote_critical_fail: remoteCriticalFail,
    remote_any_fail: remoteAnyFail,
    exit_fail: exitFail,
    steps,
  };

  writeReceipt(payload);

  try {
    const snap = await writeRuntimeRealitySnapshot();
    console.log(
      `\n[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=WROTE | runtime-reality-snapshot | data/runtime-reality-snapshot.json | DRIFT_SEVERITY_HINT=${snap.DRIFT_SEVERITY_HINT}\n`,
    );
  } catch (e) {
    console.warn("[tsos-compliance-officer] runtime-reality-snapshot failed:", e?.message || e);
  }

  try {
    const dash = await writeOperatorDashboard();
    console.log(
      `[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=WROTE | operator-dashboard | data/operator-dashboard.json | repo=${dash.repo.sync_status} | next_action=${dash.next_required_human_action.length > 120 ? `${dash.next_required_human_action.slice(0, 120)}…` : dash.next_required_human_action}\n`,
    );
  } catch (e) {
    console.warn("[tsos-compliance-officer] operator-dashboard failed:", e?.message || e);
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(" Summary");
  console.log("════════════════════════════════════════════════════════════════\n");

  for (const s of steps) {
    const mark = s.ok ? "✓" : "✗";
    const crit = s.critical ? "[critical]" : "[warn]";
    const tr = s.tier === "remote" ? "[remote]" : "[local]";
    console.log(`${mark} ${tr} ${crit} ${s.id} (${s.script}) exit=${s.exitCode}`);
    if (!s.ok && s.tailErr) console.log(`    ${s.tailErr.split("\n").slice(-3).join("\n    ")}`);
  }

  let machineLine;
  if (exitFail) {
    machineLine = `[TSOS-MACHINE] KNOW: STATE=FAIL VERB=HALT_REQUEST | compliance-officer gate failed | NEXT=fix failing step then rerun`;
  } else if (localSoftFail || (remoteAnyFail && !strictRemote)) {
    machineLine = `[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=PROBE | compliance-officer pass with warnings (see steps) | NEXT=BUILD`;
  } else {
    machineLine = `[TSOS-MACHINE] KNOW: STATE=PASS VERB=PROBE | compliance-officer all gates OK${deep ? " (+deep)" : ""}${remote ? " (+remote)" : ""} | NEXT=BUILD`;
  }

  console.log(`\n${machineLine}\n`);

  process.exit(exitFail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  console.error(
    "\n[TSOS-MACHINE] KNOW: STATE=FAIL VERB=HALT_REQUEST | compliance-officer crashed | NEXT=inspect stderr\n"
  );
  process.exit(1);
});
