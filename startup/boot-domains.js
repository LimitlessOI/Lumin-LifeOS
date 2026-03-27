/**
 * boot-domains.js
 * Bootstraps all domain-specific subsystems at startup.
 *
 * This is the ONLY place async IIFE startup blocks should live.
 * Do NOT put domain boot logic in server.js — add it here instead.
 *
 * Pattern for adding a new domain:
 *   async function bootMyDomain(deps) {
 *     const { pool, logger, ... } = deps;
 *     const { createMyService } = await import('../services/my-service.js');
 *     const svc = createMyService({ pool, logger });
 *     svc.start();
 *   }
 *   // then add bootMyDomain(deps) to the exports at the bottom
 *
 * Deps shape: { pool, logger, notificationService, callCouncilMember, accountManager, tcCoordinator }
 */

// ── GLVAR Monitor (dues + violations) ────────────────────────────────────────
async function bootGLVARMonitor(deps) {
  const { pool, logger, notificationService, accountManager } = deps;
  if (process.env.LIFEOS_DIRECTED_MODE === 'true' || process.env.PAUSE_AUTONOMY === '1') {
    logger.info?.('[BOOT] GLVAR monitor skipped — directed mode active');
    return;
  }
  try {
    const { createGLVARMonitor } = await import('../services/glvar-monitor.js');
    const { createTCBrowserAgent } = await import('../services/tc-browser-agent.js');
    const tcBrowser = createTCBrowserAgent({ accountManager, logger });
    const monitor = createGLVARMonitor({ pool, tcBrowser, accountManager, notificationService, logger });
    monitor.startDuesCron();
    monitor.startViolationsCron();
    logger.info?.('[BOOT] GLVAR monitor started');
  } catch (err) {
    logger.warn?.(`[BOOT] GLVAR monitor failed to start: ${err.message}`);
  }
}

// ── Email Triage (inbox scanning + daily digest) ──────────────────────────────
async function bootEmailTriage(deps) {
  const { pool, logger, notificationService, callCouncilMember, accountManager } = deps;
  if (process.env.LIFEOS_DIRECTED_MODE === 'true' || process.env.PAUSE_AUTONOMY === '1') {
    logger.info?.('[BOOT] Email triage skipped — directed mode active');
    return;
  }
  try {
    const { createEmailTriage } = await import('../services/email-triage.js');
    const triage = createEmailTriage({ pool, notificationService, callCouncilMember, accountManager, logger });
    triage.startTriageCron();
    logger.info?.('[BOOT] Email triage started');
  } catch (err) {
    logger.warn?.(`[BOOT] Email triage failed to start: ${err.message}`);
  }
}

// ── TC Deadline Cron ──────────────────────────────────────────────────────────
async function bootTCDeadlineCron(deps) {
  const { logger, tcCoordinator } = deps;
  if (process.env.LIFEOS_DIRECTED_MODE === 'true' || process.env.PAUSE_AUTONOMY === '1') {
    logger.info?.('[BOOT] TC deadline cron skipped — directed mode active');
    return;
  }
  try {
    if (!tcCoordinator) {
      logger.warn?.('[BOOT] TC deadline cron skipped — tcCoordinator missing');
      return;
    }
    const { startTCDeadlineCron } = await import('../services/tc-coordinator.js');
    startTCDeadlineCron({ coordinator: tcCoordinator, logger });
    logger.info?.('[BOOT] TC deadline cron started');
  } catch (err) {
    logger.warn?.(`[BOOT] TC deadline cron failed to start: ${err.message}`);
  }
}

/**
 * bootAllDomains — call this once from server.js after app is ready.
 * Add new boot functions to this list as new domains are built.
 */
export async function bootAllDomains(deps) {
  await Promise.allSettled([
    bootGLVARMonitor(deps),
    bootEmailTriage(deps),
    bootTCDeadlineCron(deps),
  ]);
}
