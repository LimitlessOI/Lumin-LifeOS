/**
 * SYNOPSIS: Exports registerSiteBuilderSentryGateScheduler — scripts/sentry-site-builder-schedule.mjs.
 */
import { createUsefulWorkGuard } from '../services/useful-work-guard.js';

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function registerSiteBuilderSentryGateScheduler({
  pool,
  logger = console,
  intervalMs = DEFAULT_INTERVAL_MS,
}) {
  const guard = createUsefulWorkGuard({
    pool,
    logger,
    workName: 'sentry-site-builder-schedule',
  });

  const ensureTable = async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sentry_site_builder_gate_log (
        id SERIAL PRIMARY KEY,
        generated_at TIMESTAMPTZ DEFAULT now(),
        report_json JSONB
      )
    `);
  };

  const insertResult = async (report) => {
    await pool.query(
      `INSERT INTO sentry_site_builder_gate_log (report_json) VALUES ($1)`,
      [JSON.stringify(report)]
    );
  };

  const runTick = async () => {
    await guard(async () => {
      const baseUrl = process.env.PUBLIC_BASE_URL || process.env.SITE_BASE_URL;
      const key = process.env.COMMAND_CENTER_KEY;

      if (!baseUrl || !key) {
        logger.warn(
          '[sentry-site-builder-schedule] Skipping run: PUBLIC_BASE_URL/SITE_BASE_URL and COMMAND_CENTER_KEY are required.'
        );
        return;
      }

      await ensureTable();

      const { runSiteBuilderPrealphaGate } = await import(
        './sentry-site-builder-prealpha-gate.mjs'
      );

      const result = await runSiteBuilderPrealphaGate({ pool, logger });

      const report = {
        verdict: result.verdict || 'unknown',
        findingsCount: Array.isArray(result.findings) ? result.findings.length : 0,
        timestamp: new Date().toISOString(),
      };

      await insertResult(report);
      logger.info(
        `[sentry-site-builder-schedule] Gate run complete: verdict=${report.verdict}, findings=${report.findingsCount}`
      );
    });
  };

  await runTick();

  const timer = setInterval(runTick, intervalMs);
  timer.unref();

  return () => clearInterval(timer);
}
