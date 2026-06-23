/**
 * SYNOPSIS: LifeRE Outreach bridge — Am 08 outreach-engine integration.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createOutreachEngine } from './outreach-engine.js';
import { resolveLifeOSUserId } from './lifere-outreach-user-resolve.js';

export function createLifeREOutreachBridge({ pool = null, notificationService = null, sendSMS = null, logger = console } = {}) {
  const engine = pool ? createOutreachEngine({ pool, notificationService, sendSMS, logger }) : null;

  async function resolveUser(userKey) {
    const id = await resolveLifeOSUserId(pool, userKey);
    return id ?? userKey;
  }

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

    try {
      const resolvedUserId = await resolveUser(userId);
      const task = await engine.createTask({
        userId: resolvedUserId,
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
    } catch (err) {
      logger.warn?.(`[LIFERE-OUTREACH] enqueue failed: ${err.message}`);
      return { ok: false, error: err.message, label: 'THINK' };
    }
  }

  async function listPendingTasks({ userId }) {
    if (!pool) return { ok: true, tasks: [] };
    try {
      const resolvedUserId = await resolveUser(userId);
      const { rows } = await pool.query(
        `SELECT id, channel, recipient_name, status, body, approved, created_at
         FROM lifeos_outreach_tasks WHERE user_id = $1 AND status IN ('pending','awaiting_response')
         ORDER BY created_at DESC LIMIT 50`,
        [resolvedUserId],
      );
      return { ok: true, tasks: rows, user_resolved: resolvedUserId };
    } catch (err) {
      logger.warn?.(`[LIFERE-OUTREACH] listPendingTasks: ${err.message}`);
      return { ok: true, tasks: [], error: err.message, label: 'THINK' };
    }
  }

  async function approveTask({ taskId, userId }) {
    if (!pool) return { ok: false, error: 'no_pool' };
    try {
      const resolvedUserId = await resolveUser(userId);
      const { rows } = await pool.query(
        `UPDATE lifeos_outreach_tasks SET approved = true, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [taskId, resolvedUserId],
      );
      if (!rows[0]) return { ok: false, error: 'task_not_found' };
      return { ok: true, task: rows[0], label: 'KNOW' };
    } catch (err) {
      return { ok: false, error: err.message, label: 'THINK' };
    }
  }

  async function executeTaskById({ taskId, userId }) {
    if (!engine) return { ok: false, error: 'no_engine' };
    try {
      const resolvedUserId = await resolveUser(userId);
      const { rows } = await pool.query(
        `SELECT * FROM lifeos_outreach_tasks WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [taskId, resolvedUserId],
      );
      if (!rows[0]) return { ok: false, error: 'task_not_found' };
      const result = await engine.executeTask(rows[0]);
      return { ok: result.ok, result, task_id: taskId, label: result.ok ? 'KNOW' : 'THINK' };
    } catch (err) {
      return { ok: false, error: err.message, label: 'THINK' };
    }
  }

  async function processQueue({ userId }) {
    if (!engine) return { ok: true, executed: 0, label: 'THINK' };
    try {
      const summary = await engine.processQueue();
      return { ok: true, ...summary, user_id: userId, label: 'KNOW' };
    } catch (err) {
      return { ok: false, error: err.message, executed: 0, label: 'THINK' };
    }
  }

  return { enqueueSequence, listPendingTasks, approveTask, executeTaskById, processQueue };
}
