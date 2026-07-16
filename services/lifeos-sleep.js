/**
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports logSleep and registerSleepTracking — services/lifeos-sleep.js.
 */
import dayjs from 'dayjs';

function normalizeDateInput(date) {
  if (!date) return dayjs().format('YYYY-MM-DD');
  if (date instanceof Date) return dayjs(date).format('YYYY-MM-DD');
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
}

function normalizePayload(payload = {}) {
  const sleepQuality = payload.sleepQuality ?? payload.sleep_quality ?? null;
  const sleepHours = payload.sleepHours ?? payload.sleep_hours ?? null;
  const notes = payload.notes ?? null;
  const source = payload.source ?? 'manual';
  const checkinDate = normalizeDateInput(payload.checkinDate ?? payload.checkin_date ?? payload.date);

  return {
    checkinDate,
    sleepQuality,
    sleepHours,
    notes,
    source,
    hrv: payload.hrv ?? null,
    alcoholDrinks: payload.alcoholDrinks ?? payload.alcohol_drinks ?? null,
    foodsLogged: payload.foodsLogged ?? payload.foods_logged ?? null,
    moodScore: payload.moodScore ?? payload.mood_score ?? null,
    restingHr: payload.restingHr ?? payload.resting_hr ?? null,
    weightLbs: payload.weightLbs ?? payload.weight_lbs ?? null,
    waterOz: payload.waterOz ?? payload.water_oz ?? null,
    glucoseNotes: payload.glucoseNotes ?? payload.glucose_notes ?? null,
    energyScore: payload.energyScore ?? payload.energy_score ?? null,
    medicationsTaken: payload.medicationsTaken ?? payload.medications_taken ?? null
  };
}

export async function logSleep(db, userId, payload = {}) {
  const p = normalizePayload(payload);

  const sql = `
    INSERT INTO health_checkins (
      user_id,
      checkin_date,
      sleep_quality,
      hrv,
      alcohol_drinks,
      foods_logged,
      mood_score,
      notes,
      source,
      sleep_hours,
      resting_hr,
      weight_lbs,
      water_oz,
      glucose_notes,
      energy_score,
      medications_taken
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
    RETURNING *
  `;

  const params = [
    userId,
    p.checkinDate,
    p.sleepQuality,
    p.hrv,
    p.alcoholDrinks,
    p.foodsLogged,
    p.moodScore,
    p.notes,
    p.source,
    p.sleepHours,
    p.restingHr,
    p.weightLbs,
    p.waterOz,
    p.glucoseNotes,
    p.energyScore,
    p.medicationsTaken
  ];

  const result = await db.query(sql, params);
  return result.rows[0] ?? null;
}

export async function getSleepSummary(db, userId, days = 7) {
  const safeDays = Number.isFinite(Number(days)) ? Math.max(1, Math.min(365, Number(days))) : 7;

  const sql = `
    SELECT
      id,
      user_id,
      checkin_date,
      sleep_quality,
      sleep_hours,
      hrv,
      resting_hr,
      mood_score,
      energy_score,
      alcohol_drinks,
      foods_logged,
      notes,
      source,
      created_at
    FROM health_checkins
    WHERE user_id = $1
      AND checkin_date >= (CURRENT_DATE - ($2::int - 1))
    ORDER BY checkin_date DESC, created_at DESC
  `;

  const result = await db.query(sql, [userId, safeDays]);
  return result.rows;
}

export async function getSleepScoreContribution(db, userId, date) {
  const checkinDate = normalizeDateInput(date);

  const sql = `
    SELECT sleep_quality
    FROM health_checkins
    WHERE user_id = $1
      AND checkin_date = $2
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await db.query(sql, [userId, checkinDate]);
  const sleepQuality = result.rows[0]?.sleep_quality;

  if (sleepQuality >= 7) return 2;
  if (sleepQuality >= 5) return 1;
  return 0;
}

export async function getSleepHrvNarrative(db, userId, days = 7, callCouncilMember) {
  const summary = await getSleepSummary(db, userId, days);
  const hrvRows = summary.filter((row) => row.hrv != null);

  if (!hrvRows.length || typeof callCouncilMember !== 'function') {
    return null;
  }

  const avgHrv = hrvRows.reduce((sum, row) => sum + Number(row.hrv || 0), 0) / hrvRows.length;
  const prompt = `Given this sleep/HRV data for a founder, write a short, practical narrative insight. Average HRV: ${avgHrv.toFixed(1)}. Recent rows: ${JSON.stringify(
    hrvRows.slice(0, 7)
  )}.`;

  return callCouncilMember('health-intelligence', prompt, { maxTokens: 180 });
}

export function registerSleepTracking() {
  // Implementation details for registering sleep tracking
  // This could involve setting up event listeners, initializing data structures,
  // or other necessary setup for the sleep tracking module.
  console.log('Sleep tracking module registered.');
}
