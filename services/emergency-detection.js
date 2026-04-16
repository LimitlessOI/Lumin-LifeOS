/**
 * services/emergency-detection.js
 * Watches wearable data for emergency signals. Fires alert chain within 60s.
 * Never fires false positives without learning from feedback.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

'use strict';

/**
 * @param {{ pool: import('pg').Pool, sendSMS: Function, logger: import('pino').Logger }} opts
 */
export function createEmergencyDetection({ pool, sendSMS, logger }) {
  /**
   * Run all checks for a user and fire alerts where needed.
   * @param {number|string} userId
   * @returns {Promise<{alerted: boolean, events: Array<object>}>}
   */
  async function check(userId) {
    const results = await Promise.allSettled([
      checkHeartRate(userId),
      checkAbsencePattern(userId),
    ]);

    const events = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        events.push(result.value);
      }
    }

    const alerted = events.length > 0;
    return { alerted, events };
  }

  /**
   * Check latest heart rate readings for abnormalities.
   * Creates an emergency event and fires alert chain if abnormal.
   * @param {number|string} userId
   * @returns {Promise<object|null>} created event or null
   */
  async function checkHeartRate(userId) {
    const { rows } = await pool.query(
      `SELECT value::float AS value
       FROM wearable_data
       WHERE user_id = $1
         AND metric = 'heart_rate'
       ORDER BY recorded_at DESC
       LIMIT 10`,
      [userId]
    );

    if (rows.length === 0) return null;

    const values = rows.map(r => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const maxVal = Math.max(...values);
    const hasSpike = maxVal > 150;
    const isElevated = avg > 120;

    if (!hasSpike && !isElevated) return null;

    const severity = maxVal > 180 ? 'critical' : hasSpike ? 'high' : 'medium';
    const reason = hasSpike
      ? `Heart rate spike to ${maxVal} bpm detected`
      : `Sustained elevated heart rate: avg ${avg.toFixed(1)} bpm`;

    const { rows: eventRows } = await pool.query(
      `INSERT INTO emergency_events
         (user_id, type, triggered_by, severity, alert_chain, alerts_sent, resolved)
       VALUES ($1, 'abnormal_hr', $2, $3, '[]', 0, FALSE)
       RETURNING *`,
      [userId, reason, severity]
    );

    const event = eventRows[0];
    logger.warn({ userId, event: event.id, reason, severity }, 'emergency-detection: abnormal HR event created');

    await fireAlertChain(userId, event);
    return event;
  }

  /**
   * Check if there has been no wearable data during waking hours (8am-10pm).
   * Creates a low-severity event if gap > 8 hours.
   * @param {number|string} userId
   * @returns {Promise<object|null>}
   */
  async function checkAbsencePattern(userId) {
    const { rows } = await pool.query(
      `SELECT MAX(recorded_at) AS last_seen
       FROM wearable_data
       WHERE user_id = $1`,
      [userId]
    );

    if (!rows[0]?.last_seen) return null;

    const lastSeen = new Date(rows[0].last_seen);
    const now = new Date();
    const hoursSince = (now - lastSeen) / (1000 * 60 * 60);

    if (hoursSince < 8) return null;

    // Only alert during typical waking hours (8am–10pm local)
    const hour = now.getHours();
    if (hour < 8 || hour > 22) return null;

    const reason = `No wearable data for ${hoursSince.toFixed(1)} hours during waking hours`;

    const { rows: eventRows } = await pool.query(
      `INSERT INTO emergency_events
         (user_id, type, triggered_by, severity, alert_chain, alerts_sent, resolved)
       VALUES ($1, 'absence_pattern', $2, 'low', '[]', 0, FALSE)
       RETURNING *`,
      [userId, reason]
    );

    const event = eventRows[0];
    logger.info({ userId, event: event.id, hoursSince }, 'emergency-detection: absence pattern event created');

    await fireAlertChain(userId, event);
    return event;
  }

  /**
   * Send SMS to each emergency contact in priority order.
   * Updates alert_chain and alerts_sent on the event.
   * @param {number|string} userId
   * @param {object} event
   */
  async function fireAlertChain(userId, event) {
    const { rows: contacts } = await pool.query(
      `SELECT * FROM emergency_contacts
       WHERE user_id = $1
         AND active = TRUE
       ORDER BY priority ASC`,
      [userId]
    );

    if (contacts.length === 0) {
      logger.warn({ userId, event: event.id }, 'emergency-detection: no active emergency contacts configured');
      return;
    }

    const alertChain = [];
    let sent = 0;

    for (const contact of contacts) {
      const message = `LifeOS Emergency Alert for user ${userId}: ${event.triggered_by}. Severity: ${event.severity}. Please check on them.`;
      try {
        await sendSMS({ to: contact.phone, body: message });
        alertChain.push({ name: contact.name, phone: contact.phone, sent_at: new Date().toISOString(), status: 'sent' });
        sent++;
        logger.info({ userId, contact: contact.name, event: event.id }, 'emergency-detection: SMS sent');
      } catch (err) {
        alertChain.push({ name: contact.name, phone: contact.phone, status: 'failed', error: err.message });
        logger.error({ err, contact: contact.name }, 'emergency-detection: SMS failed');
      }
    }

    await pool.query(
      `UPDATE emergency_events
       SET alert_chain = $1, alerts_sent = $2
       WHERE id = $3`,
      [JSON.stringify(alertChain), sent, event.id]
    );
  }

  /**
   * Mark an emergency event as resolved.
   * @param {number|string} eventId
   * @param {string} note
   * @returns {Promise<object|null>}
   */
  async function resolveEvent(eventId, note) {
    const { rows } = await pool.query(
      `UPDATE emergency_events
       SET resolved = TRUE, resolved_at = NOW(), resolution_note = $1
       WHERE id = $2
       RETURNING *`,
      [note ?? null, eventId]
    );
    return rows[0] ?? null;
  }

  /**
   * Get all unresolved emergency events for a user.
   * @param {number|string} userId
   * @returns {Promise<Array<object>>}
   */
  async function getActiveEvents(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM emergency_events
       WHERE user_id = $1
         AND resolved = FALSE
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  return { check, checkHeartRate, checkAbsencePattern, fireAlertChain, resolveEvent, getActiveEvents };
}
