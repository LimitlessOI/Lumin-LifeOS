export function unintendedConsequenceCheck({ step, builderResult } = {}) {
  const findings = [];
  const boundary = step?.sandbox_boundary || '';
  const target = builderResult?.target_file || step?.target_file || '';

  if (target && boundary && !target.replace(/\\/g, '/').startsWith(boundary.replace(/\/\*\*$/, ''))) {
    findings.push({ lane: 'boundary_regression', severity: 'blocking', detail: 'target outside sandbox' });
  }

  if (/server\.js$/.test(target)) {
    findings.push({ lane: 'misuse', severity: 'blocking', detail: 'composition_root_write_forbidden_on_hot_path' });
  }

  const blocking = findings.filter((f) => f.severity === 'blocking');
  return {
    subject: step?.step_id || 'unknown',
    reviewLanes: ['help', 'harm', 'misuse', 'boundary_regression'],
    findings,
    pass: blocking.length === 0,
    status: blocking.length ? 'FAIL' : findings.length ? 'ADVISORY' : 'PASS',
  };
}
