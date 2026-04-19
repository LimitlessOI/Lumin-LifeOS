/**
 * services/truth-delivery.js
 *
 * Calibrated truth delivery for LifeOS.
 *
 * The system learns over time how each person receives hard truths:
 * - Which style (direct/gentle/coaching) leads to acknowledgment
 * - Which topics they engage with vs avoid
 * - Time of day and emotional state correlations
 *
 * Starts with the user's stated preference (truth_style on lifeos_users).
 * Over time, observed acknowledgment patterns override stated preference.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createResponseVariety } from './response-variety.js';

const STYLES = {
  direct:   'Be direct and clear. No softening. State the truth plainly in 2–3 sentences.',
  gentle:   'Be compassionate but honest. Acknowledge the difficulty, then name the truth. 2–3 sentences.',
  coaching: 'Ask one powerful question that helps them see it themselves. No statement of the truth — just the question.',
};

const TOPICS = ['commitments', 'health', 'relationships', 'purpose', 'integrity', 'inner_work'];

export function createTruthDelivery({ pool, callAI }) {

  const variety = createResponseVariety({ pool });

  // ── Generate a hard truth for a user ──────────────────────────────────────

  async function generate({ userId, context }) {
    const [profile, effectiveness] = await Promise.all([
      getUserProfile(userId),
      getStyleEffectiveness(userId),
    ]);

    // Pick the most effective style based on observed acknowledgment rate
    // Fall back to user's stated preference if not enough data yet
    const style = pickBestStyle(profile?.truth_style || 'direct', effectiveness);
    const topic = inferTopic(context);
    const prompt = buildPrompt({ profile, context, style, topic });

    let text = '';
    let varietyStyles = null;

    try {
      const { systemPrompt: wrappedPrompt, styles } = await variety.wrapPromptWithVariety({
        userId,
        systemPrompt: prompt,
      });
      varietyStyles = styles;
      const raw = await callAI(wrappedPrompt);
      text = (typeof raw === 'string' ? raw : raw?.content || raw?.text || '').trim();
    } catch {
      text = defaultTruth(topic, profile?.display_name || 'You');
    }

    // Log variety pattern if we got a response
    if (text && varietyStyles) {
      await variety.logResponse({ userId, styles: varietyStyles, responsePreview: text.substring(0, 100), context: 'truth_delivery' });
    }

    // Capture calibration metadata at delivery time: hour-of-day and
    // best-effort emotional state (from last daily check-in in the last 24h).
    const hourOfDay = new Date().getHours();
    const emotionalState = await inferEmotionalState(userId);
    const joy7d = context?.jScore?.avg_joy_7d ?? null;
    const integrity = context?.iScore?.total_score ?? null;

    const deliveryId = await logDelivery({
      userId, style, topic, text,
      hourOfDay, emotionalState,
      joy7d, integrity,
    });

    return { text, style, topic, deliveryId, hourOfDay, emotionalState };
  }

  // ── Log a delivery ────────────────────────────────────────────────────────

  async function logDelivery({ userId, style, topic, text, hourOfDay = null, emotionalState = null, joy7d = null, integrity = null }) {
    try {
      const { rows } = await pool.query(`
        INSERT INTO truth_delivery_log
          (user_id, style_used, topic, truth_text,
           hour_of_day, emotional_state, joy_7d_at_time, integrity_at_time)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
      `, [userId, style, topic, text, hourOfDay, emotionalState, joy7d, integrity]);
      return rows[0]?.id;
    } catch {
      return null;
    }
  }

  // Best-effort: infer emotional state from the most recent daily check-in
  // in the last 24h; returns 'unknown' when no signal is present.
  async function inferEmotionalState(userId) {
    try {
      const { rows } = await pool.query(`
        SELECT weather, intensity, valence
        FROM daily_emotional_checkins
        WHERE user_id = $1
          AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);
      const row = rows[0];
      if (!row) return 'unknown';
      const intensity = Number(row.intensity ?? 0);
      const valence = Number(row.valence ?? 0);
      if (intensity >= 8 && valence <= -3) return 'flooded';
      if (intensity >= 6 && valence < 0)   return 'heated';
      if (valence < 0)                     return 'stirred';
      return 'calm';
    } catch {
      return 'unknown';
    }
  }

  // ── Record that user acknowledged (engaged) ───────────────────────────────

  async function recordAcknowledgment(deliveryId, { engaged = true } = {}) {
    if (!deliveryId) return;
    try {
      await pool.query(`
        UPDATE truth_delivery_log
        SET acknowledged = $2, acknowledged_at = NOW()
        WHERE id = $1
      `, [deliveryId, engaged]);
    } catch { /* non-fatal */ }
  }

  // ── Effectiveness analysis ────────────────────────────────────────────────

  async function getStyleEffectiveness(userId) {
    try {
      const { rows } = await pool.query(`
        SELECT
          style_used,
          COUNT(*) AS deliveries,
          COUNT(*) FILTER (WHERE acknowledged = true) AS acknowledged,
          ROUND(COUNT(*) FILTER (WHERE acknowledged = true)::numeric / NULLIF(COUNT(*),0) * 100, 1) AS ack_rate
        FROM truth_delivery_log
        WHERE user_id = $1
          AND created_at >= NOW() - INTERVAL '90 days'
        GROUP BY style_used
      `, [userId]);
      return rows;
    } catch {
      return [];
    }
  }

  // ── Calibration report ───────────────────────────────────────────────────
  // Human-readable snapshot of what the system has learned about how this
  // specific user receives hard truths. Used by the /truth/calibration route
  // and surfaced in the Mirror overlay so the learning loop is visible.
  async function getCalibrationReport(userId, { days = 90 } = {}) {
    const [styleRows, hourRows, stateRows, topicRows] = await Promise.all([
      safeQuery(`
        SELECT style_used,
               COUNT(*)::int AS deliveries,
               COUNT(*) FILTER (WHERE acknowledged = true)::int AS acknowledged,
               ROUND(
                 COUNT(*) FILTER (WHERE acknowledged = true)::numeric
                 / NULLIF(COUNT(*),0) * 100, 1
               ) AS ack_rate
        FROM truth_delivery_log
        WHERE user_id = $1
          AND created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY style_used
        ORDER BY ack_rate DESC NULLS LAST
      `, [userId, days]),
      safeQuery(`
        SELECT hour_of_day,
               COUNT(*)::int AS deliveries,
               ROUND(
                 COUNT(*) FILTER (WHERE acknowledged = true)::numeric
                 / NULLIF(COUNT(*),0) * 100, 1
               ) AS ack_rate
        FROM truth_delivery_log
        WHERE user_id = $1
          AND hour_of_day IS NOT NULL
          AND created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY hour_of_day
        HAVING COUNT(*) >= 3
        ORDER BY ack_rate DESC NULLS LAST, deliveries DESC
      `, [userId, days]),
      safeQuery(`
        SELECT emotional_state,
               COUNT(*)::int AS deliveries,
               ROUND(
                 COUNT(*) FILTER (WHERE acknowledged = true)::numeric
                 / NULLIF(COUNT(*),0) * 100, 1
               ) AS ack_rate
        FROM truth_delivery_log
        WHERE user_id = $1
          AND emotional_state IS NOT NULL
          AND created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY emotional_state
        HAVING COUNT(*) >= 3
        ORDER BY ack_rate DESC NULLS LAST
      `, [userId, days]),
      safeQuery(`
        SELECT topic,
               COUNT(*)::int AS deliveries,
               ROUND(
                 COUNT(*) FILTER (WHERE acknowledged = true)::numeric
                 / NULLIF(COUNT(*),0) * 100, 1
               ) AS ack_rate
        FROM truth_delivery_log
        WHERE user_id = $1
          AND created_at > NOW() - ($2 || ' days')::INTERVAL
        GROUP BY topic
        ORDER BY ack_rate DESC NULLS LAST
      `, [userId, days]),
    ]);

    const totalDeliveries = styleRows.reduce((s, r) => s + Number(r.deliveries || 0), 0);
    const best = {
      style: styleRows.find(r => Number(r.deliveries) >= 5) || null,
      hour:  hourRows[0] || null,
      state: stateRows[0] || null,
      topic: topicRows[0] || null,
    };

    return {
      total_deliveries: totalDeliveries,
      window_days: Number(days),
      by_style: styleRows,
      by_hour: hourRows,
      by_emotional_state: stateRows,
      by_topic: topicRows,
      best,
      confident: totalDeliveries >= 10,
    };
  }

  async function safeQuery(sql, params) {
    try {
      const { rows } = await pool.query(sql, params);
      return rows || [];
    } catch {
      return [];
    }
  }

  function pickBestStyle(statedPreference, effectiveness) {
    if (!effectiveness || effectiveness.length < 3) return statedPreference; // not enough data
    // Need at least 5 deliveries per style to trust the signal
    const qualified = effectiveness.filter(e => parseInt(e.deliveries) >= 5);
    if (qualified.length === 0) return statedPreference;
    const best = qualified.sort((a, b) => parseFloat(b.ack_rate) - parseFloat(a.ack_rate))[0];
    return best.style_used;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function getUserProfile(userId) {
    try {
      const { rows } = await pool.query(
        'SELECT display_name, be_statement, truth_style FROM lifeos_users WHERE id=$1',
        [userId]
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  function inferTopic(context) {
    if (!context) return 'integrity';
    const { overdue = [], iScore, jScore, health } = context;
    if (overdue.length > 2) return 'commitments';
    if (iScore?.commitment_score < 50) return 'commitments';
    if (health?.sleep_hours < 6) return 'health';
    if (jScore?.avg_joy_7d < 4) return 'purpose';
    if (iScore?.inner_work_score < 40) return 'inner_work';
    return 'integrity';
  }

  function buildPrompt({ profile, context, style, topic }) {
    const name   = profile?.display_name || 'the user';
    const be     = profile?.be_statement || '(not yet defined)';
    const guide  = STYLES[style] || STYLES.direct;

    const ctx = context || {};
    const open    = ctx.open    || [];
    const overdue = ctx.overdue || [];
    const iScore  = ctx.iScore;
    const jScore  = ctx.jScore;
    const health  = ctx.health;

    return `You are the Mirror — the honest inner voice in a personal operating system for ${name}.

Their identity statement: "${be}"

Current data:
- Open commitments: ${open.length} (${overdue.length} overdue${overdue.length > 0 ? ': ' + overdue.slice(0,2).map(c=>`"${c.title}"`).join(', ') : ''})
- Integrity score: ${iScore?.total_score ?? 'no data'}
- Joy score (7d avg): ${jScore?.avg_joy_7d ?? 'no data'}
- Sleep last night: ${health?.sleep_hours ?? 'unknown'} hours
- Focus area: ${topic}

Deliver one hard truth about this person's current state in the focus area.

Style: ${guide}

Rules:
- Specific to their actual data — not generic wisdom
- No preamble, no "I notice that..." — start with the truth or the question
- Maximum 3 sentences
- Sovereignty rule: never push them toward a direction they didn't state. Reflect only what IS, not what they should become.`;
  }

  function defaultTruth(topic, name) {
    const defaults = {
      commitments: 'There are promises waiting. The gap between what you said and what you did is where trust — with yourself — is built or eroded.',
      health:      'The body keeps score whether you log it or not. What happened last night affects what happens today.',
      purpose:     'The restlessness you feel is information. What is it trying to tell you?',
      integrity:   'Alignment is built one kept promise at a time. Where are you out of alignment with yourself right now?',
      inner_work:  'The work on the inside is the work. Everything else is downstream of it.',
      relationships: 'Connection requires presence. Where have you been absent that matters?',
    };
    return defaults[topic] || defaults.integrity;
  }

  return {
    generate,
    recordAcknowledgment,
    getStyleEffectiveness,
    getCalibrationReport,
    logDelivery,
  };
}
