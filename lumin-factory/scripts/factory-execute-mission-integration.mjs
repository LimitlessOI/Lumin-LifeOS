#!/usr/bin/env node
/**
 * SYNOPSIS: Integration test: dispatchExecuteMission dry-run on 0005. Integration test: dispatchExecuteMission dry-run on 0005. */
import path from 'node:path';
import { repoRootFromScriptMeta, detectFactoryLayout } from './factory-repo-layout.mjs';

const REPO_ROOT = repoRootFromScriptMeta(import.meta.url);
const layout = detectFactoryLayout(REPO_ROOT);
process.chdir(REPO_ROOT);

const { dispatchExecuteMission } = await import(
  path.join(REPO_ROOT, 'factory-staging/factory-core/builder/run-mission.js')
);

const { httpStatus, body } = dispatchExecuteMission({
  mission_id: 'FACTORY-REBOOT-0005',
  dry_run: true,
});

if (httpStatus !== 200 || !body.ok || body.steps_total !== 4) {
  console.error('FAIL mission dry-run', httpStatus, body);
  process.exit(1);
}

console.log(`PASS execute-mission integration (dry-run 0005, 4 steps, layout=${layout.mode})`);
