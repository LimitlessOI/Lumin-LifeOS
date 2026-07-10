/**
 * SYNOPSIS: Registers TcIntakeRoutes routes/handlers (routes/tc-intake-routes.js).
 */
import { tcIntakeRunner } from '../services/tc-intake-runner.js';

export function registerTcIntakeRoutes(app, deps) {
  const requireAuth = deps.requireAuth || deps.requireKey;
  const logger = deps.logger;

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
        status: result?.status ?? null,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc intake run failed');
      return res.status(500).json({
        error: 'Failed to run intake',
      });
    }
  });

  app.get('/api/tc/intake/runs', requireAuth, async (req, res) => {
    try {
      const result = await deps.pool.query(
        `SELECT id, transaction_id, email_message_id, skyslope_file_id, status, run_log, created_at, updated_at
         FROM intake_runs
         ORDER BY created_at DESC
         LIMIT 20`
      );

      return res.status(200).json({
        runs: result.rows,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'tc intake runs fetch failed');
      return res.status(500).json({
        error: 'Failed to fetch intake runs',
      });
    }
  });
}

export default registerTcIntakeRoutes;