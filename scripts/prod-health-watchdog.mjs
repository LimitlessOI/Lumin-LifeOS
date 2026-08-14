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
import { classifyHealthRepair, repairBindMigrationsInRepo } from './lib/repair-bind-migration.mjs';
import { evaluateSystemWatchdog, overlayNativeBlockedSteps } from './lib/system-watchdog.mjs';
import { collectiblesPrintStillOpen, isCollectiblesPrintSlice } from '../config/overlay-print-sequence.js';

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
 * Shared SMS -> call escalation state machine. Founder standing order
 * 2026-08-14: "if it ever fucking stops I want the system to text me first,
 * if I don't get it started I want a call... stopping building is the
 * biggest fail it can do." Used for both /healthz degradation and BuilderOS
 * watchdog findings (queue stopped shipping, governed loop stale, factory
 * idle with real work still open, etc.) so "the build stopped" gets the
 * exact same founder-reaches-a-human guarantee as a degraded health check --
 * previously only /healthz degradation escalated to a call; a stopped build
 * with zero /healthz symptoms (the exact shape of "ran out of work" or "the
 * in-process loop never started") only ever got a single SMS, never a call.
 */
export function evaluateEscalation({ reasonKey, alerted, now, callDelayMs = CALL_ESCALATION_DELAY_MS }) {
  if (!reasonKey) {
    if (alerted) return { action: 'recovered', newAlerted: null };
    return { action: 'none', newAlerted: alerted || null };
  }
  if (!alerted || alerted.reasonKey !== reasonKey) {
    return { action: 'sms', newAlerted: { reasonKey, smsAt: now, calledAt: null } };
  }
  if (!alerted.calledAt && now - alerted.smsAt >= callDelayMs) {
    return { action: 'call', newAlerted: { ...alerted, calledAt: now } };
  }
  return { action: 'none', newAlerted: alerted };
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

  const { action, newAlerted } = evaluateEscalation({ reasonKey, alerted: state.alertedReasons, now });
  return { action, reasonKey, newState: { ...state, alertedReasons: newAlerted } };
}

export async function fetchGovernedStatus({ baseUrl, commandKey, fetchFn = fetch }) {
  if (!commandKey) return null;
  const res = await fetchFn(`${baseUrl}/api/v1/lifeos/never-stop/status`, {
    headers: { 'x-command-key': commandKey },
    signal: AbortSignal.timeout(10000),
  });
  const body = await res.json().catch(() => null);
  const ns = body?.never_stop || {};
  const gs = ns.governed_status || {};
  return {
    enabled: gs.enabled === true,
    lastTickAt: gs.lastTickAt || gs.lastRunAt || null,
    hardHalt: ns.hard_halt?.halt === true,
  };
}

/**
 * Founder standing order 2026-08-14: "stopping building is the biggest fail
 * it can do." A sealed print sequence that finished (nothing pending,
 * nothing blocked, no next sealed slice) is not automatically a bug -- it
 * may genuinely be the end of what's sealed so far -- but it's exactly the
 * silent-stop shape that already happened once with zero /healthz symptom
 * and zero existing watchdog finding, so it must alert every time, not be
 * assumed fine. Only fires once real collectibles work has actually
 * happened (avoids alerting on a product that simply hasn't started yet).
 */
export function collectiblesPrintClosedFinding(queue) {
  const steps = Array.isArray(queue?.steps) ? queue.steps : [];
  const collectiblesSteps = steps.filter(isCollectiblesPrintSlice);
  if (!collectiblesSteps.length) return null;
  const doneCount = collectiblesSteps.filter((s) => String(s.status || '').toLowerCase() === 'done').length;
  if (!doneCount) return null;
  if (collectiblesPrintStillOpen(queue)) return null;
  return {
    id: 'collectibles_print_closed',
    proposed_solution:
      `Collectibles print sequence has ${doneCount}/${collectiblesSteps.length} steps done and nothing pending/blocked/sealed-next -- factory-3 has genuinely run out of work. `
      + 'Verify whether the next version (V-next) needs Architect sealing (npm run builderos:architect:seal-print -- --product collectibles --from-amended-blueprint) or whether this is a real, intentional stopping point.',
  };
}

function readOverlayQueue() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/products/universal-overlay/BUILD_QUEUE.json'), 'utf8'));
  } catch {
    return { steps: [] };
  }
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

  let governed = null;
  try {
    governed = await fetchGovernedStatus({ baseUrl, commandKey });
  } catch {
    governed = null;
  }
  const overlayQueue = readOverlayQueue();
  const overlayNativeBlocks = overlayNativeBlockedSteps(overlayQueue);
  const sys = evaluateSystemWatchdog({ governed, overlayNativeBlocks });
  const closedFinding = collectiblesPrintClosedFinding(overlayQueue);
  if (closedFinding) {
    sys.findings = [...(sys.findings || []), closedFinding];
    sys.ok = false;
    sys.reasonKey = sys.findings.map((f) => f.id).sort().join('|');
  }

  const { action: systemAction, newAlerted: systemAlerted } = evaluateEscalation({
    reasonKey: sys.reasonKey || null,
    alerted: state.systemAlertedReasons,
    now: Date.now(),
  });

  const merged = { ...newState, systemReasonKey: sys.reasonKey || null, systemAlertedReasons: systemAlerted };
  saveState(merged);

  if (action === 'none' && systemAction === 'none') {
    return { action: 'none', reasonKey, system: sys };
  }

  if (!commandKey || !alertPhone) {
    logger.warn?.(`[PROD-HEALTH-WATCHDOG] would ${action}/${systemAction} (${reasonKey || sys.reasonKey}) but COMMAND_CENTER_KEY/ALERT_PHONE missing — cannot actually alert`);
    return { action, reasonKey, systemAction, system: sys, alerted: false, reason: 'missing_alert_config' };
  }

  if (action === 'recovered') {
    await sendFounderSms({ baseUrl, commandKey, message: 'BuilderOS: production /healthz is back to healthy.' });
    logger.info?.('[PROD-HEALTH-WATCHDOG] recovery SMS sent');
  } else if (action === 'sms') {
    await sendFounderSms({ baseUrl, commandKey, message: `BuilderOS ALERT: production is degraded (${reasonKey}). ${baseUrl}/healthz` });
  } else if (action === 'call') {
    await sendFounderCall({ baseUrl, commandKey, to: alertPhone, message: `BuilderOS ALERT: production is degraded (${reasonKey}). ${baseUrl}/healthz` });
  }

  if (systemAction === 'sms') {
    const lines = (sys.findings || []).map((f) => `${f.id}: ${f.proposed_solution}`).join(' | ');
    await sendFounderSms({ baseUrl, commandKey, message: `BuilderOS watchdog: ${lines}` });
  } else if (systemAction === 'call') {
    const lines = (sys.findings || []).map((f) => f.id).join(', ');
    await sendFounderCall({ baseUrl, commandKey, to: alertPhone, message: `BuilderOS ALERT: build has been stopped and unresolved for over 10 minutes (${lines}). Check ${baseUrl}/healthz.` });
  } else if (systemAction === 'recovered') {
    await sendFounderSms({ baseUrl, commandKey, message: 'BuilderOS watchdog: factory/overlay findings cleared.' });
  }

  let repair = null;
  if (action === 'sms' || action === 'call') {
    const classified = classifyHealthRepair(health);
    if (classified?.repair_id === 'DR-BIND-MIGRATION') {
      try {
        const changed = repairBindMigrationsInRepo(process.cwd(), classified.migrations_failed);
        repair = {
          repair_id: classified.repair_id,
          changed,
          proposed_solution: changed.length
            ? 'Bind-before-create SQL rewritten on disk. Commit these files and redeploy so the next boot applies them.'
            : 'migrations_failed but no RAISE EXCEPTION bind file matched — different class, still needs a playbook.',
        };
        logger.warn?.({ repair }, '[PROD-HEALTH-WATCHDOG] attempted bind-migration self-repair');
      } catch (err) {
        repair = { repair_id: classified.repair_id, error: err.message };
        logger.warn?.({ err: err.message }, '[PROD-HEALTH-WATCHDOG] bind-migration self-repair threw');
      }
    }
  }

  if (action !== 'none') {
    logger.warn?.(`[PROD-HEALTH-WATCHDOG] ${action} alert sent for reason=${reasonKey}`);
  }
  return { action, reasonKey, systemAction, system: sys, alerted: true, repair };
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
