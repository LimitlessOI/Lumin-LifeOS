#!/usr/bin/env node
/** Local self-check for materialized factory-staging tree. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['factory-core', 'lifeos', 'startup', 'scripts'];

function walkJs(dir, out = []) {
  if (path.basename(dir) === 'node_modules') return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

let failed = 0;
const files = [
  path.join(ROOT, 'server.js'),
  ...SCAN_DIRS.flatMap((d) => {
    const dir = path.join(ROOT, d);
    return fs.existsSync(dir) ? walkJs(dir) : [];
  }),
];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status === 0) {
    console.log(`PASS syntax ${rel}`);
  } else {
    failed++;
    console.log(`FAIL syntax ${rel}: ${result.stderr || result.stdout}`);
  }
}

const councilPath = path.join(ROOT, 'factory-core/canon/services/council-service.js');
if (fs.existsSync(councilPath)) {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(councilPath)).digest('hex');
  console.log(`PASS council import present sha256=${sha.slice(0, 16)}…`);
} else {
  failed++;
  console.log('FAIL council-service.js missing');
}

const routePath = path.join(ROOT, 'factory-core/routes/factory-execute-step-routes.js');
if (fs.existsSync(routePath)) {
  console.log('PASS factory execute-step route payload present');
} else {
  failed++;
  console.log('FAIL factory-execute-step-routes.js missing');
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll factory-staging checks passed');
process.exit(failed ? 1 : 0);
