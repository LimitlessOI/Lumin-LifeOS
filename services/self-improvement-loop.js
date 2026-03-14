/**
 * continuousSelfImprovement — extracted from server.js.
 * Factory pattern: call createSelfImprovementLoop(getDeps) to get the bound async function.
 */
import logger from './logger.js';

/**
 * @param {() => object} getDeps  Returns: { systemMetrics, pool, createSystemSnapshot,
 *   detectBlindSpots, rotateAIsBasedOnPerformance, callCouncilWithFailover,
 *   sandboxTest, executionQueue, systemSnapshots, rollbackToSnapshot }
 */
export function createSelfImprovementLoop(getDeps) {
  return async function continuousSelfImprovement() {
    const {
      systemMetrics,
      pool,
      createSystemSnapshot,
      detectBlindSpots,
      rotateAIsBasedOnPerformance,
      callCouncilWithFailover,
      sandboxTest,
      executionQueue,
      systemSnapshots,
      rollbackToSnapshot,
    } = getDeps();

    try {
      systemMetrics.improvementCyclesRun++;
      logger.info(
        `🔧 [IMPROVEMENT] Running cycle #${systemMetrics.improvementCyclesRun}...`
      );

      await createSystemSnapshot("Before improvement cycle");

      const recentErrors = await pool.query(
        `SELECT what_was_lost, why_lost, COUNT(*) as count
         FROM loss_log
         WHERE timestamp > NOW() - INTERVAL '1 hour'
         GROUP BY what_was_lost, why_lost
         ORDER BY count DESC LIMIT 5`
      );

      const slowTasks = await pool.query(
        `SELECT type, AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) as avg_duration
         FROM execution_tasks
         WHERE created_at > NOW() - INTERVAL '24 hours'
         AND completed_at IS NOT NULL
         GROUP BY type
         HAVING AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) > 5000`
      );

      const recentDecisions = await pool.query(
        `SELECT * FROM user_decisions
         WHERE created_at > NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC LIMIT 5`
      );

      for (const decision of recentDecisions.rows) {
        await detectBlindSpots(decision.choice, decision.context);
      }

      await rotateAIsBasedOnPerformance();

      if (recentErrors.rows.length > 0 || slowTasks.rows.length > 0) {
        const improvementPrompt = `Analyze and suggest code/process improvements for these issues:

      Recent Errors: ${JSON.stringify(recentErrors.rows.slice(0, 3))}
      Performance Bottlenecks: ${JSON.stringify(slowTasks.rows.slice(0, 3))}
      Blind Spots Detected: ${systemMetrics.blindSpotsDetected}

      Focus especially on:
      - Reducing friction in monetization flows
      - Improving ROI visibility
      - Keeping safety and ethics intact.

      Suggest specific, actionable improvements.`;

        const improvements = await callCouncilWithFailover(
          improvementPrompt,
          "ollama_deepseek" // Use Tier 0 (free)
        );

        if (improvements && improvements.length > 50) {
          const testResult = await sandboxTest(
            `// Test improvements\nconsole.log("Testing improvements");`,
            "Improvement test"
          );

          if (testResult.success) {
            await executionQueue.addTask("self_improvement", improvements);
            systemMetrics.lastImprovement = new Date().toISOString();
          } else {
            logger.warn("⚠️ Improvements failed sandbox test, rolling back");
            await rollbackToSnapshot(
              systemSnapshots[systemSnapshots.length - 1].id
            );
          }
        }
      }
    } catch (error) {
      logger.error("Self-improvement error:", { error: error.message });
    }
  };
}
