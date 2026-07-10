/**
 * SYNOPSIS: Exports logEnergy — services/lifeos-energy.js.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
export async function logEnergy(db, userId, datetime, level, notes) {
  // phase2 schema uses logged_at (not datetime) — keep API arg name for callers
  const text = `
    INSERT INTO energy_logs (user_id, logged_at, level, notes)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [userId, datetime, level, notes ?? null];
  const { rows } = await db.query(text, values);
  return rows[0] ?? null;
}

export async function getEnergyLogs(db, userId, { from, to } = {}) {
  const conditions = ['user_id = $1'];
  const values = [userId];

  if (from) {
    values.push(from);
    conditions.push(`logged_at >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    conditions.push(`logged_at <= $${values.length}`);
  }

  const text = `
    SELECT id, user_id, logged_at AS datetime, level, notes, created_at
    FROM energy_logs
    WHERE ${conditions.join(' AND ')}
    ORDER BY logged_at ASC, id ASC
  `;
  const { rows } = await db.query(text, values);
  return rows;
}

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function toHourBucketLabel(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

function buildSevenDaySummary(logs) {
  const buckets = new Map();

  for (let h = 0; h < 24; h += 1) {
    buckets.set(String(h).padStart(2, '0'), { count: 0, sum: 0 });
  }

  for (const row of logs) {
    const hour = new Date(row.datetime).getHours();
    const key = String(hour).padStart(2, '0');
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const level = Number(row.level);
    if (!Number.isFinite(level)) continue;
    bucket.count += 1;
    bucket.sum += level;
  }

  const lines = [];
  for (let h = 0; h < 24; h += 1) {
    const key = String(h).padStart(2, '0');
    const bucket = buckets.get(key);
    const avg = bucket && bucket.count ? (bucket.sum / bucket.count).toFixed(2) : 'n/a';
    lines.push(`${key}:00 | samples=${bucket?.count ?? 0} | avg_level=${avg}`);
  }

  return lines.join('\n');
}

export async function analyzeEnergyCurve(db, userId, callCouncilMember) {
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await getEnergyLogs(db, userId, { from });

  const summary = buildSevenDaySummary(logs);
  const prompt = [
    'Analyze the user energy curve from the last 7 days.',
    'Return ONLY valid JSON with keys: peakHours (array of hour strings like "09:00"), lowHours (array of hour strings like "14:00"), recommendation (string).',
    'Use the hourly summary below.',
    '',
    summary,
  ].join('\n');

  const raw = await callCouncilMember('analyst', prompt);
  const parsed = safeJsonParse(raw) ?? {};

  const peakHours = Array.isArray(parsed.peakHours)
    ? parsed.peakHours.filter((x) => typeof x === 'string')
    : [];
  const lowHours = Array.isArray(parsed.lowHours)
    ? parsed.lowHours.filter((x) => typeof x === 'string')
    : [];
  const recommendation = typeof parsed.recommendation === 'string' ? parsed.recommendation : '';

  return { peakHours, lowHours, recommendation };
}