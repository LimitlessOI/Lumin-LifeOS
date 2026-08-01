/**
 * SYNOPSIS: Scheduled SENTRY Site Builder pre-alpha gate runner.
 * Reuses the existing CLI gate (scripts/sentry-site-builder-prealpha-gate.mjs)
 * so no logic is duplicated. Wrapped with createUsefulWorkGuard per the
 * Zero Waste AI Call Rule: it only runs when prod credentials are present and
 * the interval has elapsed.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUsefulWorkGuard } from '../services/useful-work-guard.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sentry_site_builder_gate_log (
      id SERIAL PRIMARY KEY,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      report_json JSONB NOT NULL
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sentry_site_builder_gate_log_generated_at
    ON sentry_site_builder_gate_log (generated_at)
  `);
}

async function lastRunAt(pool) {
  await ensureTable(pool);
  const { rows } = await pool.query(
    `SELECT generated_at FROM sentry_site_builder_gate_log ORDER BY generated_at DESC LIMIT 1`,
  );
  return rows[0]?.generated_at || null;
}

async function runSiteBuilderSentryGateTick({ pool, logger = console }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/sentry-site-builder-prealpha-gate.mjs'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('error', reject);
    child.on('close', async (code) => {
      const report = {
        exitCode: code,
        ok: code === 0,
        timestamp: new Date().toISOString(),
        stdout: stdout.slice(0, 2000),
        stderr: stderr.slice(0, 2000),
      };
      await ensureTable(pool);
      await pool.query(
        `INSERT INTO sentry_site_builder_gate_log (report_json) VALUES ($1)`,
        [JSON.stringify(report)],
      );
      logger.log?.(`[SENTRY-SITE-BUILDER-SCHEDULE] gate exited ${code}`);
      resolve(report);
    });
  });
}

export function registerSiteBuilderSentryGateScheduler({
  pool,
  logger = console,
  intervalMs = DEFAULT_INTERVAL_MS,
} = {}) {
  if (!pool) return null;

  const guarded = createUsefulWorkGuard({
    taskName: 'Site Builder SENTRY Gate',
    purpose: 'SO-002 — periodically run Layer A + Layer B SENTRY gate and persist results to sentry_site_builder_gate_log',
    prerequisites: async () => {
      const base = process.env.PUBLIC_BASE_URL || process.env.SITE_BASE_URL;
      if (!base || !process.env.COMMAND_CENTER_KEY) {
        return { ok: false, reason: 'missing PUBLIC_BASE_URL/SITE_BASE_URL or COMMAND_CENTER_KEY' };
      }
      return { ok: true };
    },
    workCheck: async () => {
      const last = await lastRunAt(pool);
      if (!last) {
        return { count: 1, description: 'no prior gate run recorded' };
      }
      const ageMs = Date.now() - new Date(last).getTime();
      return ageMs >= intervalMs
        ? { count: 1, description: `last gate run ${Math.round(ageMs / 3600000)}h ago, due` }
        : { count: 0, description: `last gate run ${Math.round(ageMs / 60000)}m ago, not due yet` };
    },
    execute: () => runSiteBuilderSentryGateTick({ pool, logger }),
    logger,
  });

  const timer = setInterval(guarded, Math.min(intervalMs, 6 * 60 * 60 * 1000));
  if (typeof timer.unref === 'function') timer.unref();

  guarded().catch((err) => logger.warn?.(`[SENTRY-SITE-BUILDER-SCHEDULE] initial tick failed: ${err.message}`));

  return { timer, tick: guarded };
}
