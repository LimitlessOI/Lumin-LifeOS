/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-communication-callback-service.js
 * Normalizes delivery/reply callbacks into canonical TC communication state.
 */

function normalizeProviderEvent(provider, payload = {}) {
  const p = String(provider || 'manual').toLowerCase();
  const event = String(
    payload.event_type || payload.eventType || payload.status || payload.MessageStatus || payload.SmsStatus || payload.EmailEvent || 'delivered'
  ).toLowerCase();

  let status = 'sent';
  if (['queued', 'accepted', 'scheduled', 'sending'].includes(event)) status = 'prepared';
  else if (['sent', 'delivered', 'success'].includes(event)) status = 'sent';
  else if (['opened', 'read', 'seen'].includes(event)) status = 'delivered';
  else if (['replied', 'reply', 'inbound_reply', 'response_received'].includes(event)) status = 'replied';
  else if (['failed', 'undelivered', 'bounced', 'error'].includes(event)) status = 'failed';

  return {
    provider: p,
    event_type: event,
    status,
    external_id: payload.external_id || payload.externalId || payload.MessageSid || payload.Sid || null,
    feedback_text: payload.feedback_text || payload.feedbackText || payload.Body || payload.body || null,
    from: payload.from || payload.From || null,
    to: payload.to || payload.To || null,
    raw: payload,
  };
}

export function createTCCommunicationCallbackService({ pool, portalService, reportService, coordinator, logger = console }) {
  async function getCommunication(communicationId) {
    const { rows } = await pool.query(`SELECT * FROM tc_communications WHERE id=$1`, [communicationId]);
    return rows[0] || null;
  }

  async function handleCallback(communicationId, payload = {}) {
    const communication = await getCommunication(communicationId);
    if (!communication) return { ok: false, error: 'Communication not found' };

    const normalized = normalizeProviderEvent(payload.provider, payload);
    const metadata = {
      ...(communication.metadata || {}),
      last_callback: {
        provider: normalized.provider,
        event_type: normalized.event_type,
        external_id: normalized.external_id,
        at: new Date().toISOString(),
      },
      callback_history: [
        ...((communication.metadata || {}).callback_history || []),
        {
          provider: normalized.provider,
          event_type: normalized.event_type,
          status: normalized.status,
          external_id: normalized.external_id,
          feedback_text: normalized.feedback_text,
          at: new Date().toISOString(),
        },
      ].slice(-20),
    };

    const updated = await portalService.updateCommunication(communicationId, {
      status: normalized.status,
      sent_at: communication.sent_at || (normalized.status === 'sent' ? new Date().toISOString() : communication.sent_at),
      metadata,
    });

    await coordinator.logEvent(communication.transaction_id, 'communication_callback', {
      communication_id: communicationId,
      provider: normalized.provider,
      event_type: normalized.event_type,
      status: normalized.status,
      external_id: normalized.external_id,
    });

    let feedback = null;
    if (normalized.feedback_text && communication.metadata?.showing_id) {
      const feedbackText = String(normalized.feedback_text).trim();
      if (feedbackText && feedbackText.length > 3) {
        try {
          feedback = await reportService.recordShowingFeedback(communication.metadata.showing_id, {
            raw_feedback: feedbackText,
            source: `${normalized.provider}_callback`,
          });
          await coordinator.logEvent(communication.transaction_id, 'showing_feedback_received', {
            communication_id: communicationId,
            showing_id: communication.metadata.showing_id,
            source: `${normalized.provider}_callback`,
          });
        } catch (error) {
          logger.warn?.({ err: error.message, communicationId }, '[TC-COMM-CALLBACK] feedback persistence failed');
        }
      }
    }

    return {
      ok: true,
      communication: updated,
      callback: normalized,
      feedback,
    };
  }

  return {
    handleCallback,
  };
}

export default createTCCommunicationCallbackService;
