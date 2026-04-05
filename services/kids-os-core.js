/**
 * services/kids-os-core.js
 *
 * Kids OS Core — enrollment, win logging, integrity scoring, session tracking,
 * belonging guarantee enforcement, learning love score, and child dashboard.
 *
 * The #1 metric is LOVE OF LEARNING. Self-worth is never tied to performance.
 * Every child arrives with full curiosity — this system protects and amplifies it.
 *
 * Constitutional constraints:
 *   - Hardship protected children never lose access
 *   - No child goes 5 days without a documented win moment (belonging guarantee)
 *   - Self-worth is structurally separated from performance metrics
 *   - Misidentification screening routes to professionals, never diagnoses
 *
 * @ssot docs/projects/AMENDMENT_34_KIDS_OS.md
 */

const INTEGRITY_POINTS = {
  clear_ask: 1,
  graceful_no: 1,
  commitment_kept: 1,
  truth_told: 1,
  self_caught: 2,       // double points — catching yourself is the hardest skill
  manipulation_detected: 0,
};

const INTEGRITY_LEVELS = [
  { min: 0,   max: 50,  label: 'building',  description: 'Starting to build your integrity foundation' },
  { min: 51,  max: 150, label: 'growing',   description: 'Your integrity is growing stronger every day' },
  { min: 151, max: 300, label: 'strong',    description: 'You have strong integrity — people can count on you' },
  { min: 301, max: Infinity, label: 'champion', description: 'Integrity champion — you choose right even when it\'s hard' },
];

const BELONGING_GUARANTEE_DAYS = 5;

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createKidsOSCore({ pool, callAI }) {

  // ── Enrollment ─────────────────────────────────────────────────────────────

  /**
   * Enroll a new child. Creates profile + initial learning profile.
   * @param {number|null} parentUserId
   * @param {{ displayName: string, age?: number, gradeLevel?: string, interests?: string[] }} opts
   */
  async function enrollChild(parentUserId, { displayName, age, gradeLevel, interests = [] }) {
    if (!displayName) throw new Error('displayName is required');

    const childResult = await pool.query(
      `INSERT INTO kids_os_children
         (parent_user_id, display_name, age, grade_level, interests, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       RETURNING *`,
      [parentUserId || null, displayName, age || null, gradeLevel || null, interests]
    );
    const child = childResult.rows[0];

    // Children arrive with love of learning intact — start at 85
    await pool.query(
      `INSERT INTO kids_os_learning_profile
         (child_id, love_of_learning_score, confidence_baseline, is_current, created_at)
       VALUES ($1, 85, 7.0, true, now())`,
      [child.id]
    );

    return child;
  }

  // ── Fetch child ────────────────────────────────────────────────────────────

  /**
   * Get a child record along with their current learning profile.
   * @param {number} childId
   */
  async function getChild(childId) {
    const childResult = await pool.query(
      `SELECT * FROM kids_os_children WHERE id = $1`,
      [childId]
    );
    if (!childResult.rows.length) throw new Error(`Child ${childId} not found`);
    const child = childResult.rows[0];

    const profileResult = await pool.query(
      `SELECT * FROM kids_os_learning_profile WHERE child_id = $1 AND is_current = true LIMIT 1`,
      [childId]
    );
    child.learningProfile = profileResult.rows[0] || null;

    return child;
  }

  // ── Win log ────────────────────────────────────────────────────────────────

  /**
   * Log a genuine win for a child. Resolves the no_win_streak welfare flag if open.
   * @param {number} childId
   * @param {{ domain: string, winDescription: string, evidence?: string, beforeState?: string, afterState?: string, loggedBy?: string }} opts
   */
  async function logWin(childId, { domain, winDescription, evidence, beforeState, afterState, loggedBy = 'system' }) {
    if (!domain) throw new Error('domain is required');
    if (!winDescription) throw new Error('winDescription is required');

    const result = await pool.query(
      `INSERT INTO kids_os_wins
         (child_id, domain, win_description, evidence, before_state, after_state, logged_by, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       RETURNING *`,
      [childId, domain, winDescription, evidence || null, beforeState || null, afterState || null, loggedBy]
    );
    const win = result.rows[0];

    // Resolve open no_win_streak flag if present
    await pool.query(
      `UPDATE kids_os_welfare_flags
       SET resolved = true, resolved_at = now()
       WHERE child_id = $1 AND flag_type = 'no_win_streak' AND resolved = false`,
      [childId]
    );

    return win;
  }

  // ── Belonging guarantee ────────────────────────────────────────────────────

  /**
   * Check if this child has had a win in the last 5 days. Create a welfare flag if not.
   * @param {number} childId
   */
  async function checkBelongingGuarantee(childId) {
    const result = await pool.query(
      `SELECT occurred_at FROM kids_os_wins
       WHERE child_id = $1
       ORDER BY occurred_at DESC
       LIMIT 1`,
      [childId]
    );

    const lastWin = result.rows[0]?.occurred_at || null;
    const now = new Date();
    const daysSinceLastWin = lastWin
      ? Math.floor((now - new Date(lastWin)) / (1000 * 60 * 60 * 24))
      : null;

    const flagged = daysSinceLastWin === null || daysSinceLastWin > BELONGING_GUARANTEE_DAYS;

    let flag = null;
    if (flagged) {
      // Only create a new flag if none is already open
      const existingFlag = await pool.query(
        `SELECT id FROM kids_os_welfare_flags
         WHERE child_id = $1 AND flag_type = 'no_win_streak' AND resolved = false
         LIMIT 1`,
        [childId]
      );

      if (!existingFlag.rows.length) {
        const flagResult = await pool.query(
          `INSERT INTO kids_os_welfare_flags
             (child_id, flag_type, severity, evidence, resolved, created_at)
           VALUES ($1, 'no_win_streak', 'concern', $2, false, now())
           RETURNING *`,
          [childId, JSON.stringify({ daysSinceLastWin, lastWin })]
        );
        flag = flagResult.rows[0];
      } else {
        flag = existingFlag.rows[0];
      }
    }

    return { daysSinceLastWin, flagged, flag };
  }

  // ── Integrity score ────────────────────────────────────────────────────────

  /**
   * Log an integrity action for a child.
   * @param {number} childId
   * @param {{ actionType: string, description?: string, loggedBy?: string }} opts
   */
  async function logIntegrityAction(childId, { actionType, description, loggedBy = 'system' }) {
    const validTypes = Object.keys(INTEGRITY_POINTS);
    if (!validTypes.includes(actionType)) {
      throw new Error(`Invalid action_type. Must be one of: ${validTypes.join(', ')}`);
    }

    const points = INTEGRITY_POINTS[actionType];

    await pool.query(
      `INSERT INTO kids_os_integrity_log
         (child_id, action_type, points, description, logged_by, occurred_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [childId, actionType, points, description || null, loggedBy]
    );

    const scoreData = await getIntegrityScore(childId);
    return { points, ...scoreData };
  }

  /**
   * Get the current integrity score and level for a child.
   * @param {number} childId
   */
  async function getIntegrityScore(childId) {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(points), 0) AS total_points,
         COUNT(*) FILTER (WHERE occurred_at > now() - INTERVAL '30 days') AS actions_last_30d
       FROM kids_os_integrity_log
       WHERE child_id = $1`,
      [childId]
    );
    const totalPoints = parseInt(result.rows[0]?.total_points || 0);

    const recentResult = await pool.query(
      `SELECT action_type, points, description, occurred_at
       FROM kids_os_integrity_log
       WHERE child_id = $1
       ORDER BY occurred_at DESC
       LIMIT 10`,
      [childId]
    );

    const levelEntry = INTEGRITY_LEVELS.find(l => totalPoints >= l.min && totalPoints <= l.max)
      || INTEGRITY_LEVELS[INTEGRITY_LEVELS.length - 1];

    // Simple streak: consecutive days with at least one integrity action
    const streakResult = await pool.query(
      `SELECT DISTINCT DATE(occurred_at) AS day
       FROM kids_os_integrity_log
       WHERE child_id = $1
       ORDER BY day DESC`,
      [childId]
    );
    let streak = 0;
    let prevDay = null;
    for (const row of streakResult.rows) {
      const d = new Date(row.day);
      if (!prevDay) {
        // Only count streak if most recent action was today or yesterday
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffFromToday = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diffFromToday > 1) break;
        prevDay = d;
        streak = 1;
      } else {
        const diff = Math.floor((prevDay - d) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          streak++;
          prevDay = d;
        } else {
          break;
        }
      }
    }

    return {
      totalPoints,
      level: levelEntry.label,
      levelLabel: levelEntry.description,
      streak,
      recentActions: recentResult.rows,
    };
  }

  // ── Session log ────────────────────────────────────────────────────────────

  /**
   * Log a learning session.
   * @param {number} childId
   * @param {{ sessionType: string, domain?: string, durationMinutes?: number, curiosityMoments?: number, engagementLevel?: number }} opts
   */
  async function logSession(childId, { sessionType, domain, durationMinutes, curiosityMoments = 0, engagementLevel, notes }) {
    const validTypes = ['learning', 'practice', 'checkin', 'simulator', 'integrity', 'workshop'];
    if (!validTypes.includes(sessionType)) {
      throw new Error(`Invalid session_type. Must be one of: ${validTypes.join(', ')}`);
    }

    const result = await pool.query(
      `INSERT INTO kids_os_sessions
         (child_id, session_type, domain, duration_minutes, engagement_level, curiosity_moments, notes, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       RETURNING *`,
      [childId, sessionType, domain || null, durationMinutes || null, engagementLevel || null, curiosityMoments, notes || null]
    );

    return result.rows[0];
  }

  // ── Love of learning score ─────────────────────────────────────────────────

  /**
   * Recalculate the love of learning score from the last 14 days of sessions.
   * Creates a welfare flag if the score drops significantly. AI synthesizes a note.
   * @param {number} childId
   */
  async function updateLearningLoveScore(childId) {
    const sessionResult = await pool.query(
      `SELECT curiosity_moments, engagement_level, win_logged, started_at
       FROM kids_os_sessions
       WHERE child_id = $1
         AND started_at > now() - INTERVAL '14 days'
       ORDER BY started_at DESC`,
      [childId]
    );
    const sessions = sessionResult.rows;

    const winResult = await pool.query(
      `SELECT COUNT(*) AS win_count
       FROM kids_os_wins
       WHERE child_id = $1 AND occurred_at > now() - INTERVAL '14 days'`,
      [childId]
    );
    const winCount = parseInt(winResult.rows[0]?.win_count || 0);

    // Score formula: base 50, +curiosity weight, +engagement weight, +win frequency
    let score = 50;
    if (sessions.length > 0) {
      const totalCuriosity = sessions.reduce((s, r) => s + (parseInt(r.curiosity_moments) || 0), 0);
      const avgEngagement = sessions.reduce((s, r) => s + (parseFloat(r.engagement_level) || 5), 0) / sessions.length;
      // Each curiosity moment adds ~1 point, capped at +30
      const curiosityBonus = Math.min(totalCuriosity * 1.5, 30);
      // Engagement 1-10, scale to +0 to +15
      const engagementBonus = ((avgEngagement - 1) / 9) * 15;
      // Win frequency: up to +5 for 5+ wins
      const winBonus = Math.min(winCount, 5);
      score = Math.min(100, Math.round(50 + curiosityBonus + engagementBonus + winBonus));
    }

    // Get previous score to detect drops
    const prevProfile = await pool.query(
      `SELECT love_of_learning_score, id FROM kids_os_learning_profile
       WHERE child_id = $1 AND is_current = true LIMIT 1`,
      [childId]
    );
    const previousScore = parseFloat(prevProfile.rows[0]?.love_of_learning_score || 85);
    const previousProfileId = prevProfile.rows[0]?.id || null;
    const drop = previousScore - score;

    // AI synthesis — if available
    let aiSynthesis = null;
    if (callAI) {
      try {
        const prompt =
          `A child's love of learning score is ${score}/100 (was ${previousScore}). ` +
          `In the last 14 days: ${sessions.length} sessions, ${winCount} wins logged, ` +
          `total curiosity moments: ${sessions.reduce((s, r) => s + (parseInt(r.curiosity_moments) || 0), 0)}. ` +
          `Write 1-2 sentences for a parent/teacher: what this tells us and one specific thing to watch or celebrate. ` +
          `Warm, practical, specific. No jargon. No alarm unless the drop was significant (>15 points).`;
        const raw = await callAI(prompt);
        aiSynthesis = typeof raw === 'string' ? raw : raw?.content || raw?.text || null;
      } catch (_) {
        // Non-blocking
      }
    }

    // Retire old current profile, insert new one
    if (previousProfileId) {
      await pool.query(
        `UPDATE kids_os_learning_profile SET is_current = false WHERE id = $1`,
        [previousProfileId]
      );
    }
    await pool.query(
      `INSERT INTO kids_os_learning_profile
         (child_id, love_of_learning_score, ai_synthesis, is_current, created_at)
       VALUES ($1, $2, $3, true, now())`,
      [childId, score, aiSynthesis]
    );

    // Flag if drop > 15
    if (drop > 15) {
      const existingFlag = await pool.query(
        `SELECT id FROM kids_os_welfare_flags
         WHERE child_id = $1 AND flag_type = 'learning_love_drop' AND resolved = false LIMIT 1`,
        [childId]
      );
      if (!existingFlag.rows.length) {
        await pool.query(
          `INSERT INTO kids_os_welfare_flags
             (child_id, flag_type, severity, evidence, resolved, created_at)
           VALUES ($1, 'learning_love_drop', 'concern', $2, false, now())`,
          [childId, JSON.stringify({ previousScore, newScore: score, drop, sessionCount: sessions.length })]
        );
      }
    }

    return score;
  }

  // ── Misidentification flags ────────────────────────────────────────────────

  /**
   * Return structured misidentification flags from the child's profile.
   * Never diagnoses — always routes to professionals.
   * @param {number} childId
   */
  async function getMisidentificationFlags(childId) {
    const result = await pool.query(
      `SELECT flags FROM kids_os_children WHERE id = $1`,
      [childId]
    );
    if (!result.rows.length) throw new Error(`Child ${childId} not found`);

    const flags = result.rows[0]?.flags || {};
    const recommendations = [];

    if (flags.visual_stress) {
      recommendations.push({
        pattern: 'visual_stress',
        description: 'Pattern consistent with visual stress (may include Irlen Syndrome)',
        confidence: flags.visual_stress.confidence || 'moderate',
        firstStep: 'Try a free colored overlay trial — print a page, place a colored sheet (yellow, blue, green, pink) and observe reading comfort. If any color helps significantly, document and consult a developmental optometrist.',
        whenToSeekProfessional: 'If colored overlay trial shows significant improvement, seek a visual processing evaluation. This is a tool assessment, not a diagnosis.',
        neverDiagnose: true,
      });
    }
    if (flags.gifted_as_adhd) {
      recommendations.push({
        pattern: 'gifted_as_adhd',
        description: 'Pattern consistent with giftedness being misread as attention issues',
        confidence: flags.gifted_as_adhd.confidence || 'moderate',
        firstStep: 'Increase challenge level on high-interest topics before adjusting attention supports. Track performance on genuinely novel vs repetitive tasks separately.',
        whenToSeekProfessional: 'If inattention persists even on high-challenge novel material, a gifted-specialist evaluation is a useful next step.',
        neverDiagnose: true,
      });
    }
    if (flags.auditory_processing) {
      recommendations.push({
        pattern: 'auditory_processing',
        description: 'Pattern consistent with auditory processing differences',
        confidence: flags.auditory_processing.confidence || 'moderate',
        firstStep: 'Compare performance on written vs verbal instructions in a controlled way. Reduce background noise and observe if compliance/comprehension improves.',
        whenToSeekProfessional: 'An audiologist who specializes in auditory processing can provide a functional assessment.',
        neverDiagnose: true,
      });
    }
    if (flags.anxiety_as_behavior) {
      recommendations.push({
        pattern: 'anxiety_as_behavior',
        description: 'Behavior patterns appear concentrated around performance, transitions, or social exposure rather than being consistent',
        confidence: flags.anxiety_as_behavior.confidence || 'moderate',
        firstStep: 'Map when behavior issues occur. If they cluster before tests, presentations, transitions, or social situations — that\'s a different intervention than general behavior support.',
        whenToSeekProfessional: 'A child psychologist specializing in anxiety can distinguish anxiety-as-behavior from other patterns.',
        neverDiagnose: true,
      });
    }

    return {
      hasFlags: recommendations.length > 0,
      flags: recommendations,
      irlensGuidance: 'For any reading difficulty: print a page of text. Try placing a colored sheet over it — yellow, then blue, then green, then pink. Watch what happens to reading speed and comfort. If you see significant change with any color, that is important information worth exploring with a professional.',
    };
  }

  // ── Welfare check ─────────────────────────────────────────────────────────

  /**
   * Run a full belonging and welfare check for this child.
   * Checks: belonging guarantee, love of learning trend, open flags.
   * @param {number} childId
   */
  async function runBelongingCheck(childId) {
    const belonging = await checkBelongingGuarantee(childId);

    // Check confidence trend from profile
    const profileResult = await pool.query(
      `SELECT love_of_learning_score, confidence_baseline, created_at
       FROM kids_os_learning_profile
       WHERE child_id = $1
       ORDER BY created_at DESC
       LIMIT 2`,
      [childId]
    );
    const profiles = profileResult.rows;
    const currentScore = parseFloat(profiles[0]?.love_of_learning_score || 85);
    const previousScore = parseFloat(profiles[1]?.love_of_learning_score || currentScore);
    const scoreTrend = currentScore - previousScore;

    // Open welfare flags
    const flagResult = await pool.query(
      `SELECT flag_type, severity, evidence, created_at
       FROM kids_os_welfare_flags
       WHERE child_id = $1 AND resolved = false
       ORDER BY created_at DESC`,
      [childId]
    );
    const openFlags = flagResult.rows;

    return {
      belonging,
      learningLoveScore: currentScore,
      scoreTrend,
      scoreTrendLabel: scoreTrend > 5 ? 'improving' : scoreTrend < -5 ? 'declining' : 'stable',
      openFlags,
      welfare: openFlags.length === 0 && !belonging.flagged ? 'good' : 'needs_attention',
    };
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  /**
   * Full parent/teacher dashboard for a child. Everything in one call.
   * @param {number} childId
   */
  async function getChildDashboard(childId) {
    const child = await getChild(childId);

    const recentWinsResult = await pool.query(
      `SELECT * FROM kids_os_wins
       WHERE child_id = $1
       ORDER BY occurred_at DESC
       LIMIT 10`,
      [childId]
    );

    const integrityScore = await getIntegrityScore(childId);

    const openFlagsResult = await pool.query(
      `SELECT * FROM kids_os_welfare_flags
       WHERE child_id = $1 AND resolved = false
       ORDER BY created_at DESC`,
      [childId]
    );

    const sessionSummaryResult = await pool.query(
      `SELECT
         COUNT(*) AS total_sessions,
         SUM(curiosity_moments) AS total_curiosity_moments,
         AVG(engagement_level) AS avg_engagement,
         MAX(started_at) AS last_session
       FROM kids_os_sessions
       WHERE child_id = $1 AND started_at > now() - INTERVAL '30 days'`,
      [childId]
    );

    return {
      child,
      learningProfile: child.learningProfile,
      recentWins: recentWinsResult.rows,
      integrityScore,
      openFlags: openFlagsResult.rows,
      sessionSummary: sessionSummaryResult.rows[0] || {},
    };
  }

  return {
    enrollChild,
    getChild,
    logWin,
    checkBelongingGuarantee,
    logIntegrityAction,
    getIntegrityScore,
    logSession,
    updateLearningLoveScore,
    getMisidentificationFlags,
    runBelongingCheck,
    getChildDashboard,
  };
}
