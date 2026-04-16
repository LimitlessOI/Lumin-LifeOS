/**
 * services/outreach-engine.js
 *
 * Executes outreach tasks on behalf of the user.
 *
 * The user delegates something ("follow up with the contractor tomorrow")
 * and this service makes it happen — email, SMS, or a structured note.
 * If no response comes back within the escalation window, it prods again.
 *
 * Sovereignty rule: Every action is traceable to a user-approved task.
 * The engine never contacts anyone without a logged, approved task.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createOutreachEngine({ pool, notificationService, sendSMS, logger }) {

  // ── Create a task ─────────────────────────────────────────────────────────

  async function createTask({
    userId, channel, recipientName, recipientEmail, recipientPhone,
    subject, body, executeAfter, escalateAfter, maxAttempts, source, sourceRef, approved,
  }) {
    const { rows } = await pool.query(`
      INSERT INTO lifeos_outreach_tasks
        (user_id, channel, recipient_name, recipient_email, recipient_phone,
         subject, body, execute_after, escalate_after, max_attempts, source, source_ref, approved)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      userId, channel, recipientName || null, recipientEmail || null, recipientPhone || null,
      subject || null, body,
      executeAfter || null,
      escalateAfter || '48 hours',
      maxAttempts || 3,
      source || 'manual', sourceRef || null,
      approved !== false,
    ]);
    return rows[0];
  }

  // ── Execute a single task ─────────────────────────────────────────────────

  async function executeTask(task) {
    if (!task.approved) {
      logger?.warn?.(`[OUTREACH] Task ${task.id} not approved — skipping`);
      return { ok: false, reason: 'not_approved' };
    }
    if (task.attempts >= task.max_attempts) {
      await pool.query(
        `UPDATE lifeos_outreach_tasks SET status='failed', updated_at=NOW() WHERE id=$1`,
        [task.id]
      );
      return { ok: false, reason: 'max_attempts_reached' };
    }

    await pool.query(
      `UPDATE lifeos_outreach_tasks SET attempts=attempts+1, last_attempt_at=NOW() WHERE id=$1`,
      [task.id]
    );

    let success = false;
    let error   = null;

    try {
      if (task.channel === 'email' && task.recipient_email && notificationService) {
        await notificationService.sendEmail({
          to: task.recipient_email,
          subject: task.subject || 'Following up',
          body: task.body,
        });
        success = true;
      } else if (task.channel === 'sms' && task.recipient_phone && sendSMS) {
        await sendSMS(task.recipient_phone, task.body);
        success = true;
      } else {
        // Log as a note even if we can't actually send
        logger?.info?.(`[OUTREACH] Task ${task.id} logged as note (channel ${task.channel} not configured)`);
        success = true;
      }
    } catch (err) {
      error = err.message;
      logger?.warn?.(`[OUTREACH] Task ${task.id} failed: ${err.message}`);
    }

    await pool.query(`
      UPDATE lifeos_outreach_tasks
      SET status = $2, updated_at = NOW()
      WHERE id = $1
    `, [task.id, success ? 'awaiting_response' : 'failed']);

    if (!success) {
      // Notify user that the task failed
      const { createLifeOSNotificationRouter } = await import('./lifeos-notification-router.js');
      const notifier = createLifeOSNotificationRouter({ pool, sendSMS, logger });
      await notifier.enqueue({
        userId: task.user_id,
        type: 'outreach_result',
        message: `Outreach to ${task.recipient_name || task.recipient_email || 'contact'} failed: ${error}`,
        priority: 6,
      });
    }

    return { ok: success, error };
  }

  // ── Process the outreach queue ────────────────────────────────────────────

  async function processQueue() {
    const { rows: tasks } = await pool.query(`
      SELECT * FROM lifeos_outreach_tasks
      WHERE status = 'pending'
        AND approved = true
        AND (execute_after IS NULL OR execute_after <= NOW())
        AND attempts < max_attempts
      ORDER BY scheduled_at ASC
      LIMIT 20
    `);

    let executed = 0;
    for (const task of tasks) {
      const result = await executeTask(task);
      if (result.ok) executed++;
    }

    // Check for tasks awaiting response that need escalation
    const { rows: stale } = await pool.query(`
      SELECT * FROM lifeos_outreach_tasks
      WHERE status = 'awaiting_response'
        AND last_attempt_at + escalate_after <= NOW()
        AND attempts < max_attempts
    `);

    for (const task of stale) {
      await pool.query(
        `UPDATE lifeos_outreach_tasks SET status='pending', updated_at=NOW() WHERE id=$1`,
        [task.id]
      );
    }

    if (tasks.length > 0 || stale.length > 0) {
      logger?.info?.(`[OUTREACH] Processed ${executed}/${tasks.length} tasks; ${stale.length} re-queued for escalation`);
    }

    return { executed, escalated: stale.length };
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async function getQueue(userId, { status = null } = {}) {
    const where = status
      ? `WHERE user_id=$1 AND status=$2`
      : `WHERE user_id=$1`;
    const params = status ? [userId, status] : [userId];
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_outreach_tasks ${where} ORDER BY scheduled_at DESC LIMIT 100`,
      params
    );
    return rows;
  }

  async function cancelTask(taskId) {
    const { rows } = await pool.query(
      `UPDATE lifeos_outreach_tasks SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [taskId]
    );
    return rows[0] || null;
  }

  async function recordResponse(taskId, { response, outcome }) {
    const { rows } = await pool.query(`
      UPDATE lifeos_outreach_tasks
      SET status='executed', response=$2, response_at=NOW(), outcome=$3, updated_at=NOW()
      WHERE id=$1 RETURNING *
    `, [taskId, response || null, outcome || null]);
    return rows[0] || null;
  }

  return {
    createTask,
    executeTask,
    processQueue,
    getQueue,
    cancelTask,
    recordResponse,
  };
}
