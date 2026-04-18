/**
 * LifeOS unified capture/event stream.
 * Turns freeform text into tracked suggestions and optionally applies them.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function extractJsonBlock(text, fallback) {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return safeJsonParse(fence[1].trim(), fallback);
  const start = raw.indexOf('{');
  const startArray = raw.indexOf('[');
  let idx = -1;
  if (start >= 0 && startArray >= 0) idx = Math.min(start, startArray);
  else idx = Math.max(start, startArray);
  if (idx >= 0) return safeJsonParse(raw.slice(idx), fallback);
  return fallback;
}

function normalizeDateValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function createLifeOSEventStreamService({ pool, callAI = null, commitments, calendar, focusPrivacy, logger = console }) {
  async function listEvents(userId, { limit = 30 } = {}) {
    const { rows: events } = await pool.query(
      `SELECT *
         FROM lifeos_event_stream
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, Math.max(1, Math.min(100, parseInt(limit, 10) || 30))],
    );
    if (!events.length) return [];
    const eventIds = events.map((row) => row.id);
    const { rows: actions } = await pool.query(
      `SELECT *
         FROM lifeos_event_actions
        WHERE event_id = ANY($1::bigint[])
        ORDER BY created_at ASC, id ASC`,
      [eventIds],
    );
    const byEvent = new Map();
    for (const action of actions) {
      const bucket = byEvent.get(action.event_id) || [];
      bucket.push(action);
      byEvent.set(action.event_id, bucket);
    }
    return events.map((event) => ({ ...event, actions: byEvent.get(event.id) || [] }));
  }

  async function extractCalendarSuggestions(text) {
    if (!callAI) return [];
    const today = new Date();
    const prompt = `You extract calendar events from LifeOS capture text.
Current date: ${today.toISOString()}.

Rules:
- Return ONLY events that are explicit enough to put on a calendar.
- If there is no clear date/time, return [].
- Output JSON array only.
- Each item must be: {"title":"...","starts_at":"ISO-8601","ends_at":"ISO-8601","lane":"personal|family|work|social","description":"..."}
- If duration is not explicit, use 60 minutes.

Text:
${text}`;
    try {
      const raw = await callAI(prompt);
      const parsed = extractJsonBlock(raw, []);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => ({
          title: String(item?.title || '').trim(),
          starts_at: normalizeDateValue(item?.starts_at),
          ends_at: normalizeDateValue(item?.ends_at),
          lane: ['personal', 'family', 'work', 'social'].includes(String(item?.lane || '').trim()) ? String(item.lane).trim() : 'personal',
          description: String(item?.description || '').trim(),
        }))
        .filter((item) => item.title && item.starts_at && item.ends_at);
    } catch (err) {
      logger.warn?.('[LIFEOS EVENTS] calendar extraction failed:', err.message);
      return [];
    }
  }

  async function createAction({ eventId, userId, actionType, title, details }) {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_event_actions (event_id, user_id, action_type, title, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [eventId, userId, actionType, title, JSON.stringify(details || {})],
    );
    return rows[0];
  }

  async function applyAction(action) {
    let resourceType = null;
    let resourceId = null;
    let details = action.details || {};

    if (action.action_type === 'command') {
      const result = await focusPrivacy.executeCommand({ userId: action.user_id, text: details.command_text || action.title });
      if (!result.ok) throw new Error(result.error || 'Could not execute command');
      resourceType = 'command_log';
      resourceId = String(result.result?.id || result.result?.job?.id || result.result?.privacy_window?.id || result.result?.command_log_id || '');
      details = { ...details, executed: result };
    } else if (action.action_type === 'commitment') {
      const commitment = await commitments.logCommitment({
        userId: action.user_id,
        title: details.title || action.title,
        description: details.description || '',
        dueAt: details.due_at || null,
        committedTo: details.committed_to || null,
        weight: details.weight || null,
      });
      resourceType = 'commitment';
      resourceId = String(commitment?.id || '');
      details = { ...details, commitment };
    } else if (action.action_type === 'calendar_event') {
      const event = await calendar.createEvent(action.user_id, {
        title: details.title || action.title,
        description: details.description || '',
        starts_at: details.starts_at,
        ends_at: details.ends_at,
        lane: details.lane || 'personal',
      });
      resourceType = 'calendar_event';
      resourceId = String(event?.id || '');
      details = { ...details, event };
    }

    const { rows } = await pool.query(
      `UPDATE lifeos_event_actions
          SET status = 'applied',
              applied_resource_type = $2,
              applied_resource_id = $3,
              details = $4::jsonb,
              applied_at = NOW(),
              updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
      [action.id, resourceType, resourceId || null, JSON.stringify(details)],
    );
    return rows[0];
  }

  async function applyEvent(userId, eventId) {
    const { rows: eventRows } = await pool.query(
      `SELECT * FROM lifeos_event_stream WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [eventId, userId],
    );
    const event = eventRows[0];
    if (!event) return null;
    const { rows: actions } = await pool.query(
      `SELECT * FROM lifeos_event_actions WHERE event_id = $1 AND user_id = $2 AND status = 'suggested' ORDER BY id ASC`,
      [eventId, userId],
    );
    const applied = [];
    for (const action of actions) {
      try {
        applied.push(await applyAction(action));
      } catch (err) {
        await pool.query(
          `UPDATE lifeos_event_actions
              SET status = 'error',
                  details = jsonb_set(COALESCE(details, '{}'::jsonb), '{error}', to_jsonb($2::text), true),
                  updated_at = NOW()
            WHERE id = $1`,
          [action.id, err.message],
        );
      }
    }
    await pool.query(
      `UPDATE lifeos_event_stream
          SET status = CASE WHEN EXISTS (SELECT 1 FROM lifeos_event_actions WHERE event_id = $1 AND status = 'error') THEN 'error' ELSE 'applied' END,
              updated_at = NOW()
        WHERE id = $1`,
      [eventId],
    );
    return { event_id: eventId, applied_count: applied.length, actions: applied };
  }

  async function captureEvent({ userId, text, source = 'manual', channel = 'text', metadata = {}, autoApply = false }) {
    const body = String(text || '').trim();
    if (!body) throw new Error('text is required');

    const parsedCommand = focusPrivacy.parseCommand(body);
    const commitmentSuggestions = await commitments.extractCommitments(body, userId).catch(() => []);
    const calendarSuggestions = await extractCalendarSuggestions(body);

    const { rows: inserted } = await pool.query(
      `INSERT INTO lifeos_event_stream (user_id, source, channel, text_content, status, detected_command, metadata, processed_at)
       VALUES ($1, $2, $3, $4, 'processed', $5, $6::jsonb, NOW())
       RETURNING *`,
      [userId, source, channel, body, parsedCommand.ok ? parsedCommand.type : null, JSON.stringify(metadata || {})],
    );
    const event = inserted[0];
    const actions = [];

    if (parsedCommand.ok) {
      actions.push(await createAction({
        eventId: event.id,
        userId,
        actionType: 'command',
        title: parsedCommand.spoken_confirmation || body,
        details: {
          command_text: body,
          parsed_action: parsedCommand.type,
          parsed_payload: parsedCommand.payload || {},
          spoken_confirmation: parsedCommand.spoken_confirmation || null,
        },
      }));
    }

    for (const item of commitmentSuggestions || []) {
      actions.push(await createAction({
        eventId: event.id,
        userId,
        actionType: 'commitment',
        title: String(item.title || '').trim() || 'Commitment',
        details: {
          title: String(item.title || '').trim() || 'Commitment',
          description: String(item.description || '').trim(),
          due_at: item.due_at || null,
          committed_to: item.committed_to || null,
          weight: item.weight || null,
        },
      }));
    }

    for (const item of calendarSuggestions || []) {
      actions.push(await createAction({
        eventId: event.id,
        userId,
        actionType: 'calendar_event',
        title: item.title,
        details: item,
      }));
    }

    let applyResult = null;
    if (autoApply && actions.length) {
      applyResult = await applyEvent(userId, event.id);
    }

    const { rows: freshRows } = await pool.query(
      `SELECT * FROM lifeos_event_stream WHERE id = $1 LIMIT 1`,
      [event.id],
    );
    return {
      event: freshRows[0] || event,
      actions: autoApply && applyResult ? applyResult.actions : actions,
      apply_result: applyResult,
      summary: {
        command_count: parsedCommand.ok ? 1 : 0,
        commitment_count: commitmentSuggestions.length,
        calendar_count: calendarSuggestions.length,
      },
    };
  }

  return {
    listEvents,
    captureEvent,
    applyEvent,
  };
}
