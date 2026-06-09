#!/usr/bin/env node
/** Verify lumin-factory-bundle structure after build. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUNDLE = path.join(REPO_ROOT, 'lumin-factory-bundle');

const required = [
  'lumin-factory-bundle/README.md',
  'lumin-factory-bundle/BUNDLE_MANIFEST.json',
  'lumin-factory-bundle/factory-staging/server.js',
  'lumin-factory-bundle/missions/FACTORY-REBOOT-0005/BLUEPRINT.json',
];

let failed = 0;
for (const rel of required) {
  const ok = fs.existsSync(path.join(REPO_ROOT, rel));
  console.log(ok ? `PASS ${rel}` : `FAIL ${rel}`);
  if (!ok) failed++;
}

process.exit(failed ? 1 : 0);
