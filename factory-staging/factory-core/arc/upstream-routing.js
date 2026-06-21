/**
 * SYNOPSIS: Upstream failure routing — ARC pushes to Chair; Chair escalates to founder only on Chair failure.
 * Agent drift ≠ system drift.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';

export function classifyDrift({ actor = 'system', kind = 'process', detail = '' } = {}) {
  const isAgent = actor === 'agent' || actor === 'cursor' || actor === 'codex' || actor === 'claude';
  return {
    drift_class: isAgent ? 'AGENT_DRIFT' : 'SYSTEM_DRIFT',
    failure_owner: isAgent ? 'agent' : 'system',
    kind,
    detail,
    lesson: isAgent
      ? 'Agent drift — agent impersonated a seat or bypassed machine path.'
      : 'System drift — pipeline skipped a required seat or receipt.',
  };
}

/**
 * Build upstream route when development handoff is incomplete.
 * Default: Chair failure — NOT founder incomplete packet.
 */
export function buildUpstreamRoute({
  missionId,
  violations = [],
  defectOwnerSeat = 'Chair',
  pushedBy = 'ARC',
  chairCanSynthesize = null,
} = {}) {
  const chairFailed = defectOwnerSeat === 'Chair' || violations.some((v) => v.includes('development') || v.includes('department'));
  const escalateToFounder =
    chairCanSynthesize === false ||
    violations.some((v) => v.includes('BLOCKED_INTENT_AMBIGUITY'));

  return {
    schema: 'upstream_route_v1',
    mission_id: missionId,
    pushed_by: pushedBy,
    defect_owner_seat: chairFailed ? 'Chair' : defectOwnerSeat,
    route_to: chairFailed ? 'CHAIR' : defectOwnerSeat,
    escalate_to_founder: escalateToFounder,
    founder_frame: escalateToFounder
      ? 'Chair failed to synthesize your intent from our conversation — not that you failed to provide it.'
      : null,
    violations,
    flow: escalateToFounder
      ? ['ARC → Chair (handoff incomplete)', 'Chair → Adam (Chair acknowledges synthesis failure)', 'resolve → back down chain']
      : ['ARC → Chair (handoff incomplete)', 'Chair resolves from conversation → re-run department sims → ARC'],
    lesson: 'Incomplete handoff clarity = Chair failure. Architect pushes upstream.',
  };
}

export function writeChairFailureReceipt(missionFolder, route) {
  const out = path.join(missionFolder, 'receipts/CHAIR_HANDOFF_FAILURE.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const record = {
    schema: 'chair_handoff_failure_v1',
    mission_id: path.basename(missionFolder),
    recorded_at: new Date().toISOString(),
    chair_failed: true,
    pushed_by: route.pushed_by,
    defect_owner_seat: 'Chair',
    violations: route.violations,
    escalate_to_founder: route.escalate_to_founder,
    founder_message: route.founder_frame,
    next: route.flow,
  };
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export function writeUpstreamRouteReport(missionFolder, route) {
  const out = path.join(missionFolder, 'receipts/UPSTREAM_ROUTE_REPORT.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(route, null, 2)}\n`);
  return route;
}
