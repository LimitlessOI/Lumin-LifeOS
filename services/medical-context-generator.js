/**
 * services/medical-context-generator.js
 * Generates a pre-appointment medical context brief.
 * Pulls 90 days of data, patterns, medications, correlations.
 * Produces a structured summary the user can share with a doctor.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

'use strict';

/**
 * @param {{ pool: import('pg').Pool, callAI: Function }} opts
 */
export function createMedicalContextGenerator({ pool, callAI }) {
  /**
   * Generate a pre-appointment medical context brief.
   * @param {number|string} userId
   * @param {{ appointmentType?: string, focusAreas?: string[] }} opts
   * @returns {Promise<{brief: string, generated_at: string, data_days: number}>}
   */
  async function generate(userId, { appointmentType = 'general', focusAreas = [] } = {}) {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [checkinRes, wearableRes, medsRes, correlationsRes] = await Promise.allSettled([
      pool.query(
        `SELECT
           AVG(sleep_hours)::float   AS avg_sleep,
           AVG(energy_score)::float  AS avg_energy,
           AVG(mood_score)::float    AS avg_mood,
           MIN(sleep_hours)::float   AS min_sleep,
           MAX(sleep_hours)::float   AS max_sleep,
           COUNT(*)::int             AS days_logged
         FROM health_checkins
         WHERE user_id = $1
           AND created_at >= $2`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT
           metric,
           AVG(value)::float AS avg_val,
           MIN(value)::float AS min_val,
           MAX(value)::float AS max_val,
           COUNT(*)::int     AS reading_count
         FROM wearable_data
         WHERE user_id = $1
           AND recorded_at >= $2
         GROUP BY metric`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT name, COUNT(*)::int AS times_taken
         FROM medications_taken
         WHERE user_id = $1
           AND taken_at >= $2
         GROUP BY name
         ORDER BY times_taken DESC
         LIMIT 20`,
        [userId, cutoff]
      ),
      pool.query(
        `SELECT factor_a, factor_b, direction, strength, observation
         FROM health_correlations
         WHERE user_id = $1
         ORDER BY strength DESC NULLS LAST
         LIMIT 5`,
        [userId]
      ),
    ]);

    const checkin = checkinRes.status === 'fulfilled' ? checkinRes.value.rows[0] : {};
    const wearableRows = wearableRes.status === 'fulfilled' ? wearableRes.value.rows : [];
    const meds = medsRes.status === 'fulfilled' ? medsRes.value.rows : [];
    const correlations = correlationsRes.status === 'fulfilled' ? correlationsRes.value.rows : [];

    // Build wearable summary map
    const wearableMap = {};
    for (const row of wearableRows) {
      wearableMap[row.metric] = row;
    }

    const fmt = v => (v != null ? Number(v).toFixed(1) : 'N/A');

    const sleepSection = checkin.avg_sleep != null
      ? `Sleep: avg ${fmt(checkin.avg_sleep)} hrs/night (range ${fmt(checkin.min_sleep)}–${fmt(checkin.max_sleep)} hrs) over ${checkin.days_logged ?? 0} logged nights`
      : 'Sleep: no check-in data available';

    const energySection = checkin.avg_energy != null
      ? `Energy: avg ${fmt(checkin.avg_energy)}/10, Mood: avg ${fmt(checkin.avg_mood)}/10`
      : 'Energy/Mood: no check-in data';

    const hrRow = wearableMap['heart_rate'];
    const hrvRow = wearableMap['hrv'];
    const wearableSection = [
      hrRow ? `Resting HR: avg ${fmt(hrRow.avg_val)} bpm (range ${fmt(hrRow.min_val)}–${fmt(hrRow.max_val)})` : null,
      hrvRow ? `HRV: avg ${fmt(hrvRow.avg_val)} ms` : null,
    ].filter(Boolean).join(', ') || 'No wearable HR/HRV data available';

    const medsSection = meds.length > 0
      ? meds.map(m => `${m.name} (${m.times_taken}x in 90 days)`).join(', ')
      : 'No medication log data available';

    const correlationsSection = correlations.length > 0
      ? correlations.map(c =>
          `- ${c.factor_a} → ${c.factor_b}: ${c.direction ?? 'unknown'} correlation (strength ${fmt(c.strength * 100)}%). ${c.observation ?? ''}`
        ).join('\n')
      : 'No correlation data available yet';

    const focusLine = focusAreas.length > 0
      ? `Focus areas for this appointment: ${focusAreas.join(', ')}.`
      : '';

    const prompt = `You are helping a patient prepare for a doctor appointment. Write a concise medical context brief that covers the following data from their personal health monitoring system (last 90 days).

SLEEP PATTERNS:
${sleepSection}

ENERGY AND MOOD TRENDS:
${energySection}

CARDIOVASCULAR:
${wearableSection}

MEDICATIONS / SUPPLEMENTS REGULARLY TAKEN:
${medsSection}

NOTABLE HEALTH PATTERNS AND CORRELATIONS:
${correlationsSection}

Appointment type: ${appointmentType}
${focusLine}

Instructions:
- Be specific with numbers where available
- Write in a clear, professional tone suitable for a medical provider
- Organize into sections: Sleep, Energy & Mood, Cardiovascular, Medications, Key Patterns
- End with 2-3 specific questions the patient should ask their doctor based on these patterns
- Keep the total brief to approximately one page (400-600 words)`;

    const aiResponse = await callAI(prompt);
    const brief = typeof aiResponse === 'string'
      ? aiResponse
      : aiResponse?.content ?? aiResponse?.text ?? 'Unable to generate brief.';

    return {
      brief,
      generated_at: new Date().toISOString(),
      data_days: 90,
    };
  }

  return { generate };
}
