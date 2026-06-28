/**
 * SYNOPSIS: Governed post-acceptance artifact sync for BP truth, verdicts, and readiness surfaces.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBpPriority, BP_PRIORITY_REL } from './bp-priority-queue.js';
import { findBpItem, syncMissionFromTechnicalReceipt, writeJson } from './bp-priority-sync.js';
import { buildProductReadinessReport } from './product-readiness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCT_READINESS_REL = 'builderos-reboot/PRODUCT_READINESS_REPORT.json';

function readJson(absPath, fallback = null) {
  if (!fs.existsSync(absPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return fallback;
  }
}

function updateMissionArtifactFreshness({ root, missionId, sourceMode, freshnessAt }) {
  const bp = loadBpPriority({ root });
  const item = findBpItem(bp, missionId);
  if (!item) {
    return { ok: false, error: `BP_SYNC_NO_ITEM: ${missionId} not in ${BP_PRIORITY_REL}` };
  }
  item.artifact_sync = {
    at: freshnessAt,
    mode: sourceMode,
    status: 'CURRENT',
  };
  bp.updated_at = freshnessAt.slice(0, 10);
  writeJson(BP_PRIORITY_REL, bp, { root });
  return { ok: true, item };
}

function regenerateProductReadiness({ root, freshnessAt }) {
  const report = buildProductReadinessReport({ root });
  report.updated_at = freshnessAt;
  report.freshness = {
    status: 'CURRENT',
    updated_at: freshnessAt,
    authority_paths: [
      'docs/products/PRODUCT_REGISTRY.json',
      'builderos-reboot/BP_PRIORITY.json',
      'builderos-reboot/POINT_B_TARGET.json',
    ],
  };
  writeJson(PRODUCT_READINESS_REL, report, { root });
  return {
    ok: true,
    path: PRODUCT_READINESS_REL,
    report,
  };
}

export function syncTechnicalAcceptanceArtifacts({
  missionId,
  receipt,
  root = ROOT,
  buildRecord = {},
} = {}) {
  const sync = syncMissionFromTechnicalReceipt({
    missionId,
    receipt,
    root,
    buildRecord,
  });
  const freshnessAt = receipt?.completed_at || new Date().toISOString();
  const bpUpdate = updateMissionArtifactFreshness({
    root,
    missionId,
    sourceMode: 'technical_acceptance',
    freshnessAt,
  });
  const readiness = regenerateProductReadiness({ root, freshnessAt });
  return {
    ok: true,
    mode: 'technical_acceptance',
    bp_sync: sync,
    freshness: bpUpdate,
    readiness,
  };
}

export function syncFounderUsabilityArtifacts({
  missionId,
  pass,
  root = ROOT,
  at = new Date().toISOString(),
} = {}) {
  const bpUpdate = updateMissionArtifactFreshness({
    root,
    missionId,
    sourceMode: 'founder_usability',
    freshnessAt: at,
  });
  const readiness = regenerateProductReadiness({ root, freshnessAt: at });
  const verdictPath = path.join(root, 'builderos-reboot/MISSIONS', missionId, 'OBJECTIVE_VERDICT.json');
  const verdict = readJson(verdictPath, {});
  return {
    ok: true,
    mode: 'founder_usability',
    point_b_complete: verdict?.founder_usability_pass === true && ['TECHNICAL_PASS', 'PASS', 'OBJECTIVE_COMPLETE', 'FOUNDER_PASS'].includes(String(verdict?.verdict || '').toUpperCase()),
    founder_usability_pass: pass === true,
    freshness: bpUpdate,
    readiness,
  };
}
