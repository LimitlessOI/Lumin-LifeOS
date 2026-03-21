/**
 * services/adam-logger.js
 * Captures every decision, every word, every preference Adam expresses.
 * This is the foundation of the digital twin — the raw material the profile is built from.
 *
 * Every API call that involves Adam making a decision should call log().
 * It's fire-and-forget — never blocks the main action.
 *
 * Exports: createAdamLogger(pool) → { log, logConversation, getDecisions, buildProfile, simulateDecision }
 */

import crypto from 'crypto';

// Decision event types
export const EVENTS = {
  IDEA_SUBMITTED:   'idea_submitted',
  IDEA_APPROVED:    'idea_approved',
  IDEA_REJECTED:    'idea_rejected',
  IDEA_DEFERRED:    'idea_deferred',
  BUILD_TRIGGERED:  'build_triggered',
  FEEDBACK_GIVEN:   'feedback_given',
  PREFERENCE:       'preference',
  OVERRIDE:         'override',        // Adam overrides a system decision
  CONVERSATION:     'conversation',    // raw message from Adam
  OUTCOME_LOGGED:   'outcome_logged',  // Adam confirms an outcome
};

export function createAdamLogger(pool) {
  let sessionId = crypto.randomUUID();

  function newSession() {
    sessionId = crypto.randomUUID();
    return sessionId;
  }

  // ── Core log ───────────────────────────────────────────────────────────────
  /**
   * Log any Adam decision or statement. Fire-and-forget — never throws.
   * @param {string} eventType   — from EVENTS
   * @param {object} data
   * @param {string} data.subject        — what this is about
   * @param {string} [data.subjectId]    — entity ID if applicable
   * @param {string} [data.inputText]    — raw words from Adam
   * @param {string} [data.decision]     — approve|reject|modify|defer|etc.
   * @param {string} [data.reasoning]    — why
   * @param {object} [data.context]      — any extra context snapshot
   * @param {string[]} [data.tags]       — searchable tags
   */
  async function log(eventType, data = {}) {
    if (!pool) return;
    try {
      const {
        subject = '',
        subjectId = null,
        inputText = null,
        decision = null,
        reasoning = null,
        context = null,
        tags = [],
      } = data;

      await pool.query(
        `INSERT INTO adam_decisions
           (session_id, event_type, subject, subject_id, input_text, decision, reasoning, context, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          sessionId,
          eventType,
          subject,
          subjectId,
          inputText,
          decision,
          reasoning,
          context ? JSON.stringify(context) : null,
          tags,
        ]
      );
    } catch (err) {
      // Never fail silently in a way that blocks Adam
      console.warn(`[ADAM-LOGGER] Log failed (non-blocking): ${err.message}`);
    }
  }

  // ── Log a raw conversation message ─────────────────────────────────────────
  async function logConversation(text, { source = 'adam', context = {} } = {}) {
    await log(EVENTS.CONVERSATION, {
      subject: source,
      inputText: text,
      context,
      tags: extractTags(text),
    });
  }

  // ── Get decision history ───────────────────────────────────────────────────
  async function getDecisions({ eventType, limit = 100, since } = {}) {
    if (!pool) return [];
    try {
      const params = [limit];
      let where = '';
      if (eventType) {
        where += ` AND event_type = $${params.push(eventType)}`;
      }
      if (since) {
        where += ` AND created_at >= $${params.push(since)}`;
      }

      const result = await pool.query(
        `SELECT * FROM adam_decisions WHERE 1=1 ${where}
         ORDER BY created_at DESC LIMIT $1`,
        params
      );
      return result.rows;
    } catch (err) {
      console.warn(`[ADAM-LOGGER] getDecisions failed: ${err.message}`);
      return [];
    }
  }

  // ── Build/refresh Adam's profile ───────────────────────────────────────────
  /**
   * Analyze all logged decisions and synthesize Adam's decision profile.
   * Called periodically (e.g. after every 10 new decisions).
   * @param {Function} callAI — AI function to synthesize the profile
   */
  async function buildProfile(callAI) {
    if (!pool || !callAI) return null;

    try {
      // Get last 200 decisions
      const decisions = await getDecisions({ limit: 200 });
      if (decisions.length < 5) {
        console.log('[ADAM-TWIN] Not enough decisions yet to build profile (need 5+)');
        return null;
      }

      const decisionText = decisions.map(d =>
        `[${d.event_type}] ${d.subject}: ${d.decision || ''} — ${d.reasoning || d.input_text || ''}`
      ).join('\n');

      const profile = await callAI(`You are analyzing the decision patterns of an entrepreneur named Adam to build his digital profile.

Based on these ${decisions.length} decisions and statements, extract:

1. **Core Values** — what does Adam care about most? (e.g. speed, revenue, user experience, simplicity)
2. **Decision Patterns** — how does he decide? What does he approve vs reject and why?
3. **Design Preferences** — what visual/UX patterns does he like and hate?
4. **Communication Style** — how does he talk? What vocabulary does he use?
5. **Priorities** — what comes first when there's a tradeoff?
6. **Red Lines** — things he will never compromise on
7. **Blind Spots** — where does he consistently not think about X?
8. **How to simulate him** — given a new decision, what would Adam do?

Decisions log:
${decisionText.substring(0, 6000)}

Respond in JSON:
{
  "core_values": ["value 1", "value 2"],
  "decision_patterns": ["pattern 1"],
  "design_preferences": { "likes": [], "dislikes": [] },
  "communication_style": "description",
  "priorities_order": ["1st", "2nd", "3rd"],
  "red_lines": ["never do X"],
  "blind_spots": ["tends to overlook Y"],
  "simulation_heuristics": ["when presented with X, Adam typically does Y because Z"],
  "summary": "One paragraph plain-English description of Adam as a decision maker"
}`);

      let profileData;
      try {
        const jsonMatch = profile.match(/\{[\s\S]*\}/);
        profileData = JSON.parse(jsonMatch[0]);
      } catch {
        profileData = { raw: profile };
      }

      // Mark old profile as not current
      await pool.query(`UPDATE adam_profile SET is_current = FALSE WHERE is_current = TRUE`);

      // Insert new profile
      await pool.query(
        `INSERT INTO adam_profile (profile, summary, decision_count, is_current)
         VALUES ($1, $2, $3, TRUE)`,
        [JSON.stringify(profileData), profileData.summary || '', decisions.length]
      );

      console.log(`✅ [ADAM-TWIN] Profile updated from ${decisions.length} decisions`);
      return profileData;
    } catch (err) {
      console.warn(`[ADAM-LOGGER] buildProfile failed: ${err.message}`);
      return null;
    }
  }

  // ── Simulate what Adam would decide ───────────────────────────────────────
  /**
   * Given a scenario, predict what Adam would decide based on his profile + history.
   * Used for: auto-prioritizing ideas, flagging things he'd probably reject, etc.
   * NOT used for autonomous action — Adam still approves everything.
   *
   * @param {string} scenario   — description of the decision to make
   * @param {Function} callAI
   * @returns {{ prediction: string, confidence: number, reasoning: string }}
   */
  async function simulateDecision(scenario, callAI) {
    if (!pool || !callAI) return null;

    try {
      // Get current profile
      const profileResult = await pool.query(
        `SELECT profile, summary FROM adam_profile WHERE is_current = TRUE LIMIT 1`
      );

      // Get recent similar decisions
      const recentDecisions = await getDecisions({ limit: 50 });
      const recentText = recentDecisions
        .slice(0, 20)
        .map(d => `${d.event_type}: ${d.subject} → ${d.decision} (${d.reasoning || 'no reason given'})`)
        .join('\n');

      const profileSummary = profileResult.rows[0]?.summary || 'No profile built yet';
      const profileData = profileResult.rows[0]?.profile || {};

      const prediction = await callAI(`You are simulating Adam Hopkins, an entrepreneur, making a decision.

Adam's profile:
${profileSummary}

His heuristics:
${(profileData.simulation_heuristics || []).join('\n') || 'None built yet'}

Recent decisions for context:
${recentText}

New scenario to decide on:
${scenario}

What would Adam most likely decide? Respond in JSON:
{
  "prediction": "approve|reject|modify|defer|needs_more_info",
  "confidence": 0.75,
  "reasoning": "Adam would likely... because based on his patterns...",
  "concerns": ["thing he might push back on"],
  "questions_he_would_ask": ["what question would he want answered first?"]
}`);

      const jsonMatch = prediction.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.warn(`[ADAM-TWIN] Simulation failed: ${err.message}`);
      return null;
    }
  }

  return { log, logConversation, newSession, getDecisions, buildProfile, simulateDecision, EVENTS };
}

// ── Tag extraction helper ──────────────────────────────────────────────────
function extractTags(text = '') {
  const lower = text.toLowerCase();
  const tags = [];
  const topicMap = {
    design: ['design', 'ui', 'ux', 'look', 'feel', 'color', 'font', 'layout'],
    revenue: ['revenue', 'money', 'price', 'stripe', 'pay', 'cost', 'profit', 'sales'],
    build: ['build', 'code', 'implement', 'ship', 'deploy', 'feature'],
    approval: ['approve', 'yes', 'go ahead', 'do it', 'launch'],
    rejection: ['no', 'reject', 'dont', "don't", 'stop', 'not that'],
    ux: ['user', 'customer', 'intuitive', 'confusing', 'flow', 'experience'],
    performance: ['slow', 'fast', 'speed', 'latency', 'performance'],
    bug: ['bug', 'broken', 'fix', 'error', 'crash', 'issue', 'problem'],
  };

  for (const [tag, keywords] of Object.entries(topicMap)) {
    if (keywords.some(kw => lower.includes(kw))) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)];
}
