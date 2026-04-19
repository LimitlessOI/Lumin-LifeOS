/**
 * services/useful-work-guard.js
 *
 * Hard enforcement layer: no AI call fires unless it passes a prerequisite check
 * that proves there is real, actionable work to do.
 *
 * RULE: Every scheduled AI task must declare:
 *   1. What it needs to exist before it runs (prerequisites)
 *   2. What it checks to confirm there's actual work (work check)
 *   3. What it will produce as output (purpose)
 *
 * If prerequisites fail → skip silently (log at debug level only).
 * If work check returns zero items → skip, log "nothing to do".
 * If either throws → skip, log error, never fall through to AI call.
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

/**
 * createUsefulWorkGuard — wraps a scheduled task with prerequisite + work checks.
 *
 * @param {object} opts
 * @param {string}   opts.taskName        — human label, shown in logs
 * @param {string}   opts.purpose         — what useful output this produces
 * @param {Function} opts.prerequisites   — async () => { ok: bool, reason: string }
 * @param {Function} opts.workCheck       — async () => { count: number, description: string }
 * @param {Function} opts.execute         — async () => result — only called if above pass
 * @param {object}   [opts.logger]        — pino-compatible logger
 * @returns {Function} — wrapped async function safe to call on any schedule
 */
export function createUsefulWorkGuard({ taskName, purpose, prerequisites, workCheck, execute, logger = console }) {
  const log = {
    info:  (...a) => logger.info?.(...a)  ?? console.log(...a),
    warn:  (...a) => logger.warn?.(...a)  ?? console.warn(...a),
    debug: (...a) => logger.debug?.(...a) ?? null,
    error: (...a) => logger.error?.(...a) ?? console.error(...a),
  };

  return async function guardedExecute() {
    // ── 1. Directed mode check (global kill switch) ──────────────────────────
    if (process.env.LIFEOS_DIRECTED_MODE === 'true' || process.env.PAUSE_AUTONOMY === '1') {
      log.debug(`[USEFUL-WORK-GUARD] ${taskName} skipped — directed mode active`);
      return { skipped: true, reason: 'directed_mode' };
    }

    // ── 2. Prerequisite check ────────────────────────────────────────────────
    let prereqResult;
    try {
      prereqResult = await prerequisites();
    } catch (err) {
      log.warn(`[USEFUL-WORK-GUARD] ${taskName} prerequisite check threw: ${err.message} — skipping`);
      return { skipped: true, reason: 'prerequisite_error', error: err.message };
    }

    if (!prereqResult.ok) {
      log.info(`[USEFUL-WORK-GUARD] ${taskName} skipped — prerequisites not met: ${prereqResult.reason}`);
      return { skipped: true, reason: 'prerequisites_not_met', detail: prereqResult.reason };
    }

    // ── 3. Work availability check ───────────────────────────────────────────
    let workResult;
    try {
      workResult = await workCheck();
    } catch (err) {
      log.warn(`[USEFUL-WORK-GUARD] ${taskName} work check threw: ${err.message} — skipping`);
      return { skipped: true, reason: 'work_check_error', error: err.message };
    }

    if (!workResult.count || workResult.count < 1) {
      log.info(`[USEFUL-WORK-GUARD] ${taskName} skipped — nothing to do: ${workResult.description || 'work_check returned 0'}`);
      return { skipped: true, reason: 'no_work', detail: workResult.description };
    }

    // ── 4. Execute — prerequisites passed, real work exists ─────────────────
    log.info(`[USEFUL-WORK-GUARD] ${taskName} starting — ${workResult.count} item(s) | purpose: ${purpose}`);
    try {
      const result = await execute();
      log.info(`[USEFUL-WORK-GUARD] ${taskName} complete`);
      return { skipped: false, result };
    } catch (err) {
      log.error(`[USEFUL-WORK-GUARD] ${taskName} execute failed: ${err.message}`);
      return { skipped: false, error: err.message };
    }
  };
}

/**
 * requireEnvVars — standard prerequisite helper.
 * Returns { ok: false, reason } if any required env var is missing or empty.
 */
export function requireEnvVars(...vars) {
  return async () => {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      return { ok: false, reason: `missing env vars: ${missing.join(', ')}` };
    }
    return { ok: true };
  };
}

/**
 * requireTableRows — standard work check helper.
 * Returns { count, description } from a DB query.
 * query must return rows with a numeric `count` column.
 */
export function requireTableRows(pool, sql, params = [], description = 'rows') {
  return async () => {
    const { rows: [row] } = await pool.query(sql, params);
    const count = parseInt(row?.count ?? row?.cnt ?? 0, 10);
    return { count, description: `${count} ${description}` };
  };
}
