/**
 * SYNOPSIS: Natural-language query over LifeOS twin memory (commitments, check-ins, decisions, sleep).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { safeInt } from './lifeos-request-helpers.js';

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

/**
 * Query captured LifeOS facts for a user. Deterministic keyword routing first;
 * never invents moments that are not in DB rows.
 * @param {string} queryText
 * @param {string|number} userId
 * @param {{ pool?: import('pg').Pool }} [deps]
 */
export async function queryLife(queryText, userId, { pool } = {}) {
  const q = String(queryText || '').trim();
  const uid = safeInt(userId);
  if (!q) {
    return { ok: false, error: 'empty_query', moments: [] };
  }
  if (!pool) {
    return {
      ok: true,
      mode: 'no_pool',
      message: 'Database unavailable — cannot search your life yet.',
      moments: [],
      query: q,
    };
  }

  const lower = q.toLowerCase();
  const moments = [];

  const wantTired = /\b(tired|exhaust|sleep|fatigue)\b/.test(lower);
  const wantDecide = /\b(decid|chose|choice|decision)\b/.test(lower);
  const wantFeel = /\b(felt|feel|emotion|mood|joy|anxious|angry)\b/.test(lower);
  const wantCommit = /\b(commit|promise|mit|todo|task)\b/.test(lower);
  const wantAny = !(wantTired || wantDecide || wantFeel || wantCommit);

  if (wantTired || wantAny) {
    try {
      const r = await pool.query(
        `SELECT sleep_start, sleep_end, quality, notes, duration_minutes
           FROM sleep_logs
          WHERE user_id = $1 AND sleep_start >= $2
          ORDER BY sleep_start DESC LIMIT 8`,
        [uid, daysAgo(60)],
      );
      for (const row of r.rows) {
        moments.push({
          kind: 'sleep',
          when: row.sleep_start,
          summary: `Sleep quality ${row.quality ?? '?'} · ${row.duration_minutes ?? '?'} min`,
          detail: row.notes || null,
        });
      }
    } catch {
      /* table may not exist */
    }
  }

  if (wantFeel || wantAny) {
    try {
      const r = await pool.query(
        `SELECT created_at, mood, note, score
           FROM joy_checkins
          WHERE user_id = $1 AND created_at >= $2
          ORDER BY created_at DESC LIMIT 8`,
        [uid, daysAgo(90)],
      );
      for (const row of r.rows) {
        moments.push({
          kind: 'emotional_checkin',
          when: row.created_at,
          summary: `Felt ${row.mood || 'unspecified'}${row.score != null ? ` (${row.score})` : ''}`,
          detail: row.note || null,
        });
      }
    } catch {
      /* optional table */
    }
  }

  if (wantDecide || wantAny) {
    try {
      const r = await pool.query(
        `SELECT id, created_at, title, decision_text, outcome
           FROM decision_logs
          WHERE user_id = $1 AND created_at >= $2
          ORDER BY created_at DESC LIMIT 8`,
        [uid, daysAgo(180)],
      );
      for (const row of r.rows) {
        moments.push({
          kind: 'decision',
          when: row.created_at,
          summary: row.title || 'Decision',
          detail: row.decision_text || row.outcome || null,
          id: row.id,
        });
      }
    } catch {
      /* optional */
    }
  }

  if (wantCommit || wantAny) {
    try {
      const r = await pool.query(
        `SELECT id, created_at, title, status, due_at
           FROM commitments
          WHERE user_id = $1
          ORDER BY created_at DESC LIMIT 8`,
        [uid],
      );
      for (const row of r.rows) {
        moments.push({
          kind: 'commitment',
          when: row.created_at || row.due_at,
          summary: `${row.title || 'Commitment'} (${row.status || 'open'})`,
          detail: null,
          id: row.id,
        });
      }
    } catch {
      /* optional */
    }
  }

  moments.sort((a, b) => String(b.when || '').localeCompare(String(a.when || '')));

  return {
    ok: true,
    query: q,
    mode: 'keyword_db',
    message: moments.length
      ? `Found ${moments.length} real moment(s) from your LifeOS data.`
      : 'No matching moments in your captured data yet.',
    moments: moments.slice(0, 20),
  };
}

export function createAskYourLifeService({ pool }) {
  return {
    queryLife: (queryText, userId) => queryLife(queryText, userId, { pool }),
  };
}