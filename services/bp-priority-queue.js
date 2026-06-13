/**
 * Canonical product work queue — BP_PRIORITY.json loader.
 * NOT Hist domain — active orchestration lives here; historian owns legacy MISSION_QUEUE etc.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const sorted = [...bpPriority.items].sort((a, b) => a.rank - b.rank);
  return (
    sorted.find((item) => {
      const status = String(item.blueprint_status || '').toLowerCase();
      const verdict = String(item.verdict || '').toUpperCase();
      if (verdict === 'PASS' || verdict === 'OBJECTIVE_COMPLETE' || verdict === 'TECHNICAL_PASS') {
        return false;
      }
      return status !== 'complete' && status !== 'complete_archived';
    }) || null
  );
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

function normalizeRel(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Read mission BLUEPRINT.json — the BP is the file, not a meta-service. */
export function loadMissionBlueprint(blueprintPath, { root = REPO_ROOT } = {}) {
  const abs = path.isAbsolute(blueprintPath)
    ? blueprintPath
    : path.join(root, normalizeRel(blueprintPath));
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

/** First step in BLUEPRINT.json with status !== complete. */
export function findNextIncompleteBlueprintStep(blueprint) {
  return (blueprint?.steps || []).find((s) => s.status !== 'complete') || null;
}

/**
 * Walk BP_PRIORITY → each item's BLUEPRINT.json → first incomplete step.
 * Returns null when every listed blueprint step is complete (honest empty queue).
 */
export function resolveNextBlueprintBuild({ root = REPO_ROOT } = {}) {
  const queue = loadBpPriority({ root });
  for (const item of [...queue.items].sort((a, b) => a.rank - b.rank)) {
    if (!item.blueprint_path) continue;
    const blueprint = loadMissionBlueprint(item.blueprint_path, { root });
    if (!blueprint) continue;
    const step = findNextIncompleteBlueprintStep(blueprint);
    if (!step) continue;
    return {
      rank: item.rank,
      mission_id: item.mission_id,
      blueprint_path: item.blueprint_path,
      step_id: step.step_id,
      title: step.title,
      target_file: step.target_file || null,
      action_type: step.action_type || 'builder_build',
      command: step.command || null,
      verdict: item.verdict || null,
    };
  }
  return null;
}

/** Summarize BP_PRIORITY + blueprint step status for operator context. */
export function summarizeBpPriorityForOperator({ root = REPO_ROOT } = {}) {
  const queue = loadBpPriority({ root });
  const lines = [`${BP_PRIORITY_REL}:`];
  for (const item of [...queue.items].sort((a, b) => a.rank - b.rank)) {
    const blueprint = item.blueprint_path
      ? loadMissionBlueprint(item.blueprint_path, { root })
      : null;
    const pending = blueprint ? findNextIncompleteBlueprintStep(blueprint) : null;
    const stepNote = pending
      ? `next step ${pending.step_id} → ${pending.target_file || pending.command || '?'}`
      : blueprint
        ? 'all blueprint steps complete'
        : 'no blueprint file';
    lines.push(`  rank ${item.rank} ${item.mission_id} [${item.verdict || '?'}] ${stepNote}`);
  }
  const next = resolveNextBlueprintBuild({ root });
  if (next) {
    lines.push('');
    lines.push(`NEXT BUILD (from ${next.blueprint_path}):`);
    lines.push(`  ${next.step_id}: ${next.title}`);
    lines.push(`  target_file: ${next.target_file || next.command || '—'}`);
  } else {
    lines.push('');
    lines.push('NEXT BUILD: none — every BLUEPRINT.json step in BP_PRIORITY is complete.');
  }
  return { text: lines.join('\n'), next };
}
