/**
 * SYNOPSIS: LifeRE Outreach bridge — Am 08 outreach-engine integration.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createOutreachEngine } from './outreach-engine.js';

export function createLifeREOutreachBridge({ pool = null, notificationService = null, sendSMS = null, logger = console } = {}) {
  const engine = pool ? createOutreachEngine({ pool, notificationService, sendSMS, logger }) : null;

  async function enqueueSequence({ userId, sequenceId, recipientRef, draft, channel = 'email', recipientEmail, recipientPhone, recipientName, approved = false }) {
    if (!engine) {
      return {
        ok: true,
        queued: true,
        sequence_id: sequenceId,
        recipient_ref: recipientRef,
        draft,
        requires_approval: true,
        autonomy_level: 2,
        persisted: false,
        label: 'THINK',
      };
    }

    const task = await engine.createTask({
      userId,
      channel,
      recipientName: recipientName || recipientRef,
      recipientEmail,
      recipientPhone,
      subject: `LifeRE sequence ${sequenceId}`,
      body: draft,
      source: 'lifere_outreach',
      sourceRef: sequenceId,
      approved,
    });

    return {
      ok: true,
      queued: true,
      task_id: task.id,
      sequence_id: sequenceId,
      requires_approval: !approved,
      autonomy_level: approved ? 3 : 2,
      label: 'KNOW',
    };
  }

  async function listPendingTasks({ userId }) {
    if (!pool) return { ok: true, tasks: [] };
    const { rows } = await pool.query(
      `SELECT id, channel, recipient_name, status, body, approved, created_at
       FROM lifeos_outreach_tasks WHERE user_id = $1 AND status IN ('pending','awaiting_response')
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return { ok: true, tasks: rows };
  }

  async function approveTask({ taskId, userId }) {
    if (!pool) return { ok: false, error: 'no_pool' };
    const { rows } = await pool.query(
      `UPDATE lifeos_outreach_tasks SET approved = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [taskId, userId]
    );
    if (!rows[0]) return { ok: false, error: 'task_not_found' };
    return { ok: true, task: rows[0], label: 'KNOW' };
  }

  async function executeTaskById({ taskId, userId }) {
    if (!engine) return { ok: false, error: 'no_engine' };
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_outreach_tasks WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [taskId, userId]
    );
    if (!rows[0]) return { ok: false, error: 'task_not_found' };
    const result = await engine.executeTask(rows[0]);
    return { ok: result.ok, result, task_id: taskId, label: result.ok ? 'KNOW' : 'THINK' };
  }

  async function processQueue({ userId }) {
    if (!engine) return { ok: true, executed: 0, label: 'THINK' };
    const summary = await engine.processQueue();
    return { ok: true, ...summary, user_id: userId, label: 'KNOW' };
  }

  return { enqueueSequence, listPendingTasks, approveTask, executeTaskById, processQueue };
}
