/**
 * SYNOPSIS: Record system failure when corridor discovers intent should have been cleared pre-handoff.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';

export function writeSystemFailureDefect(missionFolder, {
  reason,
  defect_owner_seat = 'ARC',
  which_phase_should_have_caught_it = 'Pre-ARC',
  gaps = [],
  intake_category_to_add = '',
} = {}) {
  const missionId = path.basename(missionFolder);
  const record = {
    schema: 'system_failure_defect_v1',
    mission_id: missionId,
    recorded_at: new Date().toISOString(),
    classification: 'intent_not_cleared_before_handoff',
    route: 'system_fix_not_founder',
    reason: String(reason || '').trim(),
    defect_owner_seat,
    which_phase_should_have_caught_it,
    intake_category_to_add,
    gaps,
    lesson: 'Corridor started but intent gap found — system failure, not founder re-question.',
  };
  const out = path.join(missionFolder, 'receipts/SYSTEM_FAILURE_DEFECT.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export function isIntentRelatedGap(gap) {
  const text = `${gap?.decision_gap || ''} ${gap?.forced_decision_reason || ''}`.toLowerCase();
  const owners = new Set(['ARC', 'IDC', 'Chair', 'SNT']);
  if (owners.has(gap?.required_owner)) return true;
  return /intent|scope|invent|unclear|missing.*field|product scope/i.test(text);
}
