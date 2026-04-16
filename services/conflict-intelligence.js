/**
 * services/conflict-intelligence.js
 *
 * Conflict Intelligence — consent management, conflict recording, and
 * real-time escalation detection.
 *
 * Three core concerns:
 *   1. Consent — per-pair, per-type (live_interrupt | recording | post_coaching)
 *   2. Recording — structured transcript log with tone flags, lifecycle management
 *   3. Detection — pattern-match text for real-time escalation signals
 *
 * Exports:
 *   createConflictIntelligence({ pool, callAI, logger }) → ConflictIntelligence
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

// ── Word lists for human-readable session codes ────────────────────────────

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

// ── Escalation signals ─────────────────────────────────────────────────────
// Common verbal markers that indicate a conversation is escalating.
// These are phrase-level signals, not single-word triggers, to avoid
// false positives on ordinary speech.

const ESCALATION_SIGNALS = [
  'you always',
  'you never',
  "you don't",
  "that's not fair",
  'stop interrupting',
  "you're not listening",
  'i give up',
  'forget it',
  'whatever',
  'fine.',
  "you're impossible",
];

// ── Flooding signals ───────────────────────────────────────────────────────
// Phrases that indicate a person has crossed into emotional flooding —
// the nervous system is overwhelmed and resolution is not possible right now.
// When flooding is detected, the recommended response is de-escalation +
// a suggested break, NOT continued problem-solving.

const FLOODING_SIGNALS = [
  "i can't do this",
  "i'm done",
  'this is pointless',
  'you never change',
  'nothing ever changes',
  'i hate this',
  'leave me alone',
  'stop talking',
];

// ── Factory ────────────────────────────────────────────────────────────────

export function createConflictIntelligence({ pool, callAI, logger }) {

  // ── Internal helpers ────────────────────────────────────────────────────

  function generateSessionCode() {
    const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num  = Math.floor(10 + Math.random() * 90); // 10–99
    return `${adj}-${noun}-${num}`;
  }

  // ── Consent management ─────────────────────────────────────────────────

  /**
   * Grant consent for a specific consent_type between two users.
   * Upserts: if row exists, reactivates it.
   * @param {{ userId, partnerUserId, consentType }} params
   * @returns {Promise<object>} consent record
   */
  async function grantConsent({ userId, partnerUserId, consentType }) {
    const { rows } = await pool.query(`
      INSERT INTO conflict_consent
        (user_id, partner_user_id, consent_type, granted, granted_at, revoked_at)
      VALUES ($1, $2, $3, TRUE, NOW(), NULL)
      ON CONFLICT (user_id, partner_user_id, consent_type) DO UPDATE
        SET granted    = TRUE,
            granted_at = NOW(),
            revoked_at = NULL
      RETURNING *
    `, [userId, partnerUserId, consentType]);

    logger?.info?.(`[CONFLICT] Consent granted: user ${userId} → partner ${partnerUserId} [${consentType}]`);
    return rows[0];
  }

  /**
   * Revoke a previously granted consent.
   * @param {{ userId, partnerUserId, consentType }} params
   * @returns {Promise<object>} updated consent record
   */
  async function revokeConsent({ userId, partnerUserId, consentType }) {
    const { rows } = await pool.query(`
      UPDATE conflict_consent
         SET granted    = FALSE,
             revoked_at = NOW()
       WHERE user_id = $1
         AND partner_user_id = $2
         AND consent_type = $3
      RETURNING *
    `, [userId, partnerUserId, consentType]);

    if (!rows.length) {
      throw new Error(`No consent record found for user ${userId} → partner ${partnerUserId} [${consentType}]`);
    }

    logger?.info?.(`[CONFLICT] Consent revoked: user ${userId} → partner ${partnerUserId} [${consentType}]`);
    return rows[0];
  }

  /**
   * Check if BOTH users have mutually granted a specific consent_type.
   * A→B and B→A must both exist with granted=true and revoked_at IS NULL.
   * @param {{ userId, partnerUserId, consentType }} params
   * @returns {Promise<boolean>}
   */
  async function checkConsent({ userId, partnerUserId, consentType }) {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS cnt
        FROM conflict_consent
       WHERE consent_type = $3
         AND granted = TRUE
         AND revoked_at IS NULL
         AND (
           (user_id = $1 AND partner_user_id = $2)
           OR
           (user_id = $2 AND partner_user_id = $1)
         )
    `, [userId, partnerUserId, consentType]);

    return parseInt(rows[0].cnt, 10) >= 2;
  }

  /**
   * Get the full consent status for a pair, for all three consent_types.
   * @param {{ userId, partnerUserId }} params
   * @returns {Promise<{ live_interrupt: boolean, recording: boolean, post_coaching: boolean }>}
   */
  async function getConsentStatus({ userId, partnerUserId }) {
    const types = ['live_interrupt', 'recording', 'post_coaching'];
    const results = await Promise.all(
      types.map(t => checkConsent({ userId, partnerUserId, consentType: t }))
    );
    return {
      live_interrupt: results[0],
      recording:      results[1],
      post_coaching:  results[2],
    };
  }

  // ── Conflict recording ─────────────────────────────────────────────────

  /**
   * Start a new conflict recording.
   * Requires both users to have consented to 'recording'.
   * @param {{ initiatorUserId, partnerUserId, initiatorLabel, partnerLabel, topic }} params
   * @returns {Promise<object>} the new recording record
   */
  async function startRecording({ initiatorUserId, partnerUserId, initiatorLabel, partnerLabel, topic }) {
    if (!initiatorLabel?.trim()) throw new Error('initiator_label is required');
    if (!partnerLabel?.trim())   throw new Error('partner_label is required');

    // Consent check — both users must have agreed to recording
    if (initiatorUserId && partnerUserId) {
      const hasConsent = await checkConsent({
        userId: initiatorUserId,
        partnerUserId,
        consentType: 'recording',
      });
      if (!hasConsent) {
        throw new Error('Both parties must consent to recording before a conflict recording can be started');
      }
    }

    // Generate a unique code — retry on collision
    let code;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateSessionCode();
      const { rows } = await pool.query(
        'SELECT id FROM conflict_recordings WHERE session_code=$1',
        [code]
      );
      if (rows.length === 0) break;
      if (attempt === 4) throw new Error('Could not generate a unique session code — please retry');
    }

    const { rows } = await pool.query(`
      INSERT INTO conflict_recordings
        (session_code, initiator_user_id, partner_user_id, initiator_label, partner_label, topic, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'recording')
      RETURNING *
    `, [
      code,
      initiatorUserId || null,
      partnerUserId   || null,
      initiatorLabel.trim(),
      partnerLabel.trim(),
      topic?.trim() || null,
    ]);

    logger?.info?.(`[CONFLICT] Recording started: ${code}`);
    return rows[0];
  }

  /**
   * Append a turn to a recording's transcript.
   * @param {{ sessionCode, speaker, content, toneFlags }} params
   * @returns {Promise<object>} updated recording
   */
  async function addTurn({ sessionCode, speaker, content, toneFlags }) {
    if (!content?.trim()) throw new Error('content is required');

    const turn = {
      speaker:    speaker || 'unknown',
      content:    content.trim(),
      timestamp:  new Date().toISOString(),
      tone_flags: Array.isArray(toneFlags) ? toneFlags : [],
    };

    const { rows } = await pool.query(`
      UPDATE conflict_recordings
         SET transcript  = transcript || $1::jsonb,
             updated_at  = NOW()
       WHERE session_code = $2
         AND status = 'recording'
      RETURNING *
    `, [JSON.stringify(turn), sessionCode]);

    if (!rows.length) {
      throw new Error(`Recording not found or not in 'recording' state: ${sessionCode}`);
    }

    return rows[0];
  }

  /**
   * Mark a recording as captured (done being recorded, ready to process).
   * @param {{ sessionCode }} params
   * @returns {Promise<object>} updated recording
   */
  async function captureComplete({ sessionCode }) {
    const { rows } = await pool.query(`
      UPDATE conflict_recordings
         SET status     = 'captured',
             updated_at = NOW()
       WHERE session_code = $1
      RETURNING *
    `, [sessionCode]);

    if (!rows.length) throw new Error(`Recording not found: ${sessionCode}`);

    logger?.info?.(`[CONFLICT] Recording captured: ${sessionCode}`);
    return rows[0];
  }

  /**
   * Set the processing mode after capture.
   * @param {{ sessionCode, requestingUserId, mode }} params
   * @returns {Promise<object>} updated recording
   */
  async function chooseProcessingMode({ sessionCode, requestingUserId, mode }) {
    const validModes = ['together', 'separate', 'separate_then_together'];
    if (!validModes.includes(mode)) {
      throw new Error(`mode must be one of: ${validModes.join(', ')}`);
    }

    const newStatus = mode === 'together' ? 'processing_together' : 'processing_separately';

    const { rows } = await pool.query(`
      UPDATE conflict_recordings
         SET processing_mode = $1,
             status          = $2,
             updated_at      = NOW()
       WHERE session_code = $3
      RETURNING *
    `, [mode, newStatus, sessionCode]);

    if (!rows.length) throw new Error(`Recording not found: ${sessionCode}`);

    logger?.info?.(`[CONFLICT] Processing mode set: ${sessionCode} → ${mode}`);
    return rows[0];
  }

  /**
   * Get a single recording by session code.
   * @param {string} sessionCode
   * @returns {Promise<object|null>}
   */
  async function getRecording(sessionCode) {
    const { rows } = await pool.query(
      'SELECT * FROM conflict_recordings WHERE session_code=$1',
      [sessionCode]
    );
    return rows[0] || null;
  }

  /**
   * Get all recordings for a user (as initiator or partner).
   * @param {{ userId }} params
   * @returns {Promise<Array>}
   */
  async function getRecordings({ userId }) {
    if (!userId) throw new Error('userId is required');

    const { rows } = await pool.query(`
      SELECT * FROM conflict_recordings
       WHERE initiator_user_id = $1
          OR partner_user_id   = $1
       ORDER BY created_at DESC
       LIMIT 50
    `, [userId]);

    return rows;
  }

  // ── Conflict detection ─────────────────────────────────────────────────

  /**
   * Detect escalation and flooding signals in a piece of text.
   * Uses phrase-level matching against known escalation and flooding patterns.
   * When flooding is true, the recommended response is to de-escalate completely
   * and suggest a break — do NOT attempt resolution.
   * @param {{ text }} params
   * @returns {{ escalating: boolean, flooding: boolean, signals: string[] }}
   */
  function detectEscalation({ text }) {
    if (!text) return { escalating: false, flooding: false, signals: [] };

    const lower           = text.toLowerCase();
    const signals         = ESCALATION_SIGNALS.filter(s => lower.includes(s));
    const floodingMatches = FLOODING_SIGNALS.filter(s => lower.includes(s));
    const flooding        = floodingMatches.length > 0;

    return {
      escalating: signals.length > 0 || flooding,
      flooding,
      signals: [...signals, ...floodingMatches],
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────

  return {
    // Consent
    grantConsent,
    revokeConsent,
    checkConsent,
    getConsentStatus,
    // Recording
    startRecording,
    addTurn,
    captureComplete,
    chooseProcessingMode,
    getRecording,
    getRecordings,
    // Detection
    detectEscalation,
  };
}
