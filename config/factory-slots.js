/**
 * SYNOPSIS: Factory-N is a switch, not a rewrite. Identities factory-1..N are
 * registered here; dispatching is who has `owns` in LANE_ASSIGNMENT.json.
 * Enable provisions + assigns a lane template + loads a LaunchAgent.
 * Idle unloads the agent and clears owns; the worktree stays.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FALLBACK_LANES } from './lane-assignment.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLOT_RECEIPT = path.join(ROOT, 'products/receipts/FACTORY_SLOT_STATE.json');

/** Two are the laboratory. Three is registered idle so flipping it on is a switch. */
export const BUILTIN_SLOT_COUNT = 3;
export const PRIMARY_FACTORY_ID = 'factory-1';

export function factoryIdAt(n) {
  const i = Number(n);
  if (!Number.isInteger(i) || i < 1) throw new Error(`invalid_factory_slot:${n}`);
  return `factory-${i}`;
}

export function parseFactorySlot(id) {
  const m = /^factory-(\d+)$/.exec(String(id || '').trim());
  return m ? Number(m[1]) : null;
}

export function loadSlotState(filePath = SLOT_RECEIPT) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (parsed && Number.isInteger(parsed.registered_count) && parsed.registered_count >= BUILTIN_SLOT_COUNT) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return { schema: 'factory_slot_state_v1', registered_count: BUILTIN_SLOT_COUNT, source: 'builtin' };
}

export function registeredCount(filePath = SLOT_RECEIPT) {
  return loadSlotState(filePath).registered_count;
}

export function registeredFactoryIds(filePath = SLOT_RECEIPT) {
  const n = registeredCount(filePath);
  return Array.from({ length: n }, (_, i) => factoryIdAt(i + 1));
}

export function nextFactoryId(filePath = SLOT_RECEIPT) {
  return factoryIdAt(registeredCount(filePath) + 1);
}

/** Collectibles lane — longest-prefix wins over factory-1's broad services/routes. */
export const COLLECTIBLES_LANE_OWNS = Object.freeze([
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

/**
 * Who writes which prefix when a slot is flipped on. factory-1/2 stay overlay
 * (backend + native). factory-3 is Collectibles. factory-4+ gets empty owns
 * until Conductor assigns one — enabling still provisions the lane.
 */
export function laneTemplateFor(factoryId) {
  const id = String(factoryId || '').trim();
  if (id === 'factory-1') return [...(FALLBACK_LANES[0]?.owns || [])];
  if (id === 'factory-2') return [...(FALLBACK_LANES[1]?.owns || [])];
  if (id === 'factory-3') return [...COLLECTIBLES_LANE_OWNS];
  return [];
}

export function registerNextSlot({ filePath = SLOT_RECEIPT, now = () => new Date().toISOString() } = {}) {
  const current = loadSlotState(filePath);
  const registered_count = current.registered_count + 1;
  const factory_id = factoryIdAt(registered_count);
  const state = {
    schema: 'factory_slot_state_v1',
    generated_at: now(),
    registered_count,
    last_registered: factory_id,
    note: 'Identity only. Enable with npm run builderos:factory:enable -- --factory ' + factory_id,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
  return { factory_id, registered_count, state };
}

export function ensureFactoryRegistered(factoryId, { filePath = SLOT_RECEIPT } = {}) {
  const slot = parseFactorySlot(factoryId);
  if (slot == null) throw new Error(`unknown_factory_shape:${factoryId}`);
  let count = registeredCount(filePath);
  if (slot <= count) return { factory_id: factoryIdAt(slot), action: 'already_registered', registered_count: count };
  if (slot !== count + 1) {
    throw new Error(`factory_slots_must_grow_in_order:next_is_${factoryIdAt(count + 1)}_got_${factoryId}`);
  }
  const added = registerNextSlot({ filePath });
  return { factory_id: added.factory_id, action: 'registered', registered_count: added.registered_count };
}

export function dispatchingFactoryIds(assignment) {
  const lanes = Array.isArray(assignment?.lanes) ? assignment.lanes : [];
  const ids = lanes
    .filter((l) => l && l.factory_id && Array.isArray(l.owns) && l.owns.length > 0)
    .map((l) => String(l.factory_id));
  if (!ids.includes(PRIMARY_FACTORY_ID)) ids.unshift(PRIMARY_FACTORY_ID);
  return [...new Set(ids)];
}

export function applyEnableLane(assignment, factoryId, { owns = laneTemplateFor(factoryId) } = {}) {
  const lanes = Array.isArray(assignment?.lanes) ? assignment.lanes.map((l) => ({ ...l, owns: [...(l.owns || [])] })) : [];
  const existing = lanes.find((l) => l.factory_id === factoryId);
  if (existing) {
    existing.owns = [...owns];
    existing.dispatch = existing.dispatch || (factoryId === PRIMARY_FACTORY_ID
      ? 'POST /factory/ship-queue-and-commit on production'
      : 'local worktree + LaunchAgent');
  } else {
    lanes.push({
      factory_id: factoryId,
      owns: [...owns],
      dispatch: factoryId === PRIMARY_FACTORY_ID
        ? 'POST /factory/ship-queue-and-commit on production'
        : 'local worktree + LaunchAgent',
      current_job: owns.length ? `owns ${owns.join(', ')}` : 'provisioned idle — Conductor assigns owns',
    });
  }
  return { ...assignment, lanes };
}

export function applyIdleLane(assignment, factoryId) {
  if (String(factoryId) === PRIMARY_FACTORY_ID) {
    throw new Error('cannot_idle_primary_factory');
  }
  const lanes = (assignment?.lanes || [])
    .map((l) => {
      if (l.factory_id !== factoryId) return { ...l, owns: [...(l.owns || [])] };
      return { ...l, owns: [], current_job: 'idle — worktree kept, LaunchAgent unloaded' };
    });
  return { ...assignment, lanes };
}
