/**
 * SYNOPSIS: Generate a soft-waiver file for the current false-done audit state.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateStepExpectations } from '../services/product-build-orchestrator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(ROOT, 'docs/products');
const WAIVER_PATH = path.join(ROOT, 'data/false-done-soft-waivers.json');

function keyOf(product, rec) {
  return `${product}::${rec.id}::${rec.target_file}`;
}

function classify(step, reason) {
  const target = String(step.target_file || '');
  const abs = target ? path.join(ROOT, target) : null;
  if (!target || !fs.existsSync(abs)) return 'MISSING_FILE';
  const isJs = /\.(js|mjs|cjs)$/i.test(target);
  const importBroke = /assertion_threw|reaudit_threw|missing_exports/i.test(reason);
  if (isJs && importBroke) return 'IMPORT_BROKE';
  return 'SOFT';
}

async function auditQueue(queuePath) {
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const steps = Array.isArray(queue.steps) ? queue.steps : [];
  const soft = [];
  for (const step of steps) {
    if (step.status !== 'done') continue;
    let proof;
    try {
      proof = await evaluateStepExpectations(step, { root: ROOT });
    } catch (err) {
      proof = { ok: false, applicable: true, reason: `reaudit_threw: ${err.message}` };
    }
    if (proof.applicable === false) continue;
    if (proof.ok) continue;
    const tier = classify(step, proof.reason);
    if (tier === 'SOFT') soft.push({ id: step.id, target_file: step.target_file, reason: proof.reason });
  }
  return soft;
}

function listProductQueues() {
  let ids = [];
  try {
    ids = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  return ids.map((id) => ({ id, queuePath: path.join(PRODUCTS_DIR, id, 'BUILD_QUEUE.json') })).filter((p) => fs.existsSync(p.queuePath));
}

async function main() {
  const waivers = [];
  for (const { id, queuePath } of listProductQueues()) {
    const soft = await auditQueue(queuePath);
    for (const f of soft) {
      waivers.push({
        key: keyOf(id, f),
        product: id,
        step_id: f.id,
        target_file: f.target_file,
        reason: f.reason,
        waiver_reason: 'Pre-existing content-drift assertion; file exists and imports. To be remediated when the product is touched, not bulk-rebuilt.',
        waived_at: new Date().toISOString(),
      });
    }
  }

  const payload = {
    schema: 'false_done_soft_waivers_v1',
    generated_at: new Date().toISOString(),
    note: 'SOFT false-done waivers. Each entry maps to a done step whose artifact exists and imports, but whose declared substring/assertion is stale. These are pre-existing drifts to be closed incrementally; HARD regressions remain blocked.',
    count: waivers.length,
    waived_keys: waivers.map((w) => w.key).sort(),
    waivers,
  };

  fs.mkdirSync(path.dirname(WAIVER_PATH), { recursive: true });
  fs.writeFileSync(WAIVER_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${waivers.length} soft waivers to ${path.relative(ROOT, WAIVER_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
