#!/usr/bin/env node
/** Run acceptance tests for all emitted factory reboot missions. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const missions = [
  'FACTORY-REBOOT-0001',
  'FACTORY-REBOOT-0002',
  'FACTORY-REBOOT-0003',
  'FACTORY-REBOOT-0004',
  'FACTORY-REBOOT-0005',
  'FACTORY-REBOOT-0006',
  'FACTORY-REBOOT-0007',
  'FACTORY-REBOOT-0008',
  'FACTORY-REBOOT-0009',
  'FACTORY-REBOOT-0010',
  'FACTORY-REBOOT-0011',
  'FACTORY-REBOOT-0012',
  'FACTORY-REBOOT-0013',
  'FACTORY-REBOOT-0014',
  'FACTORY-REBOOT-0015',
  'FACTORY-REBOOT-0016',
  'FACTORY-REBOOT-0017',
  'FACTORY-REBOOT-0018',
  'FACTORY-REBOOT-0019',
  'FACTORY-REBOOT-0020',
  'FACTORY-REBOOT-0021',
  'FACTORY-REBOOT-0022',
  'FACTORY-REBOOT-0023',
  'FACTORY-REBOOT-0024',
  'FACTORY-REBOOT-0025',
  'FACTORY-REBOOT-0026',
  'FACTORY-REBOOT-0027',
  'FACTORY-REBOOT-0028',
  'FACTORY-REBOOT-0029',
];
let failed = 0;

for (const mission of missions) {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, 'run-mission-acceptance.mjs'), mission],
    { stdio: 'inherit', cwd: path.join(__dirname, '../..') },
  );
  if (result.status !== 0) failed++;
}

if (failed) {
  console.error(`\n${failed} mission(s) failed acceptance.`);
  process.exit(1);
}
console.log('\nAll mission acceptance tests passed.');
