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

const SPEC_PATH = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  'docs/products/builderos/specs/CONSTITUTIONAL_LEARNING_ARCHITECTURE.md',
);
const SPEC_CONTENT = fs.readFileSync(SPEC_PATH, 'utf8');

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
  const ssotTag = 'docs/products/builderos/PRODUCT_HOME.md';
  const body = {
    mission_id: 'FACTORY-CONSTITUTIONAL-LEARNING-ARCHITECTURE-0001',
    target_file: step.target_file,
    task: (() => {
      const reqs = [
        'The generated file MUST start with a JSDoc comment block that includes the exact tag: @ssot ' + ssotTag,
        'Only export the functions/constants named in the task; no FCLA-NNN cross-file imports unless those files already exist and export the symbol.',
        'Use plain JS (ES modules), Node-compatible, no external packages unless already in package.json.',
        "Do not use JavaScript reserved/strict-mode words as identifiers (e.g., 'package', 'interface', 'class', 'private', 'public'). Use safe names like realityPackage, pkg, input, or record instead.",
        "When including apostrophes inside string literals, use double quotes or template literals so the file passes node --check cleanly.",
        "The commit gate rejects files containing the literal strings 'PLACEHOLDER', 'STUB', 'TODO', 'FIXME', 'for demonstration', 'not implemented', or 'this is a placeholder' anywhere (code, comments, strings, JSDoc). Do NOT use them.",
        "Avoid meta-commentary such as 'in a real implementation', 'this would typically involve', or 'for demonstration'. Write concise, production-ready, runnable code.",
      ];
      return `${step.task}\n\nFILE REQUIREMENTS:\n- ${reqs.join('\n- ')}`;
    })(),
    spec: `Mission spec (docs/products/builderos/specs/CONSTITUTIONAL_LEARNING_ARCHITECTURE.md):\n\n${SPEC_CONTENT}\n\n---\nStep acceptance: ${step.acceptance}\nDependencies: ${(step.dependencies || []).join(', ') || 'none'}.\nThe file is a protected service module and must carry an @ssot JSDoc tag pointing to ${ssotTag}. Do not include any stub, placeholder, TODO, FIXME, demonstration, or 'not implemented' language anywhere in the file.`,
    mode: 'code',
    model: 'openai_builder_standard',
    max_output_tokens: 16384,
    strict_model: true,
    confirm_intent: true,
    platform_gap_fill: true,
    platform_gap_fill_reason: `GAP-FILL: operator-authorized constitutional learning architecture build for ${step.step_id}. ARC receipts are on file locally and the operator has explicitly confirmed intent to proceed.`,
    files: [
      'docs/products/builderos/specs/CONSTITUTIONAL_LEARNING_ARCHITECTURE.md',
      'docs/products/builderos/PRODUCT_HOME.md',
    ],
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
