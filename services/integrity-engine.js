/**
 * services/integrity-engine.js — Amendment 16 (Word Keeper)
 *
 * Integrity score calculation, gamification, events ledger, and pattern analysis.
 * Uses DeepSeek for trend analysis (per Amendment 16 AI council role assignment).
 *
 * Score: 0–1000. Starts at 500. Append-only event log.
 *
 * Exports: createIntegrityEngine(pool, councilService) → { recordOutcome, getScore, getPatterns, weeklyCoaching }
 * @ssot docs/projects/AMENDMENT_16_WORD_KEEPER.md
 */

// Score delta per event type (from Amendment 16 SSOT)
const SCORE_DELTAS = {
  kept_on_time:              +25,
  kept_within_24h:           +15,
  kept_late_communicated:    +10,
  renegotiated_proactive:    +8,
  honourable_exit:           +2,
  broken_communicated:       -15,
  broken_no_notice:          -30,
  no_show:                   -50,
  streak_7:                  +15,
  streak_30:                 +50,
  relationship_penalty:      -25,
  manual_adjustment:         0,   // points passed directly
};

// Score band definitions (0–1000)
const SCORE_BANDS = [
  { min: 0,    max: 199,  level: 1, title: 'Learning Your Word' },
  { min: 200,  max: 399,  level: 2, title: 'Building Trust' },
  { min: 400,  max: 599,  level: 3, title: 'Reliable' },
  { min: 600,  max: 749,  level: 4, title: 'Your Word Is Bond' },
  { min: 750,  max: 899,  level: 5, title: 'Integrity Leader' },
  { min: 900,  max: 999,  level: 6, title: 'Unbreakable' },
  { min: 1000, max: 1000, level: 7, title: 'The Word Keeper' },
];

function getBand(score) {
  const s = Math.max(0, Math.min(1000, score));
  return SCORE_BANDS.find(b => s >= b.min && s <= b.max) || SCORE_BANDS[0];
}

function clamp(n) {
  return Math.max(0, Math.min(1000, n));
}

export function createIntegrityEngine(pool, councilService) {
  // ── Record an outcome for a commitment ───────────────────────────────────
  async function recordOutcome(commitmentId, eventType, opts = {}) {
    if (!pool) return null;

    const userId = opts.userId || 'adam';
    const notes  = opts.notes || null;

    // Get current score
    const { rows: scoreRows } = await pool.query(
      'SELECT * FROM integrity_scores WHERE user_id = $1', [userId]
    );

    let current = scoreRows[0];
    if (!current) {
      // Seed if missing
      await pool.query(
        `INSERT INTO integrity_scores (user_id, score, level, level_title)
         VALUES ($1, 500, 2, 'Building Trust') ON CONFLICT DO NOTHING`, [userId]
      );
      current = { score: 500, level: 2, level_title: 'Building Trust',
        total_commitments: 0, kept_count: 0, broken_count: 0,
        honourable_exit_count: 0, current_streak: 0, longest_streak: 0 };
    }

    const scoreBefore = current.score;
    let points = opts.points ?? SCORE_DELTAS[eventType] ?? 0;

    // Streak logic — check kept streak
    let newStreak = current.current_streak;
    let longestStreak = current.longest_streak;
    let extraEvents = [];

    const isKept = ['kept_on_time', 'kept_within_24h', 'kept_late_communicated'].includes(eventType);
    const isBroken = ['broken_no_notice', 'broken_communicated', 'no_show'].includes(eventType);

    if (isKept) {
      newStreak++;
      if (newStreak > longestStreak) longestStreak = newStreak;
      // Streak bonuses
      if (newStreak === 7)  extraEvents.push({ type: 'streak_7',  pts: SCORE_DELTAS.streak_7 });
      if (newStreak === 30) extraEvents.push({ type: 'streak_30', pts: SCORE_DELTAS.streak_30 });
    } else if (isBroken || eventType === 'honourable_exit') {
      newStreak = 0;
    }

    // Relationship penalty check — 3 broken to same person
    if (isBroken && commitmentId) {
      const { rows: broken } = await pool.query(`
        SELECT COUNT(*) AS cnt FROM commitments c
        JOIN integrity_events ie ON ie.commitment_id = c.id
        WHERE c.to_person = (SELECT to_person FROM commitments WHERE id = $1)
          AND ie.event_type IN ('broken_no_notice','broken_communicated','no_show')
          AND c.user_id = $2
      `, [commitmentId, userId]);

      if (parseInt(broken[0]?.cnt || 0) >= 2) { // 2 prior + this one = 3
        extraEvents.push({ type: 'relationship_penalty', pts: SCORE_DELTAS.relationship_penalty });
      }
    }

    // Apply main event
    let scoreAfter = clamp(scoreBefore + points);
    const band = getBand(scoreAfter);

    // Bug fix: pool.query('BEGIN') does NOT work with connection pools — each call
    // gets a different connection. Must use pool.connect() for a dedicated client.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert main event
      const { rows: eventRows } = await client.query(`
        INSERT INTO integrity_events (user_id, commitment_id, event_type, points, score_before, score_after, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `, [userId, commitmentId || null, eventType, points, scoreBefore, scoreAfter, notes]);

      const mainEventId = eventRows[0].id;

      // Extra events (streaks, penalties)
      for (const extra of extraEvents) {
        const extraBefore = scoreAfter;
        scoreAfter = clamp(scoreAfter + extra.pts);
        await client.query(`
          INSERT INTO integrity_events (user_id, commitment_id, event_type, points, score_before, score_after, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, commitmentId || null, extra.type, extra.pts, extraBefore, scoreAfter, `Auto from ${eventType}`]);
      }

      // Update commitment status if commitmentId provided
      if (commitmentId) {
        let newStatus;
        if (isKept)                               newStatus = 'kept';
        else if (eventType === 'no_show')         newStatus = 'broken';
        else if (isBroken)                        newStatus = 'broken';
        else if (eventType === 'honourable_exit') newStatus = 'honourable_exit';
        else if (eventType === 'renegotiated_proactive') newStatus = 'renegotiated';

        if (newStatus) {
          await client.query(`
            UPDATE commitments SET status = $1, completed_at = NOW(),
              outcome_notes = $2, score_event_id = $3, updated_at = NOW()
            WHERE id = $4
          `, [newStatus, notes, mainEventId, commitmentId]);
        }
      }

      // Update integrity score
      const finalBand = getBand(scoreAfter);
      await client.query(`
        UPDATE integrity_scores SET
          score = $1, level = $2, level_title = $3,
          kept_count = kept_count + $4,
          broken_count = broken_count + $5,
          honourable_exit_count = honourable_exit_count + $6,
          total_commitments = total_commitments + $7,
          current_streak = $8, longest_streak = $9,
          last_event_at = NOW(), updated_at = NOW()
        WHERE user_id = $10
      `, [
        scoreAfter, finalBand.level, finalBand.title,
        isKept ? 1 : 0,
        isBroken ? 1 : 0,
        eventType === 'honourable_exit' ? 1 : 0,
        (isKept || isBroken || eventType === 'honourable_exit') ? 1 : 0,
        newStreak, longestStreak,
        userId,
      ]);

      await client.query('COMMIT');

      return {
        scoreBefore,
        scoreAfter,
        pointsAwarded: points,
        extraEvents,
        band: finalBand,
        streak: newStreak,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Get current score + breakdown ────────────────────────────────────────
  async function getScore(userId = 'adam') {
    if (!pool) return null;

    const { rows: scoreRows } = await pool.query(
      'SELECT * FROM integrity_scores WHERE user_id = $1', [userId]
    );
    const score = scoreRows[0];
    if (!score) return null;

    // 30-day trend
    const { rows: trend } = await pool.query(`
      SELECT
        DATE_TRUNC('day', created_at) AS day,
        MAX(score_after) AS score
      FROM integrity_events
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `, [userId]);

    // Breakdown by category — filter both tables by user_id to prevent cross-user contamination
    const { rows: byCategory } = await pool.query(`
      SELECT c.category,
        COUNT(*) FILTER (WHERE ie.event_type IN ('kept_on_time','kept_within_24h','kept_late_communicated')) AS kept,
        COUNT(*) FILTER (WHERE ie.event_type IN ('broken_no_notice','broken_communicated','no_show')) AS broken
      FROM commitments c
      JOIN integrity_events ie ON ie.commitment_id = c.id AND ie.user_id = $1
      WHERE c.user_id = $1
        AND ie.event_type NOT IN ('streak_7','streak_30','relationship_penalty','manual_adjustment')
      GROUP BY c.category
    `, [userId]);

    // Breakdown by person — filter both tables by user_id
    const { rows: byPerson } = await pool.query(`
      SELECT c.to_person,
        COUNT(*) FILTER (WHERE ie.event_type IN ('kept_on_time','kept_within_24h','kept_late_communicated')) AS kept,
        COUNT(*) FILTER (WHERE ie.event_type IN ('broken_no_notice','broken_communicated','no_show')) AS broken
      FROM commitments c
      JOIN integrity_events ie ON ie.commitment_id = c.id AND ie.user_id = $1
      WHERE c.user_id = $1 AND c.to_person IS NOT NULL
        AND ie.event_type NOT IN ('streak_7','streak_30','relationship_penalty','manual_adjustment')
      GROUP BY c.to_person ORDER BY (kept + broken) DESC
      LIMIT 10
    `, [userId]);

    const band = getBand(score.score);
    const keepRate = score.total_commitments > 0
      ? Math.round((score.kept_count / score.total_commitments) * 100)
      : 0;

    return {
      score: score.score,
      level: band.level,
      title: band.title,
      keepRate,
      counts: {
        total: score.total_commitments,
        kept: score.kept_count,
        broken: score.broken_count,
        honourableExits: score.honourable_exit_count,
      },
      streak: {
        current: score.current_streak,
        longest: score.longest_streak,
      },
      trend: trend.map(r => ({ day: r.day, score: parseInt(r.score) })),
      byCategory: byCategory.map(r => ({
        category: r.category,
        kept: parseInt(r.kept || 0),
        broken: parseInt(r.broken || 0),
      })),
      byPerson: byPerson.map(r => ({
        person: r.to_person,
        kept: parseInt(r.kept || 0),
        broken: parseInt(r.broken || 0),
      })),
    };
  }

  // ── Pattern analysis via DeepSeek ─────────────────────────────────────────
  async function getPatterns(userId = 'adam') {
    if (!pool) return null;

    // Time-of-day pattern
    const { rows: byHour } = await pool.query(`
      SELECT EXTRACT(HOUR FROM c.created_at) AS hour,
        COUNT(*) FILTER (WHERE ie.event_type IN ('broken_no_notice','broken_communicated','no_show')) AS broken,
        COUNT(*) AS total
      FROM commitments c
      JOIN integrity_events ie ON ie.commitment_id = c.id
      WHERE c.user_id = $1
        AND ie.event_type NOT IN ('streak_7','streak_30','relationship_penalty','manual_adjustment')
      GROUP BY 1 ORDER BY 1
    `, [userId]);

    // Day of week pattern
    const { rows: byDay } = await pool.query(`
      SELECT TO_CHAR(c.created_at, 'Day') AS dow,
        COUNT(*) FILTER (WHERE ie.event_type IN ('broken_no_notice','broken_communicated','no_show')) AS broken,
        COUNT(*) AS total
      FROM commitments c
      JOIN integrity_events ie ON ie.commitment_id = c.id
      WHERE c.user_id = $1
        AND ie.event_type NOT IN ('streak_7','streak_30','relationship_penalty','manual_adjustment')
      GROUP BY 1 ORDER BY MIN(c.created_at)
    `, [userId]);

    // Recent event history for DeepSeek context
    const { rows: recentEvents } = await pool.query(`
      SELECT ie.event_type, ie.points, c.category, c.to_person,
        c.deadline, ie.created_at
      FROM integrity_events ie
      LEFT JOIN commitments c ON c.id = ie.commitment_id
      WHERE ie.user_id = $1
        AND ie.event_type NOT IN ('streak_7','streak_30','relationship_penalty')
      ORDER BY ie.created_at DESC LIMIT 50
    `, [userId]);

    // Only run DeepSeek analysis if we have enough data
    let aiPatterns = null;
    if (councilService && recentEvents.length >= 5) {
      try {
        const prompt = `Analyze this commitment tracking data and identify behavioral patterns.

Hour-of-day breakdown (broken/total):
${byHour.map(r => `  Hour ${r.hour}: ${r.broken} broken / ${r.total} total`).join('\n')}

Day-of-week breakdown:
${byDay.map(r => `  ${r.dow.trim()}: ${r.broken} broken / ${r.total} total`).join('\n')}

Recent 50 events:
${recentEvents.map(r => `  ${r.event_type} | ${r.category} | to:${r.to_person || 'self'}`).join('\n')}

Return ONLY valid JSON:
{
  "patterns": [
    { "insight": "string", "severity": "info|warning|concern", "actionable": "string" }
  ],
  "topRisk": "the single biggest pattern to address",
  "topStrength": "the single biggest strength"
}`;

        const response = await councilService.ask(prompt, {
          model: 'deepseek',
          taskType: 'analysis',
          temperature: 0.3,
        });

        const text = (response?.content || response?.text || response || '').trim();
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        aiPatterns = JSON.parse(cleaned);
      } catch (err) {
        console.warn('[IntegrityEngine] DeepSeek pattern analysis failed:', err.message);
      }
    }

    return {
      byHour: byHour.map(r => ({
        hour: parseInt(r.hour),
        broken: parseInt(r.broken || 0),
        total: parseInt(r.total || 0),
      })),
      byDay: byDay.map(r => ({
        day: r.dow.trim(),
        broken: parseInt(r.broken || 0),
        total: parseInt(r.total || 0),
      })),
      aiPatterns,
    };
  }

  // ── Weekly coaching SMS content ──────────────────────────────────────────
  async function weeklyCoaching(userId = 'adam') {
    if (!pool || !councilService) return null;

    const score = await getScore(userId);
    if (!score) return null;

    const { rows: weekEvents } = await pool.query(`
      SELECT ie.event_type, ie.points, c.raw_text, c.to_person, c.category
      FROM integrity_events ie
      LEFT JOIN commitments c ON c.id = ie.commitment_id
      WHERE ie.user_id = $1
        AND ie.created_at >= NOW() - INTERVAL '7 days'
        AND ie.event_type NOT IN ('streak_7','streak_30','relationship_penalty')
      ORDER BY ie.created_at DESC
    `, [userId]);

    const prompt = `You are an integrity coach. Write a concise weekly coaching summary for SMS delivery.

This week's data:
- Score: ${score.score}/1000 (${score.title})
- Kept: ${score.counts.kept} | Broken: ${score.counts.broken}
- Current streak: ${score.streak.current}
- Events: ${weekEvents.map(r => r.event_type).join(', ')}

Rules:
- Maximum 160 characters per section (SMS limit)
- 4 sections: score line, best kept, one lesson from a broken, one thing to focus on
- Warm but direct. No sugarcoating.

Return ONLY valid JSON:
{
  "scoreLine": "string (max 160 chars)",
  "bestKept": "string (max 160 chars)",
  "lesson": "string (max 160 chars)",
  "focus": "string (max 160 chars)"
}`;

    try {
      const response = await councilService.ask(prompt, {
        model: 'claude',
        taskType: 'summary',
        temperature: 0.5,
      });
      const text = (response?.content || response?.text || response || '').trim();
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn('[IntegrityEngine] weeklyCoaching failed:', err.message);
      return null;
    }
  }

  return { recordOutcome, getScore, getPatterns, weeklyCoaching };
}
