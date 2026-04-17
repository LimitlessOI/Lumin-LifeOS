/**
 * services/lifeos-calendar.js
 *
 * LifeOS native calendar domain plus Google Calendar adapter.
 * Stores LifeOS events locally and can import/sync upcoming events
 * from the user's connected Google primary calendar.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const GOOGLE_PROVIDER = 'google_calendar';
const DEFAULT_LANE = 'personal';
const SYNC_LOOKAHEAD_DAYS = 30;

function normalizePublicBaseUrl() {
  const raw = String(process.env.RAILWAY_PUBLIC_DOMAIN || process.env.PUBLIC_BASE_URL || 'http://localhost:8080').trim();
  if (!raw) return 'http://localhost:8080';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

async function getGoogleAuthModule() {
  const m = await import('google-auth-library');
  return m;
}

async function getGoogleApis() {
  const m = await import('googleapis');
  return m.google;
}

export function createLifeOSCalendarService(pool) {
  async function requireGoogleConfig() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google Calendar is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
    }
  }

  async function getOAuthClient() {
    await requireGoogleConfig();
    const { OAuth2Client } = await getGoogleAuthModule();
    return new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${normalizePublicBaseUrl()}/api/v1/lifeos/engine/calendar/google/callback`
    );
  }

  async function ensureDefaultCalendar(userId) {
    const { rows: existing } = await pool.query(
      `SELECT *
         FROM lifeos_calendars
        WHERE user_id = $1
          AND provider = 'lifeos'
          AND provider_calendar_id = 'lifeos-default'
          AND active = true
        LIMIT 1`,
      [userId]
    );
    if (existing[0]) return existing[0];
    const { rows } = await pool.query(
      `INSERT INTO lifeos_calendars (
          user_id, provider, provider_calendar_id, name, lane, color, is_primary, sync_enabled, metadata
       ) VALUES ($1, 'lifeos', 'lifeos-default', 'LifeOS Calendar', $2, $3, true, false, '{}'::jsonb)
       RETURNING *`,
      [userId, DEFAULT_LANE, '#5b6af5']
    );
    return rows[0];
  }

  async function upsertGoogleCalendar(userId) {
    const { rows: existing } = await pool.query(
      `SELECT *
         FROM lifeos_calendars
        WHERE user_id = $1
          AND provider = 'google'
          AND provider_calendar_id = 'primary'
        LIMIT 1`,
      [userId]
    );
    if (existing[0]) return existing[0];
    const { rows } = await pool.query(
      `INSERT INTO lifeos_calendars (
          user_id, provider, provider_calendar_id, name, lane, color, is_primary, sync_enabled, metadata
       ) VALUES ($1, 'google', 'primary', 'Google Calendar', $2, $3, false, true, '{}'::jsonb)
       RETURNING *`,
      [userId, DEFAULT_LANE, '#34d399']
    );
    return rows[0];
  }

  async function listCalendars(userId) {
    await ensureDefaultCalendar(userId);
    const { rows } = await pool.query(
      `SELECT *
         FROM lifeos_calendars
        WHERE user_id = $1 AND active = true
        ORDER BY is_primary DESC, provider, name`,
      [userId]
    );
    return rows;
  }

  async function listEvents(userId, { from = null, to = null, lane = '', limit = 100 } = {}) {
    const values = [userId];
    const where = ['e.user_id = $1'];
    if (from) {
      values.push(from);
      where.push(`e.ends_at >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      where.push(`e.starts_at <= $${values.length}`);
    }
    if (lane) {
      values.push(lane);
      where.push(`COALESCE(e.lane, c.lane, '${DEFAULT_LANE}') = $${values.length}`);
    }
    values.push(Number(limit) || 100);
    const { rows } = await pool.query(
      `SELECT e.*, c.name AS calendar_name, c.provider AS calendar_provider
         FROM lifeos_calendar_events e
         LEFT JOIN lifeos_calendars c ON c.id = e.calendar_id
        WHERE ${where.join(' AND ')}
          AND e.status <> 'deleted'
        ORDER BY e.starts_at ASC
        LIMIT $${values.length}`,
      values
    );
    return rows;
  }

  async function createEvent(userId, payload = {}) {
    const calendar = await ensureDefaultCalendar(userId);
    const title = String(payload.title || '').trim();
    if (!title) throw new Error('title is required');
    const startsAt = payload.starts_at || payload.startsAt;
    const endsAt = payload.ends_at || payload.endsAt;
    if (!startsAt || !endsAt) throw new Error('starts_at and ends_at are required');
    const { rows } = await pool.query(
      `INSERT INTO lifeos_calendar_events (
          user_id, calendar_id, source, title, description, location,
          starts_at, ends_at, all_day, lane, status, metadata
       ) VALUES (
          $1, $2, 'manual', $3, $4, $5,
          $6, $7, $8, $9, 'confirmed', $10::jsonb
       ) RETURNING *`,
      [
        userId,
        calendar.id,
        title,
        payload.description || '',
        payload.location || '',
        startsAt,
        endsAt,
        Boolean(payload.all_day || payload.allDay),
        payload.lane || calendar.lane || DEFAULT_LANE,
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return rows[0];
  }

  async function updateEvent(userId, eventId, payload = {}) {
    const { rows: existingRows } = await pool.query(
      `SELECT * FROM lifeos_calendar_events WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [eventId, userId]
    );
    const existing = existingRows[0];
    if (!existing) return null;
    const next = {
      title: String(payload.title ?? existing.title).trim(),
      description: payload.description ?? existing.description,
      location: payload.location ?? existing.location,
      starts_at: payload.starts_at ?? payload.startsAt ?? existing.starts_at,
      ends_at: payload.ends_at ?? payload.endsAt ?? existing.ends_at,
      all_day: payload.all_day ?? payload.allDay ?? existing.all_day,
      lane: payload.lane ?? existing.lane,
      status: payload.status ?? existing.status,
      metadata: payload.metadata ?? existing.metadata ?? {},
    };
    const { rows } = await pool.query(
      `UPDATE lifeos_calendar_events
          SET title = $3,
              description = $4,
              location = $5,
              starts_at = $6,
              ends_at = $7,
              all_day = $8,
              lane = $9,
              status = $10,
              metadata = $11::jsonb,
              updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [
        eventId,
        userId,
        next.title,
        next.description,
        next.location,
        next.starts_at,
        next.ends_at,
        Boolean(next.all_day),
        next.lane || DEFAULT_LANE,
        next.status,
        JSON.stringify(next.metadata || {}),
      ]
    );
    return rows[0] || null;
  }

  async function deleteEvent(userId, eventId) {
    const { rowCount } = await pool.query(
      `UPDATE lifeos_calendar_events
          SET status = 'deleted', updated_at = NOW()
        WHERE id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    return rowCount > 0;
  }

  async function getGoogleStatus(userHandle = 'adam', userId = null) {
    const { rows } = await pool.query(
      `SELECT updated_at FROM user_integrations WHERE user_id = $1 AND provider = $2 LIMIT 1`,
      [String(userHandle), GOOGLE_PROVIDER]
    );
    const calendars = userId ? await listCalendars(userId) : [];
    return {
      connected: Boolean(rows[0]),
      connectedSince: rows[0]?.updated_at || null,
      calendars,
    };
  }

  async function getGoogleConnectUrl(userHandle = 'adam') {
    const auth = await getOAuthClient();
    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
      state: String(userHandle || 'adam'),
      prompt: 'consent',
    });
    return { authUrl };
  }

  async function handleGoogleCallback(code, userHandle = 'adam') {
    const auth = await getOAuthClient();
    const { tokens } = await auth.getToken(code);
    await pool.query(
      `INSERT INTO user_integrations (user_id, provider, tokens, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (user_id, provider)
       DO UPDATE SET tokens = EXCLUDED.tokens, updated_at = NOW()`,
      [String(userHandle), GOOGLE_PROVIDER, JSON.stringify(tokens)]
    );
    return { connected: true, user: String(userHandle) };
  }

  async function getGoogleAuthedClient(userHandle = 'adam') {
    const { rows } = await pool.query(
      `SELECT tokens FROM user_integrations WHERE user_id = $1 AND provider = $2 LIMIT 1`,
      [String(userHandle), GOOGLE_PROVIDER]
    );
    if (!rows[0]) return null;
    const auth = await getOAuthClient();
    const tokens = typeof rows[0].tokens === 'string' ? JSON.parse(rows[0].tokens) : rows[0].tokens;
    auth.setCredentials(tokens);
    auth.on('tokens', async (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      await pool.query(
        `UPDATE user_integrations SET tokens = $3::jsonb, updated_at = NOW() WHERE user_id = $1 AND provider = $2`,
        [String(userHandle), GOOGLE_PROVIDER, JSON.stringify(merged)]
      ).catch(() => {});
    });
    return auth;
  }

  async function syncGooglePrimaryCalendar(userId, userHandle = 'adam') {
    const auth = await getGoogleAuthedClient(userHandle);
    if (!auth) throw new Error('Google Calendar is not connected for this user.');
    const google = await getGoogleApis();
    const calendarApi = google.calendar({ version: 'v3', auth });
    const googleCalendar = await upsertGoogleCalendar(userId);
    const timeMin = new Date();
    const timeMax = new Date(Date.now() + SYNC_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
    const response = await calendarApi.events.list({
      calendarId: 'primary',
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });
    const items = response.data.items || [];
    for (const item of items) {
      const startDateTime = item.start?.dateTime || item.start?.date;
      const endDateTime = item.end?.dateTime || item.end?.date || startDateTime;
      if (!startDateTime || !endDateTime) continue;
      const allDay = Boolean(item.start?.date && !item.start?.dateTime);
      await pool.query(
        `INSERT INTO lifeos_calendar_events (
            user_id, calendar_id, source, provider_event_id, title, description, location,
            starts_at, ends_at, all_day, lane, status, metadata
         ) VALUES (
            $1, $2, 'google_sync', $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12::jsonb
         )
         ON CONFLICT (calendar_id, provider_event_id)
         DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            location = EXCLUDED.location,
            starts_at = EXCLUDED.starts_at,
            ends_at = EXCLUDED.ends_at,
            all_day = EXCLUDED.all_day,
            lane = EXCLUDED.lane,
            status = EXCLUDED.status,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()`,
        [
          userId,
          googleCalendar.id,
          item.id,
          item.summary || '(untitled)',
          item.description || '',
          item.location || '',
          startDateTime,
          endDateTime,
          allDay,
          DEFAULT_LANE,
          item.status || 'confirmed',
          JSON.stringify({ htmlLink: item.htmlLink || '', attendees: item.attendees || [], provider: 'google' }),
        ]
      );
    }
    await pool.query(`UPDATE lifeos_calendars SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1`, [googleCalendar.id]);
    return {
      synced: items.length,
      calendar: googleCalendar,
      window: { from: timeMin.toISOString(), to: timeMax.toISOString() },
    };
  }

  return {
    ensureDefaultCalendar,
    listCalendars,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getGoogleStatus,
    getGoogleConnectUrl,
    handleGoogleCallback,
    syncGooglePrimaryCalendar,
  };
}
