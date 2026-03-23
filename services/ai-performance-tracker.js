/**
 * ai-performance-tracker.js — extracted from server.js
 * AI performance tracking and rotation based on performance.
 *
 * Use createAIPerformanceTracker(deps) to get bound functions.
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

/**
 * @param {object} deps
 * @param {object} deps.pool
 * @param {Map}    deps.aiPerformanceScores
 * @param {object} deps.COUNCIL_MEMBERS
 */
export function createAIPerformanceTracker(deps) {
  const { pool, aiPerformanceScores, COUNCIL_MEMBERS } = deps;

  // --------------------------------------------------------------------------
  // trackAIPerformance
  // --------------------------------------------------------------------------
  async function trackAIPerformance(
    aiMember,
    taskType,
    durationMs,
    tokensUsed,
    cost,
    success
  ) {
    try {
      await pool.query(
        `INSERT INTO ai_performance (ai_member, task_type, duration_ms, tokens_used, cost, success, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [aiMember, taskType, durationMs, tokensUsed, cost, success]
      );

      const currentScore = aiPerformanceScores.get(aiMember) || 50;
      const newScore = success
        ? Math.min(100, currentScore + (100 - durationMs / 100))
        : Math.max(0, currentScore - 10);
      aiPerformanceScores.set(aiMember, newScore);
    } catch (error) {
      console.error("Performance tracking error:", error.message);
    }
  }

  // --------------------------------------------------------------------------
  // rotateAIsBasedOnPerformance
  // --------------------------------------------------------------------------
  async function rotateAIsBasedOnPerformance() {
    try {
      const result = await pool.query(
        `SELECT ai_member,
                AVG(CASE WHEN success THEN 1 ELSE 0 END) as success_rate,
                AVG(duration_ms) as avg_duration,
                COUNT(*) as task_count
         FROM ai_performance
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY ai_member
         ORDER BY success_rate DESC, avg_duration ASC`
      );

      if (result.rows.length > 0) {
        const bestPerformer = result.rows[0].ai_member;

        await pool.query(
          `INSERT INTO ai_rotation_log (ai_member, previous_role, new_role, performance_score, reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            bestPerformer,
            COUNCIL_MEMBERS[bestPerformer].role,
            "Primary Decision Maker",
            result.rows[0].success_rate * 100,
            "Highest success rate",
          ]
        );

        console.log(
          `🔄 AI Rotation: ${bestPerformer} promoted to Primary Decision Maker`
        );

        return {
          primary: bestPerformer,
          secondary: result.rows[1]?.ai_member || "chatgpt",
          rotations: result.rows.length,
        };
      }
    } catch (error) {
      console.error("AI rotation error:", error.message);
    }
    return null;
  }

  return { trackAIPerformance, rotateAIsBasedOnPerformance };
}
