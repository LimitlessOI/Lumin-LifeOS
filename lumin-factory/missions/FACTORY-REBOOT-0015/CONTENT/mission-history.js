/**
 * SYNOPSIS: Exports readMissionHistory — lumin-factory/missions/FACTORY-REBOOT-0015/CONTENT/mission-history.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RECEIPTS = path.join(FACTORY_ROOT, 'data/step-receipts.jsonl');

export function readMissionHistory(limit = 50) {
  if (!fs.existsSync(RECEIPTS)) {
    return { count: 0, receipts: [] };
  }
  const lines = fs.readFileSync(RECEIPTS, 'utf8').trim().split('\n').filter(Boolean);
  const receipts = lines.slice(-limit).map((line) => JSON.parse(line));
  return { count: receipts.length, receipts };
}

export function summarizeHistory() {
  const { receipts } = readMissionHistory(200);
  const byMission = {};
  for (const r of receipts) {
    const m = r.mission_id || 'unknown';
    byMission[m] = (byMission[m] || 0) + 1;
  }
  return {
    total_receipts: receipts.length,
    by_mission: byMission,
    last: receipts[receipts.length - 1] || null,
  };
}
