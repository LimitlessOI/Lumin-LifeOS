/**
 * services/lifeos-notification-router.js
 *
 * Routes LifeOS notifications to the right channel for each user and supports
 * a simple escalation ladder: overlay -> sms -> alarm -> call.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const DEFAULT_POLICY = Object.freeze({
  overlay_delay_min: 0,
  sms_enabled: true,
  sms_delay_min: 5,
  alarm_enabled: true,
  alarm_delay_min: 15,
  call_enabled: true,
  call_delay_min: 30,
});

function addMinutes(base, minutes) {
  return new Date(base.getTime() + Math.max(0, Number(minutes) || 0) * 60 * 1000);
}

function normalizePolicy(input = {}) {
  const raw = { ...DEFAULT_POLICY, ...(input || {}) };
  return {
    overlay_delay_min: Math.max(0, parseInt(raw.overlay_delay_min, 10) || 0),
    sms_enabled: raw.sms_enabled !== false,
    sms_delay_min: Math.max(0, parseInt(raw.sms_delay_min, 10) || 0),
    alarm_enabled: raw.alarm_enabled !== false,
    alarm_delay_min: Math.max(0, parseInt(raw.alarm_delay_min, 10) || 0),
    call_enabled: raw.call_enabled !== false,
    call_delay_min: Math.max(0, parseInt(raw.call_delay_min, 10) || 0),
  };
}

function buildEscalationGroup(userId, type) {
  return `lifeos:${userId}:${type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function createLifeOSNotificationRouter({ pool, sendSMS, sendAlertCall = null, makePhoneCall = null, logger }) {
  async function getUserPhone(userId) {
    const { rows } = await pool.query(
      `SELECT value
         FROM user_preferences
        WHERE user_id = $1
          AND key IN ('phone', 'gateway_phone')
        ORDER BY CASE WHEN key = 'phone' THEN 0 ELSE 1 END, updated_at DESC NULLS LAST, id DESC
        LIMIT 1`,
      [userId],
    ).catch(() => ({ rows: [] }));
    return rows[0]?.value || null;
  }

  async function enqueue({ userId, type, channel = 'overlay', subjectId, subjectType, message, priority = 5, scheduledAt, escalationGroup = null, metadata = {} }) {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_notification_queue
        (user_id, type, channel, subject_id, subject_type, message, priority, scheduled_at, escalation_group, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      RETURNING *`,
      [userId, type, channel, subjectId || null, subjectType || null, message, priority, scheduledAt || new Date(), escalationGroup, JSON.stringify(metadata || {})],
    );
    return rows[0];
  }

  async function getEscalationPolicy(userId) {
    const { rows } = await pool.query(
      `SELECT value
         FROM user_preferences
        WHERE user_id = $1 AND key = 'notification_escalation_policy'
        LIMIT 1`,
      [userId],
    ).catch(() => ({ rows: [] }));
    return normalizePolicy(rows[0]?.value ? JSON.parse(rows[0].value) : {});
  }

  async function setEscalationPolicy(userId, policy) {
    const normalized = normalizePolicy(policy);
    await pool.query(
      `INSERT INTO user_preferences (user_id, key, value, updated_at)
       VALUES ($1, 'notification_escalation_policy', $2, NOW())
       ON CONFLICT (user_id, key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [userId, JSON.stringify(normalized)],
    );
    return normalized;
  }

  async function queueEscalationChain({ userId, type, subjectId = null, subjectType = null, message, priority = 3, metadata = {} }) {
    const policy = await getEscalationPolicy(userId);
    const now = new Date();
    const escalationGroup = buildEscalationGroup(userId, type);
    const queued = [];

    queued.push(await enqueue({
      userId,
      type,
      channel: 'overlay',
      subjectId,
      subjectType,
      message,
      priority,
      scheduledAt: addMinutes(now, policy.overlay_delay_min),
      escalationGroup,
      metadata: { ...metadata, escalation_step: 'overlay' },
    }));

    if (policy.sms_enabled) {
      queued.push(await enqueue({
        userId,
        type,
        channel: 'sms',
        subjectId,
        subjectType,
        message,
        priority: Math.max(1, priority - 1),
        scheduledAt: addMinutes(now, policy.sms_delay_min),
        escalationGroup,
        metadata: { ...metadata, escalation_step: 'sms' },
      }));
    }

    if (policy.alarm_enabled) {
      queued.push(await enqueue({
        userId,
        type,
        channel: 'alarm',
        subjectId,
        subjectType,
        message,
        priority: Math.max(1, priority - 2),
        scheduledAt: addMinutes(now, policy.alarm_delay_min),
        escalationGroup,
        metadata: { ...metadata, escalation_step: 'alarm' },
      }));
    }

    if (policy.call_enabled) {
      queued.push(await enqueue({
        userId,
        type,
        channel: 'call',
        subjectId,
        subjectType,
        message,
        priority: 1,
        scheduledAt: addMinutes(now, policy.call_delay_min),
        escalationGroup,
        metadata: { ...metadata, escalation_step: 'call' },
      }));
    }

    return { escalation_group: escalationGroup, policy, notifications: queued };
  }

  async function deliver(notifId) {
    const { rows } = await pool.query(
      'SELECT n.*, u.display_name FROM lifeos_notification_queue n JOIN lifeos_users u ON u.id=n.user_id WHERE n.id=$1',
      [notifId],
    );
    const notif = rows[0];
    if (!notif || notif.status !== 'pending') return;

    try {
      if (notif.escalation_group) {
        const { rows: acknowledged } = await pool.query(
          `SELECT 1 FROM lifeos_notification_queue
            WHERE escalation_group = $1 AND acknowledged_at IS NOT NULL
            LIMIT 1`,
          [notif.escalation_group],
        );
        if (acknowledged[0]) {
          await pool.query(
            `UPDATE lifeos_notification_queue
                SET status='skipped', failed_reason='Escalation chain acknowledged elsewhere'
              WHERE id=$1`,
            [notifId],
          );
          return;
        }
      }

      if (notif.channel === 'sms' && sendSMS) {
        const phone = await getUserPhone(notif.user_id);
        if (phone) await sendSMS(phone, notif.message);
      } else if (notif.channel === 'call') {
        const phone = await getUserPhone(notif.user_id);
        if (!phone) throw new Error('No phone configured for call escalation');
        if (makePhoneCall) {
          const result = await makePhoneCall(phone, null, notif.message, 'chatgpt');
          if (!result?.success) throw new Error(result?.error || 'Call escalation failed');
        } else if (sendAlertCall) {
          await sendAlertCall(notif.message);
        } else {
          throw new Error('No call escalation transport configured');
        }
      } else if (notif.channel === 'alarm') {
        // Alarm is a client-side urgent surface. Mark delivered so the UI can ring.
      }

      await pool.query(
        `UPDATE lifeos_notification_queue SET status='delivered', delivered_at=NOW() WHERE id=$1`,
        [notifId],
      );
    } catch (err) {
      await pool.query(
        `UPDATE lifeos_notification_queue SET status='failed', failed_reason=$2 WHERE id=$1`,
        [notifId, err.message],
      );
      logger?.warn?.(`[LIFEOS-NOTIF] Delivery failed for ${notifId}: ${err.message}`);
    }
  }

  async function getPendingForUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_notification_queue
        WHERE user_id=$1
          AND status IN ('pending', 'delivered')
          AND acknowledged_at IS NULL
          AND scheduled_at <= NOW()
        ORDER BY priority ASC, scheduled_at ASC
        LIMIT 50`,
      [userId],
    );
    return rows;
  }

  async function acknowledge(notifId) {
    const { rows } = await pool.query(
      `UPDATE lifeos_notification_queue
          SET status='acknowledged', acknowledged_at=NOW()
        WHERE id=$1
        RETURNING escalation_group`,
      [notifId],
    );
    const group = rows[0]?.escalation_group;
    if (group) {
      await pool.query(
        `UPDATE lifeos_notification_queue
            SET status='skipped', failed_reason='Escalation chain acknowledged'
          WHERE escalation_group=$1 AND id<>$2 AND status IN ('pending', 'delivered')`,
        [group, notifId],
      );
    }
  }

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
    getEscalationPolicy,
    setEscalationPolicy,
    queueEscalationChain,
    prodCommitment,
    emergencyAlert,
  };
}
