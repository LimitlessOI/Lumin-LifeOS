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

    // Log the delivery attempt for calibration
    const deliveryId = await logDelivery({ userId, style, topic, text });

    return { text, style, topic, deliveryId };
  }

  // ── Log a delivery ────────────────────────────────────────────────────────

  async function logDelivery({ userId, style, topic, text }) {
    try {
      const { rows } = await pool.query(`
        INSERT INTO truth_delivery_log (user_id, style_used, topic, truth_text)
        VALUES ($1,$2,$3,$4) RETURNING id
      `, [userId, style, topic, text]);
      return rows[0]?.id;
    } catch {
      return null;
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
    logDelivery,
  };
}
