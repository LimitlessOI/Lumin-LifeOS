/**
 * services/mediator-service.js — Amendment 16 (Word Keeper)
 *
 * Conflict de-escalation AI. Uses Gemini as the empathy engine.
 * Both parties must consent before storage or AI analysis is triggered.
 * Non-negotiable: never stored without consent. Not a therapy tool.
 * Crisis phrases → immediately route to professional resources.
 *
 * Exports: createMediatorService(pool, councilService)
 */

// Crisis phrases that trigger immediate professional resource routing
const CRISIS_PHRASES = [
  /\bI want to (?:hurt|kill|harm)\b/i,
  /\bI(?:'m| am) going to (?:hurt|kill|harm)\b/i,
  /\bkill (?:myself|yourself|him|her|them)\b/i,
  /\bI(?:'m| am) going to end (?:it|my life)\b/i,
  /\bI(?:'ve| have) been (?:hurt|abused|hit|threatened)\b/i,
  /\bthreaten(?:ing)? (?:me|you|us)\b/i,
  /\bphysically? (?:hurt|harm|attacked)\b/i,
];

const CRISIS_RESOURCES = `If you or someone you know is in danger, please reach out immediately:
• 988 Suicide & Crisis Lifeline: call or text 988
• National Domestic Violence Hotline: 1-800-799-7233
• Crisis Text Line: Text HOME to 741741
• Emergency: 911

This system is not a substitute for professional help.`;

function checkCrisis(text) {
  if (!text) return false;
  return CRISIS_PHRASES.some(re => re.test(text));
}

export function createMediatorService(pool, councilService) {
  // ── Start a new mediator session ─────────────────────────────────────────
  async function startSession({ userId = 'adam', otherParty = null, triggerMethod = 'manual' } = {}) {
    if (!pool) return null;

    const { rows } = await pool.query(`
      INSERT INTO mediator_sessions (user_id, other_party, trigger_method, status, consent_both)
      VALUES ($1, $2, $3, 'active', FALSE)
      RETURNING id, created_at
    `, [userId, otherParty, triggerMethod]);

    return {
      sessionId: rows[0].id,
      createdAt: rows[0].created_at,
      message: otherParty
        ? `Mediator session started. ${otherParty} has not yet consented to storage. ` +
          `You can each share your perspective privately. Analysis only runs if both consent.`
        : `Mediator session started. Share your perspective privately. ` +
          `Analysis only runs if both parties consent.`,
    };
  }

  // ── Submit a statement from one party ────────────────────────────────────
  async function submitStatement(sessionId, { party, statement, userId = 'adam' }) {
    if (!pool) return null;

    // Crisis check — non-negotiable
    if (checkCrisis(statement)) {
      // Log crisis detection (no statement stored)
      await pool.query(`
        UPDATE mediator_sessions SET crisis_detected = TRUE,
          crisis_phrase = $1, status = 'closed'
        WHERE id = $2
      `, ['Crisis phrase detected — see logs', sessionId]);

      return {
        crisis: true,
        message: CRISIS_RESOURCES,
        sessionClosed: true,
      };
    }

    // party must be 'a' or 'b'
    const col = party === 'b' ? 'statement_b' : 'statement_a';
    const timeCol = party === 'b' ? 'statement_b_at' : 'statement_a_at';

    await pool.query(`
      UPDATE mediator_sessions SET ${col} = $1, ${timeCol} = NOW()
      WHERE id = $2
    `, [statement, sessionId]);

    return {
      crisis: false,
      received: true,
      party,
      message: party === 'b'
        ? `Your perspective has been received privately. If both parties consent, the mediator can provide analysis.`
        : `Your perspective has been received privately. Share with ${userId === 'adam' ? 'the other person' : 'Adam'} that they can now share their side.`,
    };
  }

  // ── Grant consent from a party ────────────────────────────────────────────
  // Bug fix: one call was setting consent_both = TRUE unilaterally.
  // Now tracks consent_a and consent_b separately. consent_both only becomes
  // true when BOTH have consented — enforced here, not in the caller.
  async function grantConsent(sessionId, { party = 'a' } = {}) {
    if (!pool) return null;

    // Validate party — only 'a' or 'b' accepted
    if (!['a', 'b'].includes(party)) {
      return { error: "party must be 'a' or 'b'" };
    }

    // Set the individual party's consent flag
    const consentCol = party === 'b' ? 'consent_b' : 'consent_a';

    // consent_both = TRUE only when BOTH parties have consented
    // We set the individual flag and let the DB compute consent_both
    await pool.query(`
      UPDATE mediator_sessions
      SET ${consentCol} = TRUE,
          consent_both = (consent_a OR $1) AND (consent_b OR $2)
      WHERE id = $3
    `, [party === 'a', party === 'b', sessionId]);

    // Re-fetch to get current state
    const { rows } = await pool.query(
      'SELECT * FROM mediator_sessions WHERE id = $1', [sessionId]
    );
    const session = rows[0];
    if (!session) return { error: 'Session not found' };

    if (session.consent_both && session.statement_a && session.statement_b) {
      return await runAnalysis(sessionId, session);
    }

    const bothConsented = session.consent_both;
    return {
      consentGranted: true,
      party,
      bothConsented,
      readyForAnalysis: bothConsented && !!(session.statement_a && session.statement_b),
      message: !bothConsented
        ? 'Your consent recorded. Waiting for the other party to also consent before any analysis runs.'
        : !session.statement_b
          ? 'Both consented. Waiting for the other party to share their perspective.'
          : 'Both consented. Analysis will run now.',
    };
  }

  // ── Run AI analysis (Gemini — empathy engine) ─────────────────────────────
  async function runAnalysis(sessionId, session) {
    if (!pool || !councilService) return null;

    if (!session) {
      const { rows } = await pool.query('SELECT * FROM mediator_sessions WHERE id = $1', [sessionId]);
      session = rows[0];
    }

    if (!session?.consent_both) {
      return { error: 'Both parties must consent before analysis can run.' };
    }

    if (!session.statement_a || !session.statement_b) {
      return { error: 'Both parties must share a statement before analysis.' };
    }

    const prompt = `You are a compassionate, neutral mediator. Analyze both perspectives and help each person understand the other.

Person A's statement: "${session.statement_a}"
Person B's statement: "${session.statement_b}"

Rules:
- Be completely neutral — no side-taking
- Focus on needs and feelings, not positions
- Offer practical bridge statements
- If you detect any safety concerns → immediately note them

Return ONLY valid JSON:
{
  "summaryA": "neutral 1-2 sentence summary of Person A's position",
  "summaryB": "neutral 1-2 sentence summary of Person B's position",
  "needsA": "what Person A likely needs/fears (1 sentence)",
  "needsB": "what Person B likely needs/fears (1 sentence)",
  "deescalation": [
    "suggestion 1 (concrete action either person can take)",
    "suggestion 2",
    "suggestion 3"
  ],
  "bridgeA": "something Person A could say to Person B to open dialogue",
  "bridgeB": "something Person B could say to Person A to open dialogue",
  "safetyConcern": null
}`;

    try {
      const response = await councilService.ask(prompt, {
        model: 'gemini',
        taskType: 'analysis',
        temperature: 0.4,
        systemPrompt: 'You are a compassionate neutral mediator. Return only valid JSON.',
      });

      const text = (response?.content || response?.text || response || '').trim();
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      const analysis = JSON.parse(cleaned);

      // Store analysis (consent already granted)
      await pool.query(`
        UPDATE mediator_sessions SET
          ai_summary_a = $1, ai_summary_b = $2,
          ai_needs_a = $3, ai_needs_b = $4,
          deescalation_suggestions = $5,
          bridge_statements = $6,
          status = 'analysis_ready'
        WHERE id = $7
      `, [
        analysis.summaryA, analysis.summaryB,
        analysis.needsA, analysis.needsB,
        JSON.stringify(analysis.deescalation),
        JSON.stringify({ a: analysis.bridgeA, b: analysis.bridgeB }),
        sessionId,
      ]);

      return {
        analysisReady: true,
        sessionId,
        analysis: {
          summaryA: analysis.summaryA,
          summaryB: analysis.summaryB,
          needsA: analysis.needsA,
          needsB: analysis.needsB,
          deescalation: analysis.deescalation,
          bridgeA: analysis.bridgeA,
          bridgeB: analysis.bridgeB,
        },
        safetyConcern: analysis.safetyConcern || null,
      };
    } catch (err) {
      console.warn('[MediatorService] Gemini analysis failed:', err.message);
      return { error: 'Analysis unavailable — please try again.' };
    }
  }

  // ── Get analysis for a session ─────────────────────────────────────────────
  async function getAnalysis(sessionId) {
    if (!pool) return null;

    const { rows } = await pool.query(
      'SELECT * FROM mediator_sessions WHERE id = $1', [sessionId]
    );
    const session = rows[0];
    if (!session) return { error: 'Session not found' };

    if (!session.consent_both) {
      return { error: 'Both parties must consent before analysis is available.' };
    }

    if (session.status === 'active' && session.statement_a && session.statement_b) {
      return await runAnalysis(sessionId, session);
    }

    if (session.status !== 'analysis_ready') {
      return { status: session.status, message: 'Analysis not yet available.' };
    }

    return {
      analysisReady: true,
      sessionId,
      analysis: {
        summaryA: session.ai_summary_a,
        summaryB: session.ai_summary_b,
        needsA: session.ai_needs_a,
        needsB: session.ai_needs_b,
        deescalation: session.deescalation_suggestions,
        bridgeStatements: session.bridge_statements,
      },
    };
  }

  // ── Close a session ───────────────────────────────────────────────────────
  async function closeSession(sessionId) {
    if (!pool) return null;
    await pool.query(
      `UPDATE mediator_sessions SET status = 'closed' WHERE id = $1`, [sessionId]
    );
    return { closed: true, sessionId };
  }

  return {
    startSession,
    submitStatement,
    grantConsent,
    runAnalysis,
    getAnalysis,
    closeSession,
    CRISIS_RESOURCES,
  };
}
