/**
 * SYNOPSIS: Exports registerSiteBuilderSentryGateScheduler — scripts/sentry-site-builder-schedule.mjs.
 *
 * NOT WIRED YET -- see docs/products/builderos/BUILD_QUEUE.json bo-schedule-site-builder-sentry-gate
 * for the remaining blocker before this is safe to call from server-founder-runtime.js:
 * scripts/sentry-site-builder-prealpha-gate.mjs has zero exports and its main() calls
 * process.exit() directly. Importing and calling it programmatically today would kill the
 * whole server process on the first tick. That file needs main()'s logic extracted into an
 * exported function that RETURNS a result instead of exiting, with process.exit() staying
 * only in the CLI-invocation footer (main().catch(...) at the bottom of that file). Do not
 * wire this scheduler into server-founder-runtime.js until that's done and verified.
 */
import { createUsefulWorkGuard, requireEnvVars } from '../services/useful-work-guard.js';

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sentry_site_builder_gate_log (
      id SERIAL PRIMARY KEY,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      report_json JSONB NOT NULL
    )
  `);
}

async function lastRunAt(pool) {
  await ensureTable(pool);
  const { rows } = await pool.query(
    `SELECT generated_at FROM sentry_site_builder_gate_log ORDER BY generated_at DESC LIMIT 1`
  );
  return rows[0]?.generated_at || null;
}

async function runGateTick({ pool, logger }) {
  // BLOCKED -- see the file-header note above. Left as an explicit throw (not a silent
  // no-op) so this is loud in logs if something calls it before the prealpha-gate export
  // exists, instead of quietly appearing to "work" while doing nothing.
  throw new Error(
    'sentry-site-builder-schedule: runSiteBuilderPrealphaGate is not yet a safe-to-call export ' +
    'of scripts/sentry-site-builder-prealpha-gate.mjs (its main() still calls process.exit()). ' +
    'See BUILD_QUEUE.json bo-schedule-site-builder-sentry-gate for what remains.'
  );
}

export function registerSiteBuilderSentryGateScheduler({
  pool,
  logger = console,
  intervalMs = DEFAULT_INTERVAL_MS,
} = {}) {
  if (!pool) return null;
  const guarded = createUsefulWorkGuard({
    taskName: 'Site Builder SENTRY Gate Tick',
    purpose: 'SO-002 — periodic Layer A + Layer B SENTRY walkthrough of Site Builder, persisted as real history',
    prerequisites: requireEnvVars('PUBLIC_BASE_URL', 'COMMAND_CENTER_KEY'),
    workCheck: async () => {
      const last = await lastRunAt(pool);
      if (!last) return { count: 1, description: 'no prior gate run recorded' };
      const ageMs = Date.now() - new Date(last).getTime();
      return ageMs >= intervalMs
        ? { count: 1, description: `last run ${Math.round(ageMs / 3600000)}h ago, due` }
        : { count: 0, description: `last run ${Math.round(ageMs / 60000)}m ago, not due yet` };
    },
    execute: () => runGateTick({ pool, logger }),
    logger,
  });
  const timer = setInterval(guarded, Math.min(intervalMs, 6 * 60 * 60 * 1000));
  if (typeof timer.unref === 'function') timer.unref();
  return { timer, tick: guarded };
}
