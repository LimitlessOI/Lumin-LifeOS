/**
 * SYNOPSIS: boot-domains.js
 * boot-domains.js
 * Bootstraps all domain-specific subsystems at startup.
 *
 * RULE: Every background task that makes AI calls MUST go through
 * createUsefulWorkGuard() before it is allowed to execute.
 * No exceptions. No AI calls without proven useful work.
 *
 * This is the ONLY place async IIFE startup blocks should live.
 * Do NOT put domain boot logic in server.js — add it here instead.
 *
 * @authority Legacy production spine — see services/AGENTS.md. Not canonical factory runtime.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { execSync } from 'child_process';
import { createUsefulWorkGuard, requireTableRows } from '../services/useful-work-guard.js';
import { generateDailyOILSummary } from '../services/oil-daily-summary.js';
import { startBpPriorityScheduler } from '../services/builderos-bp-priority-scheduler.js';
import { startNeverStopProductFactoryScheduler } from '../services/never-stop-product-factory-scheduler.js';
import { startGovernedAutonomousShippingLoop } from '../services/governed-autonomous-shipping-loop.js';
import { getRuntimeProfile, isFullRuntimeProfile } from '../services/runtime-modes.js';

const tcOperationsBootEnabled =
  process.env.LIFEOS_ENABLE_TC_OPERATIONS_BOOT === 'true';
const twinAutoIngestBootEnabled =
  process.env.LIFEOS_ENABLE_TWIN_AUTO_INGEST_BOOT === 'true';
const runtimeProfile = getRuntimeProfile();
const fullRuntimeProfile = isFullRuntimeProfile();

function scheduleAsyncInterval(task, intervalMs, logger, label) {
  return setInterval(() => {
    Promise.resolve()
      .then(task)
      .catch((err) => {
        logger?.warn?.({ err: err.message, intervalMs, label }, '[BOOT] Scheduled interval task failed');
      });
  }, intervalMs);
}

function scheduleAsyncTimeout(task, delayMs, logger, label) {
  return setTimeout(() => {
    Promise.resolve()
      .then(task)
      .catch((err) => {
        logger?.warn?.({ err: err.message, delayMs, label }, '[BOOT] Scheduled timeout task failed');
      });
  }, delayMs);
}

// ── GLVAR Monitor (dues + violations) ────────────────────────────────────────
async function bootGLVARMonitor(deps) {
  const { pool, logger, notificationService, accountManager } = deps;

  // Prerequisite: GLVAR credentials must be stored in the credential vault
  const prereq = async () => {
    const account = await accountManager?.getAccount?.('glvar_mls', '232953');
    if (!account?.password || !(account?.username || account?.emailUsed)) {
      return { ok: false, reason: 'GLVAR vault credentials missing (service glvar_mls / key 232953)' };
    }
    return { ok: true };
  };

  // Work check: only run if there are active agent clients enrolled
  const workCheck = requireTableRows(
    pool,
    `SELECT COUNT(*) FROM agent_clients WHERE status = 'active'`,
    [],
    'active agent clients'
  );

  const guardedBoot = createUsefulWorkGuard({
    taskName: 'GLVAR Monitor',
    purpose: 'Check GLVAR dues deadlines and violation emails for enrolled agents',
    prerequisites: prereq,
    workCheck,
    execute: async () => {
      const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
      const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
      const tcBrowser = createTCBrowserAgent({ accountManager, logger });
      const monitor = createGLVARMonitor({ pool, tcBrowser, accountManager, notificationService, logger });
      monitor.startDuesCron();
      monitor.startViolationsCron();
      logger.info?.('[BOOT] GLVAR monitor started');
    },
    logger,
  });

  await guardedBoot();
}

// ── Email Triage (inbox scanning + daily digest) ──────────────────────────────
async function bootEmailTriage(deps) {
  const { pool, logger, notificationService, callCouncilMember, accountManager } = deps;

  // Prerequisite: IMAP must resolve from env or the credential vault
  const prereq = async () => {
    const { isTCImapConfigured } = await import('../services/tc-imap-config.js');
    const ok = await isTCImapConfigured({ accountManager, logger });
    return ok ? { ok: true } : { ok: false, reason: 'TC IMAP config missing from env/vault' };
  };

  // Work check: only run if there are active TC transactions to triage emails for
  const workCheck = requireTableRows(
    pool,
    `SELECT COUNT(*) FROM tc_transactions WHERE status NOT IN ('closed','cancelled')`,
    [],
    'active TC transactions'
  );

  const guardedBoot = createUsefulWorkGuard({
    taskName: 'Email Triage',
    purpose: 'Scan TC inbox for contract emails and route to correct transaction',
    prerequisites: prereq,
    workCheck,
    execute: async () => {
      const { createEmailTriage } = await import('../services/email-triage.js');
      const triage = createEmailTriage({ pool, notificationService, callCouncilMember, accountManager, logger });
      triage.startTriageCron();
      logger.info?.('[BOOT] Email triage started');
    },
    logger,
  });

  await guardedBoot();
}

// ── TC Deadline Cron ──────────────────────────────────────────────────────────
async function bootTCDeadlineCron(deps) {
  const { logger, tcCoordinator, pool } = deps;

  // Prerequisite: coordinator must exist
  const prereq = async () => {
    if (!tcCoordinator) return { ok: false, reason: 'tcCoordinator not initialized' };
    return { ok: true };
  };

  // Work check: only run if there are transactions with upcoming deadlines
  const workCheck = requireTableRows(
    pool,
    `SELECT COUNT(*) FROM tc_deadlines
     WHERE due_date BETWEEN NOW() AND NOW() + INTERVAL '14 days'
       AND status = 'pending'`,
    [],
    'deadlines due in next 14 days'
  );

  const guardedBoot = createUsefulWorkGuard({
    taskName: 'TC Deadline Cron',
    purpose: 'Send deadline reminders for active TC transactions',
    prerequisites: prereq,
    workCheck,
    execute: async () => {
      const { startTCDeadlineCron } = await import('../services/tc-coordinator.js');
      startTCDeadlineCron({ coordinator: tcCoordinator, logger });
      logger.info?.('[BOOT] TC deadline cron started');
    },
    logger,
  });

  await guardedBoot();
}

// ── LifeOS scheduled jobs (commitment prods + event ingest + outreach) ───────
async function bootLifeOSScheduled(deps) {
  const { pool, logger, sendSMS, notificationService, callAI } = deps;
  try {
    const { startLifeOSScheduledJobs } = await import('../services/lifeos-scheduled-jobs.js');
    startLifeOSScheduledJobs({ pool, sendSMS, notificationService, logger, callAI });
    logger.info?.('[BOOT] LifeOS scheduler initialized (active only if LIFEOS_ENABLE_SCHEDULED_JOBS=1)');
  } catch (err) {
    logger.warn?.(`[BOOT] LifeOS scheduler failed to load: ${err.message}`);
  }
}

/**
 * bootAllDomains — call this once from server.js after app is ready.
 *
 * ADDING A NEW DOMAIN:
 *   1. Write an async bootMyDomain(deps) function above
 *   2. Wrap its AI work in createUsefulWorkGuard()
 *   3. Declare prerequisites (env vars, credentials, feature flags)
 *   4. Declare a work check (DB query proving real work exists)
 *   5. Add bootMyDomain(deps) to the Promise.allSettled list below
 *   6. NEVER skip the guard. No exceptions.
 */
// ── Twin Auto-Ingest (conversation → adam_decisions → adam_profile) ───────────
// ── Lane intel (Horizon + Red-team) — Amendment 36 ────────────────────────────
async function bootTruthScoreboard(deps) {
  const { pool, logger } = deps;
  if (process.env.TRUTH_SCOREBOARD_ENABLED === '0') {
    logger?.info?.('[BOOT] Truth scoreboard tick OFF (TRUTH_SCOREBOARD_ENABLED=0)');
    return;
  }
  try {
    const { registerTruthScoreboardScheduler, runTruthScoreboardTick } = await import('../services/truth-scoreboard-worker.js');
    registerTruthScoreboardScheduler({ pool, logger });
    await runTruthScoreboardTick({ pool, logger }).catch((err) => {
      logger?.warn?.(`[BOOT] Truth scoreboard initial tick: ${err.message}`);
    });
    logger?.info?.('[BOOT] Truth scoreboard scheduler active (epistemic promotion from receipts)');
  } catch (err) {
    logger?.warn?.(`[BOOT] Truth scoreboard scheduler failed: ${err.message}`);
  }
}

async function bootWisdomTruthAuditor(deps) {
  const { logger } = deps;
  if (process.env.WISDOM_TRUTH_AUDITOR_ENABLED === '0') {
    logger?.info?.('[BOOT] Wisdom truth auditor OFF (WISDOM_TRUTH_AUDITOR_ENABLED=0)');
    return;
  }
  try {
    const { registerWisdomTruthAuditorScheduler, runWisdomTruthAudit } = await import('../services/wisdom-truth-auditor.js');
    registerWisdomTruthAuditorScheduler({ logger });
    const report = await runWisdomTruthAudit({ logger }).catch((err) => {
      logger?.warn?.(`[BOOT] Wisdom truth audit initial run: ${err.message}`);
      return null;
    });
    if (report && !report.ok) {
      logger?.warn?.({ probe_fail_count: report.probe_fail_count }, '[BOOT] Wisdom truth audit found weaknesses at boot');
    }
    logger?.info?.('[BOOT] Wisdom truth auditor active (adversarial probes + enforcement gap scan)');
  } catch (err) {
    logger?.warn?.(`[BOOT] Wisdom truth auditor failed: ${err.message}`);
  }
}

async function bootChairPredictionScore(deps) {
  const { logger } = deps;
  if (process.env.CHAIR_PREDICTION_SCORE_ENABLED === '0') {
    logger?.info?.('[BOOT] Chair prediction score tick OFF (CHAIR_PREDICTION_SCORE_ENABLED=0)');
    return;
  }
  try {
    const { registerChairPredictionScoreScheduler } = await import('../services/chair-prediction-score-scheduler.js');
    registerChairPredictionScoreScheduler({ logger });
    logger?.info?.('[BOOT] Chair prediction score scheduler active (Founder Packet V2 scoreboard)');
  } catch (err) {
    logger?.warn?.(`[BOOT] Chair prediction score scheduler failed: ${err.message}`);
  }
}

async function bootLaneIntel(deps) {
  const { pool, logger, callCouncilMember } = deps;
  if (process.env.LANE_INTEL_ENABLED === '0') {
    logger?.info?.('[BOOT] Lane intel execution OFF (LANE_INTEL_ENABLED=0)');
    return;
  }
  if (process.env.LANE_INTEL_ENABLE_SCHEDULED === '0') {
    logger?.info?.('[BOOT] Lane intel schedulers off (LANE_INTEL_ENABLE_SCHEDULED=0)');
    return;
  }
  try {
    const { createLaneIntelScheduledTicks } = await import('../services/lane-intel-service.js');
    const { horizonGuard, redteamGuard } = createLaneIntelScheduledTicks({
      pool,
      logger,
      callCouncilMember,
    });
    const tickMs = Number(process.env.LANE_INTEL_TICK_MS) || 24 * 60 * 60 * 1000;
    const tick = async () => {
      await horizonGuard();
      await redteamGuard();
    };
    await tick();
    scheduleAsyncInterval(tick, tickMs, logger, 'lane-intel');
    logger?.info?.(`[BOOT] Lane intel schedulers active (every ${tickMs}ms)`);
  } catch (err) {
    logger?.warn?.(`[BOOT] Lane intel schedulers failed to start: ${err.message}`);
  }
}

async function bootTwinAutoIngest(deps) {
  const { pool, logger, callAI } = deps;

  const guardedIngest = createUsefulWorkGuard({
    taskName: 'Twin Auto-Ingest',
    purpose: 'Ingest new Adam conversation messages into adam_decisions and rebuild profile when threshold reached',
    prerequisites: async () => {
      const { rows } = await pool.query(
        `SELECT COUNT(*) FROM information_schema.tables WHERE table_name='twin_ingest_control'`
      );
      if (parseInt(rows[0].count, 10) === 0) {
        return { ok: false, reason: 'twin_ingest_control table not yet migrated' };
      }
      return { ok: true };
    },
    workCheck: requireTableRows(
      pool,
      `SELECT COUNT(*) FROM conversation_messages WHERE role='user'`,
      [],
      'user conversation messages'
    ),
    execute: async () => {
      const { createTwinAutoIngest } = await import('../services/twin-auto-ingest.js');
      const ingest = createTwinAutoIngest({ pool, callAI });
      await ingest.run();
      logger.info?.('[BOOT] Twin auto-ingest run complete');
    },
    logger,
  });

  // Run once at boot, then every 30 minutes
  await guardedIngest();
  scheduleAsyncInterval(guardedIngest, 30 * 60 * 1000, logger, 'twin-auto-ingest');
}

// ── Memory: auto-seed epistemic_facts on first boot ───────────────────────────
async function autoSeedEpistemicFacts(pool, logger) {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM epistemic_facts');
    if (rows[0].n === 0) {
      logger.info('[MEMORY] epistemic_facts empty — running auto-seed...');
      execSync('node scripts/seed-epistemic-facts.mjs', { stdio: 'inherit', cwd: process.cwd() });
      logger.info('[MEMORY] auto-seed complete');
    } else {
      logger.info({ n: rows[0].n }, '[MEMORY] epistemic_facts already seeded');
    }
  } catch (err) {
    logger.warn({ err: err.message }, '[MEMORY] auto-seed skipped (table missing or seed error)');
  }
}

async function bootOILDailySummary(deps) {
  const { pool, logger } = deps;
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  const run = createUsefulWorkGuard({
    taskName: 'OIL Daily Summary',
    purpose: 'Aggregate 24h security receipt activity and write a daily_oil_summary receipt',
    prerequisites: () => ({ ok: Boolean(pool?.query) }),
    workCheck: requireTableRows(pool, 'SELECT COUNT(*) FROM security_receipts'),
    execute: async () => {
      const { summary, receipt_id } = await generateDailyOILSummary(pool);
      logger?.info({ receipt_id, total: summary.total_receipts }, '[OIL] Daily summary written');
    },
    logger,
  });
  scheduleAsyncTimeout(async () => {
    await run();
    scheduleAsyncInterval(run, INTERVAL_MS, logger, 'oil-daily-summary');
  }, 60 * 1000, logger, 'oil-daily-summary-bootstrap');
  logger?.info('[BOOT] OIL daily summary scheduler registered (runs every 24h after 60s delay)');
}

// ── Self-repair deploy check (once per boot — no constant polling) ─────────────
async function bootSelfRepairDeployCheck(deps) {
  const { pool, logger } = deps;

  const guarded = createUsefulWorkGuard({
    taskName: 'Self-Repair Deploy Check',
    purpose: 'Refresh stale runtime proof after deploy SHA drift (PF-001→PF-002→PF-003)',
    allowInDirectedMode: process.env.SELF_REPAIR_OVERRIDE_DIRECTED_MODE !== '0',
    prerequisites: async () => {
      const { isSelfRepairBootCheckEnabled } = await import('../services/self-repair-deploy-scheduler.js');
      if (!isSelfRepairBootCheckEnabled()) {
        return { ok: false, reason: 'SELF_REPAIR_BOOT_CHECK=0' };
      }
      if (!process.env.COMMAND_CENTER_KEY && !process.env.LIFEOS_KEY && !process.env.API_KEY) {
        return { ok: false, reason: 'command key missing on runtime' };
      }
      if (!process.env.PUBLIC_BASE_URL && !process.env.RAILWAY_GIT_COMMIT_SHA) {
        return { ok: false, reason: 'deploy context unavailable' };
      }
      return { ok: true };
    },
    workCheck: async () => ({
      count: 1,
      description: 'post-deploy prevention hook — deploy-check once per boot (skip+log if CURRENT)',
    }),
    execute: async () => {
      const { runGovernedProofParityRefresh } = await import('../services/builderos-governed-proof-parity.js');
      const outcome = await runGovernedProofParityRefresh(pool, { triggeredBy: 'boot-prevention-hook' });
      logger?.info?.(
        {
          ok: outcome.ok,
          action: outcome.action,
          reason: outcome.reason,
          freshness: outcome.freshness,
          attempts: outcome.attempts,
        },
        '[BOOT] Governed proof parity pass complete'
      );
    },
    logger,
  });

  for (const delaySec of [45, 120, 240]) {
    scheduleAsyncTimeout(async () => {
      await guarded();
    }, delaySec * 1000, logger, `self-repair-deploy-check+${delaySec}s`);
  }
  logger?.info('[BOOT] Governed proof parity scheduled at +45s, +120s, +240s after boot');
}

// ── Deliberation REP catalog sync (idempotent — no AI) ─────────────────────────
async function bootDeliberationRepCatalog(deps) {
  const { pool, logger } = deps;
  if (!pool?.query) return;

  async function syncOnce(label) {
    const { createDeliberationGovernanceService } = await import('../services/deliberation-governance-service.js');
    const delib = createDeliberationGovernanceService(pool, logger);
    const result = await delib.syncRepCatalogFromConfig();
    if (result.ok) {
      logger?.info({ upserted: result.upserted, label }, '[BOOT] REP catalog synced from config/rep-catalog.json');
    } else {
      logger?.warn({ reason: result.error, label }, '[BOOT] REP catalog sync FAILED — GET /deliberation/reps may be empty');
    }
    return result;
  }

  try {
    const first = await syncOnce('boot');
    if (!first.ok) {
      scheduleAsyncTimeout(async () => {
        await syncOnce('boot-retry');
      }, 2000, logger, 'rep-catalog-retry');
    }
  } catch (err) {
    logger?.warn({ err: err.message }, '[BOOT] REP catalog sync failed (non-fatal)');
  }
}

// ── Factory autopilot recovery owner (AUTONOMOUS-RECOVERY-0002) ───────────────
async function bootFactoryAutopilotRecoveryOwner(deps) {
  const { logger } = deps;
  try {
    const { startFactoryAutopilotScheduler } = await import('../services/factory-autopilot-scheduler.js');
    startFactoryAutopilotScheduler({ logger });
  } catch (err) {
    logger?.warn?.({ err: err.message }, '[BOOT] Factory autopilot recovery owner failed to start (non-fatal)');
  }
}

// ── BuilderOS BP_PRIORITY autonomous queue (vision → reality) ────────────────
async function bootBuilderOSPriorityQueue(deps) {
  const { logger, pool } = deps;
  try {
    startBpPriorityScheduler({ logger });
  } catch (err) {
    logger?.warn?.({ err: err.message }, '[BOOT] BuilderOS BP_PRIORITY scheduler failed to start (non-fatal)');
  }
  try {
    startNeverStopProductFactoryScheduler({ logger });
  } catch (err) {
    logger?.warn?.({ err: err.message }, '[BOOT] Never-stop product factory failed to start (non-fatal)');
  }
  try {
    startGovernedAutonomousShippingLoop({ logger, pool });
  } catch (err) {
    logger?.warn?.({ err: err.message }, '[BOOT] Governed autonomous shipping loop failed to start (non-fatal)');
  }
}

async function bootLifeREDomain(deps) {
  const { pool, logger, notificationService, sendSMS } = deps;
  try {
    const { bootLifeRE } = await import('../services/lifere-boot.js');
    await bootLifeRE({ pool, logger });
    const { startLifeREOutreachScheduler } = await import('../services/lifere-outreach-scheduler.js');
    startLifeREOutreachScheduler({ pool, notificationService, sendSMS, logger });
    logger?.info?.('[BOOT] LifeRE twins + permissions + outreach scheduler initialized');
  } catch (err) {
    logger?.warn?.({ err: err.message }, '[BOOT] LifeRE boot failed (non-fatal)');
  }
}

export async function bootAllDomains(deps) {
  const { pool, logger } = deps;
  if (!fullRuntimeProfile && process.env.LIFEOS_ENABLE_FOUNDER_BUILDER_BOOT_DOMAINS !== 'true') {
    logger?.info?.(
      `[BOOT] Founder-builder runtime profile active (${runtimeProfile}) — startup domain boot skipped`
    );
    return;
  }
  await autoSeedEpistemicFacts(pool, logger);
  await bootDeliberationRepCatalog(deps);
  await bootLifeREDomain(deps);

  if (!fullRuntimeProfile) {
    logger?.info?.(`[BOOT] Founder-builder runtime profile active (${runtimeProfile}) — non-core startup domains suppressed unless explicitly re-enabled`);
  }

  if (!tcOperationsBootEnabled) {
    logger?.info?.('[BOOT] TC operations boot disabled (set LIFEOS_ENABLE_TC_OPERATIONS_BOOT=true to restore GLVAR, email triage, and TC deadline startup)');
  }
  if (!twinAutoIngestBootEnabled) {
    logger?.info?.('[BOOT] Twin auto-ingest boot disabled (set LIFEOS_ENABLE_TWIN_AUTO_INGEST_BOOT=true to restore startup ingest)');
  }

  await Promise.allSettled([
    ...(tcOperationsBootEnabled
      ? [
          bootGLVARMonitor(deps),
          bootEmailTriage(deps),
          bootTCDeadlineCron(deps),
        ]
      : []),
    ...(fullRuntimeProfile ? [bootLifeOSScheduled(deps)] : []),
    ...(fullRuntimeProfile ? [bootLaneIntel(deps)] : []),
    bootTruthScoreboard(deps),
    ...(fullRuntimeProfile ? [bootWisdomTruthAuditor(deps)] : []),
    ...(fullRuntimeProfile ? [bootChairPredictionScore(deps)] : []),
    ...(twinAutoIngestBootEnabled ? [bootTwinAutoIngest(deps)] : []),
    ...(fullRuntimeProfile ? [bootOILDailySummary(deps)] : []),
    bootSelfRepairDeployCheck(deps),
    ...(fullRuntimeProfile ? [bootFactoryAutopilotRecoveryOwner(deps)] : []),
    bootBuilderOSPriorityQueue(deps),
  ]);
}
