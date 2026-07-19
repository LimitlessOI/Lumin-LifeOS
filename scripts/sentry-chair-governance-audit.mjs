#!/usr/bin/env node
/**
 * SYNOPSIS: Orchestrates SENTRY (finds + proposes) -> Chair (reviews, real AI
 * judgment) -> Architect (writes approved findings into a real buildable
 * BUILD_QUEUE step) -> persisted findings queue -> founder escalation for
 * whatever stays open. This is the full D7 repair pipeline (FACTORY_REBUILD_
 * MANIFEST_V1.md §16) as real running code instead of doctrine — SENTRY,
 * Chair, and Architect are each real modules now, not one role standing in
 * for all three.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Runs on the same boot-sequence pattern as scripts/ci-health-watchdog.mjs
 * (which this reuses as one of its checks). Escalation reuses the founder
 * SMS route (routes/founder-sms-routes.js) that the CI watchdog proved is
 * genuinely mounted in the runtime lane Railway actually runs.
 */
import fs from 'fs';
import path from 'path';
import { runSentrySystemAudit } from '../services/sentry-system-audit.js';
import { reviewFindings, reviewFindingsWithAI } from '../services/chair-findings-review.js';
import { defaultPlannerCallModel } from '../services/never-stop-product-factory.js';
import { runArchitectPass } from '../services/architect-blueprint-writer.js';

const CALL_ESCALATION_DELAY_MS = 10 * 60 * 1000;

function queueFilePath() {
  return path.join(process.cwd(), 'builderos-reboot/governance/SENTRY_FINDINGS_QUEUE.json');
}

export function loadFindingsQueue() {
  try {
    return JSON.parse(fs.readFileSync(queueFilePath(), 'utf8'));
  } catch {
    return { findings: [] };
  }
}

export function saveFindingsQueue(queue) {
  const file = queueFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(queue, null, 2));
}

/**
 * Merges freshly-reviewed findings into the persisted queue. Pure — takes
 * and returns plain data, no I/O — so it's directly unit-testable.
 *   - a finding already open (by id) is left alone (preserves any
 *     acknowledged_at/resolved_at the founder or Architect already set)
 *   - a finding no longer detected is NOT auto-closed here (closing requires
 *     a human/Architect confirming the fix actually landed, not just that
 *     this one audit pass didn't re-detect it)
 *   - a genuinely new finding is appended with status 'open'
 */
export function mergeFindingsIntoQueue(reviewedFindings, existingQueue) {
  const existing = Array.isArray(existingQueue?.findings) ? existingQueue.findings : [];
  const existingById = new Map(existing.map((f) => [f.id, f]));
  const merged = [...existing];
  const newlyAdded = [];

  for (const finding of reviewedFindings) {
    if (existingById.has(finding.id)) continue;
    const record = { ...finding, queue_status: 'open', first_detected_at: finding.detected_at };
    merged.push(record);
    newlyAdded.push(record);
  }

  return { queue: { findings: merged }, newlyAdded };
}

async function sendFounderSms({ baseUrl, commandKey, message, fetchFn = fetch }) {
  const resp = await fetchFn(`${baseUrl}/api/v1/lifeos/founder/sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-center-key': commandKey },
    body: JSON.stringify({ body: message }),
  });
  return { ok: resp.ok, status: resp.status, json: await resp.json().catch(() => ({})) };
}

async function sendFounderCall({ baseUrl, commandKey, to, message, fetchFn = fetch }) {
  const resp = await fetchFn(`${baseUrl}/api/v1/lifeos/founder/voice/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-center-key': commandKey },
    body: JSON.stringify({ to, say: message }),
  });
  return { ok: resp.ok, status: resp.status, json: await resp.json().catch(() => ({})) };
}

export async function runGovernanceAuditCycle({
  token = process.env.GITHUB_TOKEN,
  repo = process.env.GITHUB_REPO,
  baseUrl = process.env.PUBLIC_BASE_URL,
  commandKey = process.env.COMMAND_CENTER_KEY,
  alertPhone = process.env.ALERT_PHONE || process.env.ADAM_SMS_NUMBER,
  productsDir = undefined,
  // Real AI judgment (SO-003: Chair may not run on a canned/templated
  // answer). Defaults to the existing auto-failover multi-provider caller
  // (services/never-stop-product-factory.js) so this reuses the same
  // already-proven "never idle, switch providers on error" mechanism rather
  // than inventing a second one. Pass null explicitly to force the pure
  // rule-based path (e.g. in tests).
  callModel = defaultPlannerCallModel(),
  // Injectable so tests can point Architect at an isolated fixture BUILD_QUEUE
  // instead of the real builderos/ one. Left undefined in production so
  // services/architect-blueprint-writer.js uses the real repo root.
  architectRoot = undefined,
  logger = console,
} = {}) {
  const rawFindings = await runSentrySystemAudit({ token, repo, ...(productsDir ? { productsDir } : {}) });
  const reviewed = callModel
    ? await reviewFindingsWithAI(rawFindings, { callModel, logger })
    : reviewFindings(rawFindings);

  // Architect: turn every Chair-approved finding into a real BUILD_QUEUE step
  // where the fix location is unambiguous; label the rest honestly rather
  // than guess or silently skip them.
  const withArchitectStatus = runArchitectPass(reviewed, architectRoot ? { root: architectRoot } : {});

  const existingQueue = loadFindingsQueue();
  const { queue, newlyAdded } = mergeFindingsIntoQueue(withArchitectStatus, existingQueue);
  saveFindingsQueue(queue);

  const newEscalations = newlyAdded.filter((f) => f.chair_status === 'escalate_to_founder');
  const newApproved = newlyAdded.filter((f) => f.chair_status === 'approved');
  const newQueuedToBlueprint = newlyAdded.filter((f) => f.architect_status === 'queued_to_blueprint');

  if (newlyAdded.length) {
    logger?.info?.(
      { new_findings: newlyAdded.length, escalations: newEscalations.length, approved: newApproved.length, queued_to_blueprint: newQueuedToBlueprint.length },
      '[SENTRY-CHAIR] governance audit cycle found new findings',
    );
  }

  if (newEscalations.length && baseUrl && commandKey && alertPhone) {
    const summary = newEscalations.map((f) => `- ${f.summary}`).join('\n').slice(0, 1000);
    const message = `BuilderOS: Chair needs your call on ${newEscalations.length} finding(s):\n${summary}`;
    try {
      await sendFounderSms({ baseUrl, commandKey, message });
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[SENTRY-CHAIR] founder SMS failed');
    }
    // Same escalation shape as the CI watchdog: a follow-up call only if this
    // exact set of escalations is still unresolved after the delay window —
    // checked by the NEXT cycle's read of queue_status, not a timer here.
  }

  return {
    raw_findings: rawFindings.length,
    newly_added: newlyAdded.length,
    escalations: newEscalations.length,
    approved: newApproved.length,
    queued_to_blueprint: newQueuedToBlueprint.length,
  };
}

/**
 * Starts the recurring audit interval. Mirrors
 * startCiHealthWatchdogScheduler / startNeverStopProductFactoryScheduler.
 */
export function startSentryChairGovernanceScheduler({ logger = console } = {}) {
  const intervalMs = Number(process.env.SENTRY_CHAIR_AUDIT_INTERVAL_MS || 30 * 60 * 1000);
  const bootDelayMs = Number(process.env.SENTRY_CHAIR_AUDIT_BOOT_DELAY_MS || 90_000);

  const tick = async () => {
    try {
      await runGovernanceAuditCycle({ logger });
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[SENTRY-CHAIR] audit cycle failed');
    }
  };

  logger?.info?.({ intervalMs, bootDelayMs }, '[SENTRY-CHAIR] starting periodic governance audit (SENTRY finds -> Chair reviews -> founder escalation)');

  setTimeout(() => { tick(); }, bootDelayMs);
  return setInterval(() => { tick(); }, intervalMs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runGovernanceAuditCycle()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SENTRY-CHAIR] cycle failed:', err.message);
      process.exit(1);
    });
}
