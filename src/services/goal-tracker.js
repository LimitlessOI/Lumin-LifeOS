// src/services/goal-tracker.js
// Goal tracking system with cost analysis and worth evaluation

export class GoalTracker {
  constructor(pool, callCouncilWithFailover) {
    this.pool = pool;
    this.callCouncil = callCouncilWithFailover;
  }

  /**
   * Create a new goal with cost analysis
   */
  async createGoal(agentId, goalData) {
    try {
      const { goal_type, goal_name, target_value, deadline, unit = 'count' } = goalData;

      // Analyze goal and calculate cost/ROI
      const analysis = await this.analyzeGoal(agentId, goalData);

      // Break down goal into controllable activities
      const breakdown = await this.breakdownGoal(goalData, analysis);

      const result = await this.pool.query(
        `INSERT INTO agent_goals 
         (agent_id, goal_type, goal_name, target_value, unit, deadline, 
          estimated_cost, estimated_roi, is_worth_it, breakdown, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
         RETURNING *`,
        [
          agentId,
          goal_type,
          goal_name,
          target_value,
          unit,
          deadline ? new Date(deadline) : null,
          analysis.estimated_cost || 0,
          analysis.estimated_roi || 0,
          analysis.is_worth_it,
          JSON.stringify(breakdown)
        ]
      );

      return {
        ok: true,
        goal: result.rows[0],
        analysis
      };
    } catch (error) {
      console.error('Create goal error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Analyze goal to determine cost, ROI, and if it's worth it
   */
  async analyzeGoal(agentId, goalData) {
    try {
      // Get agent's current performance metrics
      const agentMetrics = await this.getAgentMetrics(agentId);

      const prompt = `Analyze this real estate agent goal and determine if it's worth pursuing.

Agent Current Performance:
- Average conversion rate: ${agentMetrics.avg_conversion_rate || 'N/A'}%
- Current sales per month: ${agentMetrics.avg_sales_per_month || 0}
- Current revenue per month: $${agentMetrics.avg_revenue_per_month || 0}
- Best performing activity: ${agentMetrics.best_activity || 'N/A'}

Goal:
- Type: ${goalData.goal_type}
- Name: ${goalData.goal_name}
- Target: ${goalData.target_value} ${goalData.unit || 'count'}
- Deadline: ${goalData.deadline || 'Not set'}

Based on law of averages and agent's current performance, calculate:
1. Estimated cost to achieve this goal (time, resources, money)
2. Estimated ROI (return on investment)
3. Is it worth it? (true/false)
4. What activities are needed? (breakdown into controllable actions)

Return JSON:
{
  "estimated_cost": 0,
  "estimated_roi": 0,
  "is_worth_it": true,
  "reasoning": "...",
  "required_activities": {
    "calls": 0,
    "appointments": 0,
    "showings": 0,
    "follow_ups": 0
  },
  "time_estimate": "X hours/days",
  "confidence": "high/medium/low"
}`;

      const analysisText = await this.callCouncil(prompt, 'chatgpt');
      
      let analysis;
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
      } catch (parseError) {
        // Fallback analysis
        analysis = this.fallbackAnalysis(goalData, agentMetrics);
      }

      return analysis;
    } catch (error) {
      console.error('Analyze goal error:', error);
      return this.fallbackAnalysis(goalData, {});
    }
  }

  /**
   * Break down goal into controllable activities
   */
  async breakdownGoal(goalData, analysis) {
    const breakdown = {
      controllable: [],
      uncontrollable: [],
      law_of_averages: {}
    };

    // Controllable activities (what agent can directly control)
    if (analysis.required_activities) {
      breakdown.controllable = [
        { activity: 'calls', target: analysis.required_activities.calls || 0, current: 0 },
        { activity: 'appointments', target: analysis.required_activities.appointments || 0, current: 0 },
        { activity: 'showings', target: analysis.required_activities.showings || 0, current: 0 },
        { activity: 'follow_ups', target: analysis.required_activities.follow_ups || 0, current: 0 },
      ];
    }

    // Uncontrollable outcomes (what agent can't directly control)
    breakdown.uncontrollable = [
      'client_ready_to_buy',
      'client_sets_appointment',
      'client_shows_up',
      'client_makes_offer',
      'deal_closes'
    ];

    // Law of averages (based on historical data)
    breakdown.law_of_averages = {
      calls_to_appointments: 0.1, // 10% of calls become appointments
      appointments_to_showings: 0.7, // 70% of appointments become showings
      showings_to_offers: 0.3, // 30% of showings get offers
      offers_to_closes: 0.8, // 80% of offers close
    };

    return breakdown;
  }

  /**
   * Get agent's current performance metrics
   */
  async getAgentMetrics(agentId) {
    try {
      // Get last 30 days of activities
      const activities = await this.pool.query(
        `SELECT activity_type, outcome, COUNT(*) as count
         FROM agent_activities
         WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY activity_type, outcome`,
        [agentId]
      );

      // Calculate metrics
      const totalCalls = activities.rows
        .filter(a => a.activity_type === 'call')
        .reduce((sum, a) => sum + parseInt(a.count), 0);

      const appointmentsSet = activities.rows
        .filter(a => a.outcome === 'appointment_set')
        .reduce((sum, a) => sum + parseInt(a.count), 0);

      const sales = await this.pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(CAST(metadata->>'sale_amount' AS DECIMAL)), 0) as revenue
         FROM agent_activities
         WHERE agent_id = $1 AND outcome = 'sale' AND created_at >= NOW() - INTERVAL '30 days'`,
        [agentId]
      );

      const conversionRate = totalCalls > 0 ? (appointmentsSet / totalCalls) * 100 : 0;

      // Get best performing activity
      const bestActivity = await this.pool.query(
        `SELECT activity_type, COUNT(*) as count
         FROM agent_activities
         WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
           AND outcome IN ('appointment_set', 'sale', 'showing_scheduled')
         GROUP BY activity_type
         ORDER BY count DESC
         LIMIT 1`,
        [agentId]
      );

      return {
        avg_conversion_rate: conversionRate,
        avg_sales_per_month: parseInt(sales.rows[0]?.count || 0),
        avg_revenue_per_month: parseFloat(sales.rows[0]?.revenue || 0),
        best_activity: bestActivity.rows[0]?.activity_type || null,
        total_calls: totalCalls,
        appointments_set: appointmentsSet
      };
    } catch (error) {
      console.error('Get agent metrics error:', error);
      return {};
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId, currentValue) {
    try {
      const result = await this.pool.query(
        `UPDATE agent_goals 
         SET current_value = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [currentValue, goalId]
      );

      if (result.rows.length === 0) {
        return { ok: false, error: 'Goal not found' };
      }

      const goal = result.rows[0];
      
      // Check if goal is completed
      if (goal.current_value >= goal.target_value && goal.status === 'active') {
        await this.pool.query(
          `UPDATE agent_goals SET status = 'completed', updated_at = NOW() WHERE id = $1`,
          [goalId]
        );
        goal.status = 'completed';
      }

      return { ok: true, goal };
    } catch (error) {
      console.error('Update goal progress error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get all goals for an agent
   */
  async getAgentGoals(agentId, status = null) {
    try {
      let query = `SELECT * FROM agent_goals WHERE agent_id = $1`;
      const params = [agentId];

      if (status) {
        query += ` AND status = $2`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await this.pool.query(query, params);
      return { ok: true, goals: result.rows };
    } catch (error) {
      console.error('Get agent goals error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Fallback analysis if AI fails
   */
  fallbackAnalysis(goalData, agentMetrics) {
    // Simple rule-based analysis
    const target = parseFloat(goalData.target_value) || 0;
    const avgRevenue = agentMetrics.avg_revenue_per_month || 0;
    const avgSales = agentMetrics.avg_sales_per_month || 1;

    let estimatedCost = 0;
    let estimatedROI = 0;
    let isWorthIt = true;

    if (goalData.goal_type === 'revenue') {
      estimatedCost = target * 0.1; // Assume 10% cost
      estimatedROI = target - estimatedCost;
      isWorthIt = estimatedROI > estimatedCost;
    } else if (goalData.goal_type === 'sales') {
      estimatedCost = target * 1000; // Assume $1000 per sale in costs
      estimatedROI = target * (avgRevenue / avgSales) - estimatedCost;
      isWorthIt = estimatedROI > 0;
    }

    return {
      estimated_cost: estimatedCost,
      estimated_roi: estimatedROI,
      is_worth_it: isWorthIt,
      reasoning: `Based on current performance metrics`,
      required_activities: {
        calls: Math.ceil(target * 10), // Rough estimate
        appointments: Math.ceil(target * 2),
        showings: Math.ceil(target * 1.5),
        follow_ups: Math.ceil(target * 3)
      },
      time_estimate: `${Math.ceil(target * 2)} hours`,
      confidence: 'medium'
    };
  }
}
