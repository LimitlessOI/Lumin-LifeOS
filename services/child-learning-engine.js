/**
 * services/child-learning-engine.js
 *
 * Age-appropriate curiosity-first content for children.
 * Follows the child's interests, goes deep, connects knowledge across domains.
 * Always oriented toward real-world doing, not passive consumption.
 *
 * Exports: createChildLearningEngine({ pool, callAI })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function createChildLearningEngine({ pool, callAI }) {
  // ── _getChildProfile ─────────────────────────────────────────────────────────
  async function _getChildProfile(childId) {
    const { rows } = await pool.query(
      'SELECT * FROM child_profiles WHERE id = $1',
      [childId]
    );
    return rows[0] || null;
  }

  // ── _computeAge ───────────────────────────────────────────────────────────────
  function _computeAge(child) {
    if (child.age_years) return child.age_years;
    if (child.birth_date) {
      const diff = Date.now() - new Date(child.birth_date).getTime();
      return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    }
    return null;
  }

  // ── _logSession ───────────────────────────────────────────────────────────────
  async function _logSession({ childId, topic, activityType, summary, durationMin = null }) {
    const { rows } = await pool.query(
      `INSERT INTO child_sessions
         (child_id, topic, activity_type, summary, duration_min, parent_visible)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING *`,
      [childId, topic, activityType, summary, durationMin]
    );
    return rows[0];
  }

  // ── _upsertCuriosityThread ────────────────────────────────────────────────────
  async function _upsertCuriosityThread(childId, topic) {
    const { rows } = await pool.query(
      `INSERT INTO curiosity_threads (child_id, topic, depth_level, last_explored)
       VALUES ($1, $2, 1, CURRENT_DATE)
       ON CONFLICT (child_id, topic) DO UPDATE SET
         depth_level   = curiosity_threads.depth_level + 1,
         last_explored = CURRENT_DATE
       RETURNING *`,
      [childId, topic]
    );
    return rows[0];
  }

  // ── exploreTopicWithChild ─────────────────────────────────────────────────────
  /**
   * Given a child's question about a topic:
   * 1. Gets child profile for age/interests/learning style
   * 2. Builds age-appropriate prompt
   * 3. Upserts curiosity thread
   * 4. Logs session
   * 5. Returns { response, session }
   */
  async function exploreTopicWithChild({ childId, topic, question }) {
    const child = await _getChildProfile(childId);
    if (!child) throw new Error(`Child ${childId} not found`);

    const age       = _computeAge(child);
    const ageLabel  = age ? `${age}-year-old` : 'young';
    const interests = (child.interests || []).join(', ') || 'many things';
    const style     = child.learning_style || 'varied';

    const prompt = `A ${ageLabel} child named ${child.name} wants to explore ${topic}. Their question: "${question}". Their learning style: ${style}. Their interests include: ${interests}.

Respond in a way that:
(1) Directly answers the question in simple language they understand at age ${age || 'their age'}
(2) Makes it tangible with a real-world example or simple experiment they can do TODAY
(3) Connects it to one of their existing interests: ${interests}
(4) Asks ONE follow-up question that deepens their curiosity

Keep it under 200 words. Be warm, enthusiastic, and honest — children can handle real answers.`;

    if (!callAI) throw new Error('callAI is required for topic exploration');
    const response = await callAI(prompt);

    const [thread, session] = await Promise.all([
      _upsertCuriosityThread(childId, topic),
      _logSession({
        childId,
        topic,
        activityType: 'curiosity_exploration',
        summary:      `Explored "${topic}" — Q: ${question.slice(0, 100)}`,
      }),
    ]);

    return { response, thread, session };
  }

  // ── buildDreamPath ────────────────────────────────────────────────────────────
  /**
   * Given a dream the child named:
   * 1. Gets child profile
   * 2. Builds prompt that gives: why they can do it, first step, who to tell, vivid question
   * 3. Creates child_dream, logs session
   * 4. Returns { dream, guidance, session }
   */
  async function buildDreamPath({ childId, dreamTitle, dreamDescription }) {
    const child = await _getChildProfile(childId);
    if (!child) throw new Error(`Child ${childId} not found`);

    const age      = _computeAge(child);
    const ageLabel = age ? `${age}-year-old` : 'young';

    const prompt = `A ${ageLabel} named ${child.name} has a dream: "${dreamTitle}" — "${dreamDescription || 'no description yet'}".

Give them:
(1) Why this dream matters and why they are completely capable of it — in 1-2 encouraging sentences
(2) The ONE first step they can take this WEEK — age-appropriate, small, concrete, doable alone
(3) Someone they can tell about this dream (use a category like "a teacher" or "a parent" or "a best friend")
(4) One question that helps them imagine what it will feel like when it's real

Keep it under 150 words. Speak directly to ${child.name}.`;

    if (!callAI) throw new Error('callAI is required for dream path building');
    const guidance = await callAI(prompt);

    // Extract first step hint from guidance for the first_step column
    const firstStepMatch = guidance.match(/(?:first step|step one|this week)[:\s]+([^.!?\n]+[.!?])/i);
    const firstStep = firstStepMatch ? firstStepMatch[1].trim() : null;

    // Insert child dream
    const { rows: dreamRows } = await pool.query(
      `INSERT INTO child_dreams (child_id, title, description, first_step)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [childId, dreamTitle, dreamDescription || null, firstStep]
    );
    const dream = dreamRows[0];

    const session = await _logSession({
      childId,
      topic:        dreamTitle,
      activityType: 'dream_building',
      summary:      `Built dream path for "${dreamTitle}"`,
    });

    return { dream, guidance, session };
  }

  // ── getSessionHistory ─────────────────────────────────────────────────────────
  async function getSessionHistory(childId, { days = 30 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM child_sessions
        WHERE child_id    = $1
          AND session_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
        ORDER BY session_date DESC, created_at DESC`,
      [childId, days]
    );
    return rows;
  }

  // ── getCuriosityThreads ───────────────────────────────────────────────────────
  async function getCuriosityThreads(childId) {
    const { rows } = await pool.query(
      `SELECT * FROM curiosity_threads
        WHERE child_id = $1
        ORDER BY last_explored DESC NULLS LAST, depth_level DESC`,
      [childId]
    );
    return rows;
  }

  return {
    exploreTopicWithChild,
    buildDreamPath,
    getSessionHistory,
    getCuriosityThreads,
  };
}
