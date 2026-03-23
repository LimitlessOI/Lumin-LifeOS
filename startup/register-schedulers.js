/**
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
import { createTwilioService } from '../services/twilio-service.js';
import { startReminderCron } from '../services/reminder-cron.js';
import { startTCDeadlineCron } from '../services/tc-coordinator.js';
import logger from '../services/logger.js';

const registeredSchedulers = new Set();

function registerOnce(name, registerFn) {
  if (registeredSchedulers.has(name)) return;
  registerFn();
  registeredSchedulers.add(name);
}

function registerWordKeeperReminder(deps) {
  const { pool, wkIntegrityEngine, callCouncilMember, publicDomain } = deps;
  if (!pool || !wkIntegrityEngine || typeof callCouncilMember !== 'function') return;

  registerOnce('word-keeper-reminder', () => {
    startReminderCron(pool, async (to, msg) => {
      try {
        const twilio = createTwilioService({
          callCouncilMember,
          RAILWAY_PUBLIC_DOMAIN: publicDomain,
          ALERT_PHONE: to,
          alertState: { inProgress: false },
        });
        return twilio.sendSMS(to, msg);
      } catch {
        return { success: false };
      }
    }, {
      userPhone: process.env.ALERT_PHONE || process.env.ADMIN_PHONE,
      integrityEngine: wkIntegrityEngine,
    });
    logger.info('OK [WORD-KEEPER] Reminder cron started');
  });
}

function registerTCDeadline(deps) {
  const { pool, tcCoordinator } = deps;
  if (!pool || !tcCoordinator) return;

  registerOnce('tc-deadline-cron', () => {
    startTCDeadlineCron(pool, tcCoordinator);
  });
}

function registerManagedEnvScheduler(deps) {
  const { railwayManagedEnvService } = deps;
  if (!railwayManagedEnvService?.startScheduler) return;

  registerOnce('railway-managed-env-scheduler', () => {
    railwayManagedEnvService.startScheduler();
  });
}

function registerContinuousImprovementMonitor(deps) {
  const { ciMonitor, logger: scopedLogger } = deps;
  if (!ciMonitor?.runMonitorCycle) return;

  registerOnce('continuous-improvement-monitor', () => {
    setTimeout(() => {
      ciMonitor.runMonitorCycle().catch((error) =>
        scopedLogger.warn('[CI] Monitor cycle failed', { error: error.message })
      );
      setInterval(() => {
        ciMonitor.runMonitorCycle().catch((error) =>
          scopedLogger.warn('[CI] Monitor cycle failed', { error: error.message })
        );
      }, 6 * 60 * 60 * 1000);
    }, 5 * 60 * 1000);
  });
}

function registerAdamProfileRebuild(deps) {
  const { adamLogger, callCouncilMember, logger: scopedLogger } = deps;
  if (!adamLogger?.buildProfile || typeof callCouncilMember !== 'function') return;

  registerOnce('adam-profile-rebuild', () => {
    setInterval(() => {
      adamLogger.buildProfile(async (prompt) => {
        try {
          const result = await callCouncilMember('anthropic', prompt);
          return typeof result === 'string' ? result : result?.content || '';
        } catch {
          return '';
        }
      }).catch((error) => scopedLogger.warn('[ADAM-TWIN] Profile rebuild failed', { error: error.message }));
    }, 12 * 60 * 60 * 1000);
  });
}

function registerAutoBuilderScheduler(deps) {
  const { autoBuilder } = deps;
  if (!autoBuilder?.startBuildScheduler) return;

  registerOnce('auto-builder-scheduler', () => {
    autoBuilder.startBuildScheduler({
      initialDelay: 60000,
      interval: 6 * 60 * 60 * 1000,
    });
  });
}

function registerAutonomySchedulersGroup(deps) {
  const { startAutonomySchedulers, scheduleAutonomyLoop, scheduleAutonomyOnce, getAutonomyDeps, pool } = deps;
  if (
    typeof startAutonomySchedulers !== 'function'
    || typeof scheduleAutonomyLoop !== 'function'
    || typeof scheduleAutonomyOnce !== 'function'
    || typeof getAutonomyDeps !== 'function'
    || !pool
  ) {
    return;
  }

  registerOnce('autonomy-schedulers', () => {
    startAutonomySchedulers(scheduleAutonomyLoop, scheduleAutonomyOnce, getAutonomyDeps);
    scheduleAutonomyLoop('preview-expiry', 24 * 60 * 60 * 1000, () => deps.runPreviewExpiry(pool), 5 * 60 * 1000);
  });
}

export function registerAllSchedulers(deps) {
  registerWordKeeperReminder(deps);
  registerTCDeadline(deps);
  registerManagedEnvScheduler(deps);
  registerContinuousImprovementMonitor(deps);
  registerAdamProfileRebuild(deps);
  registerAutoBuilderScheduler(deps);
  registerAutonomySchedulersGroup(deps);
}
