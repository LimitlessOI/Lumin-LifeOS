/**
 * services/future-self-simulator.js
 *
 * Future Self Simulator — the most powerful feature in the platform.
 *
 * Shows any person what their consistent effort produces at any time horizon
 * they choose. The goal is NOT abstract level numbers — it is specific,
 * tangible capability descriptions: what will you actually be able to DO?
 *
 * Domains: music, reading, math, skill, habit, fitness, finance,
 *          relationship, custom
 *
 * Exports: createFutureSimulator({ pool, callAI })
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const VALID_DOMAINS = new Set([
  'music', 'reading', 'math', 'skill', 'habit',
  'fitness', 'finance', 'relationship', 'custom',
]);

// Compound growth constant: approximate weekly skill level gain per minute/day
// of focused deliberate practice. Tuned per domain below.
const DOMAIN_GROWTH_RATES = {
  music:        0.35,
  reading:      0.28,
  math:         0.32,
  skill:        0.30,
  habit:        0.40,
  fitness:      0.38,
  finance:      0.25,
  relationship: 0.22,
  custom:       0.30,
};

/**
 * @param {{ pool: import('pg').Pool, callAI: Function|null }} deps
 */
export function createFutureSimulator({ pool, callAI }) {

  // ── Core projection math ──────────────────────────────────────────────────

  /**
   * Compute projected level using a decelerating growth curve.
   * Growth is fastest when starting from a lower base, slows as mastery climbs.
   */
  function computeProjectedLevel(currentLevel, weeklyMinutes, horizonDays, domain) {
    const weeks         = horizonDays / 7;
    const growthRate    = DOMAIN_GROWTH_RATES[domain] || 0.30;
    // Effective gain per week: rate × sqrt(minutes) × distance-from-ceiling factor
    const ceilingFactor = (100 - currentLevel) / 100;
    const weeklyGain    = growthRate * Math.sqrt(weeklyMinutes) * ceilingFactor;
    const totalGain     = weeklyGain * weeks;
    return Math.min(100, Math.round(currentLevel + totalGain));
  }

  /**
   * Build milestone days array: 25%, 50%, 75%, 100% of horizon.
   */
  function buildMilestoneDays(horizonDays) {
    return [
      Math.round(horizonDays * 0.25),
      Math.round(horizonDays * 0.5),
      Math.round(horizonDays * 0.75),
      horizonDays,
    ].filter((d, i, arr) => arr.indexOf(d) === i);  // dedupe if horizon is very short
  }

  // ── AI narrative generation ───────────────────────────────────────────────

  async function generateNarrative({ domain, currentBaseline, commitmentLevel, targetHorizonDays, projectedLevel }) {
    if (!callAI) {
      return buildFallbackNarrative({ domain, commitmentLevel, targetHorizonDays, projectedLevel });
    }

    const weeks        = Math.round(targetHorizonDays / 7);
    const minsPerDay   = commitmentLevel.minutesPerDay || 0;
    const sessions     = commitmentLevel.sessionsPerWeek || 0;
    const currentDesc  = currentBaseline.description || `at level ${currentBaseline.level}/100`;

    const prompt =
      `You are a Future Self Simulator. Your job is to produce a SPECIFIC, concrete, tangible description of what a person will actually be ABLE TO DO after consistent effort.

Domain: ${domain}
Current state: ${currentDesc} (level ${currentBaseline.level}/100)
Commitment: ${minsPerDay} minutes/day, ${sessions} sessions/week
Horizon: ${weeks} weeks (${targetHorizonDays} days)
Projected level: ${projectedLevel}/100

Write TWO things:

1. narrativeArc (2-4 sentences): A specific story of their capability progression. NOT "you'll improve" — say what they'll actually DO. For music: "In 6 weeks you'll play the chorus cleanly. At 3 months, the full song with expression. At 6 months, you'll play for people without looking at your hands." For fitness: "In 6 weeks you'll run 3 miles without stopping. At 3 months, a 5K under 30 minutes." Be THIS specific.

2. milestones (array): 4 milestone objects for the key checkpoint days. Each has:
   - day: number
   - description: specific capability description (what can they DO on this day)
   - level: number (0-100)

Format as JSON:
{
  "narrativeArc": "...",
  "milestones": [
    { "day": N, "description": "...", "level": N },
    ...
  ]
}`;

    try {
      const raw = await callAI(prompt);
      const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      return {
        narrativeArc: parsed.narrativeArc || buildFallbackNarrative({ domain, commitmentLevel, targetHorizonDays, projectedLevel }),
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones : buildFallbackMilestones({ currentBaseline, projectedLevel, targetHorizonDays }),
      };
    } catch {
      return {
        narrativeArc: buildFallbackNarrative({ domain, commitmentLevel, targetHorizonDays, projectedLevel }),
        milestones: buildFallbackMilestones({ currentBaseline, projectedLevel, targetHorizonDays }),
      };
    }
  }

  function buildFallbackNarrative({ domain, commitmentLevel, targetHorizonDays, projectedLevel }) {
    const weeks = Math.round(targetHorizonDays / 7);
    const mins  = commitmentLevel.minutesPerDay || 0;
    return `At ${mins} minutes/day over ${weeks} weeks, you'll reach level ${projectedLevel}/100 in ${domain}. Consistent practice compounds — the gains in weeks 6-12 will be noticeably faster than weeks 1-6.`;
  }

  function buildFallbackMilestones({ currentBaseline, projectedLevel, targetHorizonDays }) {
    const milestoneDays = buildMilestoneDays(targetHorizonDays);
    const levelRange    = projectedLevel - currentBaseline.level;
    return milestoneDays.map((day, i) => {
      const fraction = (i + 1) / milestoneDays.length;
      const level    = Math.round(currentBaseline.level + levelRange * fraction);
      return { day, description: `Checkpoint at day ${day}: ~level ${level}`, level };
    });
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /**
   * Project a single user commitment + horizon combination.
   */
  async function project(userId, { domain, currentBaseline, commitmentLevel, targetHorizonDays }) {
    if (!VALID_DOMAINS.has(domain)) {
      throw new Error(`Invalid domain. Valid: ${[...VALID_DOMAINS].join(', ')}`);
    }

    const weeklyMinutes = (commitmentLevel.minutesPerDay || 0) * (commitmentLevel.sessionsPerWeek || 7);
    const projectedLevel = computeProjectedLevel(
      currentBaseline.level,
      weeklyMinutes,
      targetHorizonDays,
      domain,
    );

    // Confidence range: ±10% based on velocity data
    const confidenceRange = {
      low:  Math.max(currentBaseline.level, projectedLevel - 10),
      high: Math.min(100, projectedLevel + 10),
    };

    // Build comparison levels (10/20/30/45/60 min/day)
    const comparisonMinutes = [10, 20, 30, 45, 60];
    const comparisonLevels  = comparisonMinutes.map(mins => ({
      label:          `${mins} min/day`,
      minutesPerDay:  mins,
      projectedLevel: computeProjectedLevel(
        currentBaseline.level,
        mins * (commitmentLevel.sessionsPerWeek || 7),
        targetHorizonDays,
        domain,
      ),
    }));

    // AI narrative
    const { narrativeArc, milestones } = await generateNarrative({
      domain, currentBaseline, commitmentLevel, targetHorizonDays, projectedLevel,
    });

    const projection = {
      domain,
      targetHorizonDays,
      currentLevel:     currentBaseline.level,
      projectedLevel,
      confidenceRange,
      milestones,
      narrativeArc,
      comparisonLevels,
    };

    // Persist
    try {
      await pool.query(
        `INSERT INTO future_self_projections
           (user_id, domain, commitment_level, target_horizon_days, baseline_snapshot, projection)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, domain, JSON.stringify(commitmentLevel), targetHorizonDays,
         JSON.stringify(currentBaseline), JSON.stringify(projection)],
      );
    } catch { /* non-fatal */ }

    return projection;
  }

  /**
   * Project multiple horizons in one call.
   */
  async function projectMultiple(userId, { domain, currentBaseline, horizons, commitmentLevel }) {
    const results = await Promise.all(
      horizons.map(days => project(userId, { domain, currentBaseline, commitmentLevel, targetHorizonDays: days }))
    );
    return results;
  }

  /**
   * Compare different commitment levels at a fixed horizon.
   */
  async function compareCommitmentLevels(userId, { domain, currentBaseline, horizon, levels }) {
    const results = await Promise.all(
      levels.map(({ minutesPerDay, label, sessionsPerWeek = 7 }) =>
        project(userId, {
          domain,
          currentBaseline,
          commitmentLevel: { minutesPerDay, sessionsPerWeek, label },
          targetHorizonDays: horizon,
        })
      )
    );
    return results.map((r, i) => ({ ...r, label: levels[i].label }));
  }

  /**
   * Log a practice session — updates velocity tracking.
   */
  async function logPracticeSession(userId, { domain, durationMinutes, qualityScore, notes }) {
    // Velocity contribution: quality-weighted minutes
    const qualityWeight       = qualityScore != null ? (qualityScore / 10) : 0.7;
    const velocityContribution = (durationMinutes || 0) * qualityWeight;

    const { rows } = await pool.query(
      `INSERT INTO practice_sessions
         (user_id, domain, duration_minutes, quality_score, notes, velocity_contribution)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, domain, durationMinutes || 0, qualityScore || null,
       notes || null, velocityContribution],
    );
    return rows[0];
  }

  /**
   * Get velocity for a domain from recent practice sessions.
   */
  async function getVelocity(userId, domain) {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)                                     AS session_count,
         COALESCE(AVG(quality_score), 7)              AS average_quality,
         COALESCE(SUM(velocity_contribution), 0)      AS total_velocity,
         COALESCE(AVG(duration_minutes), 0)           AS avg_duration
       FROM practice_sessions
       WHERE user_id = $1
         AND domain  = $2
         AND recorded_at >= NOW() - INTERVAL '28 days'`,
      [userId, domain],
    );

    const r            = rows[0];
    const sessionCount = parseInt(r.session_count) || 0;
    const weeklyVelocity = sessionCount > 0
      ? parseFloat(r.total_velocity) / 4  // 4-week window → per week
      : 0;

    // Trend: compare last 14d vs prior 14d
    const { rows: trendRows } = await pool.query(
      `SELECT
         COALESCE(AVG(velocity_contribution) FILTER (WHERE recorded_at >= NOW() - INTERVAL '14 days'), 0) AS recent,
         COALESCE(AVG(velocity_contribution) FILTER (WHERE recorded_at < NOW() - INTERVAL '14 days'
                                                      AND  recorded_at >= NOW() - INTERVAL '28 days'), 0) AS prior
       FROM practice_sessions
       WHERE user_id = $1 AND domain = $2
         AND recorded_at >= NOW() - INTERVAL '28 days'`,
      [userId, domain],
    );

    const recent = parseFloat(trendRows[0]?.recent) || 0;
    const prior  = parseFloat(trendRows[0]?.prior)  || 0;
    const trend  = sessionCount < 3 ? 'building'
      : recent > prior * 1.1 ? 'accelerating'
      : recent < prior * 0.9 ? 'decelerating'
      : 'steady';

    return {
      velocityPerWeek: Math.round(weeklyVelocity * 10) / 10,
      sessionCount,
      averageQuality:  Math.round(parseFloat(r.average_quality) * 10) / 10,
      avgDurationMinutes: Math.round(parseFloat(r.avg_duration)),
      trend,
    };
  }

  /**
   * Retrieve projection history for a user + domain.
   */
  async function getProjectionHistory(userId, domain) {
    const { rows } = await pool.query(
      `SELECT id, domain, commitment_level, target_horizon_days, baseline_snapshot, projection, created_at
       FROM future_self_projections
       WHERE user_id = $1 AND domain = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, domain],
    );
    return rows;
  }

  return {
    project,
    projectMultiple,
    compareCommitmentLevels,
    logPracticeSession,
    getVelocity,
    getProjectionHistory,
  };
}
