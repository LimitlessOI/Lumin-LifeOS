/**
 * Daily scoreboard + trend aggregation for LifeOS.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

function clampScore(value, fallback = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function average(values = []) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function trendFromPair(current, prior, threshold = 3) {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return 'building';
  if (current > prior + threshold) return 'rising';
  if (current < prior - threshold) return 'falling';
  return 'flat';
}

function statusFromScore(score) {
  if (!Number.isFinite(score)) return 'building';
  if (score >= 80) return 'strong';
  if (score >= 65) return 'on_track';
  if (score >= 50) return 'watch';
  return 'off_track';
}

export function createLifeOSScoreboardService({ pool, integrity, joy, focusPrivacy }) {
  async function getHealthScore(userId) {
    const { rows } = await pool.query(
      `SELECT sleep_hours, hrv, energy_score, mood_score
         FROM health_checkins
        WHERE user_id = $1
        ORDER BY checkin_date DESC, created_at DESC
        LIMIT 1`,
      [userId],
    ).catch(() => ({ rows: [] }));
    const row = rows[0];
    if (!row) return { score: null, summary: null };

    const sleepScore = row.sleep_hours == null ? null
      : row.sleep_hours >= 7 ? 100
      : row.sleep_hours >= 6 ? 75
      : row.sleep_hours >= 5 ? 55
      : 35;
    const energyScore = row.energy_score == null ? null : Math.max(0, Math.min(100, Number(row.energy_score) * 10));
    const moodScore = row.mood_score == null ? null : Math.max(0, Math.min(100, Number(row.mood_score) * 10));
    const score = clampScore(average([sleepScore, energyScore, moodScore]));
    return {
      score,
      summary: {
        sleep_hours: row.sleep_hours,
        hrv: row.hrv,
        energy_score: row.energy_score,
        mood_score: row.mood_score,
      },
    };
  }

  async function getFocusTrend(userId) {
    const { rows } = await pool.query(
      `WITH daily AS (
         SELECT date_trunc('day', started_at)::date AS day,
                SUM(planned_minutes)::float AS planned_minutes,
                SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60.0)::float AS actual_minutes
           FROM lifeos_focus_sessions
          WHERE user_id = $1
            AND started_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY 1
       )
       SELECT
         AVG(CASE WHEN planned_minutes > 0 THEN (actual_minutes / planned_minutes) * 100 ELSE NULL END)
           FILTER (WHERE day >= CURRENT_DATE - INTERVAL '7 days') AS current_ratio,
         AVG(CASE WHEN planned_minutes > 0 THEN (actual_minutes / planned_minutes) * 100 ELSE NULL END)
           FILTER (WHERE day >= CURRENT_DATE - INTERVAL '14 days' AND day < CURRENT_DATE - INTERVAL '7 days') AS prior_ratio,
         COALESCE(SUM(actual_minutes) FILTER (WHERE day >= CURRENT_DATE - INTERVAL '7 days'), 0) AS current_minutes,
         COALESCE(COUNT(*) FILTER (WHERE day >= CURRENT_DATE - INTERVAL '7 days'), 0) AS active_days
       FROM daily`,
      [userId],
    ).catch(() => ({ rows: [{}] }));
    const row = rows[0] || {};
    const current = clampScore(row.current_ratio);
    const prior = clampScore(row.prior_ratio);
    return {
      score: current,
      trend: trendFromPair(current, prior),
      summary: {
        current_ratio: current,
        prior_ratio: prior,
        minutes_7d: Math.round(Number(row.current_minutes || 0)),
        active_days_7d: Number(row.active_days || 0),
      },
    };
  }

  async function getBusinessScore(userId) {
    const { rows } = await pool.query(
      `WITH outreach AS (
         SELECT
           COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::float AS created_7d,
           COUNT(*) FILTER (WHERE status = 'executed' AND updated_at >= CURRENT_DATE - INTERVAL '7 days')::float AS executed_7d,
           COUNT(*) FILTER (WHERE status = 'pending')::float AS pending_now,
           COUNT(*) FILTER (WHERE status = 'awaiting_response')::float AS waiting_now
         FROM lifeos_outreach_tasks
         WHERE user_id = $1
       ),
       calendar AS (
         SELECT
           COUNT(*) FILTER (WHERE lane = 'work' AND starts_at >= NOW() AND starts_at < NOW() + INTERVAL '7 days')::float AS work_events_7d
         FROM lifeos_calendar_events
         WHERE user_id = $1
           AND status = 'confirmed'
       )
       SELECT * FROM outreach CROSS JOIN calendar`,
      [userId],
    ).catch(() => ({ rows: [{}] }));
    const row = rows[0] || {};
    const created = Number(row.created_7d || 0);
    const executed = Number(row.executed_7d || 0);
    const waiting = Number(row.waiting_now || 0);
    const pending = Number(row.pending_now || 0);
    const workEvents = Number(row.work_events_7d || 0);

    const executionScore = created > 0 ? Math.min(100, Math.round((executed / created) * 100)) : (workEvents > 0 ? 70 : null);
    const workloadScore = pending > 8 ? 45 : pending > 4 ? 65 : 82;
    const responsivenessScore = waiting > 5 ? 55 : waiting > 2 ? 70 : 85;
    const score = clampScore(average([executionScore, workloadScore, responsivenessScore]));

    return {
      score,
      summary: {
        created_7d: created,
        executed_7d: executed,
        pending_now: pending,
        waiting_now: waiting,
        work_events_7d: workEvents,
      },
    };
  }

  async function getScoreboard(userId) {
    const [integrityLatest, integrityTrend, joyLatest, focusToday, focusTrend, health, business] = await Promise.all([
      integrity.getLatest(userId),
      integrity.getTrend(userId),
      joy.getLatestScore(userId),
      focusPrivacy.getTodayFocusSummary(userId),
      getFocusTrend(userId),
      getHealthScore(userId),
      getBusinessScore(userId),
    ]);

    const integrityScore = clampScore(integrityLatest?.total_score);
    const joyScore = joyLatest?.avg_joy_7d == null ? null : clampScore(Number(joyLatest.avg_joy_7d) * 10);
    const focusScore = focusTrend.score ?? (focusToday?.on_task_ratio == null ? null : clampScore(Number(focusToday.on_task_ratio) * 100));
    const personalScore = clampScore(average([integrityScore, joyScore, focusScore, health.score]));
    const businessScore = clampScore(average([business.score, focusScore]));
    const overallScore = clampScore(average([personalScore, businessScore]));

    const blockers = [];
    if (focusToday?.active_session && focusToday.on_task_ratio != null && Number(focusToday.on_task_ratio) < 0.6) blockers.push('Focus drifted off the planned block.');
    if ((focusToday?.interventions_count || 0) >= 3 && (focusToday?.successful_recoveries || 0) === 0) blockers.push('LifeOS is nudging you, but recoveries are not happening yet.');
    if ((business.summary?.pending_now || 0) > 8) blockers.push('Business follow-ups are accumulating.');
    if (health.summary?.sleep_hours != null && Number(health.summary.sleep_hours) < 6) blockers.push('Sleep debt is likely reducing execution quality.');

    const wins = [];
    if (integrityTrend === 'rising') wins.push('Integrity is trending up.');
    if (joyLatest?.trend === 'rising') wins.push('Joy is trending up.');
    if ((focusToday?.actual_minutes || 0) >= 90) wins.push('You protected meaningful focus time today.');
    if ((business.summary?.executed_7d || 0) >= 5) wins.push('Outreach execution is moving this week.');

    return {
      overall: {
        score: overallScore,
        status: statusFromScore(overallScore),
      },
      lanes: {
        personal: {
          score: personalScore,
          status: statusFromScore(personalScore),
          trend: trendFromPair(personalScore, average([integrityScore, joyLatest?.avg_joy_30d == null ? null : Number(joyLatest.avg_joy_30d) * 10, health.score]), 2),
        },
        business: {
          score: businessScore,
          status: statusFromScore(businessScore),
          trend: business.summary.created_7d ? (Number(business.summary.executed_7d) >= Number(business.summary.created_7d) ? 'rising' : 'watch') : 'building',
        },
      },
      metrics: {
        integrity: {
          score: integrityScore,
          trend: integrityTrend,
        },
        joy: {
          score: joyScore,
          trend: joyLatest?.trend || 'building',
        },
        focus: {
          score: focusScore,
          trend: focusTrend.trend,
          today: focusToday,
          trend_summary: focusTrend.summary,
        },
        health,
        business,
      },
      blockers,
      wins,
    };
  }

  return {
    getScoreboard,
  };
}
