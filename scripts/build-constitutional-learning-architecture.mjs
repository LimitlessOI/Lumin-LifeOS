/**
 * SYNOPSIS: Orchestrates POST /api/v1/lifeos/builder/build for the constitutional learning architecture mission.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 * Orchestrates POST /api/v1/lifeos/builder/build for the constitutional learning architecture mission.
 *
 * Reads the mission blueprint, walks pending steps, and dispatches each to the governed builder.
 * Exit code 0 only if every step reports committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BLUEPRINT = path.join(REPO_ROOT, 'builderos-reboot', 'MISSIONS', 'FACTORY-CONSTITUTIONAL-LEARNING-ARCHITECTURE-0001', 'BLUEPRINT.json');
const BASE = (
  process.env.LUMIN_BUILDER_BASE_URL ||
  process.env.BUILDER_BASE_URL ||
  'https://lumin-web-production-e3a9.up.railway.app'
).replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function buildStep(step) {
  const url = `${BASE}/api/v1/lifeos/builder/build`;
  const body = {
    mission_id: 'FACTORY-CONSTITUTIONAL-LEARNING-ARCHITECTURE-0001',
    target_file: step.target_file,
    task: step.task,
    spec: `${step.acceptance} \nDependencies: ${(step.dependencies || []).join(', ') || 'none'}. Mission spec: docs/products/builderos/specs/CONSTITUTIONAL_LEARNING_ARCHITECTURE.md`,
    mode: 'code',
    confirm_intent: true,
    platform_gap_fill: true,
    platform_gap_fill_reason: `GAP-FILL: operator-authorized constitutional learning architecture build for ${step.step_id}. ARC receipts are not yet generated for this new mission and the operator has explicitly confirmed intent to proceed.`,
    domain: 'builderos',
    commit_message: `FCLA step ${step.step_id}: ${step.title}`,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': KEY },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { ok: res.ok && json.ok === true && json.committed === true, status: res.status, json, step };
}

async function main() {
  if (!KEY) {
    console.error('Missing COMMAND_CENTER_KEY (or COMMAND_KEY / LIFEOS_KEY / API_KEY).');
    process.exit(1);
  }

  const blueprint = readJson(BLUEPRINT);
  const steps = (blueprint.steps || []).filter((s) => s.status !== 'complete');
  console.log(`Dispatching ${steps.length} constitutional learning architecture step(s) to ${BASE}/api/v1/lifeos/builder/build`);

  const results = [];
  for (const step of steps) {
    console.log(`\n[${step.step_id}] ${step.title} → ${step.target_file}`);
    const result = await buildStep(step);
    results.push(result);
    if (result.ok) {
      console.log(`  COMMITTED: ${result.json.commit_sha || result.json.target_file}`);
      step.status = 'complete';
      step.completed_at = new Date().toISOString();
    } else {
      console.error(`  FAILED (${result.status}): ${JSON.stringify(result.json)}`);
      step.status = 'failed';
    }
  }

  fs.writeFileSync(BLUEPRINT, `${JSON.stringify(blueprint, null, 2)}\n`);

  const failures = results.filter((r) => !r.ok);
  console.log(`\nDONE — committed: ${results.length - failures.length}, failed: ${failures.length}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
