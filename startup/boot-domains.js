/**
 * boot-domains.js
 * Bootstraps all domain-specific subsystems at startup.
 *
 * This is the ONLY place async IIFE startup blocks should live.
 * Do NOT put domain boot logic in server.js - add it here instead.
 *
 * Deps shape: {
 *   pool,
 *   logger,
 *   notificationService,
 *   callCouncilMember,
 *   accountManager,
 *   railwayManagedEnvService,
 *   onManagedEnvReady,
 *   registerTwilioWebhook,
 *   publicDomain,
 * }
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

async function bootGLVARMonitor(deps) {
  const { pool, logger, notificationService, accountManager } = deps;
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

async function bootEmailTriage(deps) {
  const { pool, logger, notificationService, callCouncilMember } = deps;
  try {
    const { createEmailTriage } = await import('../services/email-triage.js');
    const triage = createEmailTriage({ pool, notificationService, callCouncilMember, logger });
    triage.startTriageCron();
    logger.info?.('[BOOT] Email triage started');
  } catch (err) {
    logger.warn?.(`[BOOT] Email triage failed to start: ${err.message}`);
  }
}

async function bootManagedEnvBootstrap(deps) {
  const { logger, railwayManagedEnvService, onManagedEnvReady } = deps;
  if (!railwayManagedEnvService) return;

  try {
    await railwayManagedEnvService.ensureSchema();
    onManagedEnvReady?.();
    const result = await railwayManagedEnvService.syncDesiredVars({ actor: 'boot', syncOnBootOnly: true });
    logger.info?.({ changed: result.changed, failed: result.failed }, 'OK [RAILWAY-MANAGED-ENV] Boot sync complete');
  } catch (error) {
    logger.warn?.({ error: error.message }, 'WARN [RAILWAY-MANAGED-ENV] Boot sync failed');
  }
}

async function bootAccountManagerSchema(deps) {
  const { accountManager, logger } = deps;
  if (!accountManager?.ensureSchema) return;

  try {
    await accountManager.ensureSchema();
    logger.info?.('OK [ACCOUNT-MANAGER] Schema ensured');
  } catch (error) {
    logger.warn?.({ error: error.message }, 'WARN [ACCOUNT-MANAGER] Schema init failed');
  }
}

async function bootTwilioWebhookRegistration(deps) {
  const { logger, registerTwilioWebhook } = deps;
  if (typeof registerTwilioWebhook !== 'function') return;

  try {
    const result = await registerTwilioWebhook();
    if (result.registered) {
      logger.info?.({ url: result.url, changed: result.changed }, 'OK [TWILIO] SMS webhook confirmed');
      return;
    }
    logger.warn?.({ error: result.error }, 'WARN [TWILIO] SMS webhook registration failed (non-fatal)');
  } catch (error) {
    logger.warn?.({ error: error.message }, 'WARN [TWILIO] SMS webhook registration failed (non-fatal)');
  }
}

function buildKnownRailwayVars(publicDomain) {
  const siteBaseUrl = publicDomain
    ? (publicDomain.startsWith('http') ? publicDomain : `https://${publicDomain}`)
    : '';

  return {
    EMAIL_PROVIDER: { value: 'postmark', description: 'Email provider - set by boot seeder' },
    EMAIL_FROM: { value: 'lifeOS@hopkinsgroup.org', description: 'Outreach FROM address - set by boot seeder' },
    ...(siteBaseUrl && {
      SITE_BASE_URL: {
        value: siteBaseUrl,
        description: 'Preview site base URL - derived from RAILWAY_PUBLIC_DOMAIN',
      },
    }),
    GMAIL_SIGNUP_EMAIL: {
      value: 'lumea.lifeos@gmail.com',
      description: 'System signup email (public domain services) - set by boot seeder',
    },
    WORK_EMAIL: {
      value: 'LifeOS@hopkinsgroup.org',
      description: 'Work email (private domain, for Postmark etc.) - set by boot seeder',
    },
  };
}

async function bootKnownRailwayEnvSeeder(deps) {
  const { logger, railwayManagedEnvService, publicDomain } = deps;
  if (!railwayManagedEnvService?.upsertDesiredVars) return;

  try {
    const knownVars = buildKnownRailwayVars(publicDomain || '');
    const toSet = Object.fromEntries(
      Object.entries(knownVars).filter(([key]) => !process.env[key])
    );

    if (Object.keys(toSet).length === 0) {
      logger.info?.('[BOOT-SEEDER] All known vars already set - no action needed');
      return;
    }

    const results = await railwayManagedEnvService.upsertDesiredVars(toSet, 'boot-seeder');
    const ok = results.filter((result) => result.ok).map((result) => result.envName);
    const failed = results.filter((result) => !result.ok).map((result) => `${result.envName}: ${result.error}`);

    if (ok.length > 0) {
      logger.info?.({ vars: ok }, 'OK [BOOT-SEEDER] Vars stored in managed-env');
      await railwayManagedEnvService.syncDesiredVars({ actor: 'boot-seeder', names: ok });
      logger.info?.({ count: ok.length }, 'OK [BOOT-SEEDER] Known vars pushed to Railway');
    }

    if (failed.length > 0) {
      logger.warn?.({ failed }, 'WARN [BOOT-SEEDER] Some vars failed');
    }
  } catch (error) {
    logger.warn?.({ error: error.message }, 'WARN [BOOT-SEEDER] Non-fatal error');
  }
}

export async function bootAllDomains(deps) {
  await Promise.allSettled([
    bootGLVARMonitor(deps),
    bootEmailTriage(deps),
    bootManagedEnvBootstrap(deps),
    bootAccountManagerSchema(deps),
    bootTwilioWebhookRegistration(deps),
    bootKnownRailwayEnvSeeder(deps),
  ]);
}
