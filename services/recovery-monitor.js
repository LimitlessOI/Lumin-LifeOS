/**
 * SYNOPSIS: Exports createRecoveryMonitor — services/recovery-monitor.js.
 */
import { callCouncilMember as defaultCallCouncilMember } from '../core/council.js';

const WINDOW_DAYS = 30;
const RECENT_ALERT_HOURS = 24;
const MIN_SIGNAL_COUNT = 1;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function clampLimit(limit, min = 1, max = 200) {
  const n = parseInt(limit, 10);
  if (!Number.isFinite(n)) return max;
  return Math.min(Math.max(n, min), max);
}

function normalizeSignalRow(row) {
  return {
    id: row.id ?? null,
    user_id: row.user_id ?? null,
    signal_type: row.signal_type ?? null,
    signal_value: row.signal_value ?? null,
    confidence: row.confidence == null ? null : toNumber(row.confidence, null),
    created_at: row.created_at ?? null,
    metadata: safeJsonParse(row.metadata, {}),
  };
}

function summarizeSignals(signals) {
  const counts = {
    mood_drop: 0,
    missed_checkin: 0,
    sleep_disruption: 0,
    disengagement: 0,
    stress_spike: 0,
    other: 0,
  };

  for (const signal of signals) {
    const type = String(signal.signal_type || 'other').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(counts, type)) counts[type] += 1;
    else counts.other += 1;
  }

  return counts;
}

function scoreSignals(signals) {
  let score = 0;
  for (const signal of signals) {
    const type = String(signal.signal_type || '').toLowerCase();
    const confidence = signal.confidence == null ? 0.5 : Math.max(0, Math.min(1, toNumber(signal.confidence, 0.5)));
    if (type === 'missed_checkin') score += 2 * confidence;
    else if (type === 'mood_drop') score += 2.5 * confidence;
    else if (type === 'sleep_disruption') score += 1.5 * confidence;
    else if (type === 'disengagement') score += 1.75 * confidence;
    else if (type === 'stress_spike') score += 2.25 * confidence;
    else score += 1 * confidence;
  }
  return Math.round(score * 10) / 10;
}

function buildPrompt({ userId, windowDays, signals, summary, score }) {
  return [
    'Analyze the following behavioral recovery signals for relapse prediction.',
    `User ID: ${userId}`,
    `Window (days): ${windowDays}`,
    `Signal count: ${signals.length}`,
    `Risk score heuristic: ${score}`,
    `Summary: ${JSON.stringify(summary)}`,
    'Signals:',
    JSON.stringify(signals, null, 2),
    'Return a concise assessment with risk level, key drivers, and an early warning recommendation.',
  ].join('\n');
}

function extractCouncilOutput(result) {
  if (!result) return null;
  if (typeof result === 'string') return result;
  if (typeof result === 'object') {
    if (typeof result.output === 'string') return result.output;
    if (typeof result.content === 'string') return result.content;
    if (typeof result.message === 'string') return result.message;
    return JSON.stringify(result);
  }
  return String(result);
}

export function createRecoveryMonitor({ pool, callCouncilMember = defaultCallCouncilMember, logger }) {
  async function listRecentSignals(userId, { limit = 100, windowDays = WINDOW_DAYS } = {}) {
    const lim = clampLimit(limit, 1, 500);
    const days = Math.max(1, parseInt(windowDays, 10) || WINDOW_DAYS);

    const { rows } = await pool.query(
      `SELECT *
         FROM recovery_signals
        WHERE user_id = $1
          AND created_at >= NOW() - ($2::int * INTERVAL '1 day')
        ORDER BY created_at DESC
        LIMIT $3`,
      [userId, days, lim],
    );

    return rows.map(normalizeSignalRow);
  }

  async function getRecoverySummary(userId, { windowDays = WINDOW_DAYS } = {}) {
    const signals = await listRecentSignals(userId, { windowDays, limit: 500 });
    const summary = summarizeSignals(signals);
    const score = scoreSignals(signals);

    return {
      userId,
      windowDays,
      signalCount: signals.length,
      score,
      summary,
      signals,
    };
  }

  async function analyzeRecoverySignals(userId, { windowDays = WINDOW_DAYS } = {}) {
    const data = await getRecoverySummary(userId, { windowDays });
    if (data.signalCount < MIN_SIGNAL_COUNT) {
      return {
        userId,
        riskLevel: 'low',
        earlyWarning: false,
        summary: data.summary,
        score: data.score,
        insight: 'No recent recovery signals found in the configured window.',
        recommendation: 'Continue routine monitoring.',
        signals: data.signals,
      };
    }

    const prompt = buildPrompt({
      userId,
      windowDays,
      signals: data.signals,
      summary: data.summary,
      score: data.score,
    });

    const aiResult = await callCouncilMember('openai', prompt, { taskType: 'general' });
    const insight = extractCouncilOutput(aiResult);

    const riskLevel =
      data.score >= 6 ? 'high' :
      data.score >= 3 ? 'medium' :
      'low';

    return {
      userId,
      riskLevel,
      earlyWarning: riskLevel !== 'low',
      summary: data.summary,
      score: data.score,
      insight,
      recommendation:
        riskLevel === 'high'
          ? 'Surface an early warning and prompt immediate check-in.'
          : riskLevel === 'medium'
            ? 'Flag for closer monitoring and proactive support.'
            : 'Continue routine monitoring.',
      signals: data.signals,
      ai: aiResult ?? null,
    };
  }

  async function createEarlyWarning(userId, { windowDays = WINDOW_DAYS, createdBy = null } = {}) {
    const analysis = await analyzeRecoverySignals(userId, { windowDays });
    if (!analysis.earlyWarning) {
      return {
        created: false,
        warning: null,
        analysis,
      };
    }

    const payload = {
      user_id: userId,
      window_days: Math.max(1, parseInt(windowDays, 10) || WINDOW_DAYS),
      risk_level: analysis.riskLevel,
      score: analysis.score,
      summary: analysis.summary,
      insight: analysis.insight,
      recommendation: analysis.recommendation,
      created_by: createdBy,
    };

    const { rows } = await pool.query(
      `INSERT INTO recovery_early_warnings
         (user_id, window_days, risk_level, score, summary, insight, recommendation, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
       RETURNING *`,
      [
        payload.user_id,
        payload.window_days,
        payload.risk_level,
        payload.score,
        JSON.stringify(payload.summary || {}),
        payload.insight || null,
        payload.recommendation || null,
        payload.created_by,
      ],
    );

    return {
      created: true,
      warning: rows[0],
      analysis,
    };
  }

  async function listEarlyWarnings(userId, { limit = 50 } = {}) {
    const lim = clampLimit(limit, 1, 200);
    const { rows } = await pool.query(
      `SELECT *
         FROM recovery_early_warnings
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, lim],
    );
    return rows;
  }

  async function getRecentSignalDigest(userId, { hours = RECENT_ALERT_HOURS } = {}) {
    const hrs = Math.max(1, parseInt(hours, 10) || RECENT_ALERT_HOURS);
    const { rows } = await pool.query(
      `SELECT *
         FROM recovery_signals
        WHERE user_id = $1
          AND created_at >= NOW() - ($2::int * INTERVAL '1 hour')
        ORDER BY created_at DESC`,
      [userId, hrs],
    );

    const signals = rows.map(normalizeSignalRow);
    return {
      userId,
      hours: hrs,
      signalCount: signals.length,
      score: scoreSignals(signals),
      summary: summarizeSignals(signals),
      signals,
    };
  }

  return {
    listRecentSignals,
    getRecoverySummary,
    analyzeRecoverySignals,
    createEarlyWarning,
    listEarlyWarnings,
    getRecentSignalDigest,
  };
}