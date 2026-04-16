/**
 * services/lifeos-notification-router.js
 *
 * Routes LifeOS notifications to the right channel for each user.
 *
 * Channel priority:
 *   - 'overlay'  — queued in DB, rendered in lifeos-mirror.html on next load
 *   - 'sms'      — sent via Twilio if user has phone on file (requires TWILIO_* env)
 *   - 'push'     — reserved for future iOS app
 *
 * For commitment prods: try overlay first. If user hasn't opened mirror in >4h, escalate to SMS.
 * For emergencies: SMS immediately, overlay as backup.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createLifeOSNotificationRouter({ pool, sendSMS, logger }) {

  async function enqueue({ userId, type, channel = 'overlay', subjectId, subjectType, message, priority = 5, scheduledAt }) {
    const { rows } = await pool.query(`
      INSERT INTO lifeos_notification_queue
        (user_id, type, channel, subject_id, subject_type, message, priority, scheduled_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [userId, type, channel, subjectId || null, subjectType || null, message, priority, scheduledAt || new Date()]);
    return rows[0];
  }

  async function deliver(notifId) {
    const { rows } = await pool.query(
      'SELECT n.*, u.display_name FROM lifeos_notification_queue n JOIN lifeos_users u ON u.id=n.user_id WHERE n.id=$1',
      [notifId]
    );
    const notif = rows[0];
    if (!notif || notif.status !== 'pending') return;

    try {
      if (notif.channel === 'sms' && sendSMS) {
        // Get user phone from their profile or linked contacts
        const { rows: phoneRows } = await pool.query(
          `SELECT value FROM user_preferences WHERE user_id=$1 AND key='phone' LIMIT 1`,
          [notif.user_id]
        ).catch(() => ({ rows: [] }));
        const phone = phoneRows[0]?.value;
        if (phone) {
          await sendSMS(phone, notif.message);
        }
      }
      // Overlay is always available — the frontend polls on load
      await pool.query(
        `UPDATE lifeos_notification_queue SET status='delivered', delivered_at=NOW() WHERE id=$1`,
        [notifId]
      );
    } catch (err) {
      await pool.query(
        `UPDATE lifeos_notification_queue SET status='failed', failed_reason=$2 WHERE id=$1`,
        [notifId, err.message]
      );
      logger?.warn?.(`[LIFEOS-NOTIF] Delivery failed for ${notifId}: ${err.message}`);
    }
  }

  async function getPendingForUser(userId) {
    const { rows } = await pool.query(`
      SELECT * FROM lifeos_notification_queue
      WHERE user_id=$1 AND status='pending' AND scheduled_at <= NOW()
      ORDER BY priority ASC, scheduled_at ASC
      LIMIT 20
    `, [userId]);
    return rows;
  }

  async function acknowledge(notifId) {
    await pool.query(
      `UPDATE lifeos_notification_queue SET status='acknowledged', acknowledged_at=NOW() WHERE id=$1`,
      [notifId]
    );
  }

  // Prod a commitment — enqueue overlay + SMS escalation if user is away
  async function prodCommitment({ userId, commitmentId, commitmentTitle, lastSeenMirrorAt }) {
    const message = `Reminder: "${commitmentTitle}" — mark it done or snooze.`;
    const hoursSinceLastSeen = lastSeenMirrorAt
      ? (Date.now() - new Date(lastSeenMirrorAt).getTime()) / (1000 * 60 * 60)
      : 99;

    await enqueue({ userId, type: 'commitment_prod', channel: 'overlay', subjectId: commitmentId, subjectType: 'commitment', message, priority: 5 });

    if (hoursSinceLastSeen > 4 && sendSMS) {
      await enqueue({ userId, type: 'commitment_prod', channel: 'sms', subjectId: commitmentId, subjectType: 'commitment', message, priority: 4 });
    }
  }

  // Emergency alert — SMS first, no delay
  async function emergencyAlert({ userId, message, alertChain = [] }) {
    await enqueue({ userId, type: 'emergency', channel: 'overlay', message, priority: 1 });
    if (sendSMS && alertChain.length > 0) {
      for (const phone of alertChain) {
        try { await sendSMS(phone, `[LifeOS Emergency] ${message}`); } catch { /* non-fatal */ }
      }
    }
  }

  return {
    enqueue,
    deliver,
    getPendingForUser,
    acknowledge,
    prodCommitment,
    emergencyAlert,
  };
}
