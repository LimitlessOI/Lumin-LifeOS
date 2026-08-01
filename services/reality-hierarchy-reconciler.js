/**
 * SYNOPSIS: Compare SENTRY, receipts, production behavior, and customer data
 * against Chair consensus and flag divergences.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export function reconcileRealitySources({ sentry = {}, receipts = {}, production = {}, customer = {}, chairConsensus = {} }) {
  const divergences = [];

  if (production.sha && chairConsensus.sha && production.sha !== chairConsensus.sha) {
    divergences.push({ source: 'production', expected: chairConsensus.sha, actual: production.sha, severity: 'high' });
  }

  if (sentry.status === 'fail') {
    divergences.push({ source: 'sentry', expected: 'pass', actual: 'fail', severity: 'high', detail: sentry.detail });
  }

  if (receipts.git_sha && chairConsensus.git_sha && receipts.git_sha !== chairConsensus.git_sha) {
    divergences.push({ source: 'receipt', expected: chairConsensus.git_sha, actual: receipts.git_sha, severity: 'medium' });
  }

  if (customer.status === 'complaint' || customer.status === 'blocked') {
    divergences.push({ source: 'customer', expected: 'ok', actual: customer.status, severity: 'high', detail: customer.detail });
  }

  return {
    divergences,
    aligned: divergences.length === 0,
    highest_severity: divergences.some((d) => d.severity === 'high') ? 'high' : divergences.some((d) => d.severity === 'medium') ? 'medium' : 'none',
    timestamp: new Date().toISOString(),
  };
}

export function shouldEscalateToChair(reconcileResult) {
  if (!reconcileResult) return false;
  return reconcileResult.divergences.some((d) => d.severity === 'high');
}
