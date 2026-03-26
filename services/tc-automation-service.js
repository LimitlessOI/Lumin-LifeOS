/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-automation-service.js
 * Prepared-send automation for feedback requests, document requests, and report delivery.
 */

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function normalizeParty(value) {
  if (!value) return null;
  if (typeof value === 'string') return { name: value };
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeParty(item);
      if (normalized?.email || normalized?.phone || normalized?.name) return normalized;
    }
    return null;
  }
  return {
    name: value.name || value.full_name || value.client_name || null,
    email: value.email || value.client_email || null,
    phone: value.phone || value.mobile || value.cell || value.client_phone || null,
  };
}

function extractDefaultClientContact(transaction) {
  const parties = transaction?.parties || {};
  const role = String(transaction?.agent_role || '').toLowerCase();
  if (role === 'listing') {
    return normalizeParty(parties.seller || parties.sellers || parties.client || parties.owner);
  }
  return normalizeParty(parties.buyer || parties.buyers || parties.client);
}

function extractAgentContact(transaction) {
  const parties = transaction?.parties || {};
  const role = String(transaction?.agent_role || '').toLowerCase();
  if (role === 'listing') {
    return normalizeParty(parties.listing_agent || parties.agent);
  }
  return normalizeParty(parties.buyer_agent || parties.agent);
}

function formatDate(value) {
  if (!value) return 'TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function buildFeedbackRequestMessage({ transaction, showing }) {
  const address = transaction?.address || 'the property';
  const showingAt = formatDate(showing?.showing_at);
  const name = showing?.showing_agent_name || 'there';
  return {
    subject: `Feedback request for ${address}`,
    body: [
      `Hi ${name},`,
      '',
      `Thank you for showing ${address} on ${showingAt}.`,
      'Could you please reply with any quick feedback on price, condition, layout, and buyer interest?',
      '',
      'A short response is perfect. Thank you.',
    ].join('\n'),
    sms: `Feedback request for ${address}: how did the showing go? Any price, condition, layout, or buyer-interest notes help. Thank you.`,
  };
}

function buildDocumentRequestMessage({ transaction, request }) {
  const address = transaction?.address || 'your transaction';
  return {
    subject: `Document request for ${address}: ${request.title}`,
    body: [
      `Hello,`,
      '',
      `We still need the following item for ${address}:`,
      `${request.title}${request.description ? ` — ${request.description}` : ''}`,
      request.due_at ? `Due by: ${formatDate(request.due_at)}` : null,
      '',
      'Please upload or send it back when ready.',
    ].filter(Boolean).join('\n'),
    sms: `Document request for ${address}: ${request.title}${request.due_at ? ` due ${formatDate(request.due_at)}` : ''}. Please send when ready.`,
  };
}

function buildWeeklyReportMessage({ transaction, report, payload, audience }) {
  const address = transaction?.address || 'your listing';
  const summary = report?.summary || payload?.summary || 'Weekly listing update is ready.';
  const recommendations = asArray(report?.recommendations || payload?.recommendations || [])
    .map((item) => (typeof item === 'string' ? item : String(item || '')))
    .filter(Boolean)
    .slice(0, 3);

  const body = [
    audience === 'seller' ? 'Hello,' : 'Team,',
    '',
    `Weekly update for ${address}`,
    '',
    summary,
    '',
    recommendations.length ? 'Recommended next steps:' : null,
    ...recommendations.map((item) => `- ${item}`),
  ].filter(Boolean).join('\n');

  return {
    subject: `Weekly update for ${address}`,
    body,
    sms: `Weekly update for ${address}: ${summary}`.slice(0, 320),
  };
}

export function createTCAutomationService({
  pool,
  coordinator,
  portalService,
  reportService,
  logger = console,
  getNotificationService,
  sendSMS = null,
}) {
  async function getCommunicationById(communicationId) {
    const { rows } = await pool.query(
      `SELECT c.*, t.address, t.agent_role, t.parties
       FROM tc_communications c
       JOIN tc_transactions t ON t.id = c.transaction_id
       WHERE c.id = $1`,
      [communicationId]
    );
    return rows[0] || null;
  }

  async function resolveRecipient({ transaction, communication }) {
    const metadata = communication?.metadata || {};
    if (metadata.to) {
      return { to: metadata.to, name: metadata.recipient_name || null };
    }

    if (communication.audience === 'showing_agent') {
      return {
        to: metadata.showing_agent_email || metadata.showing_agent_phone || null,
        name: metadata.showing_agent_name || null,
      };
    }

    const client = extractDefaultClientContact(transaction);
    const agent = extractAgentContact(transaction);

    if (communication.audience === 'agent') {
      return {
        to: communication.channel === 'sms' ? agent?.phone || null : agent?.email || null,
        name: agent?.name || null,
      };
    }

    return {
      to: communication.channel === 'sms' ? client?.phone || null : client?.email || null,
      name: client?.name || null,
    };
  }

  async function sendCommunicationById(communicationId) {
    const communication = await getCommunicationById(communicationId);
    if (!communication) return { ok: false, error: 'Communication not found' };

    const recipient = await resolveRecipient({ transaction: communication, communication });
    if (!recipient.to) {
      await portalService.updateCommunication(communication.id, {
        status: 'failed',
        metadata: { ...(communication.metadata || {}), failure_reason: 'No recipient resolved' },
      });
      return { ok: false, error: 'No recipient resolved' };
    }

    let delivery = { success: false, error: 'Unsupported channel' };
    if (communication.channel === 'email') {
      const notificationService = await getNotificationService();
      if (!notificationService?.sendEmail) {
        delivery = { success: false, error: 'Notification service unavailable' };
      } else {
        delivery = await notificationService.sendEmail({
          to: recipient.to,
          subject: communication.subject || `Update for ${communication.address}`,
          text: communication.body,
          metadata: communication.metadata || {},
        });
      }
    } else if (communication.channel === 'sms') {
      if (!sendSMS) {
        delivery = { success: false, error: 'SMS service unavailable' };
      } else {
        delivery = await sendSMS(recipient.to, communication.body);
      }
    }

    const patch = delivery.success
      ? {
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            ...(communication.metadata || {}),
            recipient: recipient.to,
            external_id: delivery.messageId || delivery.sid || delivery.id || null,
            delivery,
          },
        }
      : {
          status: 'failed',
          metadata: { ...(communication.metadata || {}), recipient: recipient.to, delivery },
        };

    const updated = await portalService.updateCommunication(communication.id, patch);
    if (delivery.success) {
      await coordinator.logEvent(communication.transaction_id, 'communication_sent', {
        communication_id: communication.id,
        channel: communication.channel,
        audience: communication.audience,
        recipient: recipient.to,
      });
    }
    return { ok: !!delivery.success, communication: updated, delivery };
  }

  async function prepareShowingFeedbackRequest(showingId, { channels = ['sms', 'email'], sendNow = false } = {}) {
    const { rows: showingRows } = await pool.query(
      `SELECT s.*, t.address, t.agent_role, t.parties
       FROM tc_showings s
       JOIN tc_transactions t ON t.id = s.transaction_id
       WHERE s.id = $1`,
      [showingId]
    );
    const showing = showingRows[0] || null;
    if (!showing) return { ok: false, error: 'Showing not found' };

    const { rows: feedbackRows } = await pool.query(
      `SELECT id FROM tc_showing_feedback WHERE showing_id=$1 LIMIT 1`,
      [showingId]
    );
    if (feedbackRows[0]) {
      return { ok: true, skipped: true, reason: 'Feedback already recorded' };
    }

    const content = buildFeedbackRequestMessage({ transaction: showing, showing });
    const items = [];

    for (const channel of channels) {
      const recipient = channel === 'sms' ? showing.showing_agent_phone : showing.showing_agent_email;
      if (!recipient) continue;

      const item = await portalService.createCommunication(showing.transaction_id, {
        channel,
        audience: 'showing_agent',
        template_key: 'showing_feedback_request',
        subject: channel === 'email' ? content.subject : null,
        body: channel === 'sms' ? content.sms : content.body,
        status: sendNow ? 'prepared' : 'draft',
        metadata: {
          showing_id: showing.id,
          to: recipient,
          showing_agent_name: showing.showing_agent_name,
          showing_agent_email: showing.showing_agent_email,
          showing_agent_phone: showing.showing_agent_phone,
        },
      });
      items.push(item);
    }

    const deliveries = [];
    if (sendNow) {
      for (const item of items) deliveries.push(await sendCommunicationById(item.id));
    }

    return { ok: true, showing, communications: items, deliveries };
  }

  async function sendDocumentRequest(requestId, { channels = ['email'], sendNow = true } = {}) {
    const { rows } = await pool.query(
      `SELECT r.*, t.address, t.agent_role, t.parties
       FROM tc_document_requests r
       JOIN tc_transactions t ON t.id = r.transaction_id
       WHERE r.id = $1`,
      [requestId]
    );
    const request = rows[0] || null;
    if (!request) return { ok: false, error: 'Document request not found' };

    const content = buildDocumentRequestMessage({ transaction: request, request });
    const recipient = extractDefaultClientContact(request);
    const created = [];
    for (const channel of channels) {
      const to = channel === 'sms' ? recipient?.phone : recipient?.email;
      if (!to) continue;
      created.push(await portalService.createCommunication(request.transaction_id, {
        channel,
        audience: 'client',
        template_key: 'document_request',
        subject: channel === 'email' ? content.subject : null,
        body: channel === 'sms' ? content.sms : content.body,
        status: sendNow ? 'prepared' : 'draft',
        metadata: { request_id: request.id, to, request_title: request.title },
      }));
    }

    const deliveries = [];
    if (sendNow) {
      for (const item of created) deliveries.push(await sendCommunicationById(item.id));
      await portalService.updateDocumentRequest(request.id, { status: 'sent' });
    }
    return { ok: true, request, communications: created, deliveries };
  }

  async function prepareWeeklyReportDelivery(reportId, { channels = ['email'], sendNow = false, audience = 'seller' } = {}) {
    const { rows } = await pool.query(
      `SELECT r.*, t.address, t.agent_role, t.parties
       FROM tc_weekly_reports r
       JOIN tc_transactions t ON t.id = r.transaction_id
       WHERE r.id = $1`,
      [reportId]
    );
    const report = rows[0] || null;
    if (!report) return { ok: false, error: 'Report not found' };
    const payload = report.report_payload || {};
    const content = buildWeeklyReportMessage({ transaction: report, report, payload, audience });

    const recipient = audience === 'seller'
      ? extractDefaultClientContact(report)
      : extractAgentContact(report);

    const created = [];
    for (const channel of channels) {
      const to = channel === 'sms' ? recipient?.phone : recipient?.email;
      if (!to) continue;
      created.push(await portalService.createCommunication(report.transaction_id, {
        channel,
        audience: audience === 'seller' ? 'client' : 'agent',
        template_key: 'weekly_listing_report',
        subject: channel === 'email' ? content.subject : null,
        body: channel === 'sms' ? content.sms : content.body,
        status: sendNow ? 'prepared' : 'draft',
        metadata: { report_id: report.id, to, audience },
      }));
    }

    const deliveries = [];
    if (sendNow) {
      for (const item of created) deliveries.push(await sendCommunicationById(item.id));
    }

    return { ok: true, report, communications: created, deliveries };
  }

  async function prepareWeeklyReport(transactionId, options = {}) {
    const generated = await reportService.generateWeeklyReport(transactionId, options);
    if (!generated) return { ok: false, error: 'Transaction not found' };
    return { ok: true, ...generated };
  }

  return {
    sendCommunicationById,
    prepareShowingFeedbackRequest,
    sendDocumentRequest,
    prepareWeeklyReport,
    prepareWeeklyReportDelivery,
  };
}

export default createTCAutomationService;
