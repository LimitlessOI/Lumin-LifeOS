/**
 * IDC exit gate — full founder checklist before ARC.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadMissionJson } from '../mission-paths.js';
import { validateDepartmentReceipts } from '../department-simulations.js';

const BLOCKING = new Set(['MISSING', 'MENTIONED']);

export function evaluateIdcExitGate(missionFolder) {
  const missionId = path.basename(missionFolder);
  const violations = [];
  const checks = {};

  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  checks.intent_baseline = { pass: Boolean(baseline?.mission_id), status: baseline?.status };
  if (!baseline?.mission_id) violations.push('idc:INTENT_BASELINE missing');

  const coverage = loadMissionJson(missionFolder, 'INTENT_COVERAGE_MAP.json');
  const thin = (coverage?.dimensions || []).filter(
    (d) => d.load_bearing && BLOCKING.has(String(d.coverage_level || 'MISSING')),
  );
  checks.coverage = { pass: thin.length === 0, gaps: thin.map((d) => d.name) };
  if (thin.length) violations.push(`idc:load_bearing_gaps ${thin.map((d) => d.name).join(',')}`);

  const dept = validateDepartmentReceipts(missionFolder);
  checks.departments = dept;
  if (!dept.pass) violations.push(...dept.violations.map((v) => `idc:${v}`));

  for (const file of [
    'IDC_CONSENSUS_RECEIPT.json',
    'KNOWN_RISKS.json',
    'KNOWN_ASSUMPTIONS.json',
    'CHAIR_HANDOFF_RECEIPT.json',
    'PRE_ARC_INPUT_PACKET.json',
  ]) {
    const exists = fs.existsSync(path.join(missionFolder, file)) ||
      fs.existsSync(path.join(missionFolder, 'receipts', file));
    checks[file] = { pass: exists };
    if (!exists) violations.push(`idc:missing ${file}`);
  }

  const asset = loadMissionJson(missionFolder, 'ASSET_REUSE_DECISION.json');
  checks.asset_reuse = { pass: Boolean(asset?.decisions?.length) };
  if (!asset?.decisions?.length) violations.push('idc:missing ASSET_REUSE_DECISION');

  return {
    schema: 'idc_exit_gate_v1',
    mission_id: missionId,
    pass: violations.length === 0,
    status: violations.length === 0 ? 'IDC_EXIT_PASS' : 'BLOCKED_CONTINUE_IDC',
    route_to: violations.length ? 'CHAIR' : 'ARC',
    defect_owner_seat: violations.length ? 'Chair' : null,
    violations,
    checks,
  };
}
