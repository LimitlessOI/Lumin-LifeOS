#!/usr/bin/env node
/**
 * SYNOPSIS: Flip a factory slot on or idle without recoding the registry.
 * Enable: register if needed, provision worktree, assign lane template, load LaunchAgent.
 * Idle: clear owns, unload LaunchAgent, keep the worktree.
 *
 * Usage:
 *   node scripts/factory-slot.mjs --status
 *   node scripts/factory-slot.mjs --enable factory-3
 *   node scripts/factory-slot.mjs --idle factory-3
 *   node scripts/factory-slot.mjs --register-next
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  registeredFactoryIds,
  nextFactoryId,
  ensureFactoryRegistered,
  registerNextSlot,
  laneTemplateFor,
  dispatchingFactoryIds,
  applyEnableLane,
  applyIdleLane,
} from '../config/factory-slots.js';
import { loadLaneAssignment } from '../config/lane-assignment.js';
import { factoryStatus, isKnownFactory } from '../config/factory-registry.js';
import { isProvisioned, workspaceRootFor } from '../config/factory-workspace.js';
import { provisionFactory } from './provision-factory.mjs';
import { installLaunchAgent, unloadLaunchAgent } from './run-factory-lane.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSIGNMENT_PATH = path.join(ROOT, 'products/receipts/LANE_ASSIGNMENT.json');

function writeAssignment(assignment) {
  const next = {
    ...assignment,
    generated_at: new Date().toISOString(),
    source: assignment.source === 'fallback' ? 'factory-slot-switch' : assignment.source,
  };
  delete next.source;
  fs.writeFileSync(ASSIGNMENT_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function slotStatus() {
  const assignment = loadLaneAssignment();
  const dispatching = dispatchingFactoryIds(assignment);
  return {
    registered: registeredFactoryIds(),
    next: nextFactoryId(),
    dispatching,
    factories: registeredFactoryIds().map((id) => ({
      factory_id: id,
      status: factoryStatus(id),
      provisioned: isProvisioned(id),
      workspace: workspaceRootFor(id),
      dispatching: dispatching.includes(id),
      owns: (assignment.lanes || []).find((l) => l.factory_id === id)?.owns || [],
      lane_template: laneTemplateFor(id),
    })),
  };
}

export function enableFactory(factoryId, { installAgent = true } = {}) {
  const ensured = ensureFactoryRegistered(factoryId);
  if (!isKnownFactory(factoryId)) {
    throw new Error(`unknown_factory:${factoryId}`);
  }
  const provisioned = provisionFactory(factoryId);
  const assignment = writeAssignment(applyEnableLane(loadLaneAssignment(), factoryId, {
    owns: laneTemplateFor(factoryId),
  }));
  let agent = { skipped: true, reason: 'installAgent=false' };
  if (installAgent && factoryId !== 'factory-1') {
    agent = installLaunchAgent(factoryId);
  }
  return {
    ok: true,
    action: 'enabled',
    factory_id: factoryId,
    registered: ensured,
    provisioned,
    owns: laneTemplateFor(factoryId),
    assignment_path: ASSIGNMENT_PATH,
    agent,
    lanes: assignment.lanes.map((l) => ({ factory_id: l.factory_id, owns: l.owns })),
  };
}

export function idleFactory(factoryId, { unloadAgent = true } = {}) {
  if (!isKnownFactory(factoryId)) throw new Error(`unknown_factory:${factoryId}`);
  const assignment = writeAssignment(applyIdleLane(loadLaneAssignment(), factoryId));
  let agent = { skipped: true, reason: 'unloadAgent=false' };
  if (unloadAgent && factoryId !== 'factory-1') {
    agent = unloadLaunchAgent(factoryId);
  }
  return {
    ok: true,
    action: 'idle',
    factory_id: factoryId,
    workspace_kept: workspaceRootFor(factoryId),
    provisioned: isProvisioned(factoryId),
    agent,
    lanes: assignment.lanes.map((l) => ({ factory_id: l.factory_id, owns: l.owns })),
  };
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  if (next && !next.startsWith('-')) return next;
  const f = process.argv.indexOf('--factory');
  if (f > -1 && process.argv[f + 1] && !process.argv[f + 1].startsWith('-')) return process.argv[f + 1];
  return null;
}

function main() {
  if (process.argv.includes('--status')) {
    console.log(JSON.stringify(slotStatus(), null, 2));
    return;
  }
  if (process.argv.includes('--register-next')) {
    console.log(JSON.stringify(registerNextSlot(), null, 2));
    return;
  }
  if (process.argv.includes('--enable')) {
    const id = argValue('--enable');
    if (!id) {
      console.error('usage: factory-slot.mjs --enable <factory-N>');
      process.exit(2);
    }
    console.log(JSON.stringify(enableFactory(id), null, 2));
    return;
  }
  if (process.argv.includes('--idle')) {
    const id = argValue('--idle');
    if (!id) {
      console.error('usage: factory-slot.mjs --idle <factory-N>');
      process.exit(2);
    }
    console.log(JSON.stringify(idleFactory(id), null, 2));
    return;
  }
  console.error('usage: factory-slot.mjs --status | --enable <id> | --idle <id> | --register-next');
  process.exit(2);
}

if (process.argv[1] && process.argv[1].endsWith('factory-slot.mjs')) {
  main();
}
