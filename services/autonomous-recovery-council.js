import { runGovernanceAuditCycle } from '../scripts/sentry-chair-governance-audit.mjs';

/**
 * Autonomous recovery orchestrator.
 *
 * Enforces the canonical recovery rule that a SENTRY finding must not turn
 * into a founder-routing dependency before the autonomous recovery ladder has
 * been exhausted. This module deliberately delegates judgment to the existing
 * SENTRY -> Conductor -> consensus -> Architect pipeline; it only guarantees
 * that recovery keeps cycling and that reality is re-checked after action.
 */
export async function runAutonomousRecoveryCouncil({
  maxRounds = 3,
  logger = console,
  audit = runGovernanceAuditCycle,
  auditArgs = {},
} = {}) {
  const rounds = [];

  for (let round = 1; round <= maxRounds; round += 1) {
    const result = await audit({
      ...auditArgs,
      auditKind: 'system',
      observationTier: round === 1 ? 'deep_look' : 'full_audit',
    });
    rounds.push({ round, ...result });

    const outstanding = Number(result?.raw_findings || 0);
    const escalations = Number(result?.escalations || 0);
    if (outstanding === 0 && escalations === 0) {
      return {
        ok: true,
        disposition: 'RECOVERED',
        rounds,
      };
    }
  }

  return {
    ok: false,
    disposition: 'UNSOLVED',
    founder_alert_is_record_only: true,
    terminal_stop_forbidden: true,
    rounds,
  };
}

export default runAutonomousRecoveryCouncil;
