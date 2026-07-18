/**
 * SYNOPSIS: Manages storage and retrieval of user assessment results including
 * @fileoverview Assessment Battery Service
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * 
 * Manages storage and retrieval of user assessment results including
 * attachment styles, love languages, and conflict styles.
 */

import { safeInt } from "./lifeos-request-helpers.js";

const INSTRUMENTS = [
  'attachment_style',
  'love_language',
  'conflict_style',
  'communication_style',
  'core_values',
  'stress_profile',
];

export function listInstruments() {
  return INSTRUMENTS.slice();
}

export function createAssessmentBatteryService({ pool }) {
  const memory = new Map();
  return {
    listInstruments,
    /**
     * Save or update an assessment result
     * @param {Object} params
     * @param {number} params.userId
     * @param {string} params.assessmentType
     * @param {string} params.resultKey
     * @param {string} params.resultLabel
     * @param {number} params.score
     * @param {Object} params.rawAnswers
     * @param {number} params.version
     * @returns {Promise<Object>}
     */
    async saveResult({ userId, assessmentType, resultKey, resultLabel, score, rawAnswers, version = 1 }) {
      const result = await pool.query(
        `INSERT INTO assessment_results 
         (user_id, assessment_type, result_key, result_label, score, raw_answers, version, taken_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id, assessment_type, version)
         DO UPDATE SET 
           result_key = EXCLUDED.result_key,
           result_label = EXCLUDED.result_label,
           score = EXCLUDED.score,
           raw_answers = EXCLUDED.raw_answers,
           taken_at = NOW()
         RETURNING *`,
        [safeInt(userId), assessmentType, resultKey, resultLabel, score, JSON.stringify(rawAnswers), safeInt(version)]
      );
      return result.rows[0];
    },

    /**
     * Get a specific assessment result
     * @param {number} userId
     * @param {string} assessmentType
     * @param {number} version
     * @returns {Promise<Object|null>}
     */
    async getResult(userId, assessmentType, version = 1) {
      const result = await pool.query(
        `SELECT * FROM assessment_results 
         WHERE user_id = $1 AND assessment_type = $2 AND version = $3`,
        [safeInt(userId), assessmentType, safeInt(version)]
      );
      return result.rows[0] || null;
    },

    /**
     * Get all assessment results for a user
     * @param {number} userId
     * @returns {Promise<Array>}
     */
    async getAllResults(userId) {
      const result = await pool.query(
        `SELECT * FROM assessment_results 
         WHERE user_id = $1 
         ORDER BY assessment_type, taken_at DESC`,
        [safeInt(userId)]
      );
      return result.rows;
    },

    /**
     * Get compatibility profile with latest results keyed by assessment type
     * @param {number} userId
     * @returns {Promise<Object>}
     */
    async getCompatibilityProfile(userId) {
      const result = await pool.query(
        `SELECT DISTINCT ON (assessment_type) 
           assessment_type, result_key, result_label, score, raw_answers, taken_at
         FROM assessment_results
         WHERE user_id = $1
         ORDER BY assessment_type, taken_at DESC`,
        [safeInt(userId)]
      );
      
      const profile = {};
      for (const row of result.rows) {
        profile[row.assessment_type] = {
          resultKey: row.result_key,
          resultLabel: row.result_label,
          score: row.score,
          rawAnswers: row.raw_answers,
          takenAt: row.taken_at
        };
      }
      return profile;
    },

    /**
     * Check if user has completed all core assessments
     * @param {number} userId
     * @returns {Promise<boolean>}
     */
    async hasCompletedBattery(userId) {
      if (!pool) {
        const row = memory.get(String(userId));
        return Boolean(row && INSTRUMENTS.every((k) => row[k]));
      }
      const result = await pool.query(
        `SELECT COUNT(DISTINCT assessment_type) as count
         FROM assessment_results
         WHERE user_id = $1 
           AND assessment_type IN ('attachment_style', 'love_language', 'conflict_style')`,
        [safeInt(userId)]
      );
      return result.rows[0]?.count === 3;
    },

    async saveResponse(userId, instrument, answers) {
      if (!INSTRUMENTS.includes(instrument)) {
        throw new Error(`unknown_instrument:${instrument}`);
      }
      if (!pool) {
        const key = String(userId);
        const row = memory.get(key) || {};
        row[instrument] = { answers, takenAt: new Date().toISOString() };
        memory.set(key, row);
        return row[instrument];
      }
      return this.saveResult({
        userId,
        assessmentType: instrument,
        resultKey: instrument,
        resultLabel: instrument,
        score: null,
        rawAnswers: answers,
      });
    },

    async getProfile(userId) {
      if (!pool) return memory.get(String(userId)) || {};
      return this.getCompatibilityProfile(userId);
    },

    async comparePair(userIdA, userIdB) {
      const a = await this.getProfile(userIdA);
      const b = await this.getProfile(userIdB);
      return { user_a: a, user_b: b, instruments: listInstruments() };
    },
  };
}