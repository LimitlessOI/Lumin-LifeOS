/**
 * SYNOPSIS: Service module — Lifeos Biological Age.
 */
import { pool } from '../deps.js';

const parseDateValue = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseNumeric = (value) => {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
};

const round1 = (n) => Math.round(n * 10) / 10;

const estimateVO2MaxFromActivity = (activityLogs) => {
  if (!Array.isArray(activityLogs) || activityLogs.length === 0) return null;

  let totalMinutes = 0;
  let weightedIntensity = 0;

  for (const log of activityLogs) {
    const minutes = parseNumeric(log.minutes ?? log.duration_minutes ?? log.durationMin);
    const intensity = parseNumeric(log.intensity ?? log.mets ?? log.exertion);
    if (minutes !== null) totalMinutes += minutes;
    if (minutes !== null && intensity !== null) weightedIntensity += minutes * intensity;
  }

  if (totalMinutes <= 0) return null;

  const avgIntensity = weightedIntensity > 0 ? weightedIntensity / totalMinutes : null;
  if (avgIntensity === null) return null;

  const vo2 = 15 + avgIntensity * 4 + Math.min(totalMinutes / 150, 8);
  return round1(vo2);
};

const estimatePhenoAge = (labRow, ageYears, vo2Max) => {
  const albumin = parseNumeric(labRow?.albumin_g_dl ?? labRow?.albumin);
  const creatinine = parseNumeric(labRow?.creatinine_mg_dl ?? labRow?.creatinine);
  const glucose = parseNumeric(labRow?.glucose_mg_dl ?? labRow?.glucose);
  const cReactiveProtein = parseNumeric(labRow?.crp_mg_l ?? labRow?.hs_crp_mg_l ?? labRow?.crp);
  const lymphocytes = parseNumeric(labRow?.lymphocytes_pct ?? labRow?.lymphocyte_pct ?? labRow?.lymphocytes);
  const mcv = parseNumeric(labRow?.mcv_fl ?? labRow?.mcv);
  const rdw = parseNumeric(labRow?.rdw_pct ?? labRow?.rdw);
  const whiteBloodCells = parseNumeric(labRow?.wbc_thousand_ul ?? labRow?.wbc ?? labRow?.white_blood_cells);

  const components = [albumin, creatinine, glucose, cReactiveProtein, lymphocytes, mcv, rdw, whiteBloodCells];
  const available = components.filter((v) => v !== null);

  if (available.length === 0 && ageYears === null && vo2Max === null) return null;

  let score = 0;
  let count = 0;

  if (ageYears !== null) {
    score += ageYears;
    count += 1;
  }
  if (albumin !== null) {
    score += (4.5 - albumin) * 5;
    count += 1;
  }
  if (creatinine !== null) {
    score += (creatinine - 0.9) * 3;
    count += 1;
  }
  if (glucose !== null) {
    score += (glucose - 90) / 10;
    count += 1;
  }
  if (cReactiveProtein !== null) {
    score += Math.log1p(Math.max(cReactiveProtein, 0));
    count += 1;
  }
  if (lymphocytes !== null) {
    score += (30 - lymphocytes) / 5;
    count += 1;
  }
  if (mcv !== null) {
    score += (mcv - 90) / 5;
    count += 1;
  }
  if (rdw !== null) {
    score += (rdw - 13.5) * 1.5;
    count += 1;
  }
  if (whiteBloodCells !== null) {
    score += (whiteBloodCells - 6) * 0.5;
    count += 1;
  }
  if (vo2Max !== null) {
    score -= (vo2Max - 35) * 0.25;
    count += 1;
  }

  if (count === 0) return null;
  return round1(score / count + 30);
};

const fetchLatestLabResults = async (userId) => {
  const { rows } = await pool.query(
    `
      select response_data, created_at
      from code_services
      where service_type = $1
        and request_data::text like $2
      order by created_at desc
      limit 1
    `,
    ['lab_results', `%${String(userId)}%`],
  );

  if (!rows.length) return null;

  const responseData = rows[0].response_data;
  if (!responseData) return null;

  if (typeof responseData === 'object') return responseData;
  if (typeof responseData === 'string') {
    try {
      return JSON.parse(responseData);
    } catch {
      return null;
    }
  }

  return null;
};

const fetchActivityLogs = async (userId) => {
  const { rows } = await pool.query(
    `
      select response_data
      from code_services
      where service_type = $1
        and request_data::text like $2
      order by created_at desc
      limit 10
    `,
    ['activity_summary', `%${String(userId)}%`],
  );

  return rows
    .map((row) => {
      const value = row.response_data;
      if (!value) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
      return null;
    })
    .filter(Boolean)
    .flatMap((obj) => {
      if (Array.isArray(obj.activity_logs)) return obj.activity_logs;
      if (Array.isArray(obj.logs)) return obj.logs;
      return [];
    });
};

const fetchUserAge = async (userId) => {
  const { rows } = await pool.query(
    `
      select created_at, updated_at
      from lifeos_users
      where id = $1
      limit 1
    `,
    [userId],
  );

  if (!rows.length) return null;

  const createdAt = parseDateValue(rows[0].created_at);
  if (!createdAt) return null;

  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.2425);
  return Number.isFinite(years) ? years : null;
};

const fetchBiologicalAge = async (userId) => {
  const [labResults, activityLogs, ageYears] = await Promise.all([
    fetchLatestLabResults(userId),
    fetchActivityLogs(userId),
    fetchUserAge(userId),
  ]);

  const vo2Max = estimateVO2MaxFromActivity(activityLogs);
  const phenoAge = estimatePhenoAge(labResults, ageYears, vo2Max);

  return {
    userId,
    ageYears: ageYears === null ? null : round1(ageYears),
    phenoAge,
    vo2Max,
    labResults: labResults || null,
    activitySignals: {
      samples: Array.isArray(activityLogs) ? activityLogs.length : 0,
    },
  };
};

export { fetchBiologicalAge };
export default fetchBiologicalAge;