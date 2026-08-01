/**
 * SYNOPSIS: Reality alignment gate — compare SENTRY, receipts, production behavior,
 * and customer data against Chair consensus and flag divergences.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { reconcileRealitySources, shouldEscalateToChair } from './reality-hierarchy-reconciler.js';
import { auditFileLineage, trackAmendment } from './asset-evolution-governance.js';

export function runRealityAlignmentGate({ sentry = {}, receipts = {}, production = {}, customer = {}, chairConsensus = {} }) {
  const reconcile = reconcileRealitySources({ sentry, receipts, production, customer, chairConsensus });
  return {
    ok: reconcile.aligned,
    aligned: reconcile.aligned,
    divergences: reconcile.divergences,
    escalate_to_chair: shouldEscalateToChair(reconcile),
    timestamp: new Date().toISOString(),
  };
}

export function checkAssetEvolution(filePath, ssotReference) {
  return auditFileLineage(filePath, ssotReference);
}

export function recordAmendment(amendments, entry) {
  return trackAmendment(amendments, entry);
}

export { reconcileRealitySources, shouldEscalateToChair };
