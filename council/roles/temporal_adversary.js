import dayjs from 'dayjs';

/**
 * Temporal Adversary
 * Perspective: two years after "success", identifies slow failures, unintended consequences, incentive drift.
 * No praise. No reassurance.
 */
export async function analyzeTemporalAdversary(proposalText, context = {}) {
  const now = dayjs();
  const horizon = now.add(2, 'year').format('YYYY-MM-DD');
  const lower = (proposalText || '').toLowerCase();

  // Simple heuristic scoring; replace with council-driven reasoning when available
  let severity = 6;
  if (lower.includes('irreversible') || lower.includes('data loss')) severity = 48;
  if (lower.includes('[fsar_block]')) severity = 50;
  else if (lower.includes('[fsar_review]')) severity = Math.max(severity, 30);

  const risks = [
    `Slow failure: unnoticed degradation accumulating by ${horizon}`,
    'Unintended consequence: incentives shift toward short-term metrics, long-term reliability decays',
    'Incentive drift: stakeholders habituate to optimistic outputs, raising risk of silent defects',
  ];

  const mitigations = [
    'Add scheduled adversarial audits with hard pass/fail gates',
    'Track leading indicators for drift and trust inflation; alert on trend change',
    'Prefer reversible rollouts; keep rollback artifacts warm and tested',
  ];

  const block_execution = severity >= 45 || lower.includes('[fsar_block]');

  return {
    perspective: 'two_years_after_success',
    severity,
    block_execution,
    risks,
    mitigations,
    notes: 'No reassurance. Future-view focusing on slow failures and incentive drift.',
    context,
  };
}

export default analyzeTemporalAdversary;
