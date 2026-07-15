/**
 * SYNOPSIS: LifeOS Perfect Day — morning rituals, work blocks, closeout, husband + self care.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { createDbPool } from './db.js';

let _pool = null;
function getPool(pool) {
  if (pool && typeof pool.query === 'function') return pool;
  if (_pool) return _pool;
  _pool = createDbPool({
    validatedDatabaseUrl: process.env.DATABASE_URL,
    DB_SSL_REJECT_UNAUTHORIZED: process.env.DB_SSL_REJECT_UNAUTHORIZED,
  });
  return _pool;
}

function parseSchedule(raw) {
  if (!raw) return defaultSchedule();
  if (typeof raw === 'string') {
    try {
      return normalizeSchedule(JSON.parse(raw));
    } catch {
      return defaultSchedule();
    }
  }
  if (Array.isArray(raw)) {
    return normalizeSchedule({ work_blocks: raw });
  }
  return normalizeSchedule(raw);
}

function normalizeSchedule(input = {}) {
  const s = input && typeof input === 'object' ? input : {};
  return {
    best_day_top3: asStringList(s.best_day_top3, 3),
    work_top3: asStringList(s.work_top3, 3),
    morning_rituals: asBlocks(s.morning_rituals),
    work_blocks: asBlocks(s.work_blocks),
    husband_care: asBlocks(s.husband_care),
    self_care: asBlocks(s.self_care),
    closeout: asBlocks(s.closeout),
  };
}

function asStringList(v, max) {
  const list = Array.isArray(v) ? v : [];
  return list.map((x) => String(x || '').trim()).filter(Boolean).slice(0, max);
}

function asBlocks(v) {
  const list = Array.isArray(v) ? v : [];
  return list
    .map((b) => {
      if (!b) return null;
      if (typeof b === 'string') return { title: b.trim(), minutes: 15 };
      const title = String(b.title || b.label || b.name || '').trim();
      if (!title) return null;
      return {
        title,
        minutes: Math.max(5, Number(b.minutes) || 15),
        start: b.start ? String(b.start) : null,
        end: b.end ? String(b.end) : null,
        kind: b.kind ? String(b.kind) : null,
      };
    })
    .filter(Boolean);
}

/** Default Perfect Workday for a real-estate founder who also wants to be a present husband. */
export function defaultSchedule() {
  return normalizeSchedule({
    best_day_top3: [
      'Protect morning stillness before the phone',
      'One high-leverage client/pipeline move before noon',
      'Be present with Veronica for a real block — phone down',
    ],
    work_top3: [
      'Top-3 pipeline / follow-up that moves money',
      'One listing or buyer appointment fully prepared',
      'Content or outreach that puts my face in market',
    ],
    morning_rituals: [
      { title: 'Wake + water + light movement', minutes: 20 },
      { title: 'Prayer / intention — husband + agent + self', minutes: 10 },
      { title: 'Review Perfect Day board (top 3 + blocks)', minutes: 10 },
    ],
    work_blocks: [
      { start: '09:00', end: '11:00', title: 'Deep work — pipeline & offers', kind: 'focus', minutes: 120 },
      { start: '11:00', end: '12:30', title: 'Appointments / showings / calls', kind: 'field', minutes: 90 },
      { start: '13:30', end: '15:30', title: 'Admin, contracts, follow-ups', kind: 'admin', minutes: 120 },
      { start: '15:30', end: '17:00', title: 'Marketing / Creative Engine look-good', kind: 'creative', minutes: 90 },
    ],
    husband_care: [
      { title: 'Check in with Veronica — how is she really?', minutes: 15 },
      { title: 'Shared meal or walk without work talk', minutes: 30 },
    ],
    self_care: [
      { title: 'Body: food / gym / stretch — non-negotiable', minutes: 30 },
      { title: 'Something I want (not for anyone else)', minutes: 20 },
    ],
    closeout: [
      { title: 'Capture tomorrow’s top 3 + clear open loops', minutes: 15 },
      { title: 'Rate the day — work / husband / self energy', minutes: 5 },
      { title: 'Phone away — sleep wind-down', minutes: 20 },
    ],
  });
}

function rowToPlan(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    wake_time: row.wake_time,
    schedule: parseSchedule(row.schedule),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function planPerfectDay(userId, { wakeTime, schedule, pool } = {}) {
  const db = getPool(pool);
  const uid = String(userId || '').trim();
  if (!uid) throw new Error('user_id required');
  const sched = schedule ? normalizeSchedule(schedule) : defaultSchedule();
  const wake = wakeTime || '06:00';
  const { rows } = await db.query(
    `INSERT INTO perfect_day (user_id, wake_time, schedule)
     VALUES ($1, $2::time, $3::jsonb)
     ON CONFLICT (user_id) DO UPDATE
     SET wake_time = EXCLUDED.wake_time,
         schedule = EXCLUDED.schedule,
         updated_at = now()
     RETURNING *`,
    [uid, wake, JSON.stringify(sched)],
  );
  return rowToPlan(rows[0]);
}

export async function getPerfectDay(userId, { pool, seedIfMissing = true } = {}) {
  const db = getPool(pool);
  const uid = String(userId || '').trim();
  if (!uid) throw new Error('user_id required');
  const { rows } = await db.query(`SELECT * FROM perfect_day WHERE user_id = $1 LIMIT 1`, [uid]);
  if (rows[0]) return rowToPlan(rows[0]);
  if (!seedIfMissing) return null;
  return planPerfectDay(uid, { wakeTime: '06:00', schedule: defaultSchedule(), pool: db });
}

export async function checkIn(userId, { currentActivity, distraction, priority, pool } = {}) {
  const plan = await getPerfectDay(userId, { pool });
  const schedule = plan.schedule;
  const distractionText = String(distraction || '').trim();
  const priorityText = String(priority || '').trim();
  const activity = String(currentActivity || '').trim();

  let recommendation = 'Stay on the current block. Protect husband-care and self-care — do not steal from those first.';
  let action = 'continue';
  const nextBlocks = [];

  if (priorityText) {
    schedule.work_top3 = [priorityText, ...schedule.work_top3.filter((x) => x !== priorityText)].slice(0, 3);
    recommendation = `Re-ranked work top 3 around: “${priorityText}”. Finish or time-box the current block, then run that.`;
    action = 'reprioritize';
  } else if (distractionText) {
    recommendation = `Distraction noted (“${distractionText}”). Park it in closeout notes — do not abandon husband/self blocks. Ask: does this serve money, marriage, or body today?`;
    action = 'park_distraction';
  } else if (activity) {
    recommendation = `Checked in on “${activity}”. If energy is crashing, shorten the next work block by 15 minutes and keep self-care intact.`;
    action = 'acknowledge';
  }

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  for (const b of schedule.work_blocks) {
    if (!b.start) {
      nextBlocks.push(b);
      continue;
    }
    const [h, m] = String(b.start).split(':').map(Number);
    const startMins = (h || 0) * 60 + (m || 0);
    if (startMins >= nowMins - 30) nextBlocks.push(b);
  }

  await planPerfectDay(userId, {
    wakeTime: plan.wake_time || '06:00',
    schedule,
    pool,
  });

  return {
    ok: true,
    action,
    recommendation,
    next_blocks: nextBlocks.slice(0, 3),
    work_top3: schedule.work_top3,
    best_day_top3: schedule.best_day_top3,
    guards: {
      husband_care_protected: true,
      self_care_protected: true,
      burnout_rule: 'Never cancel husband_care or self_care to make room for a distraction.',
    },
  };
}

export async function getDailyReminders(userId, { pool } = {}) {
  const plan = await getPerfectDay(userId, { pool });
  const schedule = plan.schedule;
  const items = [
    ...schedule.morning_rituals.map((b) => ({ phase: 'morning', ...b })),
    ...schedule.work_blocks.map((b) => ({ phase: 'work', ...b })),
    ...schedule.husband_care.map((b) => ({ phase: 'husband', ...b })),
    ...schedule.self_care.map((b) => ({ phase: 'self', ...b })),
    ...schedule.closeout.map((b) => ({ phase: 'closeout', ...b })),
  ];
  return {
    ok: true,
    wake_time: plan.wake_time,
    best_day_top3: schedule.best_day_top3,
    work_top3: schedule.work_top3,
    reminders: items.slice(0, 12),
  };
}

export async function rateDay(userId, { rating, note, whatMatteredMore, workScore, husbandScore, selfScore, pool } = {}) {
  const db = getPool(pool);
  const uid = String(userId || '').trim();
  const plan = await getPerfectDay(uid, { pool: db });
  const score = Math.max(1, Math.min(10, Number(rating) || 5));
  const { rows } = await db.query(
    `INSERT INTO perfect_day_ratings (
       user_id, perfect_day_id, rating, note, what_mattered_more
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, perfect_day_id) DO UPDATE
     SET rating = EXCLUDED.rating,
         note = EXCLUDED.note,
         what_mattered_more = EXCLUDED.what_mattered_more,
         created_at = now()
     RETURNING *`,
    [
      uid,
      plan.id,
      score,
      [
        note || '',
        workScore != null ? `work:${workScore}` : '',
        husbandScore != null ? `husband:${husbandScore}` : '',
        selfScore != null ? `self:${selfScore}` : '',
      ].filter(Boolean).join(' | ') || null,
      whatMatteredMore || null,
    ],
  );
  return { ok: true, rating: rows[0], plan };
}

export function createLifeosPerfectDayService(pool) {
  return {
    defaultSchedule,
    planPerfectDay: (userId, opts) => planPerfectDay(userId, { ...opts, pool }),
    getPerfectDay: (userId, opts) => getPerfectDay(userId, { ...opts, pool }),
    checkIn: (userId, opts) => checkIn(userId, { ...opts, pool }),
    getDailyReminders: (userId, opts) => getDailyReminders(userId, { ...opts, pool }),
    rateDay: (userId, opts) => rateDay(userId, { ...opts, pool }),
  };
}
