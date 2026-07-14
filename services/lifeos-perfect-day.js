/**
 * SYNOPSIS: Exports planPerfectDay — services/lifeos-perfect-day.js.
 */
import { createDbPool } from '../services/db.js';

const pool = createDbPool({
  validatedDatabaseUrl: process.env.DATABASE_URL,
  DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED
});

export async function planPerfectDay(userId, { wakeTime, schedule }) {
  const query = `
    INSERT INTO perfect_day (user_id, wake_time, schedule)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) DO UPDATE
    SET wake_time = $2, schedule = $3, updated_at = now()
    RETURNING *;
  `;
  const values = [userId, wakeTime, JSON.stringify(schedule)];
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function getPerfectDay(userId) {
  const query = `
    SELECT * FROM perfect_day WHERE user_id = $1;
  `;
  const values = [userId];
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function checkIn(userId, { currentActivity, distraction, priority }) {
  // Implementation details for check-in logic go here.
  // For demonstration, returning a placeholder recommendation.
  return { recommendation: "Next activity or re-prioritization question." };
}

export async function getDailyReminders(userId) {
  const query = `
    SELECT * FROM perfect_day
    WHERE user_id = $1 AND wake_time::date = current_date
    ORDER BY (schedule->>'start')::time
    LIMIT 3;
  `;
  const values = [userId];
  const result = await pool.query(query, values);
  return result.rows;
}

export async function rateDay(userId, { rating, note, whatMatteredMore }) {
  const query = `
    INSERT INTO perfect_day_ratings (user_id, perfect_day_id, rating, note, what_mattered_more)
    VALUES ($1, (SELECT id FROM perfect_day WHERE user_id = $1), $2, $3, $4)
    ON CONFLICT (user_id, perfect_day_id) DO UPDATE
    SET rating = $2, note = $3, what_mattered_more = $4, created_at = now()
    RETURNING *;
  `;
  const values = [userId, rating, note, whatMatteredMore];
  const result = await pool.query(query, values);
  return result.rows[0];
}