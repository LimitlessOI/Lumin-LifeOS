/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    AI EFFECTIVENESS TRACKER                                      ║
 * ║                    Rates each AI model's effectiveness by task type              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class AIEffectivenessTracker {
  constructor(pool) {
    this.pool = pool;
    this.ratings = new Map();
  }

  /**
   * Rate AI performance after task completion
   */
  async ratePerformance(aiMember, taskType, result) {
    const {
      success = true,
      responseTime = 0,
      cost = 0,
      quality = 0.5,
      userSatisfaction = 0.5,
    } = result;

    try {
      // Get current rating
      const current = await this.pool.query(
        `SELECT * FROM ai_effectiveness_ratings
         WHERE ai_member = $1 AND task_type = $2`,
        [aiMember, taskType]
      );

      let successCount = success ? 1 : 0;
      let totalCount = 1;
      let avgResponseTime = responseTime;
      let avgCost = cost;
      let avgQuality = quality;
      let effectivenessScore = this.calculateEffectiveness(success, responseTime, cost, quality, userSatisfaction);

      if (current.rows.length > 0) {
        const existing = current.rows[0];
        successCount = existing.success_count + (success ? 1 : 0);
        totalCount = existing.total_count + 1;
        avgResponseTime = Math.round((existing.avg_response_time + responseTime) / 2);
        avgCost = (parseFloat(existing.cost_efficiency) + cost) / 2;
        avgQuality = (parseFloat(existing.quality_score) + quality) / 2;
        
        // Weighted effectiveness (90% old, 10% new)
        effectivenessScore = (parseFloat(existing.effectiveness_score) * 0.9) + (effectivenessScore * 0.1);
      }

      // Update or insert
      await this.pool.query(
        `INSERT INTO ai_effectiveness_ratings
         (ai_member, task_type, effectiveness_score, success_count, total_count,
          avg_response_time, cost_efficiency, quality_score, last_rated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (ai_member, task_type) DO UPDATE SET
           effectiveness_score = $3,
           success_count = $4,
           total_count = $5,
           avg_response_time = $6,
           cost_efficiency = $7,
           quality_score = $8,
           last_rated_at = NOW()`,
        [
          aiMember,
          taskType,
          effectivenessScore,
          successCount,
          totalCount,
          avgResponseTime,
          avgCost,
          avgQuality,
        ]
      );

      // Update cache
      this.ratings.set(`${aiMember}_${taskType}`, {
        effectivenessScore,
        successCount,
        totalCount,
        avgResponseTime,
        costEfficiency: avgCost,
        qualityScore: avgQuality,
      });

      return effectivenessScore;
    } catch (error) {
      console.warn('Failed to rate AI performance:', error.message);
      return 0.5; // Default
    }
  }

  /**
   * Calculate effectiveness score (0-1)
   */
  calculateEffectiveness(success, responseTime, cost, quality, userSatisfaction) {
    let score = 0;

    // Success (40%)
    if (success) score += 0.4;

    // Quality (30%)
    score += quality * 0.3;

    // User satisfaction (20%)
    score += userSatisfaction * 0.2;

    // Speed bonus (5%) - faster is better (normalized)
    const speedScore = Math.max(0, 1 - (responseTime / 10000)); // 10s = 0, 0s = 1
    score += speedScore * 0.05;

    // Cost efficiency (5%) - lower cost is better
    const costScore = Math.max(0, 1 - (cost / 1.0)); // $1 = 0, $0 = 1
    score += costScore * 0.05;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Get best AI for a task type
   */
  async getBestAIForTask(taskType) {
    try {
      const result = await this.pool.query(
        `SELECT ai_member, effectiveness_score, success_count, total_count
         FROM ai_effectiveness_ratings
         WHERE task_type = $1
         ORDER BY effectiveness_score DESC
         LIMIT 1`,
        [taskType]
      );

      if (result.rows.length > 0) {
        return {
          member: result.rows[0].ai_member,
          score: parseFloat(result.rows[0].effectiveness_score),
          successRate: result.rows[0].total_count > 0
            ? result.rows[0].success_count / result.rows[0].total_count
            : 0,
        };
      }
    } catch (error) {
      console.warn('Failed to get best AI:', error.message);
    }

    return null;
  }

  /**
   * Get all AI ratings
   */
  async getAllRatings() {
    try {
      const result = await this.pool.query(
        `SELECT ai_member, task_type, effectiveness_score, success_count, total_count,
                avg_response_time, cost_efficiency, quality_score
         FROM ai_effectiveness_ratings
         ORDER BY effectiveness_score DESC`
      );

      return result.rows.map(row => ({
        member: row.ai_member,
        taskType: row.task_type,
        effectiveness: parseFloat(row.effectiveness_score),
        successRate: row.total_count > 0 ? row.success_count / row.total_count : 0,
        avgResponseTime: row.avg_response_time,
        costEfficiency: parseFloat(row.cost_efficiency),
        quality: parseFloat(row.quality_score),
      }));
    } catch (error) {
      console.warn('Failed to get ratings:', error.message);
      return [];
    }
  }

  /**
   * Get AI strengths (best task types)
   */
  async getAIStrengths(aiMember) {
    try {
      const result = await this.pool.query(
        `SELECT task_type, effectiveness_score, success_count, total_count
         FROM ai_effectiveness_ratings
         WHERE ai_member = $1
         ORDER BY effectiveness_score DESC
         LIMIT 5`,
        [aiMember]
      );

      return result.rows.map(row => ({
        taskType: row.task_type,
        effectiveness: parseFloat(row.effectiveness_score),
        successRate: row.total_count > 0 ? row.success_count / row.total_count : 0,
      }));
    } catch (error) {
      return [];
    }
  }
}
