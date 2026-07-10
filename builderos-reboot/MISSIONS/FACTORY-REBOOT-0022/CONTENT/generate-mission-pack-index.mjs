#!/usr/bin/env node
/**
 * SYNOPSIS: HIST DOMAIN — Historian owns this artifact (read/salvage only).
 * HIST DOMAIN — Historian owns this artifact (read/salvage only).
 * hist_id: HIST-AUTO-002
 * Law: prompts/00-HIST-LEGACY-BOUNDARY.md
 * Product queue: builderos-reboot/BP_PRIORITY.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const missionsDir = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');
const queuePath = path.join(REPO_ROOT, 'builderos-reboot/MISSION_QUEUE.json');

const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf8')) : null;
const queueOrder = new Map((queue?.missions ?? []).map((m, i) => [m.mission_id, i]));

const dirNames = fs.readdirSync(missionsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => (queueOrder.get(a) ?? 999) - (queueOrder.get(b) ?? 999));

const entries = dirNames.map((missionId) => {
  const bpPath = path.join(missionsDir, missionId, 'BLUEPRINT.json');
  const queueRow = queue?.missions?.find((m) => m.mission_id === missionId);
  if (!fs.existsSync(bpPath)) {
    return { mission_id: missionId, steps: 0, status: queueRow?.status ?? 'unknown', error: 'no_blueprint' };
  }
  const bp = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
  return {
    mission_id: missionId,
    blueprint_id: bp.blueprint_id,
    scope: bp.scope,
    steps: bp.steps?.length ?? 0,
    status: queueRow?.status ?? 'unknown',
  };
});

const index = {
  _authority: {
    domain: 'Hist',
    hist_id: 'HIST-AUTO-002',
    owner_department: 'Historian',
    status: 'HIST_OWNED',
    role: 'Mission pack index — generated from MISSION_QUEUE.json',
    canonical_work_queue: 'builderos-reboot/BP_PRIORITY.json',
  },
  generated_at: new Date().toISOString(),
  source_of_truth: 'builderos-reboot/MISSION_QUEUE.json',
  mission_count: entries.length,
  missions_complete: entries.filter((e) => e.status === 'complete').length,
  missions: entries,
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSION_PACK_INDEX.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(JSON.stringify(index, null, 2));
