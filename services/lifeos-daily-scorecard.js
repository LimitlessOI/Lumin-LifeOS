/**
 * services/lifeos-daily-scorecard.js
 *
 * LifeOS Daily Scorecard + Most Important Tasks
 *
 * Three MITs set each morning. Evening: the system computes an honest 0–100 score
 * based on what actually happened — MITs done, commitments hit, joy logged,
 * integrity signals, how much got deferred. One grade. No softening.
 *
 * Chronic deferral detection: if the same item gets pushed 3+ times, it surfaces
 * as a pattern — not a reminder, a mirror.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A', label: 'Outstanding' },
  { min: 75, grade: 'B', label: 'Strong' },
  { min: 60, grade: 'C', label: 'Adequate' },
  { min: 40, grade: 'D', label: 'Struggling' },
  { min: 0,  grade: 'F', label: 'Missed the mark' },
];

const NARRATIVE_PROMPT = ({ displayName, date, score, grade, breakdown }) => `You are LifeOS writing an honest end-of-day assessment for ${displayName}.

Date: ${date}
Score: ${score}/100 (${grade})
Breakdown:
${JSON.stringify(breakdown, null, 2)}

Write 2–3 sentences. Be honest — not harsh, not coddling. Tell them what the data says about today.
If the score is high: acknowledge what worked and why it matters.
If the score is low: name what happened without excusing it, end with one forward-looking line.
No bullet points. No "I noticed." Start with the most important thing.`;

export function createLifeOSDailyScorecard({ pool, callAI, logger }) {
  const log = logger || console;

  // ── MITs ─────────────────────────────────────────────────────────────────────

  async function setMITs(userId, date, mits) {
    // mits = [{ position: 1, title, notes? }, ...]
    const results = [];
    for (const mit of mits) {
      if (![1, 2, 3].includes(mit.position)) continue;
      const { rows: [row] } = await pool.query(
        `INSERT INTO daily_mits (user_id, mit_date, position, title, notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, mit_date, position) DO UPDATE
           SET title = EXCLUDED.title,
               notes = EXCLUDED.notes,
               status = 'pending',
               updated_at = NOW()
         RETURNING *`,
        [userId, date, mit.position, mit.title.trim(), mit.notes || null]
      );
      results.push(row);
    }
    return results;
  }

  async function getMITs(userId, date) {
    const { rows } = await pool.query(
      `SELECT * FROM daily_mits WHERE user_id = $1 AND mit_date = $2 ORDER BY position ASC`,
      [userId, date]
    );
    return rows;
  }

  async function updateMITStatus(userId, mitId, { status, deferredTo = null }) {
    const validStatuses = ['pending', 'done', 'deferred', 'dropped'];
    if (!validStatuses.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });

    const { rows: [mit] } = await pool.query(
      `UPDATE daily_mits
       SET status       = $1,
           deferred_to  = $2,
           completed_at = CASE WHEN $1 = 'done' THEN NOW() ELSE NULL END,
           updated_at   = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, deferredTo || null, mitId, userId]
    );
    if (!mit) throw Object.assign(new Error('MIT not found'), { status: 404 });

    // Log deferral if applicable
    if (status === 'deferred') {
      // Check existing deferral count for this item title + user
      const { rows: [existing] } = await pool.query(
        `SELECT COUNT(*) as count FROM task_deferrals
         WHERE user_id = $1 AND item_type = 'mit' AND item_title = $2`,
        [userId, mit.title]
      );
      await pool.query(
        `INSERT INTO task_deferrals (user_id, item_type, item_id, item_title, deferred_from, deferred_to, deferral_count)
         VALUES ($1, 'mit', $2, $3, $4, $5, $6)`,
        [userId, mitId, mit.title, mit.mit_date, deferredTo, parseInt(existing.count) + 1]
      );

      // Surface chronic deferral — 3+ times on same title
      if (parseInt(existing.count) >= 2) {
        log.info({ userId, title: mit.title, count: parseInt(existing.count) + 1 },
          '[SCORECARD] Chronic deferral detected');
      }
    }

    return mit;
  }

  // ── Score computation ─────────────────────────────────────────────────────────

  async function computeScore(userId, date) {
    const breakdown = {};
    let totalScore = 0;

    // MITs (40 pts max — most important signal)
    const mits = await getMITs(userId, date);
    if (mits.length > 0) {
      const done     = mits.filter(m => m.status === 'done').length;
      const deferred = mits.filter(m => m.status === 'deferred').length;
      const dropped  = mits.filter(m => m.status === 'dropped').length;
      const pending  = mits.filter(m => m.status === 'pending').length;
      const mitScore = Math.round((done / 3) * 40);
      breakdown.mits = { total: mits.length, done, deferred, dropped, pending, score: mitScore, weight: 40 };
      totalScore += mitScore;
    } else {
      // No MITs set — partial credit (can't score what wasn't tracked)
      breakdown.mits = { total: 0, score: 20, note: 'No MITs set — half credit', weight: 40 };
      totalScore += 20;
    }

    // Commitments hit today (25 pts max)
    try {
      const { rows: [commits] } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'completed' AND updated_at::date = $2) as done,
           COUNT(*) FILTER (WHERE status = 'missed'    AND updated_at::date = $2) as missed,
           COUNT(*) FILTER (WHERE remind_at::date = $2 OR due_at::date = $2) as due_today
         FROM commitments WHERE user_id = $1`,
        [userId, date]
      );
      const dueToday = Math.max(parseInt(commits.due_today), 1);
      const commitScore = Math.min(Math.round((parseInt(commits.done) / dueToday) * 25), 25);
      breakdown.commitments = {
        due: parseInt(commits.due_today),
        done: parseInt(commits.done),
        missed: parseInt(commits.missed),
        score: commitScore,
        weight: 25,
      };
      totalScore += commitScore;
    } catch { breakdown.commitments = { score: 0, error: 'unavailable' }; }

    // Joy logged + score (20 pts max)
    try {
      const { rows: joyRows } = await pool.query(
        `SELECT AVG(joy_score)::numeric(4,1) as avg_score, COUNT(*) as count
         FROM joy_checkins WHERE user_id = $1 AND created_at::date = $2`,
        [userId, date]
      );
      const avgJoy   = parseFloat(joyRows[0]?.avg_score) || 0;
      const joyCount = parseInt(joyRows[0]?.count) || 0;
      const joyScore = joyCount === 0 ? 5 : Math.round((avgJoy / 10) * 20);
      breakdown.joy = { logged: joyCount, avg: avgJoy || null, score: joyScore, weight: 20 };
      totalScore += joyScore;
    } catch { breakdown.joy = { score: 0, error: 'unavailable' }; }

    // Deferrals today (penalty — up to -15)
    try {
      const { rows: [def] } = await pool.query(
        `SELECT COUNT(*) as count FROM task_deferrals WHERE user_id = $1 AND deferred_from = $2`,
        [userId, date]
      );
      const deferCount  = parseInt(def.count) || 0;
      const deferPenalty = Math.min(deferCount * 5, 15);
      breakdown.deferrals = { count: deferCount, penalty: deferPenalty };
      totalScore = Math.max(totalScore - deferPenalty, 0);
    } catch { breakdown.deferrals = { count: 0, penalty: 0 }; }

    // Integrity signal today (15 pts max)
    try {
      const { rows: [integ] } = await pool.query(
        `SELECT AVG(total_score)::numeric(4,1) as avg FROM integrity_score_log
         WHERE user_id = $1 AND score_date = $2`,
        [userId, date]
      );
      const avgInteg  = parseFloat(integ?.avg) || 0;
      const integScore = avgInteg > 0 ? Math.round((avgInteg / 10) * 15) : 0;
      breakdown.integrity = { avg: avgInteg || null, score: integScore, weight: 15 };
      totalScore += integScore;
    } catch { breakdown.integrity = { score: 0, error: 'unavailable' }; }

    const score = Math.min(Math.max(Math.round(totalScore), 0), 100);
    const grade = GRADE_THRESHOLDS.find(t => score >= t.min);

    return { score, grade: grade.grade, grade_label: grade.label, breakdown };
  }

  async function generateScorecard(userId, date, { force = false } = {}) {
    if (!force) {
      const { rows: existing } = await pool.query(
        `SELECT * FROM daily_scorecards WHERE user_id = $1 AND scorecard_date = $2`,
        [userId, date]
      );
      if (existing.length) return existing[0];
    }

    const { score, grade, grade_label, breakdown } = await computeScore(userId, date);

    let narrative = null;
    if (callAI) {
      try {
        const { rows: [user] } = await pool.query(
          `SELECT display_name FROM lifeos_users WHERE id = $1`, [userId]
        );
        narrative = await callAI(
          NARRATIVE_PROMPT({ displayName: user?.display_name || 'you', date, score, grade, breakdown })
        );
      } catch { /* non-fatal */ }
    }

    const { rows: [card] } = await pool.query(
      `INSERT INTO daily_scorecards (user_id, scorecard_date, score, grade, breakdown, narrative)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, scorecard_date) DO UPDATE
         SET score = EXCLUDED.score, grade = EXCLUDED.grade,
             breakdown = EXCLUDED.breakdown, narrative = EXCLUDED.narrative,
             computed_at = NOW()
       RETURNING *`,
      [userId, date, score, grade, JSON.stringify(breakdown), narrative]
    );

    log.info({ userId, date, score, grade }, '[SCORECARD] Daily scorecard computed');
    return card;
  }

  // ── History + trend ──────────────────────────────────────────────────────────

  async function getScorecardHistory(userId, { days = 30 } = {}) {
    const { rows } = await pool.query(
      `SELECT scorecard_date, score, grade, breakdown, narrative
       FROM daily_scorecards
       WHERE user_id = $1 AND scorecard_date >= CURRENT_DATE - $2::interval
       ORDER BY scorecard_date DESC`,
      [userId, `${Math.min(days, 365)} days`]
    );
    return rows;
  }

  async function getDeferralPatterns(userId, { limit = 10 } = {}) {
    const { rows } = await pool.query(
      `SELECT item_title, item_type, SUM(deferral_count) as total_deferrals,
              MAX(deferred_from) as last_deferred
       FROM task_deferrals
       WHERE user_id = $1 AND deferred_from >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY item_title, item_type
       HAVING SUM(deferral_count) >= 2
       ORDER BY total_deferrals DESC
       LIMIT $2`,
      [userId, Math.min(limit, 50)]
    );
    return rows;
  }

  async function getTodaySummary(userId, date = null) {
    const d = date || new Date().toISOString().slice(0, 10);
    const [mits, scorecard] = await Promise.allSettled([
      getMITs(userId, d),
      pool.query(
        `SELECT * FROM daily_scorecards WHERE user_id = $1 AND scorecard_date = $2`,
        [userId, d]
      ),
    ]);

    return {
      date: d,
      mits: mits.status === 'fulfilled' ? mits.value : [],
      scorecard: scorecard.status === 'fulfilled' ? scorecard.value.rows[0] || null : null,
    };
  }

  return {
    setMITs,
    getMITs,
    updateMITStatus,
    generateScorecard,
    computeScore,
    getScorecardHistory,
    getDeferralPatterns,
    getTodaySummary,
  };
}
