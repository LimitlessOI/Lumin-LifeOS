/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tc-intake-routes.js).
 */
import { runIntake } from '../services/tc-intake-runner.js';

export function registerTcIntakeRoutes(app, deps = {}) {
  const authMiddleware = deps.requireAuth || deps.requireKey;

  app.post('/api/tc/intake/run', authMiddleware, async (req, res) => {
    try {
      const { transactionId, emailMessageId } = req.body || {};

      if (!transactionId || !emailMessageId) {
        return res.status(400).json({
          error: 'transactionId and emailMessageId are required',
        });
      }

      const result = await runIntake(deps, {
        transactionId,
        emailMessageId,
      });

      return res.status(200).json({
        intakeRunId: result?.intakeRunId ?? result?.id ?? null,
        status: result?.status ?? null,
      });
    } catch (error) {
      deps.logger?.error?.({ err: error }, 'tc intake run failed');
      return res.status(500).json({
        error: 'Failed to run intake',
      });
    }
  });

  app.get('/api/tc/intake/runs', authMiddleware, async (req, res) => {
    try {
      const db = deps.db || deps.pool;
      if (!db?.query) {
        return res.status(500).json({ error: 'Database unavailable' });
      }

      const { rows } = await db.query(
        `
          SELECT id, transaction_id, email_message_id, skyslope_file_id, status, run_log, created_at, updated_at
          FROM intake_runs
          ORDER BY created_at DESC
          LIMIT 20
        `
      );

      return res.status(200).json({ runs: rows });
    } catch (error) {
      deps.logger?.error?.({ err: error }, 'tc intake runs fetch failed');
      return res.status(500).json({
        error: 'Failed to load intake runs',
      });
    }
  });
}

export default registerTcIntakeRoutes;