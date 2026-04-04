/**
 * services/self-sabotage-monitor.js
 *
 * Self-Sabotage Monitor — detects behavioral sabotage patterns and surfaces
 * them back to the user as information (never judgment) so they can choose
 * to intervene before the pattern fully activates.
 *
 * Pattern Detection:
 *   - Commitment dropout (commitments made but not checked in on)
 *   - Joy score crashes correlated with milestone proximity
 *   - Sudden withdrawal before important events
 *   - Habitual "I was so close" moments
 *   - Cycle recurrence (same pattern at same time intervals)
 *
 * This service OBSERVES and SURFACES patterns. It does not intervene,
 * prescribe, or label the user. Sovereignty is preserved absolutely.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const SABOTAGE_PATTERNS = [
  {
    id: 'commitment_dropout',
    name: 'Commitment Dropout',
    description: 'Commitments made but not followed through — especially near milestone moments',
    signals: ['commitment_missed', 'check_in_skipped', 'goal_abandoned'],
  },
  {
    id: 'proximity_retreat',
    name: 'Proximity Retreat',
    description: 'Withdrawal or avoidance behavior increases as an important event approaches',
    signals: ['social_withdrawal', 'joy_score_drop', 'upcoming_milestone'],
  },
  {
    id: 'joy_crash_before_win',
    name: 'Joy Crash Before Win',
    description: 'Joy score drops significantly in the 3-7 days before a major personal win',
    signals: ['joy_score_drop', 'momentum_stall', 'win_proximity'],
  },
  {
    id: 'cycle_recurrence',
    name: 'Recurring Cycle',
    description: 'Same pattern appearing at predictable intervals (weekly, monthly, seasonal)',
    signals: ['pattern_repeat', 'time_interval'],
  },
  {
    id: 'sudden_chaos_creation',
    name: 'Sudden Chaos Creation',
    description: 'User creates or escalates conflicts, crises, or distractions immediately before important progress',
    signals: ['conflict_spike', 'distraction_creation', 'momentum_disruption'],
  },
];

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createSelfSabotageMonitor({ pool, callAI }) {
  /**
   * Analyze a user's recent behavioral data for sabotage patterns.
   * Returns detected patterns with confidence scores and non-judgmental framing.
   */
  async function detectPatterns(userId, lookbackDays = 90) {
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch commitment data
    const commitmentRows = await pool.query(
      `SELECT c.id, c.text, c.due_date, c.status, c.created_at,
              COUNT(ci.id) as checkin_count
       FROM commitments c
       LEFT JOIN commitment_checkins ci ON ci.commitment_id = c.id
       WHERE c.user_id = $1 AND c.created_at > $2
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [userId, since]
    ).then(r => r.rows).catch(() => []);

    // Fetch joy score trend
    const joyRows = await pool.query(
      `SELECT score, logged_at, notes
       FROM joy_checkins
       WHERE user_id = $1 AND logged_at > $2
       ORDER BY logged_at ASC`,
      [userId, since]
    ).then(r => r.rows).catch(() => []);

    // Fetch previously logged sabotage patterns
    const existingPatterns = await pool.query(
      `SELECT pattern_id, detected_at, confidence, acknowledged
       FROM self_sabotage_log
       WHERE user_id = $1 AND detected_at > $2
       ORDER BY detected_at DESC`,
      [userId, since]
    ).then(r => r.rows).catch(() => []);

    const detected = [];

    // ── Pattern 1: Commitment Dropout ─────────────────────────────────────────
    const missedCommitments = commitmentRows.filter(
      c => c.status === 'missed' || (c.status === 'active' && c.checkin_count === '0')
    );
    if (missedCommitments.length >= 3) {
      const recentMissed = missedCommitments.filter(c => {
        const age = (Date.now() - new Date(c.created_at)) / (1000 * 60 * 60 * 24);
        return age <= 30;
      });
      if (recentMissed.length >= 2) {
        detected.push({
          pattern_id: 'commitment_dropout',
          confidence: Math.min(0.9, 0.4 + recentMissed.length * 0.1),
          evidence: `${recentMissed.length} commitments in the last 30 days with no check-ins`,
          framing: `You've made ${recentMissed.length} commitments recently that haven't had any check-ins. This might just be a busy period — or it might be worth looking at what gets in the way.`,
        });
      }
    }

    // ── Pattern 2: Joy Crash Before Win ──────────────────────────────────────
    if (joyRows.length >= 7) {
      const recentScores = joyRows.slice(-14);
      if (recentScores.length >= 7) {
        const firstHalfAvg = recentScores.slice(0, Math.floor(recentScores.length / 2))
          .reduce((sum, r) => sum + Number(r.score), 0) / Math.floor(recentScores.length / 2);
        const secondHalfAvg = recentScores.slice(Math.floor(recentScores.length / 2))
          .reduce((sum, r) => sum + Number(r.score), 0) / Math.ceil(recentScores.length / 2);

        if (firstHalfAvg - secondHalfAvg >= 2.5) {
          detected.push({
            pattern_id: 'joy_crash_before_win',
            confidence: 0.65,
            evidence: `Joy score dropped an average of ${(firstHalfAvg - secondHalfAvg).toFixed(1)} points in the last week vs the week before`,
            framing: `Your joy scores have dipped noticeably this week. Sometimes this happens right before something important — a protective move to lower expectations. Just something to notice.`,
          });
        }
      }
    }

    // ── Pattern 4: Cycle Recurrence ───────────────────────────────────────────
    if (existingPatterns.length >= 2) {
      const patternCounts = {};
      existingPatterns.forEach(p => {
        patternCounts[p.pattern_id] = (patternCounts[p.pattern_id] || 0) + 1;
      });
      for (const [patternId, count] of Object.entries(patternCounts)) {
        if (count >= 2) {
          detected.push({
            pattern_id: 'cycle_recurrence',
            confidence: Math.min(0.9, 0.5 + count * 0.1),
            evidence: `The "${patternId}" pattern has appeared ${count} times in the last ${lookbackDays} days`,
            framing: `This pattern has shown up ${count} times. That kind of repetition usually means something — not a flaw, just a cycle worth understanding.`,
          });
        }
      }
    }

    // ── AI enrichment (if available) ─────────────────────────────────────────
    if (callAI && detected.length > 0) {
      try {
        const summary = detected.map(d => `${d.pattern_id}: ${d.evidence}`).join('; ');
        const aiInsight = await callAI(
          `A user's behavioral data shows these patterns: ${summary}. ` +
          `In 2-3 sentences, frame what this might mean — non-judgmentally, as pure curiosity. ` +
          `Use "you might" and "sometimes" language. Never diagnose. Never label. ` +
          `End with one open question they can sit with.`
        );
        if (aiInsight) {
          detected.forEach(d => { d.ai_insight = aiInsight; });
        }
      } catch (_) { /* AI not required */ }
    }

    return {
      user_id: userId,
      lookback_days: lookbackDays,
      patterns_detected: detected,
      pattern_count: detected.length,
      analyzed_at: new Date().toISOString(),
    };
  }

  /**
   * Store a detected pattern in the log.
   */
  async function logPattern(userId, patternId, confidence, evidence, framing) {
    await pool.query(
      `INSERT INTO self_sabotage_log (user_id, pattern_id, confidence, evidence, framing, detected_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT DO NOTHING`,
      [userId, patternId, confidence, evidence, framing]
    );
  }

  /**
   * Mark a pattern as acknowledged by the user.
   */
  async function acknowledgePattern(userId, logId) {
    const result = await pool.query(
      `UPDATE self_sabotage_log SET acknowledged = true, acknowledged_at = now()
       WHERE id = $1 AND user_id = $2 RETURNING id`,
      [logId, userId]
    );
    return result.rowCount > 0;
  }

  /**
   * Get pattern history for a user.
   */
  async function getPatternHistory(userId, limit = 20) {
    const rows = await pool.query(
      `SELECT id, pattern_id, confidence, evidence, framing, detected_at, acknowledged, acknowledged_at
       FROM self_sabotage_log
       WHERE user_id = $1
       ORDER BY detected_at DESC
       LIMIT $2`,
      [userId, limit]
    ).then(r => r.rows).catch(() => []);

    return rows;
  }

  /**
   * Get all available pattern definitions (for frontend display).
   */
  function getPatternDefinitions() {
    return SABOTAGE_PATTERNS;
  }

  return {
    detectPatterns,
    logPattern,
    acknowledgePattern,
    getPatternHistory,
    getPatternDefinitions,
  };
}
