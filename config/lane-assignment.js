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

/**
 * Hard floor when LANE_ASSIGNMENT.json is missing (e.g. Docker image omitted the
 * receipt). factory-3 Collectibles owns MUST stay here — tip ship with
 * factory_id=factory-3 is otherwise empty while Collectibles steps sit pending
 * under factory-1's broad `services/` prefix (proven 2026-08-13).
 * If factory-3 is deliberately idled (owns:[] in the live receipt), longest
 * prefix still falls through to factory-1 for unmatched paths.
 */
export const COLLECTIBLES_FALLBACK_OWNS = Object.freeze([
  'services/collectibles/',
  'services/mtg-card-',
  'routes/collectibles-',
  'routes/mtg-cards-',
  'public/collectibles/',
  'public/mtg-cards-',
  'docs/products/collectibles/',
  'builderos-reboot/MISSIONS/PRODUCT-COLLECTIBLES-',
  'tests/collectibles-',
  'tests/mtg-card-',
]);

export const FALLBACK_LANES = Object.freeze([
  Object.freeze({ factory_id: 'factory-1', owns: Object.freeze(['services/', 'routes/', 'db/migrations/', 'builderos-reboot/MISSIONS/']) }),
  Object.freeze({ factory_id: 'factory-2', owns: Object.freeze(['native/macos-overlay/']) }),
  Object.freeze({ factory_id: 'factory-3', owns: COLLECTIBLES_FALLBACK_OWNS }),
]);

export function loadLaneAssignment(filePath = ASSIGNMENT_PATH) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(parsed.lanes) && parsed.lanes.length) return parsed;
  } catch {
    // fall through
  }
  return { lanes: FALLBACK_LANES, source: 'fallback' };
}

function normalizeRel(targetFile) {
  return String(targetFile || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function matchPrefix(rel, prefix) {
  const p = normalizeRel(prefix);
  if (!p || p.includes('*')) return false;
  return rel === p || rel.startsWith(p.endsWith('/') ? p : `${p}/`) || rel.startsWith(p);
}

/**
 * A path is owned by exactly one lane. Longest matching `owns` prefix wins.
 * Unmatched paths default to factory-1 (the production ship lane).
 */
export function ownerFor(targetFile, assignment = loadLaneAssignment()) {
  const rel = normalizeRel(targetFile);
  const lanes = (assignment.lanes && assignment.lanes.length) ? assignment.lanes : FALLBACK_LANES;
  let best = { factory_id: PRIMARY, len: -1 };
  for (const lane of lanes) {
    for (const prefix of lane.owns || []) {
      const p = normalizeRel(prefix);
      if (!matchPrefix(rel, p)) continue;
      if (p.length > best.len) best = { factory_id: lane.factory_id, len: p.length };
    }
  }
  if (best.len < 0) {
    for (const lane of FALLBACK_LANES) {
      for (const prefix of lane.owns) {
        if (matchPrefix(rel, prefix) && prefix.length > best.len) {
          best = { factory_id: lane.factory_id, len: prefix.length };
        }
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

/**
 * Other-lane pending work stays invisible so selectNextStep cannot pick a
 * native file on factory-1 (or a service file on factory-2). Done steps stay
 * so cross-lane dependencies still resolve.
 */
export function queueForThisFactory(queue, factoryId = thisFactoryId(), assignment) {
  return {
    ...queue,
    steps: (queue.steps || []).filter((s) => {
      const st = String(s.status || '').toLowerCase();
      if (st === 'done' || st === 'complete') return true;
      return ownerFor(s.target_file || s.file, assignment) === factoryId;
    }),
  };
}
