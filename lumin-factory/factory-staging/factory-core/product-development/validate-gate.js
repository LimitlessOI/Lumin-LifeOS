/**
 * SYNOPSIS: Product Development gate — BPB may not start unless strategic ambiguity is resolved.
 * Product Development gate — BPB may not start unless strategic ambiguity is resolved.
 */

const REQUIRED_STRICT = [
  'status',
  'mission_id',
  'resolved_questions',
  'unresolved_questions',
  'founder_decisions',
  'phase_boundary',
  'risk_register',
];

const REQUIRED_LEGACY = ['status', 'mission_id'];

export function validateProductDevelopmentGate(pd, { mission_id, strict = false } = {}) {
  const violations = [];

  if (!pd || typeof pd !== 'object') {
    return { ok: false, status: 'PRODUCT_DEVELOPMENT_FAILURE', violations: ['missing PRODUCT_DEVELOPMENT_RESULT'] };
  }

  if (pd.mission_id && mission_id && pd.mission_id !== mission_id) {
    violations.push('mission_id mismatch');
  }

  const required = strict ? REQUIRED_STRICT : REQUIRED_LEGACY;
  for (const key of required) {
    if (pd[key] === undefined || pd[key] === null || pd[key] === '') {
      violations.push(`missing ${key}`);
    }
  }

  if (pd.status !== 'PASS') {
    violations.push(`status must be PASS (got ${pd.status})`);
  }

  if (strict && Array.isArray(pd.unresolved_questions) && pd.unresolved_questions.length > 0) {
    violations.push('unresolved_questions must be empty when status is PASS');
  }

  return {
    ok: violations.length === 0,
    status: violations.length === 0 ? 'PASS' : 'PRODUCT_DEVELOPMENT_FAILURE',
    violations,
    mode: strict ? 'strict' : 'legacy',
  };
}
