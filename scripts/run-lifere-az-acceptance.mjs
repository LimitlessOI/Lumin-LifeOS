#!/usr/bin/env node
/**
 * SYNOPSIS: LifeRE A-to-Z acceptance — runs W1–W6 + unit + runtime integration.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const waves = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
const results = {};

for (const w of waves) {
  const script = path.join(ROOT, `scripts/run-lifere-${w}-acceptance.mjs`);
  const r = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  results[w] = { exit: r.status, stdout: r.stdout?.trim() };
}

const unit = spawnSync(process.execPath, ['--test', 'tests/lifere-performance-twin.test.js', 'tests/lifere-chair-service.test.js'], {
  encoding: 'utf8',
  cwd: ROOT,
});
results.unit_tests = { exit: unit.status };

const runtime = spawnSync(process.execPath, [path.join(ROOT, 'scripts/run-lifere-runtime-integration.mjs')], {
  encoding: 'utf8',
});
results.runtime_integration = { exit: runtime.status, stdout: runtime.stdout?.trim() };

spawnSync(process.execPath, [path.join(ROOT, 'scripts/seed-lifere-founder-twins.mjs')], { encoding: 'utf8' });

const routes = fs.readFileSync(path.join(ROOT, 'routes/lifere-os-routes.js'), 'utf8');
results.integration_wiring = {
  exit: routes.includes('callCouncilMember') && routes.includes('createLifeREOutreachBridge') ? 0 : 1,
};

const allOk = Object.values(results).every((r) => r.exit === 0);
const receipt = {
  schema: 'lifere_az_acceptance_v1',
  at: new Date().toISOString(),
  point_z: allOk ? 'PASS' : 'FAIL',
  waves: results,
};

const receiptPath = path.join(ROOT, 'products/receipts/LIFERE_AZ_ACCEPTANCE.json');
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

console.log(JSON.stringify(receipt, null, 2));
process.exit(allOk ? 0 : 1);
