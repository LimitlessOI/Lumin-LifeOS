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
import {
  runSentrySystemAudit,
  checkSystemStillWorking,
  gatherSystemWorkingSignals,
  annotateFixerFailures,
} from '../services/sentry-system-audit.js';
import { reviewFindings, reviewFindingsWithAI } from '../services/chair-findings-review.js';
import { defaultPlannerCallModel } from '../services/never-stop-product-factory.js';
import { runArchitectPass } from '../services/architect-blueprint-writer.js';
import { runCompetitiveResearchCycle } from '../services/chair-competitive-research.js';
import { SENTRY_CADENCE, observationAiBudget, cadenceForTier } from '../config/sentry-observation-cadence.js';
import { applyRepairHandoff, readyForArchitect, REPAIR_CONSENSUS_PROTOCOL } from '../config/sentry-repair-handoff.js';

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

/**
 * Deep look: attach a strong-model re-read to already-open findings that are
 * still true. Does not duplicate rows and does not reset queue_status.
 */
export function refreshOpenFindings(reviewedFindings, existingQueue, { now = Date.now() } = {}) {
  const existing = Array.isArray(existingQueue?.findings) ? existingQueue.findings : [];
  const reviewedById = new Map((reviewedFindings || []).map((f) => [f.id, f]));
  const stamp = new Date(now).toISOString();
  return {
    queue: {
      findings: existing.map((f) => {
        const reviewed = reviewedById.get(f.id);
        if (!reviewed || f.queue_status !== 'open') return f;
        return {
          ...f,
          last_deep_review_at: stamp,
          deep_review: reviewed.chair_reasoning || f.deep_review,
        };
      }),
    },
  };
}

export async function cheapObserverCallModel({ fetchFn = fetch } = {}) {
  return async (_member, prompt, opts = {}) => {
    const maxTokens = Number(opts.maxOutputTokens) || 400;
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: String(prompt) }],
          max_tokens: maxTokens,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const text = json?.choices?.[0]?.message?.content;
      if (text && String(text).trim()) return String(text).trim();
    }
    const gKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (gKey) {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const res = await fetchFn(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(gKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: String(prompt) }] }],
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n');
      if (text && String(text).trim()) return String(text).trim();
    }
    throw new Error('no cheap observer model available');
  };
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
  // undefined = pick from observationTier (cheap vs strong vs none).
  // Pass null in tests to force the rule-based path. Pass a function to inject.
  callModel = undefined,
  cheapCallModel = undefined,
  strongCallModel = undefined,
  architectRoot = undefined,
  logger = console,
  pool = undefined,
  auditKind = 'full',
  observationTier = undefined,
  systemSignals = undefined,
  now = Date.now(),
} = {}) {
  const cadence = observationTier ? cadenceForTier(observationTier) : null;
  const kind = cadence?.auditKind || auditKind;
  const reviewOpen = cadence?.reviewOpen === true;
  const modelTier = cadence?.model || 'strong';

  const signals = systemSignals ? { now, ...systemSignals } : undefined;
  const rawSnapshot = kind === 'system'
    ? checkSystemStillWorking(signals ?? { now, ...(await gatherSystemWorkingSignals({ baseUrl, commandKey })) })
    : await runSentrySystemAudit({
      token,
      repo,
      pool,
      ...(productsDir ? { productsDir } : {}),
      ...(signals ? { systemSignals: signals } : {}),
    });

  const existingQueue = loadFindingsQueue();
  const rawFindings = annotateFixerFailures(rawSnapshot, existingQueue, { now });
  const existingIds = new Set((existingQueue.findings || []).map((f) => f.id));
  const novel = rawFindings.filter((f) => !existingIds.has(f.id));
  const rawIds = new Set(rawFindings.map((f) => f.id));
  const openStillTrue = reviewOpen
    ? (existingQueue.findings || []).filter((f) => f.queue_status === 'open' && rawIds.has(f.id))
    : [];

  const budget = observationAiBudget({
    model: modelTier,
    novelCount: novel.length,
    openCount: openStillTrue.length,
    reviewOpen,
  });

  if (novel.length === 0 && openStillTrue.length === 0) {
    return {
      raw_findings: rawFindings.length,
      newly_added: 0,
      escalations: 0,
      approved: 0,
      queued_to_blueprint: 0,
      skipped_review: 'no_work',
      observation_tier: observationTier || null,
      ai_budget: budget,
    };
  }

  const toReview = [...novel];
  for (const f of openStillTrue) {
    if (!toReview.some((x) => x.id === f.id)) toReview.push(f);
  }

  let resolvedModel = callModel;
  if (resolvedModel === undefined) {
    if (!budget.callAi) {
      resolvedModel = null;
    } else if (budget.tier === 'cheap') {
      resolvedModel = cheapCallModel || await cheapObserverCallModel();
    } else {
      resolvedModel = strongCallModel || defaultPlannerCallModel();
    }
  }

  const reviewed = resolvedModel
    ? await reviewFindingsWithAI(toReview, { callModel: resolvedModel, logger, pool })
    : reviewFindings(toReview);

  const runConductorSolve = Boolean(
    resolvedModel
    && (observationTier === 'deep_look' || observationTier === 'full_audit' || !observationTier),
  );

  let handed = reviewed.map((f) => applyRepairHandoff(f));
  if (runConductorSolve) {
    const next = [];
    for (const f of handed) {
      if (f.repair_lane !== 'dual_solve' || f.conductor_status !== 'awaiting_conductor_solution') {
        next.push(f);
        continue;
      }
      try {
        const prompt = [
          'You are Conductor. SENTRY found a problem. Propose one concrete repair.',
          'You have not been shown SENTRY\'s solution. Do not guess what it said.',
          JSON.stringify(f.conductor_packet),
        ].join('\n');
        const conductorSolution = await resolvedModel('conductor', prompt, { maxOutputTokens: 400 });
        next.push(applyRepairHandoff(f, { conductorSolution: String(conductorSolution || '') }));
      } catch {
        next.push(f);
      }
    }
    handed = next;
  }

  if (runConductorSolve) {
    const next = [];
    for (const f of handed) {
      if (f.repair_lane !== 'consensus_protocol' || f.repair_consensus === true) {
        next.push(f);
        continue;
      }
      try {
        const prompt = [
          'You are running the existing consensus protocol (LOOP_ESCALATION_CONTRACT recovery_ladder_v2).',
          `Threshold: ${REPAIR_CONSENSUS_PROTOCOL.threshold}. Majority is forbidden. Partial consensus is forbidden.`,
          'Goal is not to pick option A or option B. Combine pieces. Seek a third solution. Argue both sides.',
          'Name unintended consequences, positive and negative.',
          'Protocol:',
          ...REPAIR_CONSENSUS_PROTOCOL.protocol.map((s) => `- ${s}`),
          `SENTRY solution: ${f.proposed_solution}`,
          `Conductor solution: ${f.conductor_solution}`,
          'Return JSON only: {"synthesized":"...","sentry_accepts":true,"conductor_accepts":true,"unintended_positive":"...","unintended_negative":"...","argued_both_sides":true}',
        ].join('\n');
        const raw = await resolvedModel('consensus', prompt, { maxOutputTokens: 500 });
        const match = String(raw || '').match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : null;
        if (parsed && typeof parsed === 'object') {
          next.push(applyRepairHandoff(f, { consensusRound: parsed }));
        } else {
          next.push(f);
        }
      } catch {
        next.push(f);
      }
    }
    handed = next;
  }

  const forArchitect = handed.filter((f) => readyForArchitect(f));
  const architected = runArchitectPass(forArchitect, architectRoot ? { root: architectRoot } : {});
  const architectById = new Map(architected.map((f) => [f.id, f]));
  const withArchitectStatus = handed.map((f) => {
    if (architectById.has(f.id)) return architectById.get(f.id);
    if (f.repair_lane === 'officer_panel') return { ...f, architect_status: 'officer_panel' };
    if (f.repair_lane === 'consensus_protocol' || (f.repair_lane === 'dual_solve' && f.repair_consensus !== true)) {
      return { ...f, architect_status: 'awaiting_consensus' };
    }
    return f;
  });

  const { queue, newlyAdded } = mergeFindingsIntoQueue(withArchitectStatus, existingQueue);
  const refreshed = reviewOpen
    ? refreshOpenFindings(withArchitectStatus, queue, { now })
    : { queue };

  // Close stale ci_health findings once main is actually green again. Nothing
  // in this pipeline ever closed a finding before 2026-08-22 -- open findings
  // whose check condition stopped reproducing just sat open forever. Scoped
  // to ci_health only (the check whose SHA-keyed-id bug was found and fixed
  // the same day) rather than a general auto-close for every check type,
  // which needs its own separate, careful pass.
  const nowStamp = new Date(now).toISOString();
  const closedThisRun = [];
  const finalFindings = refreshed.queue.findings.map((f) => {
    if (f.check !== 'ci_health' || f.queue_status !== 'open' || !String(f.id).startsWith('ci_health:')) return f;
    if (rawIds.has(f.id)) return f;
    closedThisRun.push(f.id);
    return { ...f, queue_status: 'closed', closed_at: nowStamp, closed_reason: 'condition_no_longer_reproduces' };
  });
  const finalQueue = { ...refreshed.queue, findings: finalFindings };
  saveFindingsQueue(finalQueue);

  const newEscalations = newlyAdded.filter((f) => f.chair_status === 'escalate_to_founder');
  const newApproved = newlyAdded.filter((f) => f.chair_status === 'approved');
  const newQueuedToBlueprint = newlyAdded.filter((f) => f.architect_status === 'queued_to_blueprint');

  if (newlyAdded.length) {
    logger?.info?.(
      { new_findings: newlyAdded.length, escalations: newEscalations.length, approved: newApproved.length, queued_to_blueprint: newQueuedToBlueprint.length, observation_tier: observationTier || kind },
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
  }

  return {
    raw_findings: rawFindings.length,
    newly_added: newlyAdded.length,
    escalations: newEscalations.length,
    approved: newApproved.length,
    queued_to_blueprint: newQueuedToBlueprint.length,
    observation_tier: observationTier || null,
    ai_budget: budget,
    skipped_review: budget.callAi ? undefined : (novel.length ? undefined : 'no_work'),
    closed: closedThisRun.length,
  };
}

/**
 * Starts the recurring audit interval. Mirrors
 * startCiHealthWatchdogScheduler / startNeverStopProductFactoryScheduler.
 */
/**
 * Runs ONE product's real competitive-research cycle and routes the result
 * through the same Chair review + persisted findings queue as everything
 * else. Deliberately its own function on its own (much longer) schedule,
 * not folded into runGovernanceAuditCycle's 30-min loop -- competitive
 * research is a real API call with real cost, and this is a slow, ongoing
 * sweep (one product per cycle), not a time-sensitive health check.
 */
export async function runCompetitiveResearchAuditCycle({
  callModel = defaultPlannerCallModel(),
  productsDir = undefined,
  cursorPath = undefined,
  webSearchService = undefined,
  pool = undefined,
  logger = console,
} = {}) {
  const result = await runCompetitiveResearchCycle({
    logger,
    pool,
    ...(productsDir ? { productsDir } : {}),
    ...(cursorPath ? { cursorPath } : {}),
    ...(webSearchService ? { webSearchService } : {}),
  });
  if (!result.finding) {
    return { productId: result.productId || null, reviewed: false, reason: result.skipped || result.reason };
  }

  const reviewed = callModel
    ? await reviewFindingsWithAI([result.finding], { callModel, logger, pool })
    : reviewFindings([result.finding]);

  const existingQueue = loadFindingsQueue();
  const { queue, newlyAdded } = mergeFindingsIntoQueue(reviewed, existingQueue);
  saveFindingsQueue(queue);

  if (newlyAdded.length) {
    logger?.info?.({ product_id: result.productId }, '[CHAIR-COMPETITIVE-RESEARCH] new competitive finding recorded');
  }

  return { productId: result.productId, reviewed: true, added: newlyAdded.length > 0 };
}

export function startCompetitiveResearchScheduler({ logger = console, pool = undefined } = {}) {
  // Default: once per day. At ~46 products, one lap of the full portfolio
  // takes about 6-7 weeks -- deliberately slow and cheap, not a cost spike,
  // per the founder's own "seen all the way through" ask meaning sustained,
  // not a one-time rush.
  const intervalMs = Number(process.env.COMPETITIVE_RESEARCH_INTERVAL_MS || 24 * 60 * 60 * 1000);
  const bootDelayMs = Number(process.env.COMPETITIVE_RESEARCH_BOOT_DELAY_MS || 5 * 60 * 1000);

  const tick = async () => {
    try {
      await runCompetitiveResearchAuditCycle({ logger, pool });
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[CHAIR-COMPETITIVE-RESEARCH] cycle failed');
    }
  };

  logger?.info?.({ intervalMs, bootDelayMs }, '[CHAIR-COMPETITIVE-RESEARCH] starting the ongoing portfolio-wide competitive review sweep, one product per cycle');

  setTimeout(() => { tick(); }, bootDelayMs);
  return setInterval(() => { tick(); }, intervalMs);
}

export function startSentryChairGovernanceScheduler({ logger = console, pool = undefined } = {}) {
  const heartbeatMs = Number(process.env.SENTRY_HEARTBEAT_MS || process.env.SENTRY_SYSTEM_AUDIT_INTERVAL_MS || SENTRY_CADENCE.heartbeat.intervalMs);
  const deepMs = Number(process.env.SENTRY_DEEP_LOOK_MS || SENTRY_CADENCE.deep_look.intervalMs);
  const fullMs = Number(process.env.SENTRY_FULL_AUDIT_MS || process.env.SENTRY_CHAIR_AUDIT_INTERVAL_MS || SENTRY_CADENCE.full_audit.intervalMs);
  const heartbeatBootMs = Number(process.env.SENTRY_HEARTBEAT_BOOT_DELAY_MS || 30_000);
  const fullBootMs = Number(process.env.SENTRY_CHAIR_AUDIT_BOOT_DELAY_MS || 90_000);

  const heartbeatTick = async () => {
    try {
      await runGovernanceAuditCycle({ logger, pool, observationTier: 'heartbeat' });
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[SENTRY-CHAIR] heartbeat cycle failed');
    }
  };
  const deepTick = async () => {
    try {
      await runGovernanceAuditCycle({ logger, pool, observationTier: 'deep_look' });
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[SENTRY-CHAIR] deep-look cycle failed');
    }
  };
  const fullTick = async () => {
    try {
      await runGovernanceAuditCycle({ logger, pool, observationTier: 'full_audit' });
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[SENTRY-CHAIR] full-audit cycle failed');
    }
  };

  logger?.info?.(
    { heartbeatMs, deepMs, fullMs, heartbeatBootMs, fullBootMs },
    '[SENTRY-CHAIR] cadence: heartbeat cheap/free, deep look strong on open issues, full audit slower',
  );

  setTimeout(() => { heartbeatTick(); }, heartbeatBootMs);
  setTimeout(() => { fullTick(); }, fullBootMs);
  setTimeout(() => { deepTick(); }, deepMs);
  return {
    heartbeatHandle: setInterval(() => { heartbeatTick(); }, heartbeatMs),
    deepHandle: setInterval(() => { deepTick(); }, deepMs),
    fullHandle: setInterval(() => { fullTick(); }, fullMs),
  };
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
