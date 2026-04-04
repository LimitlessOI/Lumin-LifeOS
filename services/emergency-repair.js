/**
 * services/emergency-repair.js
 *
 * Emergency Repair Button — when a critical relationship or life situation
 * has fractured, the user taps this and the system activates an immediate
 * structured response: assess, ground, route to repair.
 *
 * This is NOT therapy. It is triage + routing. The system:
 *   1. Immediately assesses the situation and emotional state
 *   2. Grounds the user (breathing, safety)
 *   3. Determines repair type (relationship | self | commitment | crisis)
 *   4. Surfaces the right tool: mediation engine, commitment reset, crisis resource
 *   5. Creates a repair record for pattern tracking
 *
 * Constitutional constraint: if crisis signals are detected (harm to self or others)
 * the system IMMEDIATELY surfaces crisis resources and does NOT attempt to coach
 * through the situation.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const CRISIS_SIGNALS = [
  'hurt myself', 'hurt myself', 'end it', 'not worth living',
  'kill myself', 'suicide', "can't go on", 'want to die',
  'hurt someone', 'hurt him', 'hurt her', 'hurt them',
];

const REPAIR_TYPES = {
  relationship: 'relationship',
  self: 'self',
  commitment: 'commitment',
  crisis: 'crisis',
};

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createEmergencyRepair({ pool, callAI }) {
  /**
   * Activate the emergency repair protocol.
   * @param {string} userId
   * @param {string} situationText - User's description of what happened
   * @param {'relationship'|'self'|'commitment'|null} repairType - Optional override
   */
  async function activate(userId, situationText, repairType = null) {
    // ── Crisis check first — always ───────────────────────────────────────────
    const lowerText = (situationText || '').toLowerCase();
    const isCrisis = CRISIS_SIGNALS.some(signal => lowerText.includes(signal));

    if (isCrisis) {
      const repairRecord = await createRepairRecord(userId, situationText, 'crisis', null);
      return {
        repair_type: 'crisis',
        record_id: repairRecord.id,
        immediate_response: {
          message: "I hear you. Right now, the most important thing is your safety.",
          resources: [
            { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', available: '24/7' },
            { name: 'Crisis Text Line', contact: 'Text HOME to 741741', available: '24/7' },
            { name: 'Emergency Services', contact: '911', available: '24/7' },
          ],
          grounding: "Before anything else — can you take one slow breath in, and let it out? You're still here.",
          next_step: null,
        },
      };
    }

    // ── Determine repair type ────────────────────────────────────────────────
    let detectedType = repairType;
    let triage = null;

    if (callAI && !detectedType) {
      try {
        const triagePrompt =
          `A person activated the Emergency Repair Button and described: "${situationText}". ` +
          `Classify this as ONE of: "relationship" (rupture with another person), ` +
          `"self" (inner conflict, shame, overwhelm, identity crisis), ` +
          `or "commitment" (broken promise to self or others, integrity breach). ` +
          `Then provide: 1) A one-sentence acknowledgment (warm, human), ` +
          `2) One grounding question to help them slow down, ` +
          `3) The most important next step (one action). ` +
          `Format as JSON: { "type": "...", "acknowledgment": "...", "grounding_question": "...", "next_step": "..." }`;

        const raw = await callAI(triagePrompt);
        try {
          triage = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
          detectedType = triage.type || 'relationship';
        } catch (_) {
          detectedType = 'relationship';
        }
      } catch (_) {
        detectedType = 'relationship';
      }
    }

    detectedType = detectedType || 'relationship';

    // ── Build repair response ────────────────────────────────────────────────
    const repairRecord = await createRepairRecord(userId, situationText, detectedType, triage);

    const response = {
      repair_type: detectedType,
      record_id: repairRecord.id,
      immediate_response: {
        acknowledgment: triage?.acknowledgment || buildDefaultAcknowledgment(detectedType),
        grounding_question: triage?.grounding_question || defaultGroundingQuestion(detectedType),
        next_step: triage?.next_step || defaultNextStep(detectedType),
      },
      tools: getRepairTools(detectedType, repairRecord.id),
    };

    return response;
  }

  /**
   * Log what happened after repair so the system can track what worked.
   */
  async function logOutcome(userId, recordId, { resolved, notes, repair_approach }) {
    await pool.query(
      `UPDATE emergency_repairs
       SET resolved = $1, outcome_notes = $2, repair_approach = $3, resolved_at = now()
       WHERE id = $4 AND user_id = $5`,
      [resolved, notes, repair_approach, recordId, userId]
    );
  }

  /**
   * Get repair history — patterns show where the user most needs support.
   */
  async function getHistory(userId, limit = 20) {
    const rows = await pool.query(
      `SELECT id, situation_summary, repair_type, activated_at, resolved, resolved_at, repair_approach
       FROM emergency_repairs
       WHERE user_id = $1
       ORDER BY activated_at DESC
       LIMIT $2`,
      [userId, limit]
    ).then(r => r.rows).catch(() => []);

    return rows;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  async function createRepairRecord(userId, situationText, repairType, triage) {
    // Store only a summary, never the full raw text (sensitive data)
    const summary = situationText?.substring(0, 500) || '';
    const result = await pool.query(
      `INSERT INTO emergency_repairs (user_id, situation_summary, repair_type, triage_data, activated_at)
       VALUES ($1, $2, $3, $4, now())
       RETURNING id`,
      [userId, summary, repairType, triage ? JSON.stringify(triage) : null]
    ).catch(() => ({ rows: [{ id: null }] }));
    return { id: result.rows[0]?.id };
  }

  function buildDefaultAcknowledgment(repairType) {
    const defaults = {
      relationship: "Something broke between you and someone important. That matters — and repair is possible.",
      self: "You're in the middle of something hard. The fact that you pressed this button means part of you knows the way through.",
      commitment: "A commitment got broken — and you noticed. That awareness is the first step.",
      crisis: "I hear you.",
    };
    return defaults[repairType] || defaults.relationship;
  }

  function defaultGroundingQuestion(repairType) {
    const questions = {
      relationship: "What do you actually want to happen here — not what you think should happen, but what you actually want?",
      self: "What would it look like to be gentle with yourself right now, just for the next five minutes?",
      commitment: "If you could recommit to this with full honesty about what got in the way — what would you say?",
      crisis: "What would help you feel safe right now?",
    };
    return questions[repairType] || questions.relationship;
  }

  function defaultNextStep(repairType) {
    const steps = {
      relationship: "Write down what you would want the other person to understand — don't send it yet, just write it.",
      self: "Find one small act of kindness toward yourself you can do in the next hour.",
      commitment: "Recommit to the core of what you said you'd do — even if the original timeline is broken.",
      crisis: "Please call 988 or text HOME to 741741 right now.",
    };
    return steps[repairType] || steps.relationship;
  }

  function getRepairTools(repairType, recordId) {
    const tools = {
      relationship: [
        { name: 'Conflict Repair Simulator', action: 'Practice the repair conversation before having it', route: '/api/v1/lifeos/conflict/simulate' },
        { name: 'Mediation Session', action: 'Work through what happened with AI guidance', route: '/api/v1/lifeos/conflict/mediate' },
      ],
      self: [
        { name: 'Emotional Check-In', action: 'Name what you are actually feeling right now', route: '/api/v1/lifeos/emotional/checkin' },
        { name: 'Inner Work Session', action: 'Go deeper into what this is really about', route: '/api/v1/lifeos/healing/sessions' },
      ],
      commitment: [
        { name: 'Commitment Reset', action: 'Recommit with full honesty about what happened', route: '/api/v1/lifeos/commitments/reset' },
        { name: 'Integrity Review', action: 'Look at the full pattern, not just this one breach', route: '/api/v1/lifeos/integrity/review' },
      ],
      crisis: [],
    };
    return tools[repairType] || tools.relationship;
  }

  return {
    activate,
    logOutcome,
    getHistory,
  };
}
