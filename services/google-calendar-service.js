/**
 * services/google-calendar-service.js — Amendment 16 (Word Keeper)
 *
 * Google Calendar integration for commitment scheduling.
 * Uses OAuth2 with stored tokens — user connects once via /api/v1/word-keeper/calendar/connect.
 *
 * Exports: createGoogleCalendarService(pool) → { getAuthUrl, handleCallback, addCommitment, removeCommitment }
 */

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const CALENDAR_ID = 'primary'; // Adam's primary calendar

function getOAuth2Client() {
  const { OAuth2Client } = await_import_google_auth();
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:8080'}/api/v1/word-keeper/calendar/callback`
  );
}

// Lazy import google-auth-library (optional dep — don't crash if missing)
async function await_import_google_auth() {
  try {
    const m = await import('google-auth-library');
    return m;
  } catch {
    throw new Error('google-auth-library not installed. Run: npm install google-auth-library googleapis');
  }
}

async function getGoogleApis() {
  try {
    const m = await import('googleapis');
    return m.google;
  } catch {
    throw new Error('googleapis not installed. Run: npm install google-auth-library googleapis');
  }
}

export function createGoogleCalendarService(pool) {
  // ── Get OAuth2 authorization URL ──────────────────────────────────────────
  async function getAuthUrl(userId = 'adam') {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return { error: 'GOOGLE_CLIENT_ID not configured. Add it to Railway env vars.' };
    }
    const auth = getOAuth2Client();
    const url = auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId, // passed back in callback
      prompt: 'consent', // force refresh token on first auth
    });
    return { authUrl: url };
  }

  // ── Handle OAuth2 callback — store tokens ─────────────────────────────────
  async function handleCallback(code, userId = 'adam') {
    const auth = getOAuth2Client();
    const { tokens } = await auth.getToken(code);

    // Store tokens in DB
    await pool.query(`
      INSERT INTO user_integrations (user_id, provider, tokens, updated_at)
      VALUES ($1, 'google_calendar', $2, NOW())
      ON CONFLICT (user_id, provider)
      DO UPDATE SET tokens = $2, updated_at = NOW()
    `, [userId, JSON.stringify(tokens)]);

    return { connected: true, userId };
  }

  // ── Get an authenticated client for a user ────────────────────────────────
  async function getAuthedClient(userId = 'adam') {
    const { rows } = await pool.query(`
      SELECT tokens FROM user_integrations
      WHERE user_id = $1 AND provider = 'google_calendar'
      LIMIT 1
    `, [userId]);

    if (!rows.length) return null;

    const auth = getOAuth2Client();
    const tokens = typeof rows[0].tokens === 'string'
      ? JSON.parse(rows[0].tokens)
      : rows[0].tokens;

    auth.setCredentials(tokens);

    // Auto-refresh if expired
    auth.on('tokens', async (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      await pool.query(`
        UPDATE user_integrations SET tokens = $1, updated_at = NOW()
        WHERE user_id = $2 AND provider = 'google_calendar'
      `, [JSON.stringify(merged), userId]).catch(() => {});
    });

    return auth;
  }

  // ── Add a commitment to Google Calendar ───────────────────────────────────
  async function addCommitment(commitmentId, commitment, userId = 'adam') {
    const auth = await getAuthedClient(userId);
    if (!auth) {
      return { error: 'Google Calendar not connected. Visit /api/v1/word-keeper/calendar/connect' };
    }

    const google = await getGoogleApis();
    const calendar = google.calendar({ version: 'v3', auth });

    const title = `✓ ${commitment.normalized_text || commitment.raw_text}`;
    const description = [
      commitment.to_person ? `To: ${commitment.to_person}` : '',
      commitment.category ? `Category: ${commitment.category}` : '',
      `Tracked by Word Keeper`,
    ].filter(Boolean).join('\n');

    // Build event time — all-day if no specific time, timed if we have a full datetime
    const deadline = commitment.deadline ? new Date(commitment.deadline) : null;
    let eventBody;

    if (deadline) {
      const hasTime = deadline.getHours() !== 0 || deadline.getMinutes() !== 0;
      if (hasTime) {
        eventBody = {
          start: { dateTime: deadline.toISOString(), timeZone: 'America/Los_Angeles' },
          end:   { dateTime: new Date(deadline.getTime() + 30 * 60000).toISOString(), timeZone: 'America/Los_Angeles' },
        };
      } else {
        const dateStr = deadline.toISOString().slice(0, 10);
        eventBody = {
          start: { date: dateStr },
          end:   { date: dateStr },
        };
      }
    } else {
      // No deadline — create as a reminder for today
      const today = new Date().toISOString().slice(0, 10);
      eventBody = {
        start: { date: today },
        end:   { date: today },
      };
    }

    try {
      const event = await calendar.events.insert({
        calendarId: CALENDAR_ID,
        resource: {
          summary: title,
          description,
          ...eventBody,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 60 },
              { method: 'popup', minutes: 1440 }, // 24h
            ],
          },
          colorId: '9', // Blueberry — stands out
        },
      });

      // Save event ID back to commitment
      await pool.query(`
        UPDATE commitments SET calendar_event_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [event.data.id, commitmentId]);

      return { added: true, eventId: event.data.id, eventLink: event.data.htmlLink };
    } catch (err) {
      console.error('[CALENDAR] addCommitment failed:', err.message);
      return { error: err.message };
    }
  }

  // ── Remove a commitment event from Google Calendar ────────────────────────
  async function removeCommitment(commitmentId, userId = 'adam') {
    // Get event ID from DB
    const { rows } = await pool.query(
      'SELECT calendar_event_id FROM commitments WHERE id = $1', [commitmentId]
    );
    const eventId = rows[0]?.calendar_event_id;
    if (!eventId) return { removed: false, reason: 'No calendar event on record' };

    const auth = await getAuthedClient(userId);
    if (!auth) return { removed: false, reason: 'Not connected to Google Calendar' };

    try {
      const google = await getGoogleApis();
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });

      await pool.query(`
        UPDATE commitments SET calendar_event_id = NULL, updated_at = NOW()
        WHERE id = $1
      `, [commitmentId]);

      return { removed: true };
    } catch (err) {
      return { removed: false, reason: err.message };
    }
  }

  // ── Check connection status ───────────────────────────────────────────────
  async function getStatus(userId = 'adam') {
    const { rows } = await pool.query(`
      SELECT updated_at FROM user_integrations
      WHERE user_id = $1 AND provider = 'google_calendar'
    `, [userId]);

    return {
      connected: rows.length > 0,
      connectedSince: rows[0]?.updated_at || null,
    };
  }

  return { getAuthUrl, handleCallback, addCommitment, removeCommitment, getStatus, getAuthedClient };
}
