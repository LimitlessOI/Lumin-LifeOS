// src/services/perfect-day-system.js
// Perfect Day system with visualization, goal reading, and daily routine

export class PerfectDaySystem {
  constructor(pool, callCouncilWithFailover) {
    this.pool = pool;
    this.callCouncil = callCouncilWithFailover;
  }

  /**
   * Create or update perfect day configuration
   */
  async setupPerfectDay(agentId, config) {
    try {
      const {
        wake_up_time,
        goal_reading_time = 5,
        visualization_time = 10,
        inspiring_content_url,
        training_schedule,
        daily_routine
      } = config;

      // Analyze cost of wake-up time
      const costAnalysis = this.analyzeWakeUpTime(wake_up_time);

      // Check if perfect day exists
      const existing = await this.pool.query(
        `SELECT * FROM agent_perfect_day WHERE agent_id = $1`,
        [agentId]
      );

      let result;
      if (existing.rows.length > 0) {
        result = await this.pool.query(
          `UPDATE agent_perfect_day 
           SET wake_up_time = $1, goal_reading_time = $2, visualization_time = $3,
               inspiring_content_url = $4, training_schedule = $5, daily_routine = $6,
               updated_at = NOW()
           WHERE agent_id = $7
           RETURNING *`,
          [
            wake_up_time,
            goal_reading_time,
            visualization_time,
            inspiring_content_url,
            JSON.stringify(training_schedule),
            JSON.stringify(daily_routine),
            agentId
          ]
        );
      } else {
        result = await this.pool.query(
          `INSERT INTO agent_perfect_day 
           (agent_id, wake_up_time, goal_reading_time, visualization_time, 
            inspiring_content_url, training_schedule, daily_routine)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            agentId,
            wake_up_time,
            goal_reading_time,
            visualization_time,
            inspiring_content_url,
            JSON.stringify(training_schedule),
            JSON.stringify(daily_routine)
          ]
        );
      }

      return {
        ok: true,
        perfect_day: result.rows[0],
        wake_up_cost_analysis: costAnalysis
      };
    } catch (error) {
      console.error('Setup perfect day error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Analyze cost of wake-up time
   */
  analyzeWakeUpTime(wakeUpTime) {
    // Parse time (e.g., "12:00" or "12:00 PM")
    const [hours, minutes] = wakeUpTime.split(':').map(Number);
    const wakeUpHour = hours + (minutes / 60);

    // Standard business day starts at 9 AM
    const standardStart = 9;
    const hoursLost = Math.max(0, wakeUpHour - standardStart);

    const costAnalysis = {
      wake_up_time: wakeUpTime,
      hours_lost: hoursLost,
      impact: 'none',
      recommendation: null
    };

    if (wakeUpHour >= 12) {
      costAnalysis.impact = 'high';
      costAnalysis.recommendation = 'Waking up at noon loses 3+ hours of prime calling time. Consider adjusting goal or wake-up time.';
      costAnalysis.estimated_goal_reduction = '20-30%';
    } else if (wakeUpHour >= 10) {
      costAnalysis.impact = 'medium';
      costAnalysis.recommendation = 'Waking up after 10 AM reduces morning productivity. Consider earlier wake-up for better results.';
      costAnalysis.estimated_goal_reduction = '10-15%';
    } else {
      costAnalysis.impact = 'low';
      costAnalysis.recommendation = 'Good wake-up time for maximum productivity.';
    }

    return costAnalysis;
  }

  /**
   * Get perfect day routine
   */
  async getPerfectDay(agentId) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM agent_perfect_day WHERE agent_id = $1`,
        [agentId]
      );

      if (result.rows.length === 0) {
        return { ok: false, error: 'Perfect day not configured' };
      }

      return { ok: true, perfect_day: result.rows[0] };
    } catch (error) {
      console.error('Get perfect day error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Start perfect day routine
   */
  async startPerfectDay(agentId) {
    try {
      const perfectDay = await this.getPerfectDay(agentId);
      if (!perfectDay.ok) {
        return perfectDay;
      }

      const config = perfectDay.perfect_day;
      const today = new Date().toISOString().split('T')[0];

      // Get active goals for reading
      const goals = await this.pool.query(
        `SELECT * FROM agent_goals 
         WHERE agent_id = $1 AND status = 'active'
         ORDER BY created_at DESC`,
        [agentId]
      );

      // Generate visualization prompts
      const visualizationPrompts = await this.generateVisualizationPrompts(agentId, goals.rows);

      // Get inspiring content
      const inspiringContent = await this.getInspiringContent();

      // Get today's training
      const training = await this.getTodayTraining(agentId, config.training_schedule);

      return {
        ok: true,
        routine: {
          wake_up_time: config.wake_up_time,
          step_1_goal_reading: {
            duration_minutes: config.goal_reading_time,
            goals: goals.rows.map(g => ({
              name: g.goal_name,
              target: g.target_value,
              current: g.current_value,
              progress: ((g.current_value / g.target_value) * 100).toFixed(1) + '%'
            }))
          },
          step_2_visualize_day: {
            duration_minutes: config.visualization_time,
            prompts: visualizationPrompts.day_visualization
          },
          step_3_visualize_life: {
            duration_minutes: config.visualization_time,
            prompts: visualizationPrompts.life_visualization
          },
          step_4_inspiring_content: {
            url: config.inspiring_content_url || inspiringContent.url,
            title: inspiringContent.title,
            duration_minutes: inspiringContent.duration
          },
          step_5_training: training,
          step_6_practice_overlay: {
            description: 'Practice using sales overlay with simulated calls',
            duration_minutes: 15
          }
        }
      };
    } catch (error) {
      console.error('Start perfect day error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Generate visualization prompts
   */
  async generateVisualizationPrompts(agentId, goals) {
    try {
      const prompt = `Create visualization prompts for a real estate agent.

Active Goals:
${goals.map(g => `- ${g.goal_name}: ${g.target_value} ${g.unit || ''}`).join('\n')}

Create two types of visualizations:

1. DAY VISUALIZATION: Help them visualize having a successful day today
   - Making successful calls
   - Setting appointments
   - Closing deals
   - Feeling confident and in control

2. LIFE VISUALIZATION: Help them visualize the life they'll have when goals are achieved
   - The house they really want
   - Dream vacation
   - Financial freedom
   - Family benefits
   - Lifestyle changes

Return JSON:
{
  "day_visualization": {
    "prompt": "...",
    "key_points": ["...", "..."]
  },
  "life_visualization": {
    "prompt": "...",
    "key_points": ["...", "..."],
    "dream_house": "...",
    "dream_vacation": "..."
  }
}`;

      const response = await this.callCouncil(prompt, 'chatgpt');
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : response);
      } catch {
        // Fallback
        return {
          day_visualization: {
            prompt: 'Visualize yourself having an amazing day. See yourself making successful calls, setting appointments, and closing deals. Feel the confidence and excitement.',
            key_points: ['Successful calls', 'Appointments set', 'Deals closed', 'Feeling confident']
          },
          life_visualization: {
            prompt: 'Visualize your life when you achieve your goals. See the house you want, the vacation you dream of, the financial freedom.',
            key_points: ['Dream house', 'Dream vacation', 'Financial freedom', 'Family benefits'],
            dream_house: 'Visualize your ideal home',
            dream_vacation: 'Visualize your dream vacation'
          }
        };
      }
    } catch (error) {
      console.error('Generate visualization prompts error:', error);
      return {};
    }
  }

  /**
   * Get inspiring content
   */
  async getInspiringContent() {
    // Could be curated list or AI-generated
    const contentList = [
      {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder
        title: 'Success Mindset for Real Estate Agents',
        duration: 10
      }
    ];

    return contentList[0];
  }

  /**
   * Get today's training
   */
  async getTodayTraining(agentId, trainingSchedule) {
    if (!trainingSchedule || !Array.isArray(trainingSchedule)) {
      return {
        type: 'sales_overlay_practice',
        description: 'Practice using sales overlay with simulated calls',
        duration_minutes: 15
      };
    }

    // Get training for today based on schedule
    const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    const todayTraining = trainingSchedule.find(t => t.day === today) || trainingSchedule[0];

    return todayTraining;
  }

  /**
   * Set three most important things for the day
   */
  async setThreeMostImportant(agentId, threeThings) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if log exists for today
      const existing = await this.pool.query(
        `SELECT * FROM agent_daily_log WHERE agent_id = $1 AND log_date = $2`,
        [agentId, today]
      );

      if (existing.rows.length > 0) {
        await this.pool.query(
          `UPDATE agent_daily_log 
           SET three_most_important = $1
           WHERE agent_id = $2 AND log_date = $3`,
          [JSON.stringify(threeThings), agentId, today]
        );
      } else {
        await this.pool.query(
          `INSERT INTO agent_daily_log 
           (agent_id, log_date, three_most_important)
           VALUES ($1, $2, $3)`,
          [agentId, today, JSON.stringify(threeThings)]
        );
      }

      return { ok: true };
    } catch (error) {
      console.error('Set three most important error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * End of day review
   */
  async endOfDayReview(agentId, reviewData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const {
        three_most_important_completed,
        day_grade,
        notes
      } = reviewData;

      // Get what they committed to
      const log = await this.pool.query(
        `SELECT * FROM agent_daily_log WHERE agent_id = $1 AND log_date = $2`,
        [agentId, today]
      );

      const committed = log.rows[0]?.three_most_important || [];
      const completed = three_most_important_completed || [];

      // Calculate integrity score
      const integrityScore = this.calculateIntegrityScore(committed, completed);

      // Calculate day score
      const dayScore = this.calculateDayScore(day_grade, integrityScore, completed.length, committed.length);

      // System's assessment
      const systemScore = await this.calculateSystemScore(agentId, today);

      // Update log
      const result = await this.pool.query(
        `UPDATE agent_daily_log 
         SET three_most_important_completed = $1,
             day_grade = $2,
             day_score = $3,
             system_score = $4,
             integrity_score = $5,
             notes = $6
         WHERE agent_id = $7 AND log_date = $8
         RETURNING *`,
        [
          JSON.stringify(completed),
          day_grade,
          dayScore,
          systemScore,
          integrityScore,
          notes,
          agentId,
          today
        ]
      );

      return {
        ok: true,
        daily_log: result.rows[0],
        integrity_score: integrityScore,
        day_score: dayScore,
        system_score: systemScore
      };
    } catch (error) {
      console.error('End of day review error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Calculate integrity score
   */
  calculateIntegrityScore(committed, completed) {
    if (!committed || committed.length === 0) return 100;

    const committedItems = Array.isArray(committed) ? committed : JSON.parse(committed);
    const completedItems = Array.isArray(completed) ? completed : JSON.parse(completed || '[]');

    const matches = committedItems.filter(item => 
      completedItems.some(comp => 
        comp.toLowerCase().includes(item.toLowerCase()) || 
        item.toLowerCase().includes(comp.toLowerCase())
      )
    ).length;

    return (matches / committedItems.length) * 100;
  }

  /**
   * Calculate day score
   */
  calculateDayScore(dayGrade, integrityScore, completedCount, committedCount) {
    let baseScore = 0;
    
    if (dayGrade === 'great') baseScore = 90;
    else if (dayGrade === 'good') baseScore = 70;
    else if (dayGrade === 'poor') baseScore = 40;
    else baseScore = 50;

    // Weight integrity score
    const finalScore = (baseScore * 0.6) + (integrityScore * 0.4);
    
    return Math.round(finalScore);
  }

  /**
   * Calculate system's assessment
   */
  async calculateSystemScore(agentId, date) {
    try {
      // Get activities for the day
      const activities = await this.pool.query(
        `SELECT COUNT(*) as count, 
                COUNT(CASE WHEN outcome IN ('appointment_set', 'sale', 'showing_scheduled') THEN 1 END) as success_count
         FROM agent_activities
         WHERE agent_id = $1 AND DATE(created_at) = $2`,
        [agentId, date]
      );

      const total = parseInt(activities.rows[0]?.count || 0);
      const success = parseInt(activities.rows[0]?.success_count || 0);
      const successRate = total > 0 ? (success / total) * 100 : 0;

      // Score based on activity and success
      let score = 50; // Base score
      if (total >= 10) score += 20; // High activity
      if (total >= 20) score += 10; // Very high activity
      if (successRate >= 20) score += 20; // Good conversion
      if (successRate >= 30) score += 10; // Excellent conversion

      return Math.min(100, score);
    } catch (error) {
      return 50; // Default
    }
  }
}
