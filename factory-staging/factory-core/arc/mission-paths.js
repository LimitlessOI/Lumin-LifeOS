import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../builder/run-step.js';

export const MISSIONS_ROOT = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');

export function resolveMissionFolder(missionIdOrPath) {
  const raw = String(missionIdOrPath || '').trim();
  if (!raw) return null;
  if (path.isAbsolute(raw)) return raw;
  if (raw.includes('/')) return path.join(REPO_ROOT, raw);
  return path.join(MISSIONS_ROOT, raw);
}

export function loadMissionJson(missionFolder, filename) {
  const p = path.join(missionFolder, filename);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function missionRel(missionFolder) {
  return path.relative(REPO_ROOT, missionFolder).replace(/\\/g, '/');
}
