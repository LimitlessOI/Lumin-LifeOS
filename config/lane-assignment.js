/**
 * SYNOPSIS: Who writes which files. Conductor + Architect freeze this so two
 * lanes cannot stage each other's work. The live ship loop must read it —
 * a receipt nobody dispatches from is a preference, not an assignment.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSIGNMENT_PATH = path.join(ROOT, 'products/receipts/LANE_ASSIGNMENT.json');
const PRIMARY = 'factory-1';

export function loadLaneAssignment(filePath = ASSIGNMENT_PATH) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { lanes: [] };
  }
}

function normalizeRel(targetFile) {
  return String(targetFile || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * A path is owned by exactly one lane. Longest matching `owns` prefix wins.
 * Unmatched paths default to factory-1 (the production ship lane).
 */
export function ownerFor(targetFile, assignment = loadLaneAssignment()) {
  const rel = normalizeRel(targetFile);
  let best = { factory_id: PRIMARY, len: -1 };
  for (const lane of assignment.lanes || []) {
    for (const prefix of lane.owns || []) {
      const p = normalizeRel(prefix);
      if (!p) continue;
      const hit = rel === p || rel.startsWith(p.endsWith('/') ? p : `${p}/`) || rel.startsWith(p);
      if (hit && p.length > best.len) {
        best = { factory_id: lane.factory_id, len: p.length };
      }
    }
  }
  return best.factory_id;
}

export function thisFactoryId() {
  return String(process.env.FACTORY_ID || PRIMARY).trim() || PRIMARY;
}

export function stepBelongsToFactory(step, factoryId = thisFactoryId(), assignment) {
  const file = step?.target_file || step?.file || '';
  return ownerFor(file, assignment) === factoryId;
}
