/**
 * SYNOPSIS: Conduct AI coaching interviews and extract stories from coaching sessions.
 * WIRED: service factory for MarketingOS coaching interviews
 * @ssot docs/products/MarketingOS/MarketingOS_HOME.md
 */

function normalizeText(value) {
  return String(value ?? '').trim();
}

function asJson(value) {
  return JSON.stringify(value ?? {});
}

function safeParseJson(value, fallback = null) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildInterviewPrompt({ founderContext, sessionContext, transcriptText }) {
  return [
    'You are an AI coaching interviewer for a founder marketing session.',
    'Your task is to extract story candidates from the coaching conversation.',
    'Return concise, structured output that identifies concrete founder stories, not generic advice.',
    '',
    `Founder context: ${founderContext || 'unknown'}`,
    `Session context: ${sessionContext || 'unknown'}`,
    '',
    'Transcript:',
    transcriptText,
  ].join('\n');
}

function parseAiStoryExtraction(raw) {
  const text = normalizeText(raw);
  if (!text) {
    return { stories: [], summary: '', raw };
  }

  const parsed = safeParseJson(text, null);
  if (parsed && typeof parsed === 'object') {
    const stories = Array.isArray(parsed.stories) ? parsed.stories : [];
    return {
      summary: normalizeText(parsed.summary || parsed.overview || ''),
      stories,
      raw,
    };
  }

  return {
    summary: '',
    stories: [
      {
        title: 'Extracted from coaching session',
        narrative: text,
      },
    ],
    raw,
  };
}

export function createAiCoachService({ pool, callCouncilMember }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('callCouncilMember_required');
  }

  async function createCoachingSession({ founderId, consentRecord, timestamp } = {}) {
    const founder = normalizeText(founderId);
    const consent = normalizeText(consentRecord);

    if (!founder) {
      const err = new Error('founder_id_required');
      err.status = 400;
      throw err;
    }
    if (!consent) {
      const err = new Error('consent_record_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO coaching_sessions (founder_id, consent_record, timestamp)
       VALUES ($1, $2, COALESCE($3::timestamptz, NOW()))
       RETURNING *`,
      [founder, consent, timestamp || null],
    );

    return rows[0];
  }

  async function getCoachingSession(sessionId) {
    const id = normalizeText(sessionId);
    if (!id) {
      const err = new Error('session_id_required');
      err.status = 400;
      throw err;
    }

    const { rows } = await pool.query(
      `SELECT * FROM coaching_sessions WHERE session_id = $1 LIMIT 1`,
      [id],
    );

    const session = rows[0];
    if (!session) {
      const err = new Error('session_not_found');
      err.status = 404;
      throw err;
    }

    return session;
  }

  async function listCoachingSessions({ founderId, limit = 50 } = {}) {
    const founder = normalizeText(founderId);
    if (!founder) {
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
      [founder, lim],
    );

    return rows;
  }

  async function extractStoriesFromSession({
    sessionId,
    founderContext,
    sessionContext,
    transcriptText,
  } = {}) {
    const transcript = normalizeText(transcriptText);
    if (!transcript) {
      const err = new Error('transcript_text_required');
      err.status = 400;
      throw err;
    }

    const session = sessionId ? await getCoachingSession(sessionId) : null;
    const prompt = buildInterviewPrompt({
      founderContext: founderContext || session?.founder_id || '',
      sessionContext: sessionContext || (session ? `session_id=${session.session_id}` : ''),
      transcriptText: transcript,
    });

    const result = await callCouncilMember(
      'openai',
      {
        prompt,
        transcript,
        founder_id: session?.founder_id || founderContext || null,
        coaching_session_id: session?.session_id || sessionId || null,
      },
      { taskType: 'general' },
    );

    const rawOutput =
      typeof result === 'string'
        ? result
        : result?.output ?? result?.text ?? result?.content ?? result?.message ?? '';

    const extracted = parseAiStoryExtraction(rawOutput);

    if (session?.session_id) {
      await pool.query(
        `UPDATE coaching_sessions
         SET timestamp = timestamp
         WHERE session_id = $1`,
        [session.session_id],
      );
    }

    return {
      session: session || null,
      extraction: extracted,
    };
  }

  async function conductInterview({
    founderId,
    consentRecord,
    transcriptText,
    founderContext,
    sessionContext,
    timestamp,
  } = {}) {
    const session = await createCoachingSession({ founderId, consentRecord, timestamp });
    const extraction = await extractStoriesFromSession({
      sessionId: session.session_id,
      founderContext: founderContext || founderId || '',
      sessionContext: sessionContext || '',
      transcriptText,
    });

    return {
      session,
      extraction: extraction.extraction,
    };
  }

  return {
    createCoachingSession,
    getCoachingSession,
    listCoachingSessions,
    extractStoriesFromSession,
    conductInterview,
  };
}