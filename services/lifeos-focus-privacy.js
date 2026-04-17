/**
 * Focus sessions, privacy windows, and lightweight command execution for LifeOS.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

function toMinutes(value, unit) {
  const amount = Math.max(1, parseInt(value, 10) || 0);
  const normalized = String(unit || '').toLowerCase();
  if (normalized.startsWith('hour') || normalized === 'hr' || normalized === 'hrs') return amount * 60;
  return amount;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function createLifeOSFocusPrivacyService(pool) {
  async function getActiveFocusSession(userId) {
    const { rows } = await pool.query(
      `SELECT *
         FROM lifeos_focus_sessions
        WHERE user_id = $1 AND status = 'active'
        ORDER BY started_at DESC
        LIMIT 1`,
      [userId],
    );
    return rows[0] || null;
  }

  async function startFocusSession({ userId, intention, plannedMinutes = 60, source = 'manual', notes = null }) {
    await pool.query(
      `UPDATE lifeos_focus_sessions
          SET status = 'interrupted', ended_at = NOW(), notes = COALESCE(notes, '') || CASE WHEN COALESCE(notes, '') = '' THEN 'Interrupted by a new focus session.' ELSE E'\nInterrupted by a new focus session.' END, updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );

    const { rows } = await pool.query(
      `INSERT INTO lifeos_focus_sessions (user_id, intention, planned_minutes, source, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, intention, Math.max(5, parseInt(plannedMinutes, 10) || 60), source, notes],
    );
    return rows[0];
  }

  async function endFocusSession({ sessionId, userId, status = 'completed', notes = null }) {
    const { rows } = await pool.query(
      `UPDATE lifeos_focus_sessions
          SET status = $3,
              ended_at = COALESCE(ended_at, NOW()),
              notes = COALESCE($4, notes),
              updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [sessionId, userId, status, notes],
    );
    return rows[0] || null;
  }

  async function logIntervention({ sessionId, userId, kind = 'nudge', message = null, effectiveness = null, recoveredFocus = null }) {
    const { rows } = await pool.query(
      `INSERT INTO lifeos_focus_interventions
         (session_id, user_id, kind, message, effectiveness, recovered_focus)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [sessionId, userId, kind, message, effectiveness, recoveredFocus],
    );
    return rows[0];
  }

  async function getTodayFocusSummary(userId) {
    const active = await getActiveFocusSession(userId);
    const { rows: sessions } = await pool.query(
      `SELECT *,
              EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60.0 AS actual_minutes
         FROM lifeos_focus_sessions
        WHERE user_id = $1 AND started_at >= $2
        ORDER BY started_at DESC`,
      [userId, startOfToday()],
    );
    const { rows: interventions } = await pool.query(
      `SELECT *
         FROM lifeos_focus_interventions
        WHERE user_id = $1 AND created_at >= $2
        ORDER BY created_at DESC`,
      [userId, startOfToday()],
    );

    const actualMinutes = sessions.reduce((sum, row) => sum + Number(row.actual_minutes || 0), 0);
    const plannedMinutes = sessions.reduce((sum, row) => sum + Number(row.planned_minutes || 0), 0);
    const successfulRecoveries = interventions.filter((row) => row.recovered_focus === true).length;
    const effectivenessValues = interventions
      .map((row) => Number(row.effectiveness))
      .filter((value) => Number.isFinite(value) && value > 0);
    const effectivenessAverage = effectivenessValues.length
      ? effectivenessValues.reduce((sum, value) => sum + value, 0) / effectivenessValues.length
      : null;

    const onTaskRatio = plannedMinutes > 0
      ? Math.max(0, Math.min(1, actualMinutes / plannedMinutes))
      : null;

    return {
      active_session: active,
      session_count: sessions.length,
      planned_minutes: Math.round(plannedMinutes),
      actual_minutes: Math.round(actualMinutes),
      on_task_ratio: onTaskRatio,
      interventions_count: interventions.length,
      successful_recoveries: successfulRecoveries,
      intervention_effectiveness: effectivenessAverage ? Number(effectivenessAverage.toFixed(2)) : null,
      interventions,
      sessions,
    };
  }

  async function getActivePrivacyWindow(userId) {
    const { rows } = await pool.query(
      `SELECT *
         FROM lifeos_privacy_windows
        WHERE user_id = $1 AND status = 'active' AND started_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW())
        ORDER BY started_at DESC
        LIMIT 1`,
      [userId],
    );
    return rows[0] || null;
  }

  async function startPrivacyWindow({ userId, durationMinutes = 120, reason = null, source = 'manual', mode = 'pause_capture', metadata = {} }) {
    await pool.query(
      `UPDATE lifeos_privacy_windows
          SET status = 'ended', ended_at = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );
    const minutes = Math.max(5, parseInt(durationMinutes, 10) || 120);
    const { rows } = await pool.query(
      `INSERT INTO lifeos_privacy_windows
         (user_id, mode, status, started_at, ends_at, duration_minutes, reason, source, metadata)
       VALUES ($1, $2, 'active', NOW(), NOW() + ($3 || ' minutes')::interval, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [userId, mode, minutes, reason, source, JSON.stringify(metadata || {})],
    );
    return rows[0];
  }

  async function stopPrivacyWindow({ userId, windowId = null, reason = null }) {
    const { rows } = await pool.query(
      `UPDATE lifeos_privacy_windows
          SET status = 'ended', ended_at = NOW(), reason = COALESCE($3, reason), updated_at = NOW()
        WHERE user_id = $1
          AND status = 'active'
          AND ($2::bigint IS NULL OR id = $2)
        RETURNING *`,
      [userId, windowId, reason],
    );
    return rows[0] || null;
  }

  async function listPrivacyWindows(userId, { days = 7 } = {}) {
    const { rows } = await pool.query(
      `SELECT *
         FROM lifeos_privacy_windows
        WHERE user_id = $1 AND started_at >= NOW() - ($2 || ' days')::interval
        ORDER BY started_at DESC`,
      [userId, parseInt(days, 10) || 7],
    );
    return rows;
  }

  async function queueRedactionJob({ userId, startAt, endAt, reason = null, source = 'manual' }) {
    const { rows: windows } = await pool.query(
      `INSERT INTO lifeos_privacy_windows
         (user_id, mode, status, started_at, ends_at, ended_at, duration_minutes, reason, source, metadata)
       VALUES (
         $1,
         'redact_window',
         'redacted',
         $2,
         $3,
         NOW(),
         GREATEST(1, FLOOR(EXTRACT(EPOCH FROM ($3::timestamptz - $2::timestamptz)) / 60)),
         $4,
         $5,
         '{}'::jsonb
       )
       RETURNING *`,
      [userId, startAt, endAt, reason, source],
    );
    const privacyWindow = windows[0];
    const { rows } = await pool.query(
      `INSERT INTO lifeos_redaction_jobs
         (user_id, privacy_window_id, start_at, end_at, status, reason)
       VALUES ($1, $2, $3, $4, 'queued', $5)
       RETURNING *`,
      [userId, privacyWindow.id, startAt, endAt, reason],
    );
    return { privacy_window: privacyWindow, job: rows[0] };
  }

  function parseCommand(text) {
    const raw = String(text || '').trim();
    const normalized = raw.toLowerCase();
    if (!raw) return { ok: false, error: 'command text is required' };

    let match = normalized.match(/privacy(?: mode)?(?: on)?(?: for)?\s+(\d+)\s*(hours?|hrs?|hr|minutes?|mins?|min)\b/);
    if (match) {
      const durationMinutes = toMinutes(match[1], match[2]);
      return {
        ok: true,
        type: 'start_privacy',
        payload: { duration_minutes: durationMinutes, reason: raw },
        spoken_confirmation: `Privacy mode on for ${durationMinutes >= 60 && durationMinutes % 60 === 0 ? durationMinutes / 60 + ' hour' + (durationMinutes === 60 ? '' : 's') : durationMinutes + ' minutes'}.`,
      };
    }

    match = normalized.match(/(?:dump|redact|delete) (?:the )?(?:last|previous)\s+(\d+)\s*(hours?|hrs?|hr|minutes?|mins?|min)\b/);
    if (match) {
      const durationMinutes = toMinutes(match[1], match[2]);
      return {
        ok: true,
        type: 'redact_window',
        payload: { duration_minutes: durationMinutes, reason: raw },
        spoken_confirmation: `Queued a privacy dump for the last ${durationMinutes >= 60 && durationMinutes % 60 === 0 ? durationMinutes / 60 + ' hour' + (durationMinutes === 60 ? '' : 's') : durationMinutes + ' minutes'}.`,
      };
    }

    if (/privacy(?: mode)? (?:off|stop|end)\b/.test(normalized)) {
      return {
        ok: true,
        type: 'stop_privacy',
        payload: { reason: raw },
        spoken_confirmation: 'Privacy mode off.',
      };
    }

    match = normalized.match(/(?:start )?focus(?: block| session)?(?: for)?\s+(\d+)\s*(hours?|hrs?|hr|minutes?|mins?|min)(?:\s+(?:on|for|to)\s+(.+))?/);
    if (match) {
      const durationMinutes = toMinutes(match[1], match[2]);
      const intention = match[3] ? raw.slice(raw.toLowerCase().indexOf(match[3])).trim() : 'Focused work';
      return {
        ok: true,
        type: 'start_focus',
        payload: { planned_minutes: durationMinutes, intention },
        spoken_confirmation: `Focus block started for ${durationMinutes >= 60 && durationMinutes % 60 === 0 ? durationMinutes / 60 + ' hour' + (durationMinutes === 60 ? '' : 's') : durationMinutes + ' minutes'} on ${intention}.`,
      };
    }

    match = normalized.match(/(?:start )?focus(?: block| session)?(?: on|for|to)\s+(.+)/);
    if (match) {
      const intention = raw.slice(raw.toLowerCase().indexOf(match[1])).trim();
      return {
        ok: true,
        type: 'start_focus',
        payload: { planned_minutes: 60, intention },
        spoken_confirmation: `Focus block started for 60 minutes on ${intention}.`,
      };
    }

    if (/(?:stop|end) focus\b/.test(normalized)) {
      return {
        ok: true,
        type: 'stop_focus',
        payload: { status: 'completed', notes: raw },
        spoken_confirmation: 'Focus block ended.',
      };
    }

    return { ok: false, error: 'Could not understand command' };
  }

  async function executeCommand({ userId, text }) {
    const parsed = parseCommand(text);
    const { rows: loggedRows } = await pool.query(
      `INSERT INTO lifeos_command_log (user_id, command_text, parsed_action, parsed_payload, executed)
       VALUES ($1, $2, $3, $4::jsonb, FALSE)
       RETURNING id`,
      [userId, text, parsed.ok ? parsed.type : null, JSON.stringify(parsed.payload || {})],
    );
    const commandLogId = loggedRows[0]?.id ?? null;
    if (!parsed.ok) return parsed;

    let result = null;
    if (parsed.type === 'start_privacy') {
      result = await startPrivacyWindow({ userId, durationMinutes: parsed.payload.duration_minutes, reason: parsed.payload.reason, source: 'command' });
    } else if (parsed.type === 'stop_privacy') {
      result = await stopPrivacyWindow({ userId, reason: parsed.payload.reason });
    } else if (parsed.type === 'redact_window') {
      const endAt = new Date();
      const startAt = new Date(Date.now() - parsed.payload.duration_minutes * 60 * 1000);
      result = await queueRedactionJob({ userId, startAt, endAt, reason: parsed.payload.reason, source: 'command' });
    } else if (parsed.type === 'start_focus') {
      result = await startFocusSession({ userId, plannedMinutes: parsed.payload.planned_minutes, intention: parsed.payload.intention, source: 'command' });
    } else if (parsed.type === 'stop_focus') {
      const active = await getActiveFocusSession(userId);
      if (!active) {
        return { ok: false, error: 'No active focus block to end' };
      }
      result = await endFocusSession({ sessionId: active.id, userId, status: parsed.payload.status, notes: parsed.payload.notes });
    }

    if (commandLogId) {
      await pool.query(
        `UPDATE lifeos_command_log
            SET executed = TRUE
          WHERE id = $1`,
        [commandLogId],
      ).catch(() => {});
    }

    return { ...parsed, result };
  }

  return {
    getActiveFocusSession,
    startFocusSession,
    endFocusSession,
    logIntervention,
    getTodayFocusSummary,
    getActivePrivacyWindow,
    startPrivacyWindow,
    stopPrivacyWindow,
    listPrivacyWindows,
    queueRedactionJob,
    parseCommand,
    executeCommand,
  };
}
