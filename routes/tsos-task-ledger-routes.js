/**
 * SYNOPSIS: Exports createTsosTaskLedgerRoutes — routes/tsos-task-ledger-routes.js.
 */
import express from 'express';

export function createTsosTaskLedgerRoutes({ pool }) {
  const router = express.Router();

  router.post('/task-ledger', async (req, res) => {
    try {
      const { task_id, ...fields } = req.body;
      if (!task_id) {
        return res.status(400).json({ ok: false, error: 'task_id is required' });
      }

      const result = await pool.query(
        `
          INSERT INTO builder_task_ledger (
            task_id,
            task_domain,
            target_file,
            model_used,
            tokens_in,
            tokens_out,
            cost_usd,
            files_read_count,
            retry_count,
            committed,
            build_wall_ms,
            drift_events,
            useful_work,
            failure_stage,
            commit_sha,
            runner,
            session_id
          ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17
          )
          RETURNING id
        `,
        [
          task_id,
          fields.task_domain,
          fields.target_file,
          fields.model_used,
          fields.tokens_in,
          fields.tokens_out,
          fields.cost_usd,
          fields.files_read_count,
          fields.retry_count,
          fields.committed,
          fields.build_wall_ms,
          fields.drift_events,
          fields.useful_work,
          fields.failure_stage,
          fields.commit_sha,
          fields.runner,
          fields.session_id
        ]
      );

      return res.json({ ok: true, id: result.rows[0].id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, error: 'Internal Server Error' });
    }
  });

  return router;
}