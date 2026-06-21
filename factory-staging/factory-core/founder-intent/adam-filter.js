/**
 * SYNOPSIS: Founder Intent / Adam Filter — pre-escalation check (measurement only; never assigns work).
 */

export function runAdamFilter({ founder_packet: packet, product_development: pd, strict = false } = {}) {
  const flags = [];
  const warnings = [];

  if (!packet?.non_goals?.length) {
    if (strict) flags.push('missing_non_goals');
    else warnings.push('missing_non_goals');
  }

  if (!packet?.escalation) {
    if (strict) flags.push('missing_escalation_boundaries');
    else warnings.push('missing_escalation_boundaries');
  }

  const budget = packet?.founder_attention_budget?.level || packet?.founder_attention_budget;
  if (!budget) {
    warnings.push('founder_attention_budget_unspecified');
  } else if (String(budget).toLowerCase() === 'high' && pd?.status === 'PASS') {
    warnings.push('high_founder_attention_mission_requires_explicit_approval_receipt');
  }

  if (Array.isArray(packet?.scope) && packet.scope.some((s) => /full lifeos|entire product/i.test(String(s)))) {
    warnings.push('scope_may_exceed_single_mission_boundary');
  }

  return {
    ok: flags.length === 0,
    status: flags.length === 0 ? 'PASS' : 'FOUNDER_INTENT_BLOCK',
    flags,
    warnings,
    note: 'Filter surfaces risk; it does not approve or assign builder work.',
  };
}
