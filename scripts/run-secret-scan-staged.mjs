#!/usr/bin/env node
/**
 * SYNOPSIS: Gate 0.7 — run the existing secretScannerService on staged source files.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { scanSecrets } from '../services/secretScannerService.js';

const ROOT = process.cwd();
const ALLOW = /^(routes|services|scripts|config|startup|middleware|factory-staging|githooks)\//;
const SKIP_EXT = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|eot|pdf|mp4|mov|zip|wasm|map)$/i;

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
  cwd: ROOT,
  encoding: 'utf8',
})
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => ALLOW.test(f) && !SKIP_EXT.test(f));

let failed = false;
for (const rel of staged) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
  const findings = scanSecrets(fs.readFileSync(abs, 'utf8'));
  if (!findings.length) continue;
  failed = true;
  for (const hit of findings) {
    console.error(`secret-scan ${rel}:${hit.lineNumber} ${hit.pattern}`);
  }
}

if (failed) {
  console.error('Secret scan failed: existing secretScannerService.js found a live-looking secret in staged source.');
  process.exit(1);
}
console.log('✅ Secret scan (secretScannerService on staged source)');
