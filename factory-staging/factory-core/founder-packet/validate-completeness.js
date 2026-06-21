/**
 * SYNOPSIS: Founder Packet completeness — machine validator (no prose-only packets).
 */

const REQUIRED_STRICT = [
  'mission_id',
  'priority',
  'scope',
  'non_goals',
  'target_users',
  'success_criteria',
  'failure_criteria',
  'escalation',
  'founder_attention_budget',
  'risk_register',
  'founder_decision_log',
  'phase_boundaries',
];

const REQUIRED_LEGACY = ['mission_id', 'scope'];

function fieldPresent(packet, key) {
  const v = packet[key];
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return String(v).trim().length > 0;
}

export function validateFounderPacketCompleteness(packet, { mission_id, strict = false } = {}) {
  const violations = [];

  if (!packet || typeof packet !== 'object') {
    return { ok: false, status: 'FOUNDER_PACKET_INCOMPLETE', violations: ['missing packet'] };
  }

  if (mission_id && packet.mission_id && packet.mission_id !== mission_id) {
    violations.push('mission_id mismatch');
  }

  const required = strict ? REQUIRED_STRICT : REQUIRED_LEGACY;
  for (const key of required) {
    if (!fieldPresent(packet, key)) {
      violations.push(`missing or empty ${key}`);
    }
  }

  if (!strict && !fieldPresent(packet, 'non_goals') && !fieldPresent(packet, 'success_criteria') && !fieldPresent(packet, 'scope')) {
    violations.push('legacy requires scope, non_goals, or success_criteria');
  }

  return {
    ok: violations.length === 0,
    status: violations.length === 0 ? 'COMPLETE' : 'FOUNDER_PACKET_INCOMPLETE',
    violations,
    mode: strict ? 'strict' : 'legacy',
  };
}
