/**
 * SYNOPSIS: Canonical product work queue — BP_PRIORITY.json loader.
 * Canonical product work queue — BP_PRIORITY.json loader.
 * NOT Hist domain — active orchestration lives here; historian owns legacy MISSION_QUEUE etc.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveQueueItem } from './bp-priority-completion.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BP_PRIORITY_REL = 'builderos-reboot/BP_PRIORITY.json';
export const LEGACY_MISSION_QUEUE_REL = 'builderos-reboot/MISSION_QUEUE.json';
export const BP_PRIORITY_PATH = path.join(REPO_ROOT, BP_PRIORITY_REL);
export const LEGACY_MISSION_QUEUE_PATH = path.join(REPO_ROOT, LEGACY_MISSION_QUEUE_REL);

export function loadBpPriority({ root = REPO_ROOT } = {}) {
  const filePath = path.join(root, BP_PRIORITY_REL);
  if (!fs.existsSync(filePath)) {
    throw new Error(`MISSING_CANONICAL_QUEUE: ${BP_PRIORITY_REL}`);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (data?._authority?.status !== 'CANONICAL') {
    throw new Error(`${BP_PRIORITY_REL} missing _authority.status CANONICAL`);
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error(`${BP_PRIORITY_REL} items[] empty or missing`);
  }
  return data;
}

export function getActiveProductItem(bpPriority = loadBpPriority()) {
  return getActiveQueueItem(bpPriority.items || []);
}

export function loadLegacyMissionQueue({ root = REPO_ROOT } = {}) {
  const filePath = path.join(root, LEGACY_MISSION_QUEUE_REL);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/** Fail closed if legacy queue carries active PRODUCT-* missions (orchestration belongs in BP_PRIORITY). */
export function findLegacyQueueProductViolations({ root = REPO_ROOT } = {}) {
  const queue = loadLegacyMissionQueue({ root });
  if (!queue) return [];
  const active = new Set(['in_progress', 'pending', 'queued', 'active', 'running']);
  return (queue.missions || [])
    .filter((m) => /^PRODUCT-/.test(String(m.mission_id || '')))
    .filter((m) => active.has(String(m.status || '').toLowerCase()))
    .map((m) => ({
      mission_id: m.mission_id,
      status: m.status,
      message: `PRODUCT mission ${m.mission_id} is active in LEGACY MISSION_QUEUE — use ${BP_PRIORITY_REL} only`,
    }));
}
