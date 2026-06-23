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

  return { enqueueSequence, listPendingTasks };
}
