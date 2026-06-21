#!/usr/bin/env node
/**
 * SYNOPSIS: Verify cutover bundle / standalone repo structure. Verify cutover bundle / standalone repo structure. */
import fs from 'node:fs';
import path from 'node:path';
import { repoRootFromScriptMeta, detectFactoryLayout } from './factory-repo-layout.mjs';

const REPO_ROOT = repoRootFromScriptMeta(import.meta.url);
const layout = detectFactoryLayout(REPO_ROOT);

const required =
  layout.mode === 'standalone'
    ? [
        'README.md',
        'BUNDLE_MANIFEST.json',
        'factory-staging/server.js',
        'factory-staging/startup/register-routes.js',
        'factory-staging/factory-core/builder/run-step.js',
        'missions/FACTORY-REBOOT-0005/BLUEPRINT.json',
      ]
    : [
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

console.log(`cutover_verify layout=${layout.mode}`);
process.exit(failed ? 1 : 0);
