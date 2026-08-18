import { runGovernanceAuditCycle } from '../scripts/sentry-chair-governance-audit.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Autonomous recovery orchestrator.
 *
 * SENTRY observes and proposes. Conductor governs the repair path. Architect
 * receives only a lawfully sealed repair. Builder executes. SENTRY then
 * re-checks reality. Founder escalation is a record after exhaustion, never
 * the mechanism that keeps the machine moving.
 */
export async function runAutonomousRecoveryCouncil({
  maxRounds = 3,
  roundDelayMs = Number(process.env.SENTRY_RECOVERY_ROUND_DELAY_MS || 30_000),
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
    const founderAuthority = Number(result?.escalations || 0);
    if (outstanding === 0) {
      return {
        ok: true,
        disposition: 'RECOVERED',
        rounds,
      };
    }

    logger?.warn?.({ round, outstanding, founderAuthority }, '[SENTRY-RECOVERY] findings remain after governed repair cycle; re-verifying');
    if (round < maxRounds && roundDelayMs > 0) await sleep(roundDelayMs);
  }

  return {
    ok: false,
    disposition: 'UNSOLVED',
    founder_alert_is_record_only: true,
    terminal_stop_forbidden: true,
    next_action: 'continue_recovery_on_next_tick',
    rounds,
  };
}

export function startAutonomousRecoveryCouncilScheduler({
  logger = console,
  pool = undefined,
  intervalMs = Number(process.env.SENTRY_RECOVERY_INTERVAL_MS || 5 * 60 * 1000),
  bootDelayMs = Number(process.env.SENTRY_RECOVERY_BOOT_DELAY_MS || 45_000),
} = {}) {
  let inFlight = false;

  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const result = await runAutonomousRecoveryCouncil({
        logger,
        auditArgs: { logger, pool },
      });
      if (!result.ok) {
        logger?.error?.({ disposition: result.disposition, rounds: result.rounds?.length }, '[SENTRY-RECOVERY] recovery not yet complete; terminal stop forbidden');
      }
    } catch (error) {
      logger?.error?.({ error: error.message }, '[SENTRY-RECOVERY] recovery scheduler tick failed; next tick remains armed');
    } finally {
      inFlight = false;
    }
  };

  logger?.info?.({ intervalMs, bootDelayMs }, '[SENTRY-RECOVERY] autonomous recovery scheduler armed');
  const bootHandle = setTimeout(() => { tick(); }, bootDelayMs);
  bootHandle.unref?.();
  const intervalHandle = setInterval(() => { tick(); }, intervalMs);
  intervalHandle.unref?.();
  return { bootHandle, intervalHandle };
}

export default runAutonomousRecoveryCouncil;
