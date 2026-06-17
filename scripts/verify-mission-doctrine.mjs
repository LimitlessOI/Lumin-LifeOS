#!/usr/bin/env node
/**
 * Verify mission doctrine — artifacts, roles, measurements, result truth.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import { evaluateMissionDoctrine } from '../factory-staging/factory-core/arc/foundation/doctrine-enforcement.js';
import { resolveMissionFolder } from '../factory-staging/factory-core/arc/mission-paths.js';
import { loadMissionJson } from '../factory-staging/factory-core/arc/mission-paths.js';

const missionId = process.argv[2];
if (!missionId) {
  console.error('Usage: node scripts/verify-mission-doctrine.mjs <mission-id>');
  process.exit(2);
}

const folder = resolveMissionFolder(missionId);
if (!folder) {
  console.error('Mission not found:', missionId);
  process.exit(2);
}

const blueprint = loadMissionJson(folder, 'BLUEPRINT.json');
const report = evaluateMissionDoctrine(folder, { blueprint });
console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
