/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tc-intake-routes.js).
 */
import { tcIntakeRunner } from '../services/tc-intake-runner.js';

export function registerTcIntakeRoutes(app, deps) {
  const requireAuth = deps.requireAuth || deps.requireKey;
  if (typeof requireAuth !== 'function') {
    throw new Error('Tc intake routes require deps.requireAuth or deps.requireKey');
  }

  app.post('/api/tc/intake/run', requireAuth, async (req, res) => {
    try {
      const { transactionId, emailMessageId } = req.body || {};

      if (!transactionId || !emailMessageId) {
        return res.status(400).json({
          error: 'transactionId and emailMessageId are required',
        });
      }

      const result = await tcIntakeRunner.runIntake(deps, {
        transactionId,
        emailMessageId,
      });

      return res.status(200).json({
        intakeRunId: result?.intakeRunId ?? result?.id ?? null,
        status: result?.status ?? 'unknown',
      });
    } catch (error) {
      deps.logger?.error?.({ err: error }, 'tc intake run failed');
      return res.status(500).json({
        error: 'failed to run intake',
      });
    }
  });

  app.get('/api/tc/intake/runs', requireAuth, async (_req, res) => {
    try {
      const db = deps.db || deps.pool;
      if (!db?.query) {
        throw new Error('Database dependency missing: expected deps.db or deps.pool');
      }

      const result = await db.query(
        `SELECT id, transaction_id, email_message_id, skyslope_file_id, status, run_log, created_at, updated_at
         FROM intake_runs
         ORDER BY created_at DESC
         LIMIT 20`
      );

      return res.status(200).json({
        runs: result.rows || [],
      });
    } catch (error) {
      deps.logger?.error?.({ err: error }, 'tc intake runs fetch failed');
      return res.status(500).json({
        error: 'failed to fetch intake runs',
      });
    }
  });
}

export default registerTcIntakeRoutes;