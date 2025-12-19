// src/services/coaching-progression.js
// Manages agent progression from new agent to top performer

export class CoachingProgression {
  constructor(pool, callCouncilWithFailover) {
    this.pool = pool;
    this.callCouncil = callCouncilWithFailover;

    // Define progression levels
    this.levels = {
      new_agent: {
        name: 'New Agent',
        min_sales: 0,
        max_sales: 5,
        description: 'Just starting out - learning the basics',
        requirements: {
          calls_per_week: 20,
          appointments_per_week: 2,
          showings_per_week: 1
        }
      },
      developing: {
        name: 'Developing Agent',
        min_sales: 5,
        max_sales: 20,
        description: 'Building consistency and skills',
        requirements: {
          calls_per_week: 40,
          appointments_per_week: 5,
          showings_per_week: 3,
          conversion_rate: 10
        }
      },
      consistent: {
        name: 'Consistent Performer',
        min_sales: 20,
        max_sales: 50,
        description: 'Regular sales and steady income',
        requirements: {
          calls_per_week: 60,
          appointments_per_week: 8,
          showings_per_week: 5,
          conversion_rate: 15,
          monthly_sales: 2
        }
      },
      top_performer: {
        name: 'Top Performer',
        min_sales: 50,
        max_sales: 100,
        description: 'High volume sales and strong results',
        requirements: {
          calls_per_week: 80,
          appointments_per_week: 12,
          showings_per_week: 8,
          conversion_rate: 20,
          monthly_sales: 5
        }
      },
      elite: {
        name: 'Elite Agent',
        min_sales: 100,
        max_sales: Infinity,
        description: 'Top tier - selling 100+ properties',
        requirements: {
          calls_per_week: 100,
          appointments_per_week: 15,
          showings_per_week: 10,
          conversion_rate: 25,
          monthly_sales: 8
        }
      }
    };
  }

  /**
   * Get or create agent progression record
   */
  async getAgentProgression(agentId) {
    try {
      let result = await this.pool.query(
        `SELECT * FROM agent_progression WHERE agent_id = $1`,
        [agentId]
      );

      if (result.rows.length === 0) {
        // Create initial progression record
        const insertResult = await this.pool.query(
          `INSERT INTO agent_progression 
           (agent_id, current_level, level_progress, total_sales, total_revenue)
           VALUES ($1, 'new_agent', 0, 0, 0)
           RETURNING *`,
          [agentId]
        );
        return { ok: true, progression: insertResult.rows[0] };
      }

      // Update progression based on current performance
      const progression = await this.updateProgression(agentId, result.rows[0]);

      return { ok: true, progression };
    } catch (error) {
      console.error('Get agent progression error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Update agent progression based on performance
   */
  async updateProgression(agentId, currentProgression) {
    try {
      // Get agent's current metrics
      const metrics = await this.getAgentMetrics(agentId);

      // Determine current level
      const currentLevel = this.determineLevel(metrics);
      const levelProgress = this.calculateLevelProgress(metrics, currentLevel);

      // Assess skills
      const skillsAssessment = await this.assessSkills(agentId, metrics);
      const strengths = await this.identifyStrengths(agentId, metrics);
      const improvementAreas = await this.identifyImprovementAreas(agentId, metrics);

      // Get next level requirements
      const nextLevel = this.getNextLevel(currentLevel);
      const nextLevelRequirements = nextLevel ? this.levels[nextLevel].requirements : null;

      // Generate coaching plan
      const coachingPlan = await this.generateCoachingPlan(
        agentId,
        currentLevel,
        skillsAssessment,
        improvementAreas
      );

      // Update progression record
      const result = await this.pool.query(
        `UPDATE agent_progression 
         SET current_level = $1,
             level_progress = $2,
             total_sales = $3,
             total_revenue = $4,
             skills_assessment = $5,
             strengths = $6,
             improvement_areas = $7,
             next_level_requirements = $8,
             coaching_plan = $9,
             updated_at = NOW()
         WHERE agent_id = $10
         RETURNING *`,
        [
          currentLevel,
          levelProgress,
          metrics.total_sales,
          metrics.total_revenue,
          JSON.stringify(skillsAssessment),
          JSON.stringify(strengths),
          JSON.stringify(improvementAreas),
          JSON.stringify(nextLevelRequirements),
          JSON.stringify(coachingPlan),
          agentId
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Update progression error:', error);
      return currentProgression;
    }
  }

  /**
   * Get agent's current performance metrics
   */
  async getAgentMetrics(agentId) {
    try {
      // Get total sales and revenue
      const sales = await this.pool.query(
        `SELECT COUNT(*) as count, 
                COALESCE(SUM(CAST(metadata->>'sale_amount' AS DECIMAL)), 0) as revenue
         FROM agent_activities
         WHERE agent_id = $1 AND outcome = 'sale'`,
        [agentId]
      );

      // Get last 30 days activity
      const activities = await this.pool.query(
        `SELECT activity_type, COUNT(*) as count
         FROM agent_activities
         WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY activity_type`,
        [agentId]
      );

      const calls = activities.rows.find(a => a.activity_type === 'call')?.count || 0;
      const appointments = activities.rows.find(a => a.activity_type === 'appointment')?.count || 0;
      const showings = activities.rows.find(a => a.activity_type === 'showing')?.count || 0;

      // Calculate conversion rates
      const conversionRate = calls > 0 ? (appointments / calls) * 100 : 0;

      return {
        total_sales: parseInt(sales.rows[0]?.count || 0),
        total_revenue: parseFloat(sales.rows[0]?.revenue || 0),
        calls_per_week: Math.round((calls / 30) * 7),
        appointments_per_week: Math.round((appointments / 30) * 7),
        showings_per_week: Math.round((showings / 30) * 7),
        conversion_rate: conversionRate,
        monthly_sales: parseInt(sales.rows[0]?.count || 0) // Simplified
      };
    } catch (error) {
      console.error('Get agent metrics error:', error);
      return {
        total_sales: 0,
        total_revenue: 0,
        calls_per_week: 0,
        appointments_per_week: 0,
        showings_per_week: 0,
        conversion_rate: 0,
        monthly_sales: 0
      };
    }
  }

  /**
   * Determine agent's current level
   */
  determineLevel(metrics) {
    const sales = metrics.total_sales || 0;

    if (sales >= 100) return 'elite';
    if (sales >= 50) return 'top_performer';
    if (sales >= 20) return 'consistent';
    if (sales >= 5) return 'developing';
    return 'new_agent';
  }

  /**
   * Calculate progress to next level (0-100%)
   */
  calculateLevelProgress(metrics, currentLevel) {
    const level = this.levels[currentLevel];
    if (!level) return 0;

    const nextLevel = this.getNextLevel(currentLevel);
    if (!nextLevel) return 100; // Already at max level

    const nextLevelDef = this.levels[nextLevel];
    const range = nextLevelDef.min_sales - level.min_sales;
    const progress = metrics.total_sales - level.min_sales;

    if (range <= 0) return 100;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }

  /**
   * Get next level
   */
  getNextLevel(currentLevel) {
    const levelOrder = ['new_agent', 'developing', 'consistent', 'top_performer', 'elite'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    return currentIndex < levelOrder.length - 1 ? levelOrder[currentIndex + 1] : null;
  }

  /**
   * Assess agent's skills
   */
  async assessSkills(agentId, metrics) {
    // Get coaching clips and technique patterns
    const clips = await this.pool.query(
      `SELECT clip_type, technique_detected, COUNT(*) as count
       FROM coaching_clips
       WHERE agent_id = $1
       GROUP BY clip_type, technique_detected`,
      [agentId]
    );

    const goodPractices = clips.rows.filter(c => c.clip_type === 'good_moment').length;
    const coachingNeeded = clips.rows.filter(c => c.clip_type === 'coaching_needed').length;

    return {
      communication: this.scoreSkill(metrics.conversion_rate, 20),
      consistency: this.scoreSkill(metrics.calls_per_week, 60),
      closing: this.scoreSkill(metrics.monthly_sales, 5),
      rapport_building: goodPractices > coachingNeeded ? 'strong' : 'needs_improvement',
      overall: (this.scoreSkill(metrics.conversion_rate, 20) + 
                this.scoreSkill(metrics.calls_per_week, 60) + 
                this.scoreSkill(metrics.monthly_sales, 5)) / 3
    };
  }

  /**
   * Score a skill based on metric
   */
  scoreSkill(value, target) {
    if (value >= target) return 100;
    return Math.min(100, (value / target) * 100);
  }

  /**
   * Identify agent's strengths
   */
  async identifyStrengths(agentId, metrics) {
    const strengths = [];

    if (metrics.conversion_rate >= 20) {
      strengths.push({
        area: 'conversion_rate',
        strength: `Excellent ${metrics.conversion_rate.toFixed(1)}% conversion rate`,
        impact: 'high'
      });
    }

    if (metrics.calls_per_week >= 60) {
      strengths.push({
        area: 'activity',
        strength: `High activity: ${metrics.calls_per_week} calls per week`,
        impact: 'high'
      });
    }

    if (metrics.monthly_sales >= 3) {
      strengths.push({
        area: 'closing',
        strength: `Strong closing: ${metrics.monthly_sales} sales per month`,
        impact: 'high'
      });
    }

    return strengths;
  }

  /**
   * Identify areas needing improvement
   */
  async identifyImprovementAreas(agentId, metrics) {
    const areas = [];
    const currentLevel = this.determineLevel(metrics);
    const levelReqs = this.levels[currentLevel].requirements;

    if (metrics.calls_per_week < levelReqs.calls_per_week) {
      areas.push({
        area: 'call_volume',
        current: metrics.calls_per_week,
        target: levelReqs.calls_per_week,
        gap: levelReqs.calls_per_week - metrics.calls_per_week,
        priority: 'high'
      });
    }

    if (metrics.conversion_rate < levelReqs.conversion_rate) {
      areas.push({
        area: 'conversion_rate',
        current: metrics.conversion_rate,
        target: levelReqs.conversion_rate,
        gap: levelReqs.conversion_rate - metrics.conversion_rate,
        priority: 'high'
      });
    }

    if (metrics.appointments_per_week < levelReqs.appointments_per_week) {
      areas.push({
        area: 'appointments',
        current: metrics.appointments_per_week,
        target: levelReqs.appointments_per_week,
        gap: levelReqs.appointments_per_week - metrics.appointments_per_week,
        priority: 'medium'
      });
    }

    return areas;
  }

  /**
   * Generate personalized coaching plan
   */
  async generateCoachingPlan(agentId, currentLevel, skillsAssessment, improvementAreas) {
    try {
      const prompt = `Create a personalized coaching plan for a real estate agent.

Current Level: ${this.levels[currentLevel].name}
Skills Assessment: ${JSON.stringify(skillsAssessment)}
Improvement Areas: ${JSON.stringify(improvementAreas)}

Create a coaching plan with:
1. Immediate actions (this week)
2. Short-term goals (this month)
3. Long-term development (next 3 months)
4. Specific training recommendations
5. Practice exercises

Return JSON:
{
  "immediate_actions": ["..."],
  "short_term_goals": ["..."],
  "long_term_development": ["..."],
  "training_recommendations": ["..."],
  "practice_exercises": ["..."]
}`;

      const planText = await this.callCouncil(prompt, 'chatgpt');
      
      try {
        const jsonMatch = planText.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : planText);
      } catch {
        // Fallback plan
        return {
          immediate_actions: [
            `Increase calls to ${improvementAreas.find(a => a.area === 'call_volume')?.target || 20} per week`,
            'Focus on improving conversion rate through better qualifying questions'
          ],
          short_term_goals: [
            'Reach next level requirements',
            'Improve weakest skill area'
          ],
          long_term_development: [
            'Build consistent sales pipeline',
            'Develop advanced closing techniques'
          ],
          training_recommendations: [
            'Sales technique training',
            'Communication skills workshop'
          ],
          practice_exercises: [
            'Role play objection handling',
            'Practice active listening'
          ]
        };
      }
    } catch (error) {
      console.error('Generate coaching plan error:', error);
      return {};
    }
  }
}
