/**
 * SYNOPSIS: Exports createIncomeDrones — services/income-drones.js.
 */
const DRONE_STATUSES = [
  'monitoring',
  'alerted',
  'investigating',
  'resolved',
  'suppressed',
  'failed',
];

const DRONE_STATUS_SET = new Set(DRONE_STATUSES);
const DRONE_STATUS_ORDER = ['monitoring', 'alerted', 'investigating', 'resolved', 'suppressed', 'failed'];

function statusRank(status) {
  const idx = DRONE_STATUS_ORDER.indexOf(status);
  return idx === -1 ? -1 : idx;
}

function isForwardTransition(from, to) {
  return statusRank(to) > statusRank(from);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function toJson(value) {
  return JSON.stringify(value == null ? {} : value);
}

function parseLimit(limit, fallback = 50) {
  const n = parseInt(limit, 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : fallback, 1), 200);
}

function buildRevenueSignal(text) {
  const t = normalizeText(text).toLowerCase();
  if (!t) return 'unknown';

  if (/\b(refund|chargeback|dispute|failed payment|payment failed|declined|canceled subscription|subscription canceled)\b/.test(t)) {
    return 'negative';
  }

  if (/\b(invoice|paid|payment received|renewal|subscription|mrr|arr|revenue|sale|purchase|checkout|upsell|upgrade|donation|deposit)\b/.test(t)) {
    return 'positive';
  }

  return 'unknown';
}

function extractSignals(text) {
  const t = normalizeText(text).toLowerCase();
  const signals = [];
  const patterns = [
    ['invoice', /\binvoice\b/],
    ['subscription', /\bsubscription\b/],
    ['renewal', /\brenewal\b/],
    ['payment_failed', /\b(failed payment|payment failed|declined)\b/],
    ['refund', /\brefund\b/],
    ['chargeback', /\bchargeback|dispute\b/],
    ['mrr', /\bmrr\b/],
    ['arr', /\barr\b/],
    ['sale', /\bsale\b/],
    ['purchase', /\bpurchase\b/],
  ];

  for (const [name, pattern] of patterns) {
    if (pattern.test(t)) signals.push(name);
  }
  return signals;
}

export function createIncomeDrones({ pool, callCouncilMember }) {
  async function monitorRevenueStreams({ userId, source, note, metadata } = {}) {
    const rawNote = normalizeText(note);
    if (!rawNote) {
      const err = new Error('note_required');
      err.status = 400;
      throw err;
    }

    const aiPayload = {
      taskType: 'general',
      purpose: 'Monitor revenue streams in real time',
      note: rawNote,
      source: source || 'api',
      metadata: metadata || {},
    };

    let aiResult = null;
    if (typeof callCouncilMember === 'function') {
      aiResult = await callCouncilMember('openai', aiPayload, { taskType: 'general' });
    }

    const signal = buildRevenueSignal(rawNote);
    const tags = extractSignals(rawNote);

    const { rows } = await pool.query(
      `INSERT INTO income_drones_events
         (user_id, source, note, signal, tags, ai_result, metadata, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, 'monitoring')
       RETURNING *`,
      [
        userId || null,
        source || 'api',
        rawNote,
        signal,
        toJson(tags),
        toJson(aiResult),
        toJson(metadata || {}),
      ],
    );

    return rows[0];
  }

  async function getRevenueEvent(eventId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM income_drones_events WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [eventId, userId || null],
    );
    if (!rows[0]) {
      const err = new Error('event_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function listRevenueEvents(userId, { status, limit = 50 } = {}) {
    const lim = parseLimit(limit, 50);
    let query;
    let params;

    if (status && DRONE_STATUS_SET.has(status)) {
      query = `SELECT * FROM income_drones_events WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3`;
      params = [userId || null, status, lim];
    } else {
      query = `SELECT * FROM income_drones_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`;
      params = [userId || null, lim];
    }

    const { rows } = await pool.query(query, params);
    return rows;
  }

  async function flagRevenueEvent(eventId, { reason, details } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM income_drones_events WHERE id = $1 LIMIT 1`,
      [eventId],
    );
    const event = rows[0];
    if (!event) {
      const err = new Error('event_not_found');
      err.status = 404;
      throw err;
    }

    if (!isForwardTransition(event.status, 'alerted')) {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      err.detail = { current: event.status, requested: 'alerted' };
      throw err;
    }

    const { rows: updated } = await pool.query(
      `UPDATE income_drones_events
          SET status = 'alerted',
              alert_reason = $2,
              alert_details = $3::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [eventId, reason || 'revenue_signal_detected', toJson(details || {})],
    );

    return updated[0];
  }

  async function investigateRevenueEvent(eventId, { summary, details } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM income_drones_events WHERE id = $1 LIMIT 1`,
      [eventId],
    );
    const event = rows[0];
    if (!event) {
      const err = new Error('event_not_found');
      err.status = 404;
      throw err;
    }

    if (!isForwardTransition(event.status, 'investigating')) {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      err.detail = { current: event.status, requested: 'investigating' };
      throw err;
    }

    const { rows: updated } = await pool.query(
      `UPDATE income_drones_events
          SET status = 'investigating',
              investigation_summary = $2,
              investigation_details = $3::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [eventId, summary || null, toJson(details || {})],
    );

    return updated[0];
  }

  async function resolveRevenueEvent(eventId, { resolution, details } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM income_drones_events WHERE id = $1 LIMIT 1`,
      [eventId],
    );
    const event = rows[0];
    if (!event) {
      const err = new Error('event_not_found');
      err.status = 404;
      throw err;
    }

    if (!isForwardTransition(event.status, 'resolved')) {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      err.detail = { current: event.status, requested: 'resolved' };
      throw err;
    }

    const { rows: updated } = await pool.query(
      `UPDATE income_drones_events
          SET status = 'resolved',
              resolution = $2,
              resolution_details = $3::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [eventId, resolution || null, toJson(details || {})],
    );

    return updated[0];
  }

  async function suppressRevenueEvent(eventId, { reason, details } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM income_drones_events WHERE id = $1 LIMIT 1`,
      [eventId],
    );
    const event = rows[0];
    if (!event) {
      const err = new Error('event_not_found');
      err.status = 404;
      throw err;
    }

    if (event.status === 'resolved' || event.status === 'failed') {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      throw err;
    }

    const { rows: updated } = await pool.query(
      `UPDATE income_drones_events
          SET status = 'suppressed',
              suppression_reason = $2,
              suppression_details = $3::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [eventId, reason || 'noise_filtered', toJson(details || {})],
    );

    return updated[0];
  }

  async function failRevenueEvent(eventId, { reason, details } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM income_drones_events WHERE id = $1 LIMIT 1`,
      [eventId],
    );
    const event = rows[0];
    if (!event) {
      const err = new Error('event_not_found');
      err.status = 404;
      throw err;
    }

    if (event.status === 'resolved' || event.status === 'failed') {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      throw err;
    }

    const { rows: updated } = await pool.query(
      `UPDATE income_drones_events
          SET status = 'failed',
              failure_reason = $2,
              failure_details = $3::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [eventId, reason || 'monitoring_failed', toJson(details || {})],
    );

    return updated[0];
  }

  return {
    DRONE_STATUSES,
    STATUS_MACHINE: {
      monitoring: ['alerted', 'investigating', 'resolved', 'suppressed', 'failed'],
      alerted: ['investigating', 'resolved', 'suppressed', 'failed'],
      investigating: ['resolved', 'suppressed', 'failed'],
      resolved: [],
      suppressed: [],
      failed: [],
    },
    buildRevenueSignal,
    monitorRevenueStreams,
    getRevenueEvent,
    listRevenueEvents,
    flagRevenueEvent,
    investigateRevenueEvent,
    resolveRevenueEvent,
    suppressRevenueEvent,
    failRevenueEvent,
  };
}