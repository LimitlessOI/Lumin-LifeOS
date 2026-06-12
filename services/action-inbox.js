/**
 * Action Inbox v1 — capture, classify, stage, and route user messages.
 * Middle layer between Voice Rail communication and BuilderOS execution.
 * HARD RULE: bp_build_request items are STAGED ONLY; never auto-routed to CDR.
 * HARD RULE: private_no_save items are never written to DB.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { classifyIntent } from './voice-rail-v1.js';

const CLASSIFICATION_TYPES = [
  'conversation',
  'task',
  'commitment',
  'schedule_item',
  'bp_build_request',
  'decision',
  'reminder',
  'private_no_save',
  'unknown',
];

const VALID_STATUSES = new Set(['staged', 'approved', 'routed', 'done', 'failed']);

const STATUS_ORDER = ['staged', 'approved', 'routed', 'done', 'failed'];

function statusRank(s) {
  const i = STATUS_ORDER.indexOf(s);
  return i === -1 ? -1 : i;
}

function isForwardTransition(from, to) {
  return statusRank(to) > statusRank(from);
}

function classifyExtended(rawText, mode) {
  const t = String(rawText || '').toLowerCase().trim();
  if (!t) return 'unknown';

  if (/\b(private|off.?record|don.?t (save|log|store)|no log)\b/.test(t)) {
    return 'private_no_save';
  }

  if (
    /\b(build|ship|deploy|create|scaffold|generate|add (a |the )?(route|service|feature|component)|please (build|create|make the system|implement))\b/.test(t)
    && /\b(builder|blueprint|builderos|feature|route|service|mission)\b/.test(t)
  ) {
    return 'bp_build_request';
  }

  if (/\b(schedule|calendar|meeting|appointment|remind me (at|on|in)|set (a )?reminder|block (time|my))\b/.test(t)) {
    return 'schedule_item';
  }

  if (/\b(decide|decision|should i|choice between|weigh|pros and cons|trade.?off)\b/.test(t)) {
    return 'decision';
  }

  if (/\b(remind me|don.?t forget|note (that|to self)|heads up)\b/.test(t)) {
    return 'reminder';
  }

  const voiceIntent = classifyIntent(rawText, mode || 'conversation');

  if (voiceIntent === 'commitment') return 'commitment';
  if (voiceIntent === 'command') return 'task';
  if (voiceIntent === 'general_conversation' || voiceIntent === 'brainstorm' || voiceIntent === 'emotional' || voiceIntent === 'governance_correction') {
    return 'conversation';
  }

  return 'unknown';
}

export function createActionInbox({ pool, logger }) {
  async function resolveUserId(userRef) {
    const { rows } = await pool.query(
      `SELECT id FROM lifeos_users WHERE user_handle = $1 OR display_name ILIKE $1 LIMIT 1`,
      [String(userRef || 'adam').toLowerCase()],
    );
    return rows[0]?.id || null;
  }

  function classifyItem(rawText, mode) {
    return classifyExtended(rawText, mode);
  }

  async function captureItem({ userId, sessionId, source, rawText, metadata, mode }) {
    const raw = String(rawText || '').trim();
    if (!raw) {
      const err = new Error('raw_text_required');
      err.status = 400;
      throw err;
    }

    const classification = classifyExtended(raw, mode);

    if (classification === 'private_no_save') {
      return {
        id: null,
        private: true,
        persisted: false,
        classification,
        status: null,
        raw_text: raw,
        note: 'Private — not saved. Session-only.',
      };
    }

    const { rows } = await pool.query(
      `INSERT INTO action_inbox_items
         (user_id, session_id, source, raw_text, classification, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'staged', $6::jsonb)
       RETURNING *`,
      [
        userId,
        sessionId || null,
        source || 'api',
        raw,
        classification,
        JSON.stringify(metadata || {}),
      ],
    );
    return rows[0];
  }

  async function stageItem(itemId) {
    const { rows } = await pool.query(
      `SELECT * FROM action_inbox_items WHERE id = $1 LIMIT 1`,
      [itemId],
    );
    const item = rows[0];
    if (!item) {
      const err = new Error('item_not_found');
      err.status = 404;
      throw err;
    }
    if (item.status === 'staged') return item;
    if (!isForwardTransition(item.status, 'staged')) {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      throw err;
    }
    const { rows: updated } = await pool.query(
      `UPDATE action_inbox_items SET status = 'staged', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [itemId],
    );
    return updated[0];
  }

  async function approveItem(itemId) {
    const { rows } = await pool.query(
      `SELECT * FROM action_inbox_items WHERE id = $1 LIMIT 1`,
      [itemId],
    );
    const item = rows[0];
    if (!item) {
      const err = new Error('item_not_found');
      err.status = 404;
      throw err;
    }
    if (!isForwardTransition(item.status, 'approved')) {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      err.detail = { current: item.status, requested: 'approved' };
      throw err;
    }
    const { rows: updated } = await pool.query(
      `UPDATE action_inbox_items SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [itemId],
    );
    return updated[0];
  }

  async function routeItem(itemId, { department } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM action_inbox_items WHERE id = $1 LIMIT 1`,
      [itemId],
    );
    const item = rows[0];
    if (!item) {
      const err = new Error('item_not_found');
      err.status = 404;
      throw err;
    }

    if (item.classification === 'bp_build_request') {
      const err = new Error('bp_build_request_cannot_be_routed');
      err.status = 400;
      err.detail = { note: 'bp_build_request items are staged-only. BuilderOS routing requires explicit founder approval via separate flow.' };
      throw err;
    }

    if (!isForwardTransition(item.status, 'routed')) {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      err.detail = { current: item.status, requested: 'routed' };
      throw err;
    }

    const { rows: receipt } = await pool.query(
      `INSERT INTO action_inbox_receipts (inbox_item_id, outcome, detail)
       VALUES ($1, 'routed', $2::jsonb)
       RETURNING *`,
      [itemId, JSON.stringify({ department: department || null, routed_at: new Date().toISOString() })],
    );

    const { rows: updated } = await pool.query(
      `UPDATE action_inbox_items
         SET status = 'routed', routed_to = $2, receipt_id = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [itemId, department || null, receipt[0].id],
    );
    return { item: updated[0], receipt: receipt[0] };
  }

  async function markDone(itemId) {
    const { rows } = await pool.query(
      `SELECT * FROM action_inbox_items WHERE id = $1 LIMIT 1`,
      [itemId],
    );
    const item = rows[0];
    if (!item) {
      const err = new Error('item_not_found');
      err.status = 404;
      throw err;
    }
    if (!isForwardTransition(item.status, 'done')) {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      throw err;
    }

    let receiptId = item.receipt_id;
    if (!receiptId) {
      const { rows: receipt } = await pool.query(
        `INSERT INTO action_inbox_receipts (inbox_item_id, outcome, detail)
         VALUES ($1, 'done', '{}')
         RETURNING *`,
        [itemId],
      );
      receiptId = receipt[0].id;
    } else {
      await pool.query(
        `UPDATE action_inbox_receipts SET outcome = 'done' WHERE id = $1`,
        [receiptId],
      );
    }

    const { rows: updated } = await pool.query(
      `UPDATE action_inbox_items SET status = 'done', receipt_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [itemId, receiptId],
    );
    return updated[0];
  }

  async function markFailed(itemId, { reason } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM action_inbox_items WHERE id = $1 LIMIT 1`,
      [itemId],
    );
    const item = rows[0];
    if (!item) {
      const err = new Error('item_not_found');
      err.status = 404;
      throw err;
    }
    if (item.status === 'done' || item.status === 'failed') {
      const err = new Error('invalid_status_transition');
      err.status = 400;
      throw err;
    }

    const { rows: receipt } = await pool.query(
      `INSERT INTO action_inbox_receipts (inbox_item_id, outcome, detail)
       VALUES ($1, 'failed', $2::jsonb)
       RETURNING *`,
      [itemId, JSON.stringify({ reason: reason || 'unknown' })],
    );

    const { rows: updated } = await pool.query(
      `UPDATE action_inbox_items SET status = 'failed', receipt_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [itemId, receipt[0].id],
    );
    return { item: updated[0], receipt: receipt[0] };
  }

  async function listItems(userId, { status, limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    let query;
    let params;
    if (status && VALID_STATUSES.has(status)) {
      query = `SELECT * FROM action_inbox_items WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3`;
      params = [userId, status, lim];
    } else {
      query = `SELECT * FROM action_inbox_items WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`;
      params = [userId, lim];
    }
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async function getItem(itemId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM action_inbox_items WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [itemId, userId],
    );
    if (!rows[0]) {
      const err = new Error('item_not_found');
      err.status = 404;
      throw err;
    }
    return rows[0];
  }

  async function listReceipts(userId, { limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT r.* FROM action_inbox_receipts r
         JOIN action_inbox_items i ON i.id = r.inbox_item_id
        WHERE i.user_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2`,
      [userId, lim],
    );
    return rows;
  }

  return {
    CLASSIFICATION_TYPES,
    STATUS_MACHINE: {
      staged: ['approved', 'failed'],
      approved: ['routed', 'failed'],
      routed: ['done', 'failed'],
      done: [],
      failed: [],
    },
    classifyItem,
    resolveUserId,
    captureItem,
    stageItem,
    approveItem,
    routeItem,
    markDone,
    markFailed,
    listItems,
    getItem,
    listReceipts,
  };
}
