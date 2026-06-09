#!/usr/bin/env node
/** Integration test: dispatchExecuteMission dry-run on 0005. */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const { dispatchExecuteMission } = await import('../../factory-staging/factory-core/builder/run-mission.js');

const { httpStatus, body } = dispatchExecuteMission({
  mission_id: 'FACTORY-REBOOT-0005',
  dry_run: true,
});

if (httpStatus !== 200 || !body.ok || body.steps_total !== 4) {
  console.error('FAIL mission dry-run', httpStatus, body);
  process.exit(1);
}

console.log('PASS execute-mission integration (dry-run 0005, 4 steps)');
