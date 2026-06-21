/**
 * SYNOPSIS: V2 ARC entry gate — pre-handoff (strict) vs corridor (post-handoff, no intent re-litigation).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../builder/run-step.js';
import { resolveMissionFolder, loadMissionJson, missionRel } from './mission-paths.js';

const BLOCKING_COVERAGE = new Set(['MISSING', 'MENTIONED']);

function tier1CoveragePass(map) {
  const failures = [];
  for (const dim of map?.dimensions || []) {
    if (!dim.load_bearing) continue;
    const level = String(dim.coverage_level || 'MISSING');
    if (BLOCKING_COVERAGE.has(level)) failures.push(`${dim.name}:${level}`);
    else if (level === 'PARKED') continue;
    else if (!['SUFFICIENT', 'LOCKED', 'PARTIAL'].includes(level)) failures.push(`${dim.name}:${level}`);
  }
  return { pass: failures.length === 0, failures };
}

function runTier1Validator(missionFolder) {
  const script = path.join(REPO_ROOT, 'scripts/validate-intent-tier1.mjs');
  if (!fs.existsSync(script)) {
    return { pass: false, detail: 'validate-intent-tier1.mjs missing' };
  }
  const r = spawnSync(process.execPath, [script, missionRel(missionFolder)], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { pass: r.status === 0, detail: (r.stderr || r.stdout || '').trim() };
}

/**
 * V2 ARC entry gate — pre-handoff (strict) vs corridor (post-handoff, no intent re-litigation).
 */
export function runArcEntryGate(missionIdOrPath, { corridor = false, requireArcReceipt = false } = {}) {
  const missionFolder = resolveMissionFolder(missionIdOrPath);
  if (!missionFolder || !fs.existsSync(missionFolder)) {
    return {
      ok: false,
      status: 'BLOCKED_RETURN_TO_IDC',
      violations: ['mission folder missing'],
    };
  }

  const missionId = path.basename(missionFolder);
  const violations = [];
  const checks = {};

  const founderMd = path.join(missionFolder, 'FOUNDER_PACKET.md');
  const founderJson = path.join(missionFolder, 'FOUNDER_PACKET.json');
  checks.founder_packet = {
    pass: fs.existsSync(founderMd) || fs.existsSync(founderJson),
    path: fs.existsSync(founderMd) ? 'FOUNDER_PACKET.md' : fs.existsSync(founderJson) ? 'FOUNDER_PACKET.json' : null,
  };
  if (!checks.founder_packet.pass) violations.push('founder_packet:missing FOUNDER_PACKET.md or .json');

  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  checks.intent_baseline = {
    pass: corridor ? baseline?.status === 'HANDOFF_READY' : Boolean(baseline?.mission_id),
    status: baseline?.status || null,
    corridor,
  };
  if (!checks.intent_baseline.pass) {
    violations.push(
      corridor
        ? 'corridor:INTENT_BASELINE not HANDOFF_READY — Chair has not locked handoff'
        : 'intent_baseline:missing or invalid',
    );
  }

  if (!corridor) {
    const coverage = loadMissionJson(missionFolder, 'INTENT_COVERAGE_MAP.json');
    const cov = tier1CoveragePass(coverage);
    checks.intent_coverage = cov;
    if (!cov.pass) violations.push(`intent_coverage:${cov.failures.join(',')}`);

    const tier1Run = runTier1Validator(missionFolder);
    checks.tier1_validator = tier1Run;
    if (!tier1Run.pass) violations.push(`tier1_validator:${tier1Run.detail || 'FAIL'}`);
  } else {
    checks.intent_coverage = { pass: true, note: 'corridor — intent not re-litigated post-handoff' };
    checks.tier1_validator = { pass: true, note: 'corridor — tier1 checked at development stage only' };
  }

  const preArc = loadMissionJson(missionFolder, 'PRE_ARC_INPUT_PACKET.json');
  checks.pre_arc_packet = {
    pass: Boolean(preArc?.manifest?.length),
    manifest_count: preArc?.manifest?.length || 0,
  };
  if (!checks.pre_arc_packet.pass) violations.push('pre_arc:missing PRE_ARC_INPUT_PACKET.json or empty manifest');

  const blueprint = loadMissionJson(missionFolder, 'BLUEPRINT.json');
  const arcReceipt = loadMissionJson(missionFolder, 'ARC_RUN_RECEIPT.json');
  checks.blueprint_provenance = {
    has_blueprint: Boolean(blueprint),
    authored_by: blueprint?.authored_by || null,
    arc_run_receipt: Boolean(arcReceipt),
  };
  if (requireArcReceipt && blueprint?.authored_by === 'ARC' && !arcReceipt) {
    violations.push('provenance:authored_by ARC without ARC_RUN_RECEIPT.json');
  } else if (blueprint?.authored_by === 'ARC' && !arcReceipt) {
    checks.blueprint_provenance.warning = 'authored_by ARC without ARC_RUN_RECEIPT — run system pipeline or translate';
  }

  return {
    ok: violations.length === 0,
    status: violations.length === 0 ? 'ARC_ENTRY_PASS' : corridor ? 'BLOCKED_CORRIDOR' : 'BLOCKED_RETURN_TO_IDC',
    mission_id: missionId,
    mission_folder: missionRel(missionFolder),
    checks,
    violations,
  };
}
