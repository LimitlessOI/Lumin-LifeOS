// services/lifeos-habits-streaks.js
import { Pool } from 'pg';
import { lifeosHabitCompletionsTable } from '../db/schema';

const createHabitsStreakService = (pool: Pool) => {
  const calculateStreak = async (userId: string, habitId: string) => {
    const query = {
      text: `
        SELECT 
          COUNT(*) OVER (PARTITION BY habit_id ORDER BY completed_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS currentStreak,
          MAX(COUNT(*) OVER (PARTITION BY habit_id ORDER BY completed_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)) OVER (PARTITION BY habit_id) AS longestStreak,
          MAX(completed_date) OVER (PARTITION BY habit_id ORDER BY completed_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS lastCompletedDate
        FROM 
          lifeos_habit_completions
        WHERE 
          habit_id = $1 AND 
          user_id = $2 AND 
          completed_date >= NOW() - INTERVAL '7 days'
      `,
      values: [habitId, userId],
    };

    const result = await pool.query(query);
    const streak = result.rows[0];
    const milestone = checkMilestone(streak.currentStreak);

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedDate: streak.lastCompletedDate,
      milestone,
    };
  };

  const getAllStreaks = async (userId: string) => {
    const query = {
      text: `
        SELECT 
          h.id AS habitId, 
          h.title AS habitName, 
          hc.currentStreak, 
          hc.longestStreak
        FROM 
          lifeos_habits h
        JOIN 
          (
            SELECT 
              habit_id, 
              COUNT(*) OVER (PARTITION BY habit_id ORDER BY completed_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS currentStreak,
              MAX(COUNT(*) OVER (PARTITION BY habit_id ORDER BY completed_date ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)) OVER (PARTITION BY habit_id) AS longestStreak
            FROM 
              lifeos_habit_completions
            WHERE 
              user_id = $1 AND 
              completed_date >= NOW() - INTERVAL '7 days'
          ) hc ON h.id = hc.habit_id
        WHERE 
          h.user_id = $1
      `,
      values: [userId],
    };

    const result = await pool.query(query);
    return result.rows;
  };

  const checkMilestone = (streak: number) => {
    if (streak >= 365) return 'First year!';
    if (streak >= 180) return 'First 6 months!';
    if (streak >= 90) return 'First 3 months!';
    if (streak >= 60) return 'First 2 months!';
    if (streak >= 30) return 'First month!';
    if (streak >= 21) return 'First 3 weeks!';
    if (streak >= 14) return 'First 2 weeks!';
    if (streak >= 7) return 'First week!';
    if (streak >= 3) return 'First 3 days!';
    return null;
  };

  return {
    calculateStreak,
    getAllStreaks,
  };
};

export default createHabitsStreakService;
```

```json
---
METADATA---
{
  "target_file": null,
  "insert_after_line": null,
  "confidence": 1
}