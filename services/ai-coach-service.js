/**
 * SYNOPSIS: Exports createAiCoachService — services/ai-coach-service.js.
 */
export function createAiCoachService({ pool, callCouncilMember }) {
  async function createInterview({ founderId, consentRecord, transcript, metadata = {} }) {
    const normalizedTranscript = String(transcript || '').trim();
    if (!founderId) {
      const err = new Error('founder_id_required');
      err.status = 400;
      throw err;
    }
    if (!consentRecord) {
      const err = new Error('consent_record_required');
      err.status = 400;
      throw err;
    }
    if (!normalizedTranscript) {
      const err = new Error('transcript_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO coaching_sessions (founder_id, consent_record)
       VALUES ($1, $2)
       RETURNING *`,
      [founderId, consentRecord],
    );

    const session = rows[0];
    return {
      ...session,
      transcript: normalizedTranscript,
      metadata: metadata || {},
    };
  }

  async function extractStoriesFromSession({ sessionId, founderId = null, transcript = null, metadata = {} }) {
    if (!sessionId && !transcript) {
      const err = new Error('session_id_or_transcript_required');
      err.status = 400;
      throw err;
    }

    let session = null;
    if (sessionId) {
      const params = founderId
        ? [sessionId, founderId]
        : [sessionId];
      const query = founderId
        ? `SELECT * FROM coaching_sessions WHERE session_id = $1 AND founder_id = $2 LIMIT 1`
        : `SELECT * FROM coaching_sessions WHERE session_id = $1 LIMIT 1`;
      const { rows } = await pool.query(query, params);
      session = rows[0] || null;
      if (!session) {
        const err = new Error('coaching_session_not_found');
        err.status = 404;
        throw err;
      }
    }

    const coachingText = String(transcript || metadata.transcript || '').trim();
    if (!coachingText && !session) {
      const err = new Error('transcript_required');
      err.status = 400;
      throw err;
    }

    const promptPayload = {
      purpose: 'Extract stories from coaching sessions',
      session: session
        ? {
            session_id: session.session_id,
            founder_id: session.founder_id,
            consent_record: session.consent_record,
            timestamp: session.timestamp,
          }
        : null,
      transcript: coachingText,
      metadata: metadata || {},
    };

    const result = await callCouncilMember(
      'openai',
      {
        task: 'Extract stories from coaching sessions',
        input: promptPayload,
      },
      { taskType: 'general' },
    );

    return {
      session,
      result,
    };
  }

  async function listSessionsByFounder(founderId, { limit = 50 } = {}) {
    if (!founderId) {
      const err = new Error('founder_id_required');
      err.status = 400;
      throw err;
    }

    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const { rows } = await pool.query(
      `SELECT * FROM coaching_sessions
       WHERE founder_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [founderId, lim],
    );
    return rows;
  }

  async function getSession(sessionId, founderId = null) {
    if (!sessionId) {
      const err = new Error('session_id_required');
      err.status = 400;
      throw err;
    }

    const params = founderId ? [sessionId, founderId] : [sessionId];
    const query = founderId
      ? `SELECT * FROM coaching_sessions WHERE session_id = $1 AND founder_id = $2 LIMIT 1`
      : `SELECT * FROM coaching_sessions WHERE session_id = $1 LIMIT 1`;

    const { rows } = await pool.query(query, params);
    const session = rows[0] || null;
    if (!session) {
      const err = new Error('coaching_session_not_found');
      err.status = 404;
      throw err;
    }
    return session;
  }

  return {
    createInterview,
    extractStoriesFromSession,
    listSessionsByFounder,
    getSession,
  };
}