// src/services/goal-commitment-system.js
// Goal commitment system where agent decides worth, sets penalties/rewards

export class GoalCommitmentSystem {
  constructor(pool, callCouncilWithFailover) {
    this.pool = pool;
    this.callCouncil = callCouncilWithFailover;
  }

  /**
   * Create goal commitment (agent decides if worth it)
   */
  async createCommitment(agentId, goalId, commitmentData) {
    try {
      const {
        commitment_type,
        commitment_description,
        penalty_type,
        penalty_description,
        penalty_amount,
        reward_type,
        reward_description,
        reward_value,
        agent_decided_worth_it,
        commitment_start_date,
        commitment_end_date
      } = commitmentData;

      // Get goal details to show agent
      const goal = await this.pool.query(
        `SELECT * FROM agent_goals WHERE id = $1 AND agent_id = $2`,
        [goalId, agentId]
      );

      if (goal.rows.length === 0) {
        return { ok: false, error: 'Goal not found' };
      }

      const goalData = goal.rows[0];

      // Generate data, steps, actions, and benefits for agent
      const goalAnalysis = await this.analyzeGoalForAgent(goalData);

      // Agent must decide if worth it
      if (agent_decided_worth_it === undefined || agent_decided_worth_it === null) {
        return {
          ok: false,
          error: 'Agent must decide if goal is worth it',
          goal_analysis: goalAnalysis,
          requires_decision: true
        };
      }

      // Create commitment
      const result = await this.pool.query(
        `INSERT INTO agent_goal_commitments 
         (goal_id, agent_id, commitment_type, commitment_description,
          penalty_type, penalty_description, penalty_amount,
          reward_type, reward_description, reward_value,
          agent_decided_worth_it, commitment_start_date, commitment_end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          goalId,
          agentId,
          commitment_type,
          commitment_description,
          penalty_type || null,
          penalty_description || null,
          penalty_amount || null,
          reward_type || null,
          reward_description || null,
          reward_value || null,
          agent_decided_worth_it,
          commitment_start_date ? new Date(commitment_start_date) : null,
          commitment_end_date ? new Date(commitment_end_date) : null
        ]
      );

      return {
        ok: true,
        commitment: result.rows[0],
        goal_analysis: goalAnalysis
      };
    } catch (error) {
      console.error('Create commitment error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Analyze goal and provide data, steps, actions, benefits
   */
  async analyzeGoalForAgent(goal) {
    try {
      const prompt = `Analyze this real estate agent goal and provide comprehensive information to help them decide if it's worth it.

Goal:
- Name: ${goal.goal_name}
- Type: ${goal.goal_type}
- Target: ${goal.target_value} ${goal.unit || ''}
- Deadline: ${goal.deadline || 'Not set'}

Provide:
1. DATA: What the numbers show (current progress, what's needed)
2. STEPS: Step-by-step actions required
3. ACTIONS: Daily/weekly actions needed
4. BENEFITS: What they'll gain (financial, lifestyle, career)
5. COST: Time, effort, resources required
6. REALITY CHECK: Honest assessment of difficulty

Return JSON:
{
  "data": {
    "current_progress": "...",
    "needed_to_achieve": "...",
    "time_remaining": "..."
  },
  "steps": ["...", "..."],
  "actions": {
    "daily": ["...", "..."],
    "weekly": ["...", "..."]
  },
  "benefits": {
    "financial": "...",
    "lifestyle": "...",
    "career": "..."
  },
  "cost": {
    "time_per_day": "...",
    "effort_level": "...",
    "resources_needed": "..."
  },
  "reality_check": "..."
}`;

      const response = await this.callCouncil(prompt, 'chatgpt');
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : response);
      } catch {
        // Fallback
        return {
          data: {
            current_progress: `${goal.current_value} of ${goal.target_value}`,
            needed_to_achieve: `${goal.target_value - goal.current_value} more`,
            time_remaining: goal.deadline ? `Until ${goal.deadline}` : 'No deadline set'
          },
          steps: ['Set daily targets', 'Track progress', 'Stay committed'],
          actions: {
            daily: ['Make calls', 'Follow up', 'Track activities'],
            weekly: ['Review progress', 'Adjust strategy']
          },
          benefits: {
            financial: 'Increased income',
            lifestyle: 'Better work-life balance',
            career: 'Career advancement'
          },
          cost: {
            time_per_day: '4-6 hours',
            effort_level: 'High',
            resources_needed: 'Focus and commitment'
          },
          reality_check: 'Achievable with consistent effort'
        };
      }
    } catch (error) {
      console.error('Analyze goal for agent error:', error);
      return {};
    }
  }

  /**
   * Track commitment (check if staying on course)
   */
  async trackCommitment(commitmentId, agentId) {
    try {
      const commitment = await this.pool.query(
        `SELECT * FROM agent_goal_commitments WHERE id = $1 AND agent_id = $2`,
        [commitmentId, agentId]
      );

      if (commitment.rows.length === 0) {
        return { ok: false, error: 'Commitment not found' };
      }

      const comm = commitment.rows[0];

      // Check if staying on course (not about deals, but about actions)
      const onCourse = await this.checkOnCourse(agentId, comm);

      // Record integrity tracking
      await this.pool.query(
        `INSERT INTO agent_integrity_tracking 
         (agent_id, commitment_id, commitment_made, commitment_kept, commitment_kept_at, integrity_score_impact)
         VALUES ($1, $2, NOW(), $3, $4, $5)`,
        [
          agentId,
          commitmentId,
          onCourse.on_course,
          onCourse.on_course ? new Date() : null,
          onCourse.on_course ? 1.0 : -1.0
        ]
      );

      // If not on course and penalty exists, apply penalty
      if (!onCourse.on_course && comm.penalty_type) {
        // Could trigger penalty logic here
        // For now, just track it
      }

      return {
        ok: true,
        on_course: onCourse.on_course,
        status: onCourse.status,
        message: onCourse.message
      };
    } catch (error) {
      console.error('Track commitment error:', error);
      return { ok: false, error: error.message };
    }
  }

  /**
   * Check if agent is staying on course
   */
  async checkOnCourse(agentId, commitment) {
    try {
      // Get recent activities related to commitment
      const activities = await this.pool.query(
        `SELECT * FROM agent_activities
         WHERE agent_id = $1 
           AND created_at >= $2
         ORDER BY created_at DESC
         LIMIT 50`,
        [agentId, commitment.commitment_start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]
      );

      // Analyze if they're doing the committed actions
      // This is simplified - would need to match commitment_description to activities
      const recentActivity = activities.rows.length > 0;

      return {
        on_course: recentActivity,
        status: recentActivity ? 'on_track' : 'off_track',
        message: recentActivity 
          ? 'You are staying on course with your commitments!' 
          : 'You are falling behind on your commitments. Time to refocus!'
      };
    } catch (error) {
      return {
        on_course: false,
        status: 'unknown',
        message: 'Unable to assess commitment status'
      };
    }
  }

  /**
   * Get all commitments for agent
   */
  async getAgentCommitments(agentId, status = null) {
    try {
      let query = `
        SELECT c.*, g.goal_name, g.goal_type, g.target_value, g.current_value
        FROM agent_goal_commitments c
        JOIN agent_goals g ON c.goal_id = g.id
        WHERE c.agent_id = $1
      `;
      const params = [agentId];

      if (status) {
        query += ` AND c.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY c.created_at DESC`;

      const result = await this.pool.query(query, params);
      return { ok: true, commitments: result.rows };
    } catch (error) {
      console.error('Get agent commitments error:', error);
      return { ok: false, error: error.message };
    }
  }
}
