/**
 * SYNOPSIS: HTTP route module — Tc Intake Routes.
 */
import tcIntakeRunner from '../services/tc-intake-runner.js';

function getDb(deps) {
  return deps?.pool || deps?.db;
}

function registerTcIntakeRoutes(app, deps) {
  const db = getDb(deps);
  const requireAuth = deps?.requireAuth || ((req, res, next) => next());

  app.post('/api/tc/intake/run', requireAuth, async (req, res) => {
    try {
      const { transactionId, emailMessageId } = req.body || {};

      if (!transactionId || !emailMessageId) {
        return res.status(400).json({
          error: 'transactionId and emailMessageId are required',
        });
      }

      if (!db) {
        return res.status(500).json({ error: 'Database dependency unavailable' });
      }

      const runResult = await tcIntakeRunner.runIntake(deps, {
        transactionId,
        emailMessageId,
      });

      const intakeRunId =
        runResult?.intakeRunId ||
        runResult?.id ||
        runResult?.runId ||
        null;
      const status = runResult?.status || 'unknown';

      return res.status(200).json({
        intakeRunId,
        status,
      });
    } catch (error) {
      deps?.logger?.error?.(
        { err: error, transactionId: req.body?.transactionId, emailMessageId: req.body?.emailMessageId },
        'tc intake run failed',
      );
      return res.status(500).json({
        error: 'Failed to run tc intake',
      });
    }
  });

  app.get('/api/tc/intake/runs', requireAuth, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'Database dependency unavailable' });
      }

      const result = await db.query(
        `
          SELECT id, transaction_id, email_message_id, skyslope_file_id, status, run_log, created_at, updated_at
          FROM intake_runs
          ORDER BY created_at DESC
          LIMIT 20
        `,
      );

      return res.status(200).json({
        runs: result.rows || [],
      });
    } catch (error) {
      deps?.logger?.error?.({ err: error }, 'failed to list tc intake runs');
      return res.status(500).json({
        error: 'Failed to load intake runs',
      });
    }
  });
}

export { registerTcIntakeRoutes };
export default registerTcIntakeRoutes;