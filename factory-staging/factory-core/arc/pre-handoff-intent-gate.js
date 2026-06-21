/**
 * SYNOPSIS: Pre-handoff intent gate — development stage ONLY.
 * ARC tells Chair intent is incomplete. Adam is NOT re-questioned after handoff.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadMissionJson } from './mission-paths.js';
import { validateDepartmentReceipts } from './department-simulations.js';
import { buildUpstreamRoute, writeChairFailureReceipt, writeUpstreamRouteReport } from './upstream-routing.js';

const BLOCKING_COVERAGE = new Set(['MISSING', 'MENTIONED']);
const READY_COVERAGE = new Set(['SUFFICIENT', 'LOCKED']);

function founderPacketSections(missionFolder) {
  const md = path.join(missionFolder, 'FOUNDER_PACKET.md');
  const json = path.join(missionFolder, 'FOUNDER_PACKET.json');
  const text = fs.existsSync(md)
    ? fs.readFileSync(md, 'utf8')
    : fs.existsSync(json)
      ? JSON.stringify(JSON.parse(fs.readFileSync(json, 'utf8')), null, 2)
      : '';
  return {
    has_packet: text.length > 0,
    has_problem: /##\s*Problem/i.test(text) && text.length > 200,
    has_outcome: /##\s*(Desired Outcome|FOUNDER SUCCESS)/i.test(text),
    has_success_test: /FOUNDER SUCCESS TEST/i.test(text),
    has_acceptance: /acceptance|npm run/i.test(text),
    bytes: text.length,
  };
}

/**
 * Development-stage gate — the ONLY phase where "intent thin/incomplete" is valid.
 * Routes to Chair, not Adam.
 */
export function evaluatePreHandoffIntentGate(missionFolder) {
  const missionId = path.basename(missionFolder);
  const violations = [];
  const checks = {};

  const fp = founderPacketSections(missionFolder);
  checks.founder_packet = {
    pass: fp.has_packet && fp.has_problem && fp.has_outcome && fp.has_success_test && fp.has_acceptance,
    sections: fp,
  };
  if (!fp.has_packet) violations.push('development:missing founder packet');
  if (!fp.has_problem) violations.push('development:FOUNDER_PACKET missing Problem');
  if (!fp.has_outcome) violations.push('development:FOUNDER_PACKET missing Desired Outcome');
  if (!fp.has_success_test) violations.push('development:FOUNDER_PACKET missing FOUNDER SUCCESS TEST');
  if (!fp.has_acceptance) violations.push('development:FOUNDER_PACKET missing acceptance command');

  const coverage = loadMissionJson(missionFolder, 'INTENT_COVERAGE_MAP.json');
  const thin = [];
  for (const dim of coverage?.dimensions || []) {
    if (!dim.load_bearing) continue;
    const level = String(dim.coverage_level || 'MISSING');
    if (level === 'PARKED') continue;
    if (BLOCKING_COVERAGE.has(level) || !READY_COVERAGE.has(level)) {
      thin.push(`${dim.name}:${level}`);
    }
  }
  checks.intent_coverage = { pass: thin.length === 0, gaps: thin };
  if (thin.length) violations.push(`development:intent_not_clear ${thin.join(',')}`);

  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  checks.intent_baseline = {
    pass: baseline?.status === 'HANDOFF_READY',
    status: baseline?.status || null,
  };
  if (baseline?.status !== 'HANDOFF_READY') {
    violations.push(`development:INTENT_BASELINE not HANDOFF_READY (${baseline?.status || 'missing'})`);
  }

  const departments = validateDepartmentReceipts(missionFolder);
  checks.departments = departments.checks;
  if (!departments.pass) violations.push(...departments.violations);

  const route = buildUpstreamRoute({
    missionId,
    violations,
    defectOwnerSeat: 'Chair',
    pushedBy: 'ARC',
    chairCanSynthesize: violations.length === 0 ? true : false,
  });

  if (violations.length) {
    writeUpstreamRouteReport(missionFolder, route);
    writeChairFailureReceipt(missionFolder, route);
  }

  return {
    schema: 'pre_handoff_intent_gate_v2',
    mission_id: missionId,
    stage: 'development',
    pass: violations.length === 0,
    route_to: violations.length ? 'CHAIR' : 'ARC',
    pushed_by: 'ARC',
    defect_owner_seat: violations.length ? 'Chair' : null,
    escalate_to_founder: route.escalate_to_founder,
    founder_frame: route.founder_frame,
    audience: 'CHAIR',
    violations,
    checks,
    upstream: route,
    lesson: violations.length
      ? 'Handoff incomplete or unclear — Chair failure. ARC pushes upstream. Not founder fault.'
      : 'All departments touched. Chair may lock handoff and enter protected corridor.',
  };
}

export function writePreHandoffReport(missionFolder, report) {
  const out = path.join(missionFolder, 'receipts/PRE_HANDOFF_INTENT_GATE_REPORT.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  return out;
}
