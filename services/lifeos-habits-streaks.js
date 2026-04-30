/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * Streak calculation service for habit tracking.
 * Table: lifeos_habit_completions (habit_id, user_id, completed_date DATE)
 */

const MILESTONES = [365, 180, 90, 60, 30, 21, 14, 7, 3];
const MILESTONE_LABELS = {
  365: 'One full year!', 180: 'Six months!', 90: 'Three months!', 60: 'Two months!',
  30: 'One month!', 21: 'Three weeks!', 14: 'Two weeks!', 7: 'One week!', 3: 'Three days!',
};

export function createHabitsStreakService(pool) {
  async function calculateStreak(userId, habitId) {
    // Fetch all completion dates sorted descending
    const { rows } = await pool.query(
      `SELECT completed_date::date AS d FROM lifeos_habit_completions
       WHERE user_id = $1 AND habit_id = $2 ORDER BY completed_date DESC`,
      [userId, habitId]
    );

    if (!rows.length) return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };

    const dates = rows.map(r => r.d instanceof Date ? r.d : new Date(r.d));
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    // Count consecutive streak ending today or yesterday
    let current = 0;
    let check = dates[0] >= yesterday ? today : null;
    if (!check) {
      // Streak broken — current = 0
    } else {
      for (const d of dates) {
        const dt = new Date(d); dt.setHours(0,0,0,0);
        const exp = new Date(check); exp.setDate(check.getDate() - current);
        if (dt.getTime() === exp.getTime()) { current++; }
        else break;
      }
    }

    // Longest streak: scan all dates
    let longest = 0, run = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]); prev.setHours(0,0,0,0);
      const curr = new Date(dates[i]); curr.setHours(0,0,0,0);
      const diff = (prev - curr) / 86400000;
      if (diff === 1) { run++; longest = Math.max(longest, run); }
      else { run = 1; }
    }
    longest = Math.max(longest, current, run);

    return {
      currentStreak: current,
      longestStreak: longest,
      lastCompletedDate: dates[0] ? dates[0].toISOString().slice(0, 10) : null,
    };
  }

  async function getAllStreaks(userId) {
    const { rows: habits } = await pool.query(
      `SELECT h.id, h.name FROM lifeos_habits h WHERE h.user_id = $1`, [userId]
    );
    return Promise.all(habits.map(async h => {
      const s = await calculateStreak(userId, h.id);
      return { habitId: h.id, habitName: h.name, ...s };
    }));
  }

  function checkMilestone(streak) {
    for (const m of MILESTONES) {
      if (streak >= m) return MILESTONE_LABELS[m];
    }
    return null;
  }

  return { calculateStreak, getAllStreaks, checkMilestone };
}
