// services/builderos-alpha-readiness-guards.js
import { ProofFreshness, Readiness } from '../types';

/**
 * Computes fail-closed alpha readiness guards from runtime truth.
 *
 * @see @ssot docs/projects/builderos-remediation/BLUEPRINT.md
 */
export function buildFailClosedReadinessBlockers({
  proofFreshness,
  readiness,
}: {
  proofFreshness: ProofFreshness;
  readiness: Readiness;
}): string[] {
  const blockers: string[] = [];

  if (!proofFreshness.isFresh) {
    blockers.push('Stale proof');
  }

  if (!readiness.ready_for_supervised) {
    blockers.push('Not ready for supervised');
  }

  if (readiness.staleProofRepairQueue.length > 0) {
    blockers.push('Active stale-proof repair queue item');
  }

  return blockers;
}

export function canReportAlphaReady({
  proofFreshness,
  readiness,
  blockers,
}: {
  proofFreshness: ProofFreshness;
  readiness: Readiness;
  blockers: string[];
}): boolean {
  return blockers.length === 0;
}

export function buildFakeGreenStatusNote({
  proofFreshness,
  readiness,
  percentComplete,
}: {
  proofFreshness: ProofFreshness;
  readiness: Readiness;
  percentComplete: number;
}): string {
  if (percentComplete >= 85 && !canReportAlphaReady({ proofFreshness, readiness, blockers: [] })) {
    return 'Alpha readiness blocked by stale proof or not ready for supervised';
  }

  return '';
}