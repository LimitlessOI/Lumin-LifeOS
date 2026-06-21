/**
 * SYNOPSIS: SENTRY future-lookback — structural questions (no council call on hot path).
 * SENTRY future-lookback — structural questions (no council call on hot path).
 */

const HORIZONS = ['6_month', '1_year', '2_year'];

const QUESTIONS = [
  'how_does_this_break',
  'what_long_term_harm_might_it_create',
  'what_prevention_should_be_added_now',
];

export function futureLookbackReview({ step, builderResult } = {}) {
  const findings = [];
  const target = builderResult?.target_file || step?.target_file || '';

  if (/register-routes|run-step|run-mission/.test(target)) {
    findings.push({
      horizon: '6_month',
      severity: 'info',
      note: 'shared_file_change_requires_canonical_step_ownership',
    });
  }

  if (step?.action_type && step.action_type !== 'write_file_exact') {
    findings.push({
      horizon: '1_year',
      severity: 'warning',
      note: 'non_write_file_exact_action_may_reduce_determinism',
    });
  }

  const blocking = findings.filter((f) => f.severity === 'blocking');
  return {
    horizons: HORIZONS,
    requiredQuestions: QUESTIONS,
    findings,
    pass: blocking.length === 0,
    status: blocking.length ? 'FAIL' : findings.length ? 'ADVISORY' : 'PASS',
  };
}

/** @deprecated alias */
export function futureLookbackSummary() {
  return futureLookbackReview({});
}
