/**
 * SYNOPSIS: Exports planPerfectDay — services/lifeos-perfect-day.js.
 */
import { pool } from '../services/db.js';

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS perfect_day (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      wake_time time,
      schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS perfect_day_ratings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      perfect_day_id uuid REFERENCES perfect_day(id),
      rating smallint,
      note text,
      what_mattered_more text,
      created_at timestamptz DEFAULT now()
    );
  `);
}

function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return [];
  return schedule
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const start = item.start ?? item.start_time ?? item.from ?? null;
      const end = item.end ?? item.end_time ?? item.to ?? null;
      const title = item.title ?? item.activity ?? item.name ?? item.label ?? '';
      return {
        ...item,
        order: typeof item.order === 'number' ? item.order : index + 1,
        title: String(title),
        start: start == null ? null : String(start),
        end: end == null ? null : String(end),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getNextActivity(schedule, currentActivity, priority) {
  const normalized = normalizeSchedule(schedule);
  if (!normalized.length) return null;

  const currentIndex = currentActivity
    ? normalized.findIndex((a) => {
        const hay = `${a.title} ${a.start ?? ''} ${a.end ?? ''}`.toLowerCase();
        return hay.includes(String(currentActivity).toLowerCase());
      })
    : -1;

  if (priority) {
    const priorityIndex = normalized.findIndex((a) =>
      `${a.title} ${a.start ?? ''} ${a.end ?? ''}`.toLowerCase().includes(String(priority).toLowerCase())
    );
    if (priorityIndex >= 0) return normalized[priorityIndex];
  }

  if (currentIndex >= 0 && currentIndex + 1 < normalized.length) return normalized[currentIndex + 1];
  return normalized[0];
}

export async function planPerfectDay(userId, { wakeTime, schedule }) {
  await ensureTables();
  const normalizedSchedule = normalizeSchedule(schedule);
  const result = await pool.query(
    `
      INSERT INTO perfect_day (user_id, wake_time, schedule)
      VALUES ($1, $2::time, $3::jsonb)
      ON CONFLICT (user_id)
      DO UPDATE SET
        wake_time = EXCLUDED.wake_time,
        schedule = EXCLUDED.schedule,
        updated_at = NOW()
      RETURNING id, user_id, wake_time, schedule, created_at, updated_at;
    `,
    [userId, wakeTime ?? null, JSON.stringify(normalizedSchedule)]
  );
  return result.rows[0] ?? null;
}

export async function getPerfectDay(userId) {
  await ensureTables();
  const result = await pool.query(
    `
      SELECT id, user_id, wake_time, schedule, created_at, updated_at
      FROM perfect_day
      WHERE user_id = $1
      LIMIT 1;
    `,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function checkIn(userId, { currentActivity, distraction, priority }) {
  const plan = await getPerfectDay(userId);
  if (!plan) {
    return {
      nextRecommendedActivity: null,
      reprioritizationQuestion: 'What is the most important activity to define for today?',
      planMissing: true,
      distraction: distraction ?? null,
    };
  }

  const nextActivity = getNextActivity(plan.schedule, currentActivity, priority);
  if (!nextActivity) {
    return {
      nextRecommendedActivity: null,
      reprioritizationQuestion: 'What should be the next most important activity now?',
      planId: plan.id,
      distraction: distraction ?? null,
    };
  }

  return {
    nextRecommendedActivity: nextActivity,
    reprioritizationQuestion: null,
    planId: plan.id,
    distraction: distraction ?? null,
  };
}

export async function getDailyReminders(userId) {
  const plan = await getPerfectDay(userId);
  if (!plan) return [];

  const schedule = normalizeSchedule(plan.schedule);
  return schedule.slice(0, 3).map((activity) => ({
    title: activity.title,
    start: activity.start,
    end: activity.end,
    order: activity.order,
    wakeTime: plan.wake_time ?? null,
  }));
}

export async function rateDay(userId, { rating, note, whatMatteredMore }) {
  await ensureTables();
  const plan = await getPerfectDay(userId);
  const result = await pool.query(
    `
      INSERT INTO perfect_day_ratings (user_id, perfect_day_id, rating, note, what_mattered_more)
      VALUES ($1, $2, $3::smallint, $4, $5)
      RETURNING id, user_id, perfect_day_id, rating, note, what_mattered_more, created_at;
    `,
    [userId, plan?.id ?? null, rating ?? null, note ?? null, whatMatteredMore ?? null]
  );
  return result.rows[0] ?? null;
}