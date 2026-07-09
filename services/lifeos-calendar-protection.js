/**
 * SYNOPSIS: Exports upsertRule — services/lifeos-calendar-protection.js.
 */
export async function upsertRule(db, userId, data) {
  const label = typeof data?.label === 'string' ? data.label.trim() : '';
  const rrule = typeof data?.rrule === 'string' ? data.rrule.trim() : '';
  const startTime = normalizeTimeString(data?.start_time);
  const endTime = normalizeTimeString(data?.end_time);
  const daysOfWeek = normalizeDaysOfWeek(data?.days_of_week);
  const active = data?.active === false ? false : true;

  if (!label) throw new Error('label is required');
  if (!rrule) throw new Error('rrule is required');
  if (!startTime) throw new Error('start_time is required');
  if (!endTime) throw new Error('end_time is required');
  if (daysOfWeek.length === 0) throw new Error('days_of_week is required');

  const existing = await db.query(
    `select id
       from calendar_protection_rules
      where user_id = $1
        and label = $2
      limit 1`,
    [userId, label]
  );

  if (existing.rows.length > 0) {
    const ruleId = existing.rows[0].id;
    const result = await db.query(
      `update calendar_protection_rules
          set rrule = $1,
              start_time = $2,
              end_time = $3,
              days_of_week = $4,
              active = $5
        where id = $6
          and user_id = $7
      returning *`,
      [rrule, startTime, endTime, daysOfWeek, active, ruleId, userId]
    );
    return result.rows[0] || null;
  }

  const result = await db.query(
    `insert into calendar_protection_rules
      (user_id, label, rrule, start_time, end_time, days_of_week, active)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [userId, label, rrule, startTime, endTime, daysOfWeek, active]
  );
  return result.rows[0] || null;
}

export async function listRules(db, userId) {
  const result = await db.query(
    `select *
       from calendar_protection_rules
      where user_id = $1
      order by created_at asc, id asc`,
    [userId]
  );
  return result.rows;
}

export async function deleteRule(db, userId, ruleId) {
  const result = await db.query(
    `delete from calendar_protection_rules
      where id = $1
        and user_id = $2
     returning id`,
    [ruleId, userId]
  );
  return result.rowCount > 0;
}

export async function scanConflicts(db, userId, calendarEvents) {
  const rulesResult = await db.query(
    `select *
       from calendar_protection_rules
      where user_id = $1
        and active = true
      order by created_at asc, id asc`,
    [userId]
  );

  const rules = rulesResult.rows;
  const conflicts = [];

  for (const event of Array.isArray(calendarEvents) ? calendarEvents : []) {
    const eventStart = parseIsoDate(event?.start);
    const eventEnd = parseIsoDate(event?.end);
    if (!eventStart || !eventEnd) continue;

    for (const rule of rules) {
      const ruleDays = normalizeDaysOfWeek(rule?.days_of_week);
      const eventDay = eventStart.getUTCDay();
      if (!ruleDays.includes(eventDay)) continue;

      const ruleStart = parseTimeToMinutes(rule?.start_time);
      const ruleEnd = parseTimeToMinutes(rule?.end_time);
      if (ruleStart == null || ruleEnd == null) continue;

      const eventStartMinutes = eventStart.getUTCHours() * 60 + eventStart.getUTCMinutes();
      const eventEndMinutes = eventEnd.getUTCHours() * 60 + eventEnd.getUTCMinutes();

      if (overlapsProtectedWindow(eventStartMinutes, eventEndMinutes, ruleStart, ruleEnd)) {
        conflicts.push({
          event,
          rule,
          message: buildConflictMessage(rule, eventStart)
        });
      }
    }
  }

  return conflicts;
}

function normalizeTimeString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^\d{2}:\d{2}(:\d{2})?$/.test(trimmed) ? trimmed.slice(0, 5) : null;
}

function parseTimeToMinutes(value) {
  const normalized = normalizeTimeString(value);
  if (!normalized) return null;
  const [hh, mm] = normalized.split(':').map(Number);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function normalizeDaysOfWeek(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? safeJsonParse(value)
      : null;

  if (!Array.isArray(raw)) return [];

  const days = [];
  for (const item of raw) {
    const n = Number(item);
    if (Number.isInteger(n) && n >= 0 && n <= 6 && !days.includes(n)) {
      days.push(n);
    }
  }
  return days;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseIsoDate(value) {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function overlapsProtectedWindow(eventStartMinutes, eventEndMinutes, ruleStartMinutes, ruleEndMinutes) {
  const eventEnd = eventEndMinutes <= eventStartMinutes ? eventStartMinutes : eventEndMinutes;
  const ruleEnd = ruleEndMinutes <= ruleStartMinutes ? ruleStartMinutes : ruleEndMinutes;
  return eventStartMinutes < ruleEnd && eventEnd > ruleStartMinutes;
}

function buildConflictMessage(rule, eventStart) {
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][eventStart.getUTCDay()] || 'selected day';
  return `Event overlaps protected window for "${rule?.label || 'rule'}" on ${dayName}.`;
}