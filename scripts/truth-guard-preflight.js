#!/usr/bin/env node
/**
 * Truth Guard Preflight (fail-closed)
 *
 * This script checks that a run wrote proof artifacts and references them.
 * Minimal v1: requires a "run record" JSON with proofPaths[].
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const runRecordPath = process.argv[2] || "docs/THREAD_REALITY/latest-run.json";

function fail(msg) {
  console.error(`TRUTH_GUARD_FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(runRecordPath)) {
  fail(`Missing run record: ${runRecordPath}`);
}

let rec;
try {
  rec = JSON.parse(fs.readFileSync(runRecordPath, "utf8"));
} catch {
  fail(`Invalid JSON: ${runRecordPath}`);
}

if (!rec || typeof rec !== "object") fail("Run record is not an object");
if (!Array.isArray(rec.proofPaths) || rec.proofPaths.length === 0) {
  fail("Run record missing proofPaths[]");
}

for (const p of rec.proofPaths) {
  if (typeof p !== "string" || !p.trim()) fail("Empty proof path in proofPaths[]");
  const full = path.resolve(p);
  if (!fs.existsSync(full)) fail(`Proof missing: ${p}`);
}

if (rec.result === "VERIFIED") {
  if (!rec.runDir || typeof rec.runDir !== "string" || !rec.runDir.trim()) {
    fail("Run record missing runDir for VERIFIED result");
  }
  const art = spawnSync(
    "node",
    ["scripts/programming-artifacts-preflight.js", rec.runDir],
    {
      cwd: process.cwd(),
      stdio: "inherit",
    }
  );
  if (art.status !== 0) {
    fail(`Artifacts preflight failed (see above)`);
  }
}

console.log("TRUTH_GUARD_OK");
process.exit(0);
