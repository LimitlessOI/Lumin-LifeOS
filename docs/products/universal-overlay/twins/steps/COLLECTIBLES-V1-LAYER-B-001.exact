#!/usr/bin/env node
/**
 * SYNOPSIS: Collectibles V1 Layer-B SENTRY walker placeholder — registers product walk.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checks = [
  'public/collectibles/vault.html',
  'public/collectibles/era-wall.html',
  'public/collectibles/twin-dossier.html',
  'routes/collectibles-routes.js',
];

const findings = [];
for (const rel of checks) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    findings.push({
      id: `missing:${rel}`,
      proposed_solution: `Ship sealed exact for ${rel} via write_file_exact; do not idle factory-3.`,
    });
  }
}

const report = {
  ok: findings.length === 0,
  product_id: 'collectibles',
  layer: 'B',
  findings,
  note: 'Structural Layer-B gate for V1 surfaces; full browser critique expands here.',
};

console.log(JSON.stringify(report, null, 2));
process.exit(findings.length ? 1 : 0);
