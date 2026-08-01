/**
 * SYNOPSIS: Psychometric battery (Big Five + VIA strengths + values/interests/skills) for purpose priors.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { safeInt } from './lifeos-request-helpers.js';

export const PSYCHOMETRIC_INSTRUMENTS = [
  'big_five',
  'via_strengths',
  'values',
  'interests',
  'skills',
];

const memory = new Map();

export function listPsychometricInstruments() {
  return PSYCHOMETRIC_INSTRUMENTS.slice();
}

/**
 * SYNOPSIS: Analyzes text for cognitive distortions.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
export async function spotCognitiveDistortions(deps, payload) {
  const { callCouncilMember, logger } = deps;
  const { text, userId } = payload || {};

  if (!text) {
    logger.warn({ userId }, 'spotCognitiveDistortions called with empty text');
    return { distortions: [], cognitive_distortion_mode: false };
  }

  try {
    const prompt = `Analyze the following journal entry or message for common cognitive distortions (e.g., all-or-nothing thinking, overgeneralization, mental filter, disqualifying the positive, jumping to conclusions, magnification/minimization, emotional reasoning, "should" statements, labeling, personalization). Identify any distortions present and provide a brief explanation for each. If no distortions are found, state that clearly.

    Text: "${text}"

    Respond in a JSON array format, where each object has 'type' (the name of the distortion) and 'explanation' (why it's present in the text). If no distortions, return an empty array.`;

    const response = await callCouncilMember('psychometrics', prompt, {
      temperature: 0.3,
      max_tokens: 500,
    });

    let distortions = [];
    try {
      distortions = JSON.parse(response);
      if (!Array.isArray(distortions)) {
        distortions = []; // Ensure it's an array even if parsing yields something else
      }
    } catch (parseError) {
      logger.error({ parseError, response }, 'Failed to parse AI response for cognitive distortions');
      // Fallback if AI doesn't return perfect JSON
      distortions = [{ type: 'AI_PARSE_ERROR', explanation: 'Could not parse AI response.' }];
    }

    // Log the analysis result
    logger.info({ userId, text_length: text.length, distortions_found: distortions.length, cognitive_distortion_mode: true }, 'Cognitive distortion analysis complete');

    return { distortions, cognitive_distortion_mode: true };
  } catch (error) {
    logger.error({ error, userId }, 'Error in spotCognitiveDistortions');
    throw new Error('Failed to analyze cognitive distortions');
  }
}

export function createPsychometricBatteryService({ pool } = {}) {
  return {
    listInstruments: listPsychometricInstruments,

    async saveResponse(userId, instrument, answers = {}, resultLabel = null) {
      if (!PSYCHOMETRIC_INSTRUMENTS.includes(instrument)) {
        throw new Error(`unknown_instrument:${instrument}`);
      }
      const uid = safeInt(userId);
      const payload = {
        instrument,
        answers,
        result_label: resultLabel || instrument,
        taken_at: new Date().toISOString(),
      };
      if (!pool) {
        const key = String(uid);
        const row = memory.get(key) || {};
        row[instrument] = payload;
        memory.set(key, row);
        return payload;
      }
      try {
        const r = await pool.query(
          `INSERT INTO psychometric_results (user_id, instrument, result_label, answers, taken_at)
           VALUES ($1, $2, $3, $4::jsonb, NOW())
           ON CONFLICT (user_id, instrument)
           DO UPDATE SET result_label = EXCLUDED.result_label, answers = EXCLUDED.answers, taken_at = NOW()
           RETURNING *`,
          [uid, instrument, payload.result_label, JSON.stringify(answers)],
        );
        return r.rows[0];
      } catch {
        // Table may not exist yet — fall back to assessment_results shape.
        const r = await pool.query(
          `INSERT INTO assessment_results
             (user_id, assessment_type, result_key, result_label, score, raw_answers, version, taken_at)
           VALUES ($1, $2, $2, $3, NULL, $4::jsonb, 1, NOW())
           ON CONFLICT (user_id, assessment_type, version)
           DO UPDATE SET result_label = EXCLUDED.result_label, raw_answers = EXCLUDED.raw_answers, taken_at = NOW()
           RETURNING *`,
          [uid, `psychometric_${instrument}`, payload.result_label, JSON.stringify(answers)],
        );
        return r.rows[0];
      }
    },

    async getProfile(userId) {
      const uid = safeInt(userId);
      if (!pool) return memory.get(String(uid)) || {};
      try {
        const r = await pool.query(
          `SELECT DISTINCT ON (instrument) instrument, result_label, answers, taken_at
             FROM psychometric_results WHERE user_id = $1
             ORDER BY instrument, taken_at DESC`,
          [uid],
        );
        if (r.rows.length) {
          const profile = {};
          for (const row of r.rows) {
            profile[row.instrument] = {
              resultLabel: row.result_label,
              answers: row.answers,
              takenAt: row.taken_at,
            };
          }
          return profile;
        }
      } catch {
        /* fall through */
      }
      const r = await pool.query(
        `SELECT DISTINCT ON (assessment_type) assessment_type, result_label, raw_answers, taken_at
           FROM assessment_results
          WHERE user_id = $1 AND assessment_type LIKE 'psychometric_%'
          ORDER BY assessment_type, taken_at DESC`,
        [uid],
      );
      const profile = {};
      for (const row of r.rows) {
        const key = String(row.assessment_type).replace(/^psychometric_/, '');
        profile[key] = {
          resultLabel: row.result_label,
          answers: row.raw_answers,
          takenAt: row.taken_at,
        };
      }
      return profile;
    },

    async purposePriors(userId) {
      const profile = await this.getProfile(userId);
      return {
        ok: true,
        priors: profile,
        instruments: listPsychometricInstruments(),
        complete: PSYCHOMETRIC_INSTRUMENTS.every((k) => profile[k]),
      };
    },
  };
}
