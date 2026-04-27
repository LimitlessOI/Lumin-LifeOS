/**
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
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import { createUsefulWorkGuard, requireTableRows } from '../services/useful-work-guard.js';

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
async function bootLaneIntel(deps) {
  const { pool, logger, callCouncilMember } = deps;
  // Budget / launch gate — no Horizon or Red-team ticks unless explicitly enabled (costs tokens + npm CPU).
  if (process.env.LANE_INTEL_ENABLED !== '1') {
    logger?.info?.('[BOOT] Lane intel execution OFF (set LANE_INTEL_ENABLED=1 after launch/budget approval)');
    return;
  }
  if (process.env.LANE_INTEL_ENABLE_SCHEDULED !== '1') {
    logger?.info?.('[BOOT] Lane intel schedulers off (set LANE_INTEL_ENABLE_SCHEDULED=1 to enable ticks)');
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
    setInterval(tick, tickMs);
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
  setInterval(guardedIngest, 30 * 60 * 1000);
}

export async function bootAllDomains(deps) {
  await Promise.allSettled([
    bootGLVARMonitor(deps),
    bootEmailTriage(deps),
    bootTCDeadlineCron(deps),
    bootLifeOSScheduled(deps),
    bootLaneIntel(deps),
    bootTwinAutoIngest(deps),
  ]);
}
