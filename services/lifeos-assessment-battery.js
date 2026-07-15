/**
 * SYNOPSIS: Exports createAssessmentBatteryService — services/lifeos-assessment-battery.js.
 */
import { safeInt } from "./lifeos-request-helpers.js";

export function createAssessmentBatteryService({ pool }) {
  return {
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

    async getResult(userId, assessmentType, version = 1) {
      const result = await pool.query(
        `SELECT * FROM assessment_results
         WHERE user_id = $1 AND assessment_type = $2 AND version = $3`,
        [safeInt(userId), assessmentType, safeInt(version)]
      );
      return result.rows[0] || null;
    },

    async getAllResults(userId) {
      const result = await pool.query(
        `SELECT * FROM assessment_results
         WHERE user_id = $1
         ORDER BY assessment_type, taken_at DESC`,
        [safeInt(userId)]
      );
      return result.rows;
    },

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

    async hasCompletedBattery(userId) {
      const result = await pool.query(
        `SELECT COUNT(DISTINCT assessment_type) as count
         FROM assessment_results
         WHERE user_id = $1
           AND assessment_type IN ('attachment_style', 'love_language', 'conflict_style')`,
        [safeInt(userId)]
      );
      return result.rows[0]?.count === 3;
    }
  };
}

export async function getAssessments(userId, pool) {
  const result = await pool.query(
    `SELECT * FROM assessment_results
     WHERE user_id = $1
     ORDER BY assessment_type, taken_at DESC`,
    [safeInt(userId)]
  );
  return result.rows;
}

export async function compareAssessments(userId1, userId2, pool) {
  const user1Results = await getAssessments(userId1, pool);
  const user2Results = await getAssessments(userId2, pool);

  const comparison = {};

  const types = new Set([...user1Results.map(r => r.assessment_type), ...user2Results.map(r => r.assessment_type)]);

  for (const type of types) {
    const user1Result = user1Results.find(r => r.assessment_type === type);
    const user2Result = user2Results.find(r => r.assessment_type === type);

    if (user1Result && user2Result) {
      comparison[type] = {
        user1: {
          resultKey: user1Result.result_key,
          resultLabel: user1Result.result_label,
          score: user1Result.score
        },
        user2: {
          resultKey: user2Result.result_key,
          resultLabel: user2Result.result_label,
          score: user2Result.score
        }
      };
    }
  }

  return comparison;
}