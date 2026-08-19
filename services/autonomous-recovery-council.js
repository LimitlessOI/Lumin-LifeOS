/**
 * SYNOPSIS: Autonomous recovery orchestrator.
 */
import { runGovernanceAuditCycle } from '../scripts/sentry-chair-governance-audit.mjs';
import { gatherSystemWorkingSignals } from './sentry-system-audit.js';
import { reconcileStalls } from './sentry-stall-recovery.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const CATASTROPHIC_STOP_STALE_MS = Number(
  process.env.SENTRY_CATASTROPHIC_STOP_STALE_MS || 6 * 60 * 1000,
);

async function postFounderAlert(path, body, {
  baseUrl = process.env.PUBLIC_BASE_URL,
  commandKey = process.env.COMMAND_CENTER_KEY,
  fetchFn = fetch,
} = {}) {
  if (!baseUrl || !commandKey) {
    return { ok: false, reason: 'missing_alert_transport_config' };
  }
  try {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-center-key': commandKey,
      },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

export async function sendCatastrophicStopAlarm({
  ageMs,
  stage = 'initial',
  logger = console,
  fetchFn = fetch,
} = {}) {
  const phone = process.env.ALERT_PHONE || process.env.ADAM_SMS_NUMBER;
  const minutes = Math.max(1, Math.round(Number(ageMs || 0) / 60000));
  const text = `FIVE-ALARM BUILDEROS FAILURE: autonomous manufacturing stopped. No governed build tick for ${minutes} minute(s). SENTRY recovery is active now. Stage=${stage}. This is a P0 system failure until manufacturing resumes.`;

  const [sms, call] = await Promise.all([
    postFounderAlert('/api/v1/lifeos/founder/sms', { body: text }, { fetchFn }),
    phone
      ? postFounderAlert('/api/v1/lifeos/founder/voice/call', { to: phone, say: text }, { fetchFn })
      : Promise.resolve({ ok: false, reason: 'missing_alert_phone' }),
  ]);

  logger?.error?.({ stage, ageMs, sms, call }, '[SENTRY-RECOVERY] FIVE-ALARM catastrophic stop notification dispatched');
  return { sms, call };
}

async function sendStallSms(text, { fetchFn = fetch } = {}) {
  return postFounderAlert('/api/v1/lifeos/founder/sms', { body: text }, { fetchFn });
}

async function sendStallCall(text, { fetchFn = fetch } = {}) {
  const phone = process.env.ALERT_PHONE || process.env.ADAM_SMS_NUMBER;
  if (!phone) return { ok: false, reason: 'missing_alert_phone' };
  return postFounderAlert('/api/v1/lifeos/founder/voice/call', { to: phone, say: text }, { fetchFn });
}

export function detectCatastrophicGovernedStop(signals, {
  now = Date.now(),
  staleMs = CATASTROPHIC_STOP_STALE_MS,
} = {}) {
  const governed = signals?.governed;
  if (!governed || governed.hardHalt === true || governed.enabled !== true || !governed.lastTickAt) {
    return { stopped: false };
  }
  const tickMs = Date.parse(governed.lastTickAt);
  if (!Number.isFinite(tickMs)) return { stopped: false };
  const ageMs = now - tickMs;
  return {
    stopped: ageMs > staleMs,
    ageMs,
    staleMs,
    lastTickAt: governed.lastTickAt,
  };
}

/**
 * Autonomous recovery orchestrator.
 *
 * SENTRY observes and proposes. Conductor governs the repair path. Architect
 * receives only a lawfully sealed repair. Builder executes. SENTRY then
 * re-checks reality. A stopped builder is a catastrophic failure: alert the
 * founder, recover autonomously, and verify that manufacturing resumes.
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
  intervalMs = Number(process.env.SENTRY_RECOVERY_INTERVAL_MS || 60 * 1000),
  bootDelayMs = Number(process.env.SENTRY_RECOVERY_BOOT_DELAY_MS || 15_000),
  signalReader = gatherSystemWorkingSignals,
  restartProcess = () => {
    const handle = setTimeout(() => process.exit(1), 250);
    handle.unref?.();
  },
} = {}) {
  let inFlight = false;
  let incidentStartedAt = null;
  const alarmedStages = new Set();

  const alarmStage = (ageSinceIncident) => {
    if (ageSinceIncident >= 10 * 60 * 1000) return 'still_stopped_10m';
    if (ageSinceIncident >= 5 * 60 * 1000) return 'still_stopped_5m';
    return 'initial';
  };

  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const signals = await signalReader().catch(() => null);
      const catastrophic = detectCatastrophicGovernedStop(signals);

      if (catastrophic.stopped) {
        incidentStartedAt = incidentStartedAt || Date.now();
        const stage = alarmStage(Date.now() - incidentStartedAt);
        if (!alarmedStages.has(stage)) {
          alarmedStages.add(stage);
          await sendCatastrophicStopAlarm({ ageMs: catastrophic.ageMs, stage, logger });
        }

        // Disabled 2026-08-19: this self-restart caused a real production
        // outage — signals.governed.enabled was reporting true even though
        // the governed builder was deliberately idle (BUILDEROS_NEVER_STOP/
        // BUILDEROS_AUTOPILOT/GOVERNED_FACTORY_ONLY all off), so every boot
        // saw a ~5-day-stale "catastrophic stop" and restarted itself ~15s
        // later, forever. Alerting stays on; the founder decides whether a
        // restart is warranted instead of the process killing itself blind.
        // Re-enable by setting SENTRY_RECOVERY_AUTO_RESTART=true once
        // signals.governed.enabled is fixed to reflect real runtime state.
        if (stage === 'initial' && process.env.SENTRY_RECOVERY_AUTO_RESTART === 'true') {
          logger?.error?.({ catastrophic }, '[SENTRY-RECOVERY] governed builder stopped; forcing Railway process restart');
          restartProcess();
          return;
        }
      } else if (incidentStartedAt) {
        logger?.info?.('[SENTRY-RECOVERY] catastrophic stop cleared; manufacturing heartbeat resumed');
        incidentStartedAt = null;
        alarmedStages.clear();
      }

      // Founder order 2026-08-19: SENTRY must get any genuinely stalled
      // product going again itself, prioritizing the actual fix, before
      // ever just alerting — text first, escalate to a call only if the
      // prioritized retry fails the same way repeatedly. Deliberate
      // founder spin-breaks are never touched (see sentry-stall-recovery.js).
      try {
        await reconcileStalls({ logger, sendSms: sendStallSms, sendCall: sendStallCall });
      } catch (error) {
        logger?.error?.({ error: error.message }, '[STALL-RECOVERY] reconcile tick failed; next tick remains armed');
      }

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

  logger?.info?.({ intervalMs, bootDelayMs, catastrophicStaleMs: CATASTROPHIC_STOP_STALE_MS }, '[SENTRY-RECOVERY] autonomous recovery + five-alarm stop supervisor armed');
  const bootHandle = setTimeout(() => { tick(); }, bootDelayMs);
  bootHandle.unref?.();
  const intervalHandle = setInterval(() => { tick(); }, intervalMs);
  intervalHandle.unref?.();
  return { bootHandle, intervalHandle };
}

export default runAutonomousRecoveryCouncil;
