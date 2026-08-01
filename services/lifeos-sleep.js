/**
 * SYNOPSIS: LifeOS sleep tracking service — logs and reads from the sleep_logs table.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import dayjs from 'dayjs';

function normalizeDateInput(date) {
  if (!date) return dayjs().format('YYYY-MM-DD');
  if (date instanceof Date) return dayjs(date).format('YYYY-MM-DD');
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
}

function normalizeTimestampInput(date) {
  if (!date) return dayjs().toISOString();
  if (date instanceof Date) return dayjs(date).toISOString();
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed.toISOString() : dayjs().toISOString();
}

function normalizePayload(payload = {}) {
  // Map frontend keys to sleep_logs columns: bedtime, wake time, quality, dreams, hrv
  const bedtime = normalizeTimestampInput(payload.bedtime ?? payload.bed_time ?? payload.sleep_start ?? null);
  const wakeTime = normalizeTimestampInput(payload.wake_time ?? payload.wakeTime ?? payload.wake ?? payload.sleep_end ?? null);
  const quality = Number.isFinite(Number(payload.quality ?? payload.sleep_quality ?? payload.sleepQuality))
    ? Math.max(1, Math.min(10, Number(payload.quality ?? payload.sleep_quality ?? payload.sleepQuality)))
    : null;
  const dreams = (payload.dreams ?? payload.dream_notes ?? null)?.toString() || null;
  const hrv = Number.isFinite(Number(payload.hrv ?? payload.HRV))
    ? Math.max(0, Math.round(Number(payload.hrv ?? payload.HRV)))
    : null;

  return {
    checkinDate: normalizeDateInput(payload.checkinDate ?? payload.checkin_date ?? payload.date),
    bedtime,
    wakeTime,
    quality,
    dreams,
    hrv,
    sleepQuality: payload.sleepQuality ?? payload.sleep_quality ?? null,
    sleepHours: payload.sleepHours ?? payload.sleep_hours ?? null,
    notes: payload.notes ?? null,
    source: payload.source ?? 'manual',
    alcoholDrinks: payload.alcoholDrinks ?? payload.alcohol_drinks ?? null,
    foodsLogged: payload.foodsLogged ?? payload.foods_logged ?? null,
    moodScore: payload.moodScore ?? payload.mood_score ?? null,
    restingHr: payload.restingHr ?? payload.resting_hr ?? null,
    weightLbs: payload.weightLbs ?? payload.weight_lbs ?? null,
    waterOz: payload.waterOz ?? payload.water_oz ?? null,
    glucoseNotes: payload.glucoseNotes ?? payload.glucose_notes ?? null,
    energyScore: payload.energyScore ?? payload.energy_score ?? null,
    medicationsTaken: payload.medicationsTaken ?? payload.medications_taken ?? null,
  };
}

export async function logSleep(db, userId, payload = {}) {
  const p = normalizePayload(payload);

  const sql = `
    INSERT INTO sleep_logs (
      user_id,
      bedtime,
      wake_time,
      quality,
      dreams,
      hrv
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const params = [
    userId,
    p.bedtime,
    p.wakeTime,
    p.quality,
    p.dreams,
    p.hrv,
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
      bedtime,
      wake_time,
      quality,
      dreams,
      hrv,
      created_at
    FROM sleep_logs
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;

  const result = await db.query(sql, [userId, safeDays]);
  return result.rows || [];
}

export async function getSleepScoreContribution(db, userId, date) {
  const checkinDate = normalizeDateInput(date);
  const start = dayjs(checkinDate).startOf('day').toISOString();
  const end = dayjs(checkinDate).endOf('day').toISOString();

  const sql = `
    SELECT
      AVG(quality) AS avg_quality,
      AVG(hrv) AS avg_hrv,
      COUNT(*) AS entries
    FROM sleep_logs
    WHERE user_id = $1
      AND (bedtime >= $2 AND bedtime <= $3)
  `;

  const result = await db.query(sql, [userId, start, end]);
  const row = result.rows[0] || {};
  const avgQuality = Number(row.avg_quality || 0);
  const avgHrv = Number(row.avg_hrv || 0);
  const score = avgQuality > 0 ? Math.round((avgQuality / 10) * 50 + Math.min(avgHrv / 100, 0.5) * 50) : 0;

  return {
    score: Math.min(100, Math.max(0, score)),
    avgQuality: Number(avgQuality.toFixed(2)),
    avgHrv: Number(avgHrv.toFixed(2)),
    entries: Number(row.entries || 0),
  };
}

export async function getSleepHrvNarrative(db, userId, days = 7, callCouncilMember) {
  const summary = await getSleepSummary(db, userId, days);
  const hrvRows = summary.filter((row) => row.hrv != null);

  if (!hrvRows.length) {
    return 'No HRV data recorded yet. Track HRV alongside sleep to see correlations.';
  }

  const avgHrv = hrvRows.reduce((sum, row) => sum + Number(row.hrv || 0), 0) / hrvRows.length;
  const avgQuality = summary.reduce((sum, row) => sum + Number(row.quality || 0), 0) / summary.length;
  const prompt = `Given this sleep/HRV data for a founder, write a short, practical narrative insight. Average HRV: ${avgHrv.toFixed(1)}. Average sleep quality: ${avgQuality.toFixed(1)}. Recent rows: ${JSON.stringify(
    hrvRows.slice(0, 7)
  )}.`;

  if (typeof callCouncilMember === 'function') {
    try {
      const narrative = await callCouncilMember(prompt, { channel: 'wisdom', model: 'cheap' });
      return narrative || prompt;
    } catch {
      return prompt;
    }
  }

  return prompt;
}

export function registerSleepTracking() {
  return {
    logSleep,
    getSleepSummary,
    getSleepScoreContribution,
    getSleepHrvNarrative,
  };
}
