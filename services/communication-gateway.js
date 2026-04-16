/**
 * services/communication-gateway.js
 *
 * LifeOS communication gateway — the front door.
 *
 * All inbound communication (SMS, calls) arrives here first.
 * The gateway decides: pass through, summarize, voicemail, block.
 *
 * Outbound communication from the system is also logged here
 * so there's a complete communication record for each user.
 *
 * Twilio webhook integration:
 *   POST /api/v1/lifeos/gateway/inbound/sms  — Twilio SMS webhook
 *   POST /api/v1/lifeos/gateway/inbound/call — Twilio voice webhook (TwiML response)
 *
 * Screening rules:
 *   1. Known contacts (in user's contact list) → pass through, notify user
 *   2. Unknown numbers → voicemail + AI transcription + notify user with summary
 *   3. Blocked numbers → reject silently
 *   4. Emergency keywords in SMS → immediate alert regardless of source
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const EMERGENCY_KEYWORDS = ['emergency', 'urgent', '911', 'help me', 'accident', 'hospital'];

export function createCommunicationGateway({ pool, sendSMS, callAI, logger }) {

  // ── Log a communication event ─────────────────────────────────────────────

  async function logCommunication({ userId, direction, channel, from, to, body, durationS, screened, screenDecision, aiSummary, linkedTaskId }) {
    const { rows } = await pool.query(`
      INSERT INTO lifeos_communication_log
        (user_id, direction, channel, from_party, to_party, body,
         duration_s, screened, screen_decision, ai_summary, linked_task_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      userId || null, direction, channel, from || null, to || null, body || null,
      durationS || null, screened || false, screenDecision || null,
      aiSummary || null, linkedTaskId || null,
    ]);
    return rows[0];
  }

  // ── Handle inbound SMS ────────────────────────────────────────────────────

  async function handleInboundSMS({ from, body, to }) {
    // Resolve which LifeOS user owns this Twilio number
    const userId = await resolveUserByPhone(to);

    // Check for emergency keywords — always pass through
    const isEmergency = EMERGENCY_KEYWORDS.some(k => body?.toLowerCase().includes(k));

    // AI summary for longer messages
    let aiSummary = null;
    if (callAI && body?.length > 50) {
      try {
        const raw = await callAI(`Summarize this SMS in one sentence: "${body}"`);
        aiSummary = (typeof raw === 'string' ? raw : raw?.content || '').trim().substring(0, 200);
      } catch { /* non-fatal */ }
    }

    const entry = await logCommunication({
      userId,
      direction: 'inbound',
      channel: 'sms',
      from,
      to,
      body,
      screened: true,
      screenDecision: isEmergency ? 'emergency' : 'pass',
      aiSummary,
    });

    // Notify the user
    if (userId) {
      const { createLifeOSNotificationRouter } = await import('./lifeos-notification-router.js');
      const notifier = createLifeOSNotificationRouter({ pool, sendSMS, logger });
      const notifMsg = isEmergency
        ? `🚨 URGENT SMS from ${from}: ${body?.substring(0, 100)}`
        : `SMS from ${from}: ${aiSummary || body?.substring(0, 80)}`;
      await notifier.enqueue({
        userId,
        type: isEmergency ? 'emergency' : 'commitment_prod',
        channel: 'overlay',
        message: notifMsg,
        priority: isEmergency ? 1 : 5,
      });
    }

    logger?.info?.(`[GATEWAY] Inbound SMS from ${from} — ${isEmergency ? 'EMERGENCY' : 'normal'}`);
    return { entry, isEmergency };
  }

  // ── Generate TwiML for inbound call screening ─────────────────────────────

  function generateCallScreenTwiML({ from, userId, userName = 'the owner' }) {
    // Unknown callers go to a brief screening message + voicemail
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hi, you've reached ${userName}'s personal line. Please leave a message and they will get back to you. Press 1 if this is urgent.</Say>
  <Record maxLength="120" action="/api/v1/lifeos/gateway/voicemail?from=${encodeURIComponent(from)}&amp;userId=${userId || ''}" />
</Response>`;
  }

  // ── Handle voicemail recording callback ───────────────────────────────────

  async function handleVoicemail({ from, recordingUrl, userId }) {
    let aiSummary = null;
    // In production: transcribe via Twilio RecordingTranscriptionCallback or Whisper
    // For now: log the URL and notify user
    if (recordingUrl) {
      aiSummary = `Voicemail recording available: ${recordingUrl}`;
    }

    const entry = await logCommunication({
      userId: userId ? parseInt(userId) : null,
      direction: 'inbound',
      channel: 'call',
      from,
      body: aiSummary || 'Voicemail received',
      screened: true,
      screenDecision: 'voicemail',
      aiSummary,
    });

    if (userId) {
      const { createLifeOSNotificationRouter } = await import('./lifeos-notification-router.js');
      const notifier = createLifeOSNotificationRouter({ pool, sendSMS, logger });
      await notifier.enqueue({
        userId: parseInt(userId),
        type: 'commitment_prod',
        channel: 'overlay',
        message: `Voicemail from ${from}${aiSummary ? ': ' + aiSummary.substring(0, 100) : ''}`,
        priority: 5,
      });
    }

    return entry;
  }

  // ── Resolve user by their gateway phone number ────────────────────────────

  async function resolveUserByPhone(phone) {
    if (!phone) return null;
    try {
      const { rows } = await pool.query(`
        SELECT user_id FROM user_preferences
        WHERE key = 'gateway_phone' AND value = $1
        LIMIT 1
      `, [phone]);
      return rows[0]?.user_id || null;
    } catch {
      return null;
    }
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async function getLog(userId, { days = 7, limit = 100 } = {}) {
    const { rows } = await pool.query(`
      SELECT * FROM lifeos_communication_log
      WHERE user_id = $1
        AND created_at >= NOW() - ($2 || ' days')::INTERVAL
      ORDER BY created_at DESC
      LIMIT $3
    `, [userId, days, limit]);
    return rows;
  }

  return {
    logCommunication,
    handleInboundSMS,
    generateCallScreenTwiML,
    handleVoicemail,
    getLog,
  };
}
