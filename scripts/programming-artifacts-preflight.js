#!/usr/bin/env node
/**
 * Programming Artifacts Preflight (fail-closed)
 * Ensures required artifacts exist for a given run folder.
 */
const fs = require("fs");
const path = require("path");

function fail(msg) {
  console.error(`ARTIFACTS_FAIL: ${msg}`);
  process.exit(1);
}

const runDir = process.argv[2];
if (!runDir) fail("Usage: node scripts/programming-artifacts-preflight.js <runDir>");

const required = ["PLAN.json", "PATCH.diff", "PROOFS.json", "RISK.json"];

for (const f of required) {
  const p = path.join(runDir, f);
  if (!fs.existsSync(p)) fail(`Missing required artifact: ${p}`);
}

console.log("ARTIFACTS_OK");
process.exit(0);
