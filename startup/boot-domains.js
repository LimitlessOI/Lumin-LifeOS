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
 * @ssot docs/projects/AMENDMENT_18_PROJECT_GOVERNANCE.md
 */

import { createUsefulWorkGuard, requireEnvVars, requireTableRows } from '../services/useful-work-guard.js';

// ── GLVAR Monitor (dues + violations) ────────────────────────────────────────
async function bootGLVARMonitor(deps) {
  const { pool, logger, notificationService, accountManager } = deps;

  // Prerequisite: GLVAR credentials must be configured
  const prereq = requireEnvVars('GLVAR_USERNAME', 'GLVAR_PASSWORD');

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

  // Prerequisite: IMAP must be fully configured with real credentials
  const prereq = requireEnvVars('TC_IMAP_HOST', 'TC_IMAP_USER', 'TC_IMAP_PASS');

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
export async function bootAllDomains(deps) {
  await Promise.allSettled([
    bootGLVARMonitor(deps),
    bootEmailTriage(deps),
    bootTCDeadlineCron(deps),
  ]);
}
