#!/usr/bin/env node
/** Emit MISSION_PACK_INDEX.json listing all missions and step counts. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const missionsDir = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');

const entries = fs.readdirSync(missionsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()
  .map((missionId) => {
    const bpPath = path.join(missionsDir, missionId, 'BLUEPRINT.json');
    if (!fs.existsSync(bpPath)) return { mission_id: missionId, steps: 0, error: 'no_blueprint' };
    const bp = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
    return { mission_id: missionId, blueprint_id: bp.blueprint_id, scope: bp.scope, steps: bp.steps?.length ?? 0 };
  });

const index = { generated_at: new Date().toISOString(), mission_count: entries.length, missions: entries };
fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSION_PACK_INDEX.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(JSON.stringify(index, null, 2));
