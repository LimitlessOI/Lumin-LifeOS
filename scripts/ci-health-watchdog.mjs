#!/usr/bin/env node
/**
 * SYNOPSIS: CI health watchdog — polls GitHub Actions status for `main` and
 * escalates to the founder (SMS, then a call if still unresolved) via the
 * existing founder SMS/voice routes.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Closes a confirmed gap: nothing in the system previously watched GitHub
 * Actions/CI status at all (repo-wide audit, 2026-07-19). Deliberately built
 * on `POST /api/v1/lifeos/founder/sms` + `POST /api/v1/lifeos/founder/voice/call`
 * (routes/founder-sms-routes.js) rather than services/twilio-service.js's
 * notifyCriticalIssue, because that function is only wired inside
 * server-full-runtime.js, which never runs on Railway — runtime-modes.js
 * hard-locks Railway to the founder_builder lane, where notifyCriticalIssue
 * is a no-op stub (server-founder-runtime.js). The founder-sms routes are
 * lane-agnostic (mounted directly on `app`), so they actually work in prod.
 */

import fs from 'fs';
import path from 'path';

const CALL_ESCALATION_DELAY_MS = 10 * 60 * 1000; // matches the existing notifyCriticalIssue pattern (SMS, then call after 10 min)

// Resolved per-call (not at module load) so tests that process.chdir() into an
// isolated tmp dir actually get isolated state, instead of silently writing
// into the real repo's data/ directory the whole time.
function stateFilePath() {
  return path.join(process.cwd(), 'data', 'ci-health-watchdog-state.json');
}

export function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFilePath(), 'utf8'));
  } catch {
    return { alertedShas: {} };
  }
}

export function saveState(state) {
  const file = stateFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export async function fetchLatestMainRun({ token, repo, workflowFile = 'smoke-test.yml', fetchFn = fetch }) {
  const [owner, name] = String(repo).split('/');
  const url = `https://api.github.com/repos/${owner}/${name}/actions/workflows/${workflowFile}/runs?branch=main&per_page=1`;
  const resp = await fetchFn(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!resp.ok) {
    throw new Error(`GitHub API ${resp.status}: ${await resp.text().catch(() => '')}`);
  }
  const json = await resp.json();
  const run = json.workflow_runs?.[0];
  if (!run) return null;
  return {
    sha: run.head_sha,
    conclusion: run.conclusion, // 'success' | 'failure' | null while still running
    status: run.status, // 'completed' | 'in_progress' | 'queued'
    htmlUrl: run.html_url,
    createdAt: run.created_at,
  };
}

/**
 * Pure decision logic — no network/fs, fully unit-testable.
 * Returns which action (if any) to take and the state to persist.
 */
export function evaluateCIHealth({ run, state, now = Date.now() }) {
  const alertedShas = state.alertedShas || {};

  if (!run || run.status !== 'completed') {
    return { action: 'none', newState: state };
  }

  if (run.conclusion === 'success') {
    const wasAlerted = Boolean(alertedShas[run.sha]) || Object.keys(alertedShas).length > 0;
    if (wasAlerted) {
      return { action: 'recovered', newState: { ...state, alertedShas: {} } };
    }
    return { action: 'none', newState: state };
  }

  if (run.conclusion !== 'failure') {
    return { action: 'none', newState: state };
  }

  const alerted = alertedShas[run.sha];

  if (!alerted) {
    return {
      action: 'sms',
      newState: { ...state, alertedShas: { ...alertedShas, [run.sha]: { smsAt: now, calledAt: null } } },
    };
  }

  if (!alerted.calledAt && now - alerted.smsAt >= CALL_ESCALATION_DELAY_MS) {
    return {
      action: 'call',
      newState: { ...state, alertedShas: { ...alertedShas, [run.sha]: { ...alerted, calledAt: now } } },
    };
  }

  return { action: 'none', newState: state };
}

export async function sendFounderSms({ baseUrl, commandKey, message, fetchFn = fetch }) {
  const resp = await fetchFn(`${baseUrl}/api/v1/lifeos/founder/sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-center-key': commandKey },
    body: JSON.stringify({ body: message }),
  });
  return { ok: resp.ok, status: resp.status, json: await resp.json().catch(() => ({})) };
}

export async function sendFounderCall({ baseUrl, commandKey, to, message, fetchFn = fetch }) {
  const resp = await fetchFn(`${baseUrl}/api/v1/lifeos/founder/voice/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-center-key': commandKey },
    body: JSON.stringify({ to, say: message }),
  });
  return { ok: resp.ok, status: resp.status, json: await resp.json().catch(() => ({})) };
}

export async function runCiHealthWatchdogCycle({
  token = process.env.GITHUB_TOKEN,
  repo = process.env.GITHUB_REPO,
  baseUrl = process.env.PUBLIC_BASE_URL,
  commandKey = process.env.COMMAND_CENTER_KEY,
  alertPhone = process.env.ALERT_PHONE || process.env.ADAM_SMS_NUMBER,
  workflowFile = 'smoke-test.yml',
  logger = console,
} = {}) {
  if (!token || !repo) {
    logger.warn?.('[CI-WATCHDOG] GITHUB_TOKEN/GITHUB_REPO missing — skipping cycle');
    return { skipped: 'missing_github_credentials' };
  }

  const run = await fetchLatestMainRun({ token, repo, workflowFile });
  const state = loadState();
  const { action, newState } = evaluateCIHealth({ run, state });

  if (action === 'none') return { action, run };

  if (!baseUrl || !commandKey || !alertPhone) {
    logger.warn?.(`[CI-WATCHDOG] would ${action} but PUBLIC_BASE_URL/COMMAND_CENTER_KEY/ALERT_PHONE missing — cannot actually alert`);
    return { action, run, alerted: false, reason: 'missing_alert_config' };
  }

  if (action === 'recovered') {
    const delivery = await sendFounderSms({ baseUrl, commandKey, message: `BuilderOS: main branch CI (${workflowFile}) is back to GREEN.` });
    if (!delivery.ok) {
      logger.warn?.({ status: delivery.status }, '[CI-WATCHDOG] recovery SMS failed — retaining state for retry');
      return { action, run, alerted: false, reason: 'alert_delivery_failed', status: delivery.status };
    }
    saveState(newState);
    logger.info?.('[CI-WATCHDOG] recovery SMS sent');
    return { action, run, alerted: true };
  }

  const message = `BuilderOS ALERT: main branch CI (${workflowFile}) is FAILING. SHA ${run.sha.slice(0, 7)}. ${run.htmlUrl}`;

  const delivery = action === 'sms'
    ? await sendFounderSms({ baseUrl, commandKey, message })
    : await sendFounderCall({ baseUrl, commandKey, to: alertPhone, message });
  if (!delivery.ok) {
    logger.warn?.({ action, status: delivery.status }, '[CI-WATCHDOG] alert delivery failed — retaining state for retry');
    return { action, run, alerted: false, reason: 'alert_delivery_failed', status: delivery.status };
  }

  saveState(newState);
  logger.warn?.(`[CI-WATCHDOG] ${action} alert sent for main@${run.sha}`);
  return { action, run, alerted: true };
}

/**
 * Starts the recurring watchdog interval. Mirrors the existing
 * startNeverStopProductFactoryScheduler / startGovernedAutonomousShippingLoop
 * convention in services/*-scheduler.js: boot-delay setTimeout, then an
 * interval that's only ever stopped by process death/redeploy, tick errors
 * logged and swallowed (never crash the server over a monitoring check).
 */
export function startCiHealthWatchdogScheduler({ logger = console } = {}) {
  const intervalMs = Number(process.env.CI_HEALTH_WATCHDOG_INTERVAL_MS || 5 * 60 * 1000);
  const bootDelayMs = Number(process.env.CI_HEALTH_WATCHDOG_BOOT_DELAY_MS || 60_000);

  const tick = async () => {
    try {
      const result = await runCiHealthWatchdogCycle({ logger });
      if (result?.action && result.action !== 'none') {
        logger?.info?.({ result }, '[CI-WATCHDOG] tick');
      }
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[CI-WATCHDOG] tick failed');
    }
  };

  logger?.info?.({ intervalMs, bootDelayMs }, '[CI-WATCHDOG] starting — watching main branch CI, escalates SMS then call to ALERT_PHONE');

  setTimeout(() => { tick(); }, bootDelayMs);
  return setInterval(() => { tick(); }, intervalMs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCiHealthWatchdogCycle()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[CI-WATCHDOG] cycle failed:', err.message);
      process.exit(1);
    });
}
