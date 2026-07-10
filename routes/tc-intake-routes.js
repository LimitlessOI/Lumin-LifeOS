/**
 * SYNOPSIS: ASSUMPTIONS:
 */
import { runIntake } from '../services/tcIntakeRunner.js';

export function registerTcIntakeRoutes(app, deps) {
  const requireAuth = deps?.requireAuth || deps?.requireKey;
  const pool = deps?.pool || deps?.db;

  if (!app || typeof app.post !== 'function' || typeof app.get !== 'function') {
    throw new Error('registerTcIntakeRoutes requires an Express app with get/post methods');
  }

  if (typeof requireAuth !== 'function') {
    throw new Error('registerTcIntakeRoutes requires deps.requireAuth or deps.requireKey');
  }

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerTcIntakeRoutes requires deps.pool with query()');
  }

  app.post('/api/tc/intake/run', requireAuth, async (req, res) => {
    try {
      const { transactionId, emailMessageId } = req.body || {};

      if (!transactionId || !emailMessageId) {
        return res.status(400).json({
          error: 'transactionId and emailMessageId are required',
        });
      }

      const result = await runIntake(deps, { transactionId, emailMessageId });

      return res.status(200).json({
        intakeRunId: result?.intakeRunId ?? result?.id ?? null,
        status: result?.status ?? null,
      });
    } catch (error) {
      deps?.logger?.error?.(
        { err: error, transactionId: req.body?.transactionId, emailMessageId: req.body?.emailMessageId },
        'tc intake run failed'
      );
      return res.status(500).json({
        error: 'Failed to run intake',
      });
    }
  });

  app.get('/api/tc/intake/runs', requireAuth, async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `
          SELECT id, transaction_id, email_message_id, skyslope_file_id, status, run_log, created_at, updated_at
          FROM intake_runs
          ORDER BY created_at DESC
          LIMIT 20
        `
      );

      return res.status(200).json({ runs: rows });
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'failed to list tc intake runs');
      return res.status(500).json({
        error: 'Failed to load intake runs',
      });
    }
  });
}

export default registerTcIntakeRoutes;

// ASSUMPTIONS:
// - The existing intake executor is available at ../services/tcIntakeRunner.js and exposes runIntake(deps, payload).
// - deps.requireAuth is present in the runtime; deps.requireKey is accepted as a fallback to preserve protected-route behavior.