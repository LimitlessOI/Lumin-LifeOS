/**
 * services/lifeos-habits.js
 *
 * Identity-framed recurring habit tracker.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

function toDateOnly(v = new Date()) {
  if (typeof v === 'string') return v.slice(0, 10);
  return new Date(v).toISOString().slice(0, 10);
}

export function createLifeOSHabits({ pool }) {
  async function listHabits(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM habits
        WHERE user_id = $1 AND active = TRUE
        ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  async function createHabit(userId, { title, identity_statement, frequency = 'daily' }) {
    if (!title || !String(title).trim()) {
      const e = new Error('title is required');
      e.status = 400;
      throw e;
    }
    if (!['daily', 'weekly'].includes(frequency)) {
      const e = new Error('frequency must be daily or weekly');
      e.status = 400;
      throw e;
    }
    const { rows } = await pool.query(
      `INSERT INTO habits (user_id, title, identity_statement, frequency)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        userId,
        String(title).trim().slice(0, 200),
        identity_statement ? String(identity_statement).trim().slice(0, 500) : null,
        frequency,
      ]
    );
    return rows[0];
  }

  async function checkInHabit(userId, habitId, { date, completed = true, note = null } = {}) {
    const day = toDateOnly(date || new Date());
    // Ownership guard
    const own = await pool.query(
      `SELECT id FROM habits WHERE id = $1 AND user_id = $2`,
      [habitId, userId]
    );
    if (!own.rows.length) {
      const e = new Error('Habit not found');
      e.status = 404;
      throw e;
    }

    const { rows } = await pool.query(
      `INSERT INTO habit_completions (habit_id, completion_date, completed, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (habit_id, completion_date) DO UPDATE
         SET completed = EXCLUDED.completed,
             note = EXCLUDED.note
       RETURNING *`,
      [habitId, day, !!completed, note ? String(note).slice(0, 1000) : null]
    );
    return rows[0];
  }

  async function getHabitSummary(userId, days = 7) {
    const windowDays = Math.min(60, Math.max(7, Number(days) || 7));
    const habits = await listHabits(userId);
    const summaries = [];

    for (const h of habits) {
      const { rows } = await pool.query(
        `SELECT completion_date, completed
           FROM habit_completions
          WHERE habit_id = $1
            AND completion_date >= CURRENT_DATE - ($2::int || ' days')::interval
          ORDER BY completion_date DESC`,
        [h.id, windowDays]
      );
      const completedDates = rows.filter(r => r.completed).map(r => toDateOnly(r.completion_date));
      const completedSet = new Set(completedDates);

      // Current streak (daily habits only for now; weekly shows count).
      let streak = 0;
      if (h.frequency === 'daily') {
        for (let i = 0; i < windowDays; i++) {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - i);
          const key = toDateOnly(d);
          if (completedSet.has(key)) streak += 1;
          else break;
        }
      } else {
        streak = completedDates.length;
      }

      const missesIn7d = h.frequency === 'daily'
        ? Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - i);
            return toDateOnly(d);
          }).filter(d => !completedSet.has(d)).length
        : 0;

      const reflection_question = missesIn7d >= 3
        ? `You missed "${h.title}" ${missesIn7d} times this week. Does this habit still fit who you want to become?`
        : null;

      summaries.push({
        habit: h,
        completed_count: completedDates.length,
        streak,
        misses_in_7d: missesIn7d,
        reflection_question,
      });
    }

    return { habits: summaries, days: windowDays };
  }

  return {
    listHabits,
    createHabit,
    checkInHabit,
    getHabitSummary,
  };
}
