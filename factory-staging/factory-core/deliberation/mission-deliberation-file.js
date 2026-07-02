/**
 * SYNOPSIS: Mission DELIBERATION_GATE.json read/write leaf — fs+path only, no gate logic.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Extracted from seed-mission-deliberation.js so the validate gate can read the
 * on-disk deliberation file without importing the seeder (which imports the gate
 * back) — breaking the validate <-> seed import cycle.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../repo-paths.js';

export function missionGatePath(mission_id) {
  return path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', mission_id, 'DELIBERATION_GATE.json');
}

export function loadMissionDeliberationFile(mission_id) {
  const p = missionGatePath(mission_id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function writeMissionDeliberationFile(mission_id, payload) {
  const p = missionGatePath(mission_id);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return p;
}
