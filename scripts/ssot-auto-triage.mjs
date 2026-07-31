/**
 * SYNOPSIS: Triages missing @ssot tags by protected prefix and suggests product-home buckets.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const baseline = JSON.parse(readFileSync(path.join(ROOT, 'data', 'ssot-soft-debt-baseline.json'), 'utf8'));

const out = execFileSync('node', [path.join(ROOT, 'scripts', 'ssot-check.js'), '--all'], {
  cwd: ROOT,
  encoding: 'utf8',
});

const missing = [];
for (const line of out.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('routes/') || trimmed.startsWith('services/') || trimmed.startsWith('core/') || trimmed.startsWith('startup/')) {
    missing.push(trimmed);
  }
}

const buckets = {
  routes: 0,
  services: 0,
  core: 0,
  startup: 0,
  other: 0,
};
for (const p of missing) {
  if (p.startsWith('routes/')) buckets.routes += 1;
  else if (p.startsWith('services/')) buckets.services += 1;
  else if (p.startsWith('core/')) buckets.core += 1;
  else if (p.startsWith('startup/')) buckets.startup += 1;
  else buckets.other += 1;
}

console.log(`Missing @ssot triage: total=${missing.length} baseline=${baseline.missing_tag_count}`);
console.log(JSON.stringify(buckets, null, 2));
