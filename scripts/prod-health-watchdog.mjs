#!/usr/bin/env node
/**
 * SYNOPSIS: Production runtime-health watchdog — polls this server's own
 * /healthz for degraded status and escalates to the founder (SMS, then a
 * call if still unresolved) via the existing founder SMS/voice routes.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Closes a confirmed gap named in the founder-requested builder rating
 * (2026-07-28, punch-list item #6): keep-alive.yml already curls /healthz
 * every 5 minutes, but only checks the HTTP status code -- a 200 response
 * with "status":"degraded" (the exact shape found live the same night, two
 * migrations silently failing on every boot) passes that check silently.
 * Nobody is told when the app is up but unhealthy until someone asks.
 *
 * Reuses sendFounderSms/sendFounderCall from ci-health-watchdog.mjs rather
 * than duplicating the founder-sms-routes.js call shape -- same escalation
 * pattern (SMS immediately, call after CALL_ESCALATION_DELAY_MS if still
 * unresolved), same lane-agnostic route choice for the same reason that
 * file documents (founder-sms-routes.js works in the founder_builder lane;
 * services/twilio-service.js's notifyCriticalIssue does not).
 */
import fs from 'fs';
import path from 'path';
import { sendFounderSms, sendFounderCall } from './ci-health-watchdog.mjs';

const CALL_ESCALATION_DELAY_MS = 10 * 60 * 1000; // matches ci-health-watchdog.mjs's own escalation timing

function stateFilePath() {
  return path.join(process.cwd(), 'data', 'prod-health-watchdog-state.json');
}

export function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFilePath(), 'utf8'));
  } catch {
    return { alertedReasons: null };
  }
}

export function saveState(state) {
  const file = stateFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export async function fetchHealth({ baseUrl, fetchFn = fetch }) {
  const res = await fetchFn(`${baseUrl}/healthz`, { signal: AbortSignal.timeout(10000) });
  const body = await res.json().catch(() => null);
  return { httpOk: res.ok, body };
}

/**
 * Pure decision logic -- no network/fs, fully unit-testable. Keys the alert
 * state on the SORTED reasons list (not a boolean) so a degraded->recovered->
 * degraded-for-a-different-reason cycle re-alerts correctly instead of
 * treating "still degraded" as "same incident, already told him."
 */
export function evaluateProdHealth({ health, state, now = Date.now() }) {
  const reasons = health?.body?.startup?.startup_report?.reasons
    || health?.body?.startup_report?.reasons
    || [];
  const reasonKey = health?.httpOk === false
    ? 'unreachable'
    : (Array.isArray(reasons) && reasons.length ? [...reasons].sort().join('|') : null);

  const alerted = state.alertedReasons;

  if (!reasonKey) {
    if (alerted) return { action: 'recovered', reasonKey: null, newState: { ...state, alertedReasons: null } };
    return { action: 'none', reasonKey: null, newState: state };
  }

  if (!alerted || alerted.reasonKey !== reasonKey) {
    return {
      action: 'sms',
      reasonKey,
      newState: { ...state, alertedReasons: { reasonKey, smsAt: now, calledAt: null } },
    };
  }

  if (!alerted.calledAt && now - alerted.smsAt >= CALL_ESCALATION_DELAY_MS) {
    return {
      action: 'call',
      reasonKey,
      newState: { ...state, alertedReasons: { ...alerted, calledAt: now } },
    };
  }

  return { action: 'none', reasonKey, newState: state };
}

export async function runProdHealthWatchdogCycle({
  baseUrl = process.env.PUBLIC_BASE_URL,
  commandKey = process.env.COMMAND_CENTER_KEY,
  alertPhone = process.env.ALERT_PHONE || process.env.ADAM_SMS_NUMBER,
  logger = console,
} = {}) {
  if (!baseUrl) {
    logger.warn?.('[PROD-HEALTH-WATCHDOG] PUBLIC_BASE_URL missing — skipping cycle');
    return { skipped: 'missing_base_url' };
  }

  let health;
  try {
    health = await fetchHealth({ baseUrl });
  } catch (err) {
    health = { httpOk: false, body: null, fetchError: err.message };
  }

  const state = loadState();
  const { action, reasonKey, newState } = evaluateProdHealth({ health, state });
  saveState(newState);

  if (action === 'none') return { action, reasonKey };

  if (!commandKey || !alertPhone) {
    logger.warn?.(`[PROD-HEALTH-WATCHDOG] would ${action} (${reasonKey}) but COMMAND_CENTER_KEY/ALERT_PHONE missing — cannot actually alert`);
    return { action, reasonKey, alerted: false, reason: 'missing_alert_config' };
  }

  if (action === 'recovered') {
    await sendFounderSms({ baseUrl, commandKey, message: 'BuilderOS: production /healthz is back to healthy.' });
    logger.info?.('[PROD-HEALTH-WATCHDOG] recovery SMS sent');
    return { action, alerted: true };
  }

  const message = `BuilderOS ALERT: production is degraded (${reasonKey}). ${baseUrl}/healthz`;

  if (action === 'sms') {
    await sendFounderSms({ baseUrl, commandKey, message });
  } else if (action === 'call') {
    await sendFounderCall({ baseUrl, commandKey, to: alertPhone, message });
  }

  logger.warn?.(`[PROD-HEALTH-WATCHDOG] ${action} alert sent for reason=${reasonKey}`);
  return { action, reasonKey, alerted: true };
}

/** Mirrors startCiHealthWatchdogScheduler's exact convention. */
export function startProdHealthWatchdogScheduler({ logger = console } = {}) {
  const intervalMs = Number(process.env.PROD_HEALTH_WATCHDOG_INTERVAL_MS || 5 * 60 * 1000);
  const bootDelayMs = Number(process.env.PROD_HEALTH_WATCHDOG_BOOT_DELAY_MS || 90_000);

  const tick = async () => {
    try {
      const result = await runProdHealthWatchdogCycle({ logger });
      if (result?.action && result.action !== 'none') {
        logger?.info?.({ result }, '[PROD-HEALTH-WATCHDOG] tick');
      }
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[PROD-HEALTH-WATCHDOG] tick failed');
    }
  };

  logger?.info?.({ intervalMs, bootDelayMs }, '[PROD-HEALTH-WATCHDOG] starting — watching own /healthz for degraded status, escalates SMS then call');

  setTimeout(() => { tick(); }, bootDelayMs);
  return setInterval(() => { tick(); }, intervalMs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runProdHealthWatchdogCycle()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[PROD-HEALTH-WATCHDOG] cycle failed:', err.message);
      process.exit(1);
    });
}
