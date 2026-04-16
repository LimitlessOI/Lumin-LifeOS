/**
 * services/mediation-engine.js
 *
 * LifeOS Mediation Engine — consent-first AI conflict facilitation.
 *
 * The AI mediator is strictly neutral. It never takes sides, never assigns
 * blame, and never decides anything for the parties. Its sole purpose is to
 * ensure each person feels genuinely heard before the other responds, and to
 * help both people find resolution they actually agree on.
 *
 * Works for: couples (LifeOS relationship layer), business disputes (guest
 * access via session code), or any two people who consent to the process.
 *
 * Exports:
 *   createMediationEngine({ pool, callAI, logger }) → MediationEngine
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createResponseVariety } from './response-variety.js';

// ── Word list for human-readable session codes ────────────────────────────────

const ADJECTIVES = [
  'calm', 'clear', 'gentle', 'open', 'still', 'quiet', 'steady', 'soft',
  'bright', 'warm', 'honest', 'patient', 'present', 'sincere', 'grounded',
  'humble', 'kind', 'safe', 'tender', 'whole',
];

const NOUNS = [
  'river', 'bridge', 'harbor', 'meadow', 'valley', 'path', 'shore', 'summit',
  'cedar', 'willow', 'stone', 'candle', 'lantern', 'spring', 'haven',
  'anchor', 'dawn', 'ember', 'hearth', 'tide',
];

// ── Factory ───────────────────────────────────────────────────────────────────

export function createMediationEngine({ pool, callAI, logger }) {

  const variety = createResponseVariety({ pool });

  // ── generateSessionCode ────────────────────────────────────────────────────

  function generateSessionCode() {
    const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num  = Math.floor(10 + Math.random() * 90); // 10–99
    return `${adj}-${noun}-${num}`;
  }

  // ── createSession ──────────────────────────────────────────────────────────

  async function createSession({ initiatorUserId, initiatorLabel, respondentLabel, respondentEmail, topic, sessionType }) {
    if (!initiatorLabel?.trim()) throw new Error('initiator_label is required');
    if (!topic?.trim())          throw new Error('topic is required');

    // Generate a unique code — retry on collision (extremely unlikely)
    let code;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateSessionCode();
      const { rows } = await pool.query(
        'SELECT id FROM mediation_sessions WHERE session_code=$1',
        [code]
      );
      if (rows.length === 0) break;
      if (attempt === 4) throw new Error('Could not generate a unique session code — please retry');
    }

    const { rows } = await pool.query(`
      INSERT INTO mediation_sessions
        (session_code, initiator_user_id, initiator_label, respondent_label,
         respondent_email, topic, session_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'invited')
      RETURNING *
    `, [
      code,
      initiatorUserId || null,
      initiatorLabel.trim(),
      respondentLabel?.trim() || null,
      respondentEmail?.trim() || null,
      topic.trim(),
      sessionType || 'personal',
    ]);

    logger?.info?.(`[MEDIATION] Session created: ${code} — "${topic}"`);
    return rows[0];
  }

  // ── acceptInvitation ───────────────────────────────────────────────────────

  async function acceptInvitation({ sessionCode, respondentUserId, respondentLabel }) {
    const session = await _requireSession(sessionCode, ['invited']);

    const updates = [];
    const vals    = [];
    let   idx     = 1;

    if (respondentUserId) { updates.push(`respondent_user_id=$${idx++}`); vals.push(respondentUserId); }
    if (respondentLabel?.trim() && !session.respondent_label) {
      updates.push(`respondent_label=$${idx++}`);
      vals.push(respondentLabel.trim());
    }

    updates.push(`respondent_consented_at=NOW()`);
    updates.push(`status='active'`);
    updates.push(`updated_at=NOW()`);

    vals.push(sessionCode);
    const { rows } = await pool.query(
      `UPDATE mediation_sessions SET ${updates.join(', ')} WHERE session_code=$${idx} RETURNING *`,
      vals
    );

    logger?.info?.(`[MEDIATION] Invitation accepted: ${sessionCode}`);
    return rows[0];
  }

  // ── recordConsent ──────────────────────────────────────────────────────────

  async function recordConsent({ sessionCode, party }) {
    _requireParty(party);
    await _requireSession(sessionCode);

    const col = party === 'initiator' ? 'initiator_consented_at' : 'respondent_consented_at';

    // Check both sides after this update to decide whether to activate
    const { rows: [updated] } = await pool.query(
      `UPDATE mediation_sessions
          SET ${col} = COALESCE(${col}, NOW()), updated_at = NOW()
        WHERE session_code = $1
       RETURNING *`,
      [sessionCode]
    );

    // If both parties have now consented, activate
    if (updated.initiator_consented_at && updated.respondent_consented_at && updated.status === 'invited') {
      const { rows } = await pool.query(
        `UPDATE mediation_sessions SET status='active', updated_at=NOW()
          WHERE session_code=$1 RETURNING *`,
        [sessionCode]
      );
      return rows[0];
    }

    return updated;
  }

  // ── setReady ───────────────────────────────────────────────────────────────

  async function setReady({ sessionCode, party }) {
    _requireParty(party);
    await _requireSession(sessionCode, ['active']);

    const col = party === 'initiator' ? 'initiator_ready' : 'respondent_ready';

    const { rows: [updated] } = await pool.query(
      `UPDATE mediation_sessions
          SET ${col} = TRUE, updated_at = NOW()
        WHERE session_code = $1
       RETURNING *`,
      [sessionCode]
    );

    // If both parties are ready, set the floor and begin round 1
    if (updated.initiator_ready && updated.respondent_ready && !updated.current_speaker) {
      const { rows } = await pool.query(
        `UPDATE mediation_sessions
            SET current_speaker = 'initiator', round_number = 1, updated_at = NOW()
          WHERE session_code = $1
         RETURNING *`,
        [sessionCode]
      );

      // Insert the opening mediator turn explaining the process
      await pool.query(`
        INSERT INTO mediation_turns
          (session_id, speaker, speaker_label, content, turn_type, round_number)
        VALUES ($1, 'mediator', 'Mediator', $2, 'opening', 1)
      `, [
        rows[0].id,
        `Welcome to this mediation session. I am here as a neutral facilitator — I will not take sides, assign blame, or decide anything for you. My role is to help each of you feel genuinely heard and to support you in finding a resolution you both agree on.\n\n${rows[0].initiator_label}, you will speak first. Please share what brought you here today — speak from your own experience. When you are ready, submit your statement.`,
      ]);

      logger?.info?.(`[MEDIATION] Both ready — session ${sessionCode} started round 1`);
      return rows[0];
    }

    return updated;
  }

  // ── submitStatement ────────────────────────────────────────────────────────

  async function submitStatement({ sessionCode, party, content }) {
    _requireParty(party);
    if (!content?.trim()) throw new Error('content is required');

    const session = await _requireSession(sessionCode, ['active']);

    if (session.current_speaker !== party) {
      throw new Error(`It is currently ${session.current_speaker}'s turn, not ${party}'s`);
    }

    // Determine display label
    const speakerLabel = party === 'initiator' ? session.initiator_label : session.respondent_label;

    // Insert the statement turn
    const { rows: [turn] } = await pool.query(`
      INSERT INTO mediation_turns
        (session_id, speaker, speaker_label, content, turn_type, round_number)
      VALUES ($1, $2, $3, $4, 'statement', $5)
      RETURNING *
    `, [session.id, party, speakerLabel, content.trim(), session.round_number]);

    // AI reflection — what was heard + underlying need
    let reflectionTurn = null;

    if (callAI) {
      try {
        const context = await _getAIPromptContext(session, await _getTurns(session.id));
        const mediatorSystemPrompt = [
          'You are a neutral mediator facilitating a structured conflict resolution session.',
          'You do not take sides. You do not assign blame. You do not make decisions for the parties.',
        ].join('\n');
        const mediatorUserPrompt = [
          '',
          'A party has just submitted the following statement:',
          `"${content.trim()}"`,
          '',
          context ? `Session context so far:\n${context}\n` : '',
          'Do two things:',
          '1. Reflect back what you heard in 1-2 sentences — do NOT use the phrase "What I heard you say was". Find a fresh way to reflect it.',
          '2. In a separate sentence, name the underlying need or feeling beneath the words.',
          '   Start that sentence with "Beneath that, it sounds like there is a need to..."',
          '   or "Beneath that, it sounds like there is a feeling of..."',
          '',
          'Respond with exactly two paragraphs separated by a blank line. No headers. No lists.',
        ].join('\n');

        // Resolve speaker userId for variety tracking (skip if guest — no user_id)
        const speakerUserId = party === 'initiator'
          ? session.initiator_user_id
          : session.respondent_user_id;

        let finalPrompt = mediatorSystemPrompt + mediatorUserPrompt;
        let varietyStyles = null;

        if (speakerUserId) {
          const wrapped = await variety.wrapPromptWithVariety({
            userId:       speakerUserId,
            systemPrompt: mediatorSystemPrompt,
            userPrompt:   mediatorUserPrompt,
          });
          finalPrompt = wrapped.systemPrompt + mediatorUserPrompt;
          varietyStyles = wrapped.styles;
        }

        const raw = typeof callAI === 'function' ? await callAI(finalPrompt) : null;
        const aiText = (typeof raw === 'string' ? raw : raw?.content || '').trim();

        // Split into reflection and underlying need
        const parts = aiText.split(/\n\n+/);
        const reflection    = parts[0]?.trim() || aiText;
        const underlyingNeed = parts[1]?.trim() || null;

        // Update the statement turn with the AI insight
        await pool.query(
          `UPDATE mediation_turns SET ai_reflection=$1, underlying_need=$2 WHERE id=$3`,
          [reflection, underlyingNeed, turn.id]
        );

        // Insert the mediator's reflection as its own turn
        const { rows: [rTurn] } = await pool.query(`
          INSERT INTO mediation_turns
            (session_id, speaker, speaker_label, content, turn_type, ai_reflection, underlying_need, round_number)
          VALUES ($1, 'mediator', 'Mediator', $2, 'reflection', $3, $4, $5)
          RETURNING *
        `, [
          session.id,
          aiText,
          reflection,
          underlyingNeed,
          session.round_number,
        ]);
        reflectionTurn = rTurn;

        // Log variety pattern for the speaker (if they have a userId)
        if (speakerUserId && varietyStyles && aiText) {
          await variety.logResponse({ userId: speakerUserId, styles: varietyStyles, responsePreview: aiText.substring(0, 100), context: 'mediation' });
        }

        logger?.info?.(`[MEDIATION] AI reflection generated for session ${sessionCode}`);
      } catch (err) {
        logger?.warn?.(`[MEDIATION] AI reflection failed: ${err.message}`);
      }
    }

    // Advance the floor to the other party
    const nextSpeaker = party === 'initiator' ? 'respondent' : 'initiator';
    await pool.query(
      `UPDATE mediation_sessions SET current_speaker=$1, updated_at=NOW() WHERE session_code=$2`,
      [nextSpeaker, sessionCode]
    );

    return { turn, reflection: reflectionTurn };
  }

  // ── proposeResolution ──────────────────────────────────────────────────────

  async function proposeResolution({ sessionCode }) {
    const session = await _requireSession(sessionCode, ['active']);
    const turns   = await _getTurns(session.id);

    const statementTurns = turns.filter(t => t.turn_type === 'statement');
    if (statementTurns.length < 2) {
      throw new Error('Both parties must submit at least one statement before a resolution can be proposed');
    }

    if (!callAI) {
      throw new Error('AI is not available — cannot generate resolution proposals');
    }

    const context = await _getAIPromptContext(session, turns);

    const proposalSystemPrompt = [
      'You are a neutral mediator facilitating a conflict resolution session.',
      'You do not take sides. You do not assign blame. You do not decide anything for the parties.',
      'You are here to help both people find a resolution they genuinely agree on.',
    ].join('\n');
    const proposalUserPrompt = [
      '',
      'Session context:',
      context,
      '',
      'Based on what both parties have shared, propose exactly 2-3 resolution options.',
      'Each proposal must:',
      '  - Address the core needs of BOTH parties (not just one)',
      '  - Be concrete and actionable',
      '  - Be something both people could genuinely agree to',
      '  - Avoid assigning blame or fault',
      '',
      'Format each proposal as:',
      'PROPOSAL 1: [title]',
      '[2-3 sentence description of what both parties would agree to do]',
      '',
      'PROPOSAL 2: [title]',
      '[description]',
      '',
      '(optional) PROPOSAL 3: [title]',
      '[description]',
      '',
      'After the proposals, add one sentence: "These are offered as starting points. Both of you decide what fits."',
    ].join('\n');

    let proposalText;
    let proposalVarietyStyles = null;

    try {
      // Use initiator userId for variety tracking if available (session is addressed to both)
      const anchorUserId = session.initiator_user_id || null;
      let finalPrompt = proposalSystemPrompt + proposalUserPrompt;

      if (anchorUserId) {
        const wrapped = await variety.wrapPromptWithVariety({
          userId:       anchorUserId,
          systemPrompt: proposalSystemPrompt,
          userPrompt:   proposalUserPrompt,
        });
        finalPrompt = wrapped.systemPrompt + proposalUserPrompt;
        proposalVarietyStyles = wrapped.styles;
      }

      const raw = await callAI(finalPrompt);
      proposalText = (typeof raw === 'string' ? raw : raw?.content || '').trim();

      if (anchorUserId && proposalVarietyStyles && proposalText) {
        await variety.logResponse({ userId: anchorUserId, styles: proposalVarietyStyles, responsePreview: proposalText.substring(0, 100), context: 'mediation' });
      }
    } catch (err) {
      throw new Error(`AI proposal generation failed: ${err.message}`);
    }

    // Insert the proposal as a mediator turn
    const { rows: [proposalTurn] } = await pool.query(`
      INSERT INTO mediation_turns
        (session_id, speaker, speaker_label, content, turn_type, round_number)
      VALUES ($1, 'mediator', 'Mediator', $2, 'proposal', $3)
      RETURNING *
    `, [session.id, proposalText, session.round_number]);

    // Insert into mediation_agreements for the parties to accept/reject
    const { rows: [agreement] } = await pool.query(`
      INSERT INTO mediation_agreements (session_id, agreement_text)
      VALUES ($1, $2)
      RETURNING *
    `, [session.id, proposalText]);

    // Set the floor to the mediator while parties review
    await pool.query(
      `UPDATE mediation_sessions SET current_speaker='mediator', updated_at=NOW() WHERE session_code=$1`,
      [sessionCode]
    );

    logger?.info?.(`[MEDIATION] Resolution proposals generated for session ${sessionCode}`);
    return { proposalTurn, agreement };
  }

  // ── acceptProposal ─────────────────────────────────────────────────────────

  async function acceptProposal({ sessionCode, party, agreementId }) {
    _requireParty(party);
    const session = await _requireSession(sessionCode);

    const col = party === 'initiator' ? 'initiator_accepted' : 'respondent_accepted';

    const { rows: [agreement] } = await pool.query(
      `UPDATE mediation_agreements SET ${col}=TRUE WHERE id=$1 AND session_id=$2 RETURNING *`,
      [agreementId, session.id]
    );
    if (!agreement) throw new Error('Agreement not found for this session');

    // If both parties have now accepted → resolve the session
    if (agreement.initiator_accepted && agreement.respondent_accepted) {
      const sigCol    = party === 'initiator' ? 'initiator_signed_at' : 'respondent_signed_at';
      const otherCol  = party === 'initiator' ? 'respondent_signed_at' : 'initiator_signed_at';

      const { rows } = await pool.query(
        `UPDATE mediation_sessions
            SET status='resolved',
                agreement_text=$1,
                initiator_signed_at = CASE WHEN initiator_signed_at IS NULL THEN NOW() ELSE initiator_signed_at END,
                respondent_signed_at = CASE WHEN respondent_signed_at IS NULL THEN NOW() ELSE respondent_signed_at END,
                updated_at = NOW()
          WHERE session_code=$2
         RETURNING *`,
        [agreement.agreement_text, sessionCode]
      );

      // Insert a closing mediator turn
      await pool.query(`
        INSERT INTO mediation_turns
          (session_id, speaker, speaker_label, content, turn_type, round_number)
        VALUES ($1, 'mediator', 'Mediator', $2, 'closing', $3)
      `, [
        session.id,
        `Both parties have accepted the agreement. This session is now complete.\n\n${agreement.agreement_text}\n\nThank you both for your courage in working through this together.`,
        session.round_number,
      ]);

      logger?.info?.(`[MEDIATION] Session ${sessionCode} RESOLVED`);
      return { agreement, resolved: true, session: rows[0] };
    }

    // One party accepted — wait for the other
    logger?.info?.(`[MEDIATION] ${party} accepted proposal ${agreementId} in session ${sessionCode} — awaiting other party`);
    return { agreement, resolved: false };
  }

  // ── closeSession ───────────────────────────────────────────────────────────

  async function closeSession({ sessionCode, reason }) {
    const newStatus = reason === 'agreement' ? 'resolved' : 'closed_no_agreement';

    const { rows } = await pool.query(
      `UPDATE mediation_sessions SET status=$1, updated_at=NOW() WHERE session_code=$2 RETURNING *`,
      [newStatus, sessionCode]
    );
    if (!rows.length) throw new Error('Session not found');

    logger?.info?.(`[MEDIATION] Session ${sessionCode} closed: ${newStatus}`);
    return rows[0];
  }

  // ── getSession ─────────────────────────────────────────────────────────────

  async function getSession(sessionCode) {
    const { rows: [session] } = await pool.query(
      `SELECT * FROM mediation_sessions WHERE session_code=$1`,
      [sessionCode]
    );
    if (!session) return null;

    const turns = await _getTurns(session.id);

    const { rows: agreements } = await pool.query(
      `SELECT * FROM mediation_agreements WHERE session_id=$1 ORDER BY created_at ASC`,
      [session.id]
    );

    return { ...session, turns, agreements };
  }

  // ── getSessions ────────────────────────────────────────────────────────────

  async function getSessions({ userId }) {
    if (!userId) throw new Error('userId is required');

    const { rows } = await pool.query(`
      SELECT * FROM mediation_sessions
       WHERE initiator_user_id = $1
          OR respondent_user_id = $1
       ORDER BY created_at DESC
       LIMIT 50
    `, [userId]);

    return rows;
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  async function _requireSession(sessionCode, allowedStatuses) {
    const { rows: [session] } = await pool.query(
      `SELECT * FROM mediation_sessions WHERE session_code=$1`,
      [sessionCode]
    );
    if (!session) throw new Error(`Session not found: ${sessionCode}`);
    if (allowedStatuses && !allowedStatuses.includes(session.status)) {
      throw new Error(`Session status is '${session.status}' — expected one of: ${allowedStatuses.join(', ')}`);
    }
    return session;
  }

  function _requireParty(party) {
    if (party !== 'initiator' && party !== 'respondent') {
      throw new Error(`party must be 'initiator' or 'respondent', got: '${party}'`);
    }
  }

  async function _getTurns(sessionId) {
    const { rows } = await pool.query(
      `SELECT * FROM mediation_turns WHERE session_id=$1 ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows;
  }

  /**
   * Build prompt context string from the session history.
   * Not exported — internal helper only.
   * @param {object} session
   * @param {Array}  turns
   * @returns {string}
   */
  async function _getAIPromptContext(session, turns) {
    const lines = [
      `Topic: ${session.topic}`,
      `Session type: ${session.session_type}`,
      `Parties: ${session.initiator_label} (initiator) vs ${session.respondent_label || 'respondent'}`,
      '',
      '--- Conversation so far ---',
    ];

    for (const turn of turns) {
      if (turn.turn_type === 'opening') continue; // skip boilerplate
      const who = turn.speaker_label || turn.speaker;
      lines.push(`[${who}] ${turn.turn_type.toUpperCase()}: ${turn.content}`);
      if (turn.ai_reflection) {
        lines.push(`  [Mediator heard]: ${turn.ai_reflection}`);
      }
      if (turn.underlying_need) {
        lines.push(`  [Underlying need]: ${turn.underlying_need}`);
      }
    }

    return lines.join('\n');
  }

  return {
    generateSessionCode,
    createSession,
    acceptInvitation,
    recordConsent,
    setReady,
    submitStatement,
    proposeResolution,
    acceptProposal,
    closeSession,
    getSession,
    getSessions,
  };
}
