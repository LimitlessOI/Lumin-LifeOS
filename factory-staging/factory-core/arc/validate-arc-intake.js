/**
 * SYNOPSIS: Exports validateArcIntake — factory-staging/factory-core/arc/validate-arc-intake.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO_ROOT } from '../builder/run-step.js';
import { runArcEntryGate } from './entry-gate.js';
import { loadMissionJson, resolveMissionFolder, missionRel } from './mission-paths.js';

export function validateArcIntake(missionIdOrPath, { corridor = false } = {}) {
  const entry = runArcEntryGate(missionIdOrPath, { corridor });
  const missionFolder = resolveMissionFolder(missionIdOrPath);
  const violations = [...(entry.violations || [])];
  const checks = { ...entry.checks };

  if (!missionFolder) {
    return { ok: false, status: 'BLOCKED_RETURN_TO_IDC', violations: ['mission missing'] };
  }

  const asset = loadMissionJson(missionFolder, 'ASSET_REUSE_DECISION.json');
  checks.asset_reuse = {
    pass: Boolean(asset?.decisions?.length),
    arc_decision: asset?.arc_decision || null,
  };
  if (!checks.asset_reuse.pass) violations.push('asset_reuse:missing ASSET_REUSE_DECISION.json');

  const roadmap = loadMissionJson(missionFolder, 'BLUEPRINT_ROADMAP.json');
  const readyPhases = (roadmap?.phases || []).filter((p) => p.status === 'BUILDER_READY');
  checks.roadmap = {
    pass: readyPhases.length > 0,
    builder_ready_phases: readyPhases.map((p) => p.phase_id),
  };
  if (!checks.roadmap.pass) violations.push('roadmap:no BUILDER_READY phases');

  const coverage = loadMissionJson(missionFolder, 'INTENT_COVERAGE_MAP.json');
  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  if (!corridor) {
    if (coverage?.snt_regrade_required === true) {
      const proofLap =
        roadmap?.proof_lap_mission === path.basename(missionFolder) || baseline?.proof_lap_only === true;
      if (proofLap) {
        checks.snt_regrade = { pass: true, note: 'proof_lap_only — bootstrap allowed' };
      } else {
        checks.snt_regrade = { pass: false, note: 'snt_regrade_required — alpha missions must regrade before ARC' };
        violations.push('intent_coverage:snt_regrade_required');
      }
    }
    if (baseline?.status !== 'HANDOFF_READY') {
      violations.push(`intent_baseline:status must be HANDOFF_READY (got ${baseline?.status || 'missing'})`);
    }
  } else {
    checks.snt_regrade = { pass: true, note: 'corridor — no regrade at machine path' };
    if (baseline?.status !== 'HANDOFF_READY') {
      violations.push(`corridor:handoff not locked (${baseline?.status || 'missing'})`);
    }
  }

  const chairHandoff =
    fs.existsSync(path.join(missionFolder, 'CHAIR_HANDOFF_RECEIPT.json')) ||
    fs.existsSync(path.join(missionFolder, 'FOUNDER_HANDOFF_RECEIPT.json'));
  if (corridor) {
    checks.chair_handoff = { pass: chairHandoff };
    if (!chairHandoff) violations.push('corridor:missing CHAIR_HANDOFF_RECEIPT — development handoff not recorded');
  }

  return {
    ok: violations.length === 0 && entry.ok,
    status: violations.length === 0 && entry.ok
      ? 'ARC_INTAKE_PASS'
      : corridor
        ? 'BLOCKED_CORRIDOR'
        : 'BLOCKED_RETURN_TO_CHAIR',
    mission_id: path.basename(missionFolder),
    mission_folder: missionRel(missionFolder),
    checks,
    violations,
    route_to: corridor ? 'SYSTEM' : 'CHAIR',
    idc_questions: !corridor && violations.length
      ? violations.map((v) => ({
          category: v.split(':')[0],
          question: `Resolve in development stage: ${v}`,
          owner: 'CHAIR',
        }))
      : [],
  };
}

export function snapshotRepoFile(repoRelPath, contentDir, stepId) {
  const abs = path.join(REPO_ROOT, repoRelPath);
  if (!fs.existsSync(abs)) {
    return { ok: false, error: `missing source ${repoRelPath}` };
  }
  const base = path.basename(repoRelPath);
  const destDir = path.join(contentDir, stepId);
  fs.mkdirSync(destDir, { recursive: true });
  const destAbs = path.join(destDir, base);
  const buf = fs.readFileSync(abs);
  fs.writeFileSync(destAbs, buf);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const contentRel = path.relative(REPO_ROOT, destAbs).replace(/\\/g, '/');
  return { ok: true, content_source_path: contentRel, sha256, bytes: buf.length };
}
