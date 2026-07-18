/**
 * SYNOPSIS: Exports getSessionsByUser — services/wellness-studio-data.js.
 */
const SESSION_TABLE = 'wellness_studio_sessions';
const INSIGHT_TABLE = 'wellness_studio_insights';

function assertDb(db) {
  if (!db || typeof db.query !== 'function') {
    throw new TypeError('A pg pool/client with query(sql, params) is required as the last argument.');
  }
}

function toInt(value, fieldName) {
  const num = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(num) || num <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }
  return num;
}

function normalizeOptionalText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return String(value);
}

function normalizeOptionalNumber(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new TypeError(`${fieldName} must be a finite number.`);
  }
  return num;
}

function pickSessionPatch(patch = {}) {
  const out = {};
  const fields = [
    'user_id',
    'session_type',
    'joy_checkin_id',
    'integrity_score_log_id',
    'wearable_data_id',
    'emotional_pattern_id',
    'session_notes',
    'status',
  ];

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) {
      out[field] = patch[field];
    }
  }

  return out;
}

function pickSessionPayload(payload = {}) {
  const out = {};
  const fields = [
    'user_id',
    'session_type',
    'joy_checkin_id',
    'integrity_score_log_id',
    'wearable_data_id',
    'emotional_pattern_id',
    'session_notes',
    'status',
  ];

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      out[field] = payload[field];
    }
  }

  return out;
}

function pickInsightPayload(payload = {}) {
  const out = {};
  const fields = ['user_id', 'session_id', 'insight_type', 'content', 'confidence_score'];
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      out[field] = payload[field];
    }
  }
  return out;
}

function buildInsert(table, data) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  if (keys.length === 0) {
    throw new TypeError('No writable fields were provided.');
  }

  const cols = [];
  const vals = [];
  const params = [];
  let i = 1;

  for (const key of keys) {
    cols.push(key);
    vals.push(`$${i++}`);
    params.push(data[key]);
  }

  return {
    sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
    params,
  };
}

function buildUpdate(table, idColumn, idValue, data) {
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  if (keys.length === 0) {
    throw new TypeError('No updatable fields were provided.');
  }

  const sets = [];
  const params = [];
  let i = 1;

  for (const key of keys) {
    sets.push(`${key} = $${i++}`);
    params.push(data[key]);
  }

  params.push(idValue);
  return {
    sql: `UPDATE ${table} SET ${sets.join(', ')}, updated_at = NOW() WHERE ${idColumn} = $${i} RETURNING *`,
    params,
  };
}

export async function getSessionsByUser(userId, db) {
  assertDb(db);
  const uid = toInt(userId, 'userId');
  const result = await db.query(
    `SELECT s.*
     FROM ${SESSION_TABLE} s
     LEFT JOIN joy_checkins jc ON jc.id = s.joy_checkin_id
     LEFT JOIN integrity_score_log isl ON isl.id = s.integrity_score_log_id
     LEFT JOIN wearable_data wd ON wd.id = s.wearable_data_id
     LEFT JOIN emotional_patterns ep ON ep.id = s.emotional_pattern_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [uid]
  );
  return result.rows;
}

export async function createSession(payload, db) {
  assertDb(db);
  const data = pickSessionPayload(payload);

  if (data.user_id !== undefined) data.user_id = toInt(data.user_id, 'user_id');
  if (data.joy_checkin_id !== undefined && data.joy_checkin_id !== null) data.joy_checkin_id = toInt(data.joy_checkin_id, 'joy_checkin_id');
  if (data.integrity_score_log_id !== undefined && data.integrity_score_log_id !== null) data.integrity_score_log_id = toInt(data.integrity_score_log_id, 'integrity_score_log_id');
  if (data.wearable_data_id !== undefined && data.wearable_data_id !== null) data.wearable_data_id = toInt(data.wearable_data_id, 'wearable_data_id');
  if (data.emotional_pattern_id !== undefined && data.emotional_pattern_id !== null) data.emotional_pattern_id = toInt(data.emotional_pattern_id, 'emotional_pattern_id');
  if (data.session_notes !== undefined) data.session_notes = normalizeOptionalText(data.session_notes);
  if (data.session_type !== undefined) data.session_type = normalizeOptionalText(data.session_type);
  if (data.status !== undefined) data.status = normalizeOptionalText(data.status);

  const { sql, params } = buildInsert(SESSION_TABLE, data);
  const result = await db.query(sql, params);
  return result.rows[0];
}

export async function updateSession(sessionId, patch, db) {
  assertDb(db);
  const sid = toInt(sessionId, 'sessionId');
  const data = pickSessionPatch(patch);

  if (data.user_id !== undefined) data.user_id = toInt(data.user_id, 'user_id');
  if (data.joy_checkin_id !== undefined) data.joy_checkin_id = data.joy_checkin_id === null ? null : toInt(data.joy_checkin_id, 'joy_checkin_id');
  if (data.integrity_score_log_id !== undefined) data.integrity_score_log_id = data.integrity_score_log_id === null ? null : toInt(data.integrity_score_log_id, 'integrity_score_log_id');
  if (data.wearable_data_id !== undefined) data.wearable_data_id = data.wearable_data_id === null ? null : toInt(data.wearable_data_id, 'wearable_data_id');
  if (data.emotional_pattern_id !== undefined) data.emotional_pattern_id = data.emotional_pattern_id === null ? null : toInt(data.emotional_pattern_id, 'emotional_pattern_id');
  if (data.session_notes !== undefined) data.session_notes = normalizeOptionalText(data.session_notes);
  if (data.session_type !== undefined) data.session_type = normalizeOptionalText(data.session_type);
  if (data.status !== undefined) data.status = normalizeOptionalText(data.status);

  const { sql, params } = buildUpdate(SESSION_TABLE, 'id', sid, data);
  const result = await db.query(sql, params);
  return result.rows[0] ?? null;
}

export async function getInsightsBySession(sessionId, db) {
  assertDb(db);
  const sid = toInt(sessionId, 'sessionId');
  const result = await db.query(
    `SELECT i.*
     FROM ${INSIGHT_TABLE} i
     WHERE i.session_id = $1
     ORDER BY i.created_at DESC`,
    [sid]
  );
  return result.rows;
}

export async function createInsight(payload, db) {
  assertDb(db);
  const data = pickInsightPayload(payload);

  if (data.user_id !== undefined) data.user_id = toInt(data.user_id, 'user_id');
  if (data.session_id !== undefined) data.session_id = toInt(data.session_id, 'session_id');
  if (data.insight_type !== undefined) data.insight_type = normalizeOptionalText(data.insight_type);
  if (data.content !== undefined) data.content = normalizeOptionalText(data.content);
  if (data.confidence_score !== undefined) data.confidence_score = normalizeOptionalNumber(data.confidence_score, 'confidence_score');

  const { sql, params } = buildInsert(INSIGHT_TABLE, data);
  const result = await db.query(sql, params);
  return result.rows[0];
}